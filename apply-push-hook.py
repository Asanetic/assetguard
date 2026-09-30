#!/usr/bin/env python3
"""
Applies the push hook to app/api/apiUtils/dataControl/alarms.js.

Run it from the project root:

    python3 apply-push-hook.py

WHY A SCRIPT RATHER THAN A SED ONE-LINER. The line being changed,
`return rows[0] || null;`, appears SIX times in alarms.js — twice inside
`insertLiveAlarm` and four more times in other functions that must not be
touched. A global replace would wire the push channel to alarm reads and
acknowledgements as well, which is both wrong and very hard to notice.

So this finds `insertLiveAlarm`, bounds it at the next top-level `export`, and
edits only inside that window. If it does not find exactly two occurrences
there it changes nothing and says so, rather than guessing.

Safe to run twice: it detects its own previous work and exits.
A timestamp-free backup is written to alarms.js.bak first.
"""
import re
import shutil
import sys
from pathlib import Path

TARGET = Path("app/api/apiUtils/dataControl/alarms.js")
OLD = "return rows[0] || null;"
NEW = "return raised(rows[0]);"
ANCHOR = "export async function insertLiveAlarm"

HELPER = '''/**
 * Every alarm this function actually RAISES, offered to the push channel.
 *
 * `insertLiveAlarm` is the seam because it is the only place that knows the
 * difference between raising an alarm and de-duping one — a de-duped alarm
 * returns null, and a null never reaches here.
 *
 * Note it does NOT distinguish simulated traffic: `mainapp/ingest/simulate`
 * calls `resolveAndStore`, which lands here like any device packet, and the
 * insert stamps `source='device'` on both. Use PUSH_ENABLED=false when
 * exercising the simulator on a server that has Firebase configured.
 *
 * Dynamically imported and never awaited. The dynamic import breaks what would
 * otherwise be a cycle (alarms -> alarmPush -> alarmNotify -> alarms), and not
 * awaiting means a slow or failing FCM call cannot delay a telemetry packet or
 * throw into the ingest path.
 */
function raised(row) {
  if (row) {
    import("../notify/alarmPush.js")
      .then((m) => m.pushAlarmRaised(row, {}))
      .catch((e) => console.error("[push] hook:", e?.message || e));
  }
  return row || null;
}

'''


def fail(message):
    print(f"NOT APPLIED — {message}")
    print("Nothing was changed. Apply section 3 of PUSH-SETUP.md by hand.")
    sys.exit(1)


def main():
    if not TARGET.exists():
        fail(f"{TARGET} not found. Run this from the project root.")

    source = TARGET.read_text(encoding="utf-8")

    if "function raised(row)" in source and NEW in source:
        count = source.count(NEW)
        print(f"Already applied — {count} call site(s) already use raised(). Nothing to do.")
        return

    start = source.find(ANCHOR)
    if start == -1:
        fail(f"could not find `{ANCHOR}` in {TARGET}.")

    # The window ends at the next top-level declaration, so the four
    # occurrences in later functions are outside it and cannot be touched.
    rest = source[start + len(ANCHOR):]
    match = re.search(r"\n(?:export |function )", rest)
    end = start + len(ANCHOR) + (match.start() if match else len(rest))

    body = source[start:end]
    found = body.count(OLD)
    if found != 2:
        fail(
            f"expected 2 occurrences of `{OLD}` inside insertLiveAlarm, found {found}. "
            "Your copy of alarms.js differs from the one this was written against."
        )

    patched_body = body.replace(OLD, NEW)
    result = source[:start] + HELPER + patched_body + source[end:]

    shutil.copyfile(TARGET, TARGET.with_suffix(".js.bak"))
    TARGET.write_text(result, encoding="utf-8")

    print(f"Applied. Backup at {TARGET.with_suffix('.js.bak')}")
    print(f"  helper inserted above {ANCHOR}")
    print(f"  2 return sites rewritten inside insertLiveAlarm")
    print(f"  {source.count(OLD) - 2} occurrence(s) elsewhere left untouched, as intended")


if __name__ == "__main__":
    main()
