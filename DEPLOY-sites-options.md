# sites/options — coordinates + filters

Replaces `app/api/mainapp/sites/options/route.js`. **No migration, no schema change.**

    cd /var/www/html/baseapps/assetguard
    python3 -c "import zipfile; zipfile.ZipFile('sites-options.zip').extractall('.')"
    npm run build
    pm2 restart assetguard-3010 gps-3000

## Why

`GET /api/mainapp/sites` is `requireAdmin`. The technician app's **sites map**
and **sites list** were both calling it, so for a `field_tech` account the entire
Sites tab returned 403 and rendered "Admins only". The installation wizard used
`options` instead — correctly — but `options` returned only
`id, code, name, region`, with no coordinates. That silently broke two things:

- the **nearest-site suggestion** (it filters on `site.lat`, which was always
  null, so the list was always empty and the feature never fired)
- the **site-coordinate fallback** for the work log

## What changed

Now returns `id, code, name, region, status, lat, lng`, and accepts the same
`q` / `region` / `status` filters the admin list takes — so a screen can be
pointed at either route without its query changing shape.

## On exposing coordinates

The old header gave "it returns coordinates" as one reason the full route is
admin-only. A site's position is not a secret from the person being sent to stand
at it: it is on their work order and in their maps app already. Three things need
it — the map (cannot place a pin without it), the nearest-site suggestion, and
the work log's position.

Everything genuinely sensitive stays admin-only: contacts, security company and
arrangements, alarm configuration, and the details blob. If you would rather keep
coordinates admin-only, say so and I will gate the map and the suggestion off
instead — but then both features come out of the technician app.
