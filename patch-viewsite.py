#!/usr/bin/env python3
"""
Wires <SitePhotos /> into the existing View site page.

This edits YOUR ViewSite.jsx in place rather than shipping a copy of it. The
copy in this zip's source tree is from an older export, and overwriting the live
file would silently take any newer work with it -- the photos section is three
lines out of two hundred and thirty, so a patch is the honest way to deliver it.

Safe to run twice: if SitePhotos is already imported it changes nothing and
exits 0. The original is kept as ViewSite.jsx.bak.
"""
import re
import shutil
import sys
from pathlib import Path

TARGET = Path("app/mainapp/sites/[id]/components/ViewSite.jsx")
IMPORT = 'import SitePhotos from "./SitePhotos.jsx";'
ELEMENT = "<SitePhotos siteId={id} />"


def fail(msg):
    print(f"patch-viewsite: {msg}", file=sys.stderr)
    sys.exit(1)


def main():
    if not TARGET.exists():
        fail(f"{TARGET} not found -- run this from the project root.")

    src = TARGET.read_text(encoding="utf-8")

    if "SitePhotos" in src:
        print("patch-viewsite: already wired, nothing to do.")
        return

    # --- 1. the import -------------------------------------------------------
    # After the LAST existing import, so it cannot land above "use client".
    imports = list(re.finditer(r'(?m)^import .*?;\s*$', src))
    if not imports:
        fail("no import statements found -- is this the right file?")
    at = imports[-1].end()
    src = src[:at] + "\n" + IMPORT + src[at:]

    # --- 2. the empty state --------------------------------------------------
    # Preferred: the exact placeholder line.
    placeholder = re.compile(
        r'<div\s+className=\{styles\.empty\}>\s*No photos uploaded yet\.?\s*</div>'
    )
    src, n = placeholder.subn(ELEMENT, src)

    if n == 0:
        # Fallback: the first styles.empty div AFTER the "Site photos" heading,
        # in case the wording was changed.
        head = src.find("Site photos")
        if head == -1:
            fail(
                "couldn't find the photos section. Add this inside it by hand:\n"
                f"  {IMPORT}\n  {ELEMENT}"
            )
        tail = re.search(r'<div\s+className=\{styles\.empty\}>.*?</div>', src[head:], re.S)
        if not tail:
            fail(
                "found the 'Site photos' heading but no empty-state div to replace.\n"
                f"Add {ELEMENT} inside that section by hand."
            )
        start, end = head + tail.start(), head + tail.end()
        print(f"patch-viewsite: replacing changed placeholder -> {src[start:end][:60]!r}")
        src = src[:start] + ELEMENT + src[end:]
        n = 1

    shutil.copy2(TARGET, TARGET.with_suffix(".jsx.bak"))
    TARGET.write_text(src, encoding="utf-8")
    print(f"patch-viewsite: wired SitePhotos into {TARGET} (backup: ViewSite.jsx.bak)")


if __name__ == "__main__":
    main()
