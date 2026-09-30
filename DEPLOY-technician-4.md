# Web app — wiring in technician data

Instructions for adding three things to the AssetGuard web app:

1. **Device photos** on the device page
2. **Site photos** on the site page (before / after works, installation)
3. **Activity log** on both — what technicians actually did

All three read APIs that already exist. Nothing here needs a migration.

**Prerequisite:** the backend patch must be deployed first. Without it, two of
these return empty for anyone who is not a platform admin — see *Visibility* at
the end, and check with:

    grep -c "scoped" app/api/mainapp/media/route.js                    # expect 2
    grep -c "scoped" app/api/mainapp/technician/worklog/route.js       # expect 2

---

## 1. Site photos

The web already has `app/mainapp/sites/[id]/components/SitePhotos.jsx` reading
this endpoint. It works — it was only ever returning nothing because of the
visibility rule. What it should gain is **grouping by stage**.

    GET /api/mainapp/media?site_id=<numeric site id>&limit=60
    -> { photos: [ … ] }

Photo row:

| field | notes |
| --- | --- |
| `id` | use for the image URL |
| `site_id`, `site_code`, `site_name` | |
| `photo_type` | **"Before works" / "After works" / "Device installation"** |
| `device_id` | the human device id, e.g. `001_NairobiHeadquarters_V`. Null for site-only shots |
| `technician` | name typed on the job |
| `captured_by` | the signed-in user who uploaded — trust this over `technician` |
| `status` | "In progress" / "Complete" |
| `lat`, `lng`, `accuracy_m` | where the shutter was pressed. **`accuracy_m` null means the position came from the site record, not a live GPS fix** — do not print a made-up accuracy |
| `taken_at` | shutter time, NOT upload time. Can be hours before `created_at` |
| `imprinted` | the JPEG already has a GPS + timestamp band burned into it |
| `mime`, `bytes` | |

Bytes are never in the list response:

    GET /api/mainapp/media/<photo id>              # the image
    GET /api/mainapp/media/<photo id>?download=1   # forces a filename

**Group by `photo_type`** into three sections — Before works, Installation,
After works. Right now they render as one undifferentiated wall, which loses the
whole point: the before/after pair is the evidence of what changed.

Sort each group by `taken_at` descending.

## 2. Device photos

New capability. Same endpoint, different filter:

    GET /api/mainapp/media?device_id=<human device_id>&limit=60
    -> { photos: [ … ] }

`device_id` is the **human** id (`001_NairobiHeadquarters_V`), not the numeric
primary key — it is TEXT on the photo row.

Do **not** fetch the site's photos and filter client-side. The Android app did
exactly that and it silently returned nothing on busy sites: 60 photos of other
devices filled the page before the device's own appeared.

Most device photos will be `photo_type: "Device installation"`. Lead with those.

## 3. Activity log

The record of what a technician did — one entry per installation or maintenance
job.

    GET /api/mainapp/technician/worklog?site_id=<id>       # a site's history
    GET /api/mainapp/technician/worklog?device_id=<id>     # a device's history
    GET /api/mainapp/technician/worklog?from=&to=&limit=   # also accepted
    -> { entries: [ … ] }

    GET /api/mainapp/technician/worklog/<entry id>
    -> { entry }

Entry:

| field | notes |
| --- | --- |
| `id` | |
| `job_type` | `install` \| `maintain` |
| `maintenance_type` | `battery` \| `sim`, on maintenance jobs only |
| `site_id`, `site_name`, `device_id` | |
| `technician_id`, `technician_name` | |
| `started_at`, `finished_at` | |
| `outcome` | `passed` \| `abandoned` |
| `lat`, `lng`, `accuracy_m` | same null-accuracy rule as photos |
| `checklist` | JSONB, e.g. `{"Opened":true,"PoweredOn":true,"SimAndBattery":true,"LedsOn":true,"LidClosed":true}` |
| `photos` | JSONB **of photo ids**, grouped: `{"before":[…],"confirmation":[…],"after":[…]}` |
| `tests` | JSONB array, every attempt in order |
| `notes` | free text |
| `created_at` | |

### Rendering the entry

**`photos` holds ids, not URLs.** Render each as
`/api/mainapp/media/<id>`. The ids are the same rows the photo endpoints return,
so an entry's photos and the site gallery never disagree.

**`tests` is the interesting field.** It looks like:

    [
      {"attempt":1,"started_at":"…","result":"fail","alarm_id":null,"alarm_name":null},
      {"attempt":2,"started_at":"…","result":"pass","alarm_id":"ALM-2026-0081","alarm_name":"Disturbance"}
    ]

Show the **whole array**, not just the final result. "Passed on the third
attempt" and "passed first time" are different facts about a device, and the
first one is worth chasing — it is often a tracker that is about to give trouble.
Link `alarm_id` through to the alarm page.

**`checklist` keys are the enum names** from the app, in flow order: `Opened`,
`PoweredOn`, `SimAndBattery`, `LedsOn`, `LidClosed`. Older entries predate
`LedsOn` and simply lack the key — treat missing as "not recorded", not as false.

**`outcome: "abandoned"`** means the technician left without a passing test.
Those entries matter more than the successful ones; do not hide them behind a
default filter.

### Suggested placement

- **Site page** — an "Activity" section under the photos: date, job type,
  technician, device, outcome, test result. Row expands to the full entry.
- **Device page** — same, filtered to that device. This is the device's service
  history.

---

## Visibility — read this before testing

Two endpoints used to restrict **every non-admin** to rows they created
themselves. That is why site photos appeared empty on the web: a company manager
opening a site saw only photos they had personally taken, which is none.

The deployed patch narrows that rule to the **unscoped** listing only:

- `?site_id=` or `?device_id=` present → any signed-in user sees that subject's
  photos and activity.
- no filter at all → still restricted to your own rows.

The reasoning: the risk is someone paging through *everything* — every site's
photos with GPS fixes and the name of whoever was standing there. Asking what
happened at a named site is not that, and you had to know the site to ask.

**Test as a non-admin user.** An admin account will show these working whether
the patch is deployed or not, which is exactly how the original bug survived.

## Two gotchas worth repeating

- **`taken_at` ≠ `created_at`.** Photos queue on the phone when there is no
  signal and upload later. Order galleries by `taken_at` or the sequence of a job
  comes out scrambled.
- **`accuracy_m: null` is meaningful.** It means the coordinates came from the
  site's stored position rather than the handset's GPS. Render it as "from site
  record", never as "±0 m".
