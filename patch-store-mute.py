#!/usr/bin/env python3
"""
Routes store.js's alarm notifications through the mute guard.

Only the module SPECIFIER changes:

    import { notifyAlarmRaised, notifyDisturbanceEarly } from "../notify/alarmNotify.js";
    import { notifyAlarmRaised, notifyDisturbanceEarly } from "./muteGuard.js";

The imported names are left exactly as they are, however many there are, because
`muteGuard` re-exports everything `alarmNotify` exports and overrides only the
notifying functions. The first version of this script matched a single-name
import and refused on a real file that imported two — correct behaviour for a
patcher, but it means the rule has to be about the specifier, not the names.

Safe to run twice. The original is kept as store.js.bak.
"""
import re
import shutil
import sys
from pathlib import Path

TARGET = Path("app/api/apiUtils/ingest/store.js")

# The import to redirect, however its braces are filled.
IMPORT = re.compile(
    r'(import\s*\{[^}]*\bnotifyAlarmRaised\b[^}]*\}\s*from\s*[\'"])'
    r'([^\'"]*alarmNotify\.js)'
    r'([\'"];?)'
)


def fail(message):
    print(f"patch-store-mute: {message}", file=sys.stderr)
    sys.exit(1)


def main():
    if not TARGET.exists():
        fail(f"{TARGET} not found — run this from the project root.")

    src = TARGET.read_text(encoding="utf-8")

    if "muteGuard" in src:
        print("patch-store-mute: already routed through the guard, nothing to do.")
        return

    match = IMPORT.search(src)
    if not match:
        fail(
            "no `notifyAlarmRaised` import found. Change its module by hand:\n"
            '  from "../notify/alarmNotify.js"  ->  from "./muteGuard.js"'
        )

    names = re.search(r'\{([^}]*)\}', match.group(1)).group(1)
    names = [n.strip() for n in names.split(',') if n.strip()]

    src = IMPORT.sub(lambda m: m.group(1) + "./muteGuard.js" + m.group(3), src, count=1)
    calls = len(re.findall(r'\bnotify\w*\s*\(', src))

    shutil.copy2(TARGET, TARGET.with_suffix(".js.bak"))
    TARGET.write_text(src, encoding="utf-8")

    print(f"patch-store-mute: redirected {len(names)} import(s) — {', '.join(names)}")
    print(f"                  {calls} notify call site(s) now go through the guard.")
    print(f"                  Backup: {TARGET.name}.bak")

    guarded = {"notifyAlarmRaised", "notifyDisturbanceEarly"}
    passthrough = [n for n in names if n not in guarded]
    if passthrough:
        # Not a failure: `export *` forwards them untouched. But if one of them
        # also sends an alert, it is NOT muted, and that should be said out loud
        # rather than discovered when a muted device rings someone at 3am.
        print(f"\n  NOTE: {', '.join(passthrough)} pass through unguarded.")
        print("        If any of those send alerts, add a wrapper in muteGuard.js.")


if __name__ == "__main__":
    main()
