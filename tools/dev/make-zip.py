#!/usr/bin/env python3
"""Creates the distribution zip.

The zip contains Japanese file names, so the flag that marks names as UTF-8 (bit 11 of the general purpose flags)
must always be set. Without it, Windows Explorer garbles the file names when extracting, and links between documents break.
Python's zipfile sets this flag automatically for non-ASCII names. After creating the zip, all entries are read back to check.

    python3 tools/dev/make-zip.py <output.zip> <top-level folder name in the zip> <path to add>...
"""
import os
import sys
import zipfile


def add(zf, src, arc):
    if os.path.isdir(src):
        for name in sorted(os.listdir(src)):
            if name in ('.DS_Store', 'Thumbs.db'):
                continue
            add(zf, os.path.join(src, name), arc + '/' + name)
    else:
        zf.write(src, arc)


def main():
    if len(sys.argv) < 4:
        print(__doc__)
        return 2
    out, top, paths = sys.argv[1], sys.argv[2], sys.argv[3:]
    if os.path.exists(out):
        os.remove(out)
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
        for p in paths:
            src, _, arc = p.partition('=')  # "source path=name in zip" renames the entry
            add(zf, src, top + '/' + (arc or os.path.basename(src.rstrip('/'))))
    # Check: every non-ASCII name has the UTF-8 flag
    with zipfile.ZipFile(out) as zf:
        bad = [i.filename for i in zf.infolist() if any(ord(c) > 127 for c in i.filename) and not i.flag_bits & 0x800]
        if bad or zf.testzip() is not None:
            print('zip verification failed:', bad[:5])
            return 1
        names = zf.namelist()
    non_ascii = sum(1 for n in names if any(ord(c) > 127 for c in n))
    print('%s: %d entries (%d with non-ASCII names such as Japanese, all flagged as UTF-8), %d bytes' % (out, len(names), non_ascii, os.path.getsize(out)))
    return 0


if __name__ == '__main__':
    sys.exit(main())
