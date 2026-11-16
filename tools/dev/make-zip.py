#!/usr/bin/env python3
"""配布用の zip を作る。

日本語のファイル名を含むので、名前が UTF-8 であることを示す印（汎用フラグのビット 11）を必ず付ける。
この印がないと、Windows のエクスプローラーで展開したときにファイル名が文字化けし、文書どうしのリンクも切れる。
Python の zipfile は、ASCII 以外の名前にこの印を自動で付ける。作成後に全項目を読み直して確かめる。

    python3 tools/dev/make-zip.py <出力.zip> <zip 内の最上位フォルダ名> <入れるパス>...
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
            src, _, arc = p.partition('=')  # 「元のパス=zip 内の名前」で名前を変えられる
            add(zf, src, top + '/' + (arc or os.path.basename(src.rstrip('/'))))
    # 検証: ASCII 以外の名前には、すべて UTF-8 の印が付いていること
    with zipfile.ZipFile(out) as zf:
        bad = [i.filename for i in zf.infolist() if any(ord(c) > 127 for c in i.filename) and not i.flag_bits & 0x800]
        if bad or zf.testzip() is not None:
            print('zip の検証に失敗しました:', bad[:5])
            return 1
        names = zf.namelist()
    non_ascii = sum(1 for n in names if any(ord(c) > 127 for c in n))
    print('%s: %d 項目（日本語などの名前 %d 件、すべて UTF-8 の印あり）、%d バイト' % (out, len(names), non_ascii, os.path.getsize(out)))
    return 0


if __name__ == '__main__':
    sys.exit(main())
