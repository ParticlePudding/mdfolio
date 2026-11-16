#!/usr/bin/env python3
"""ソース中に不可視文字・制御文字が紛れ込んでいないかを調べる（開発時の確認用）。"""
import sys
bad = 0
for p in sys.argv[1:]:
    s = open(p, encoding='utf-8').read()
    for i, ch in enumerate(s):
        o = ord(ch)
        if (o < 0x20 and ch not in '\n\t') or o in (0x7f, 0xa0, 0x2028, 0x2029, 0xfeff, 0xfffd, 0x200b, 0x200c, 0x200d, 0x2060) or 0xd800 <= o <= 0xdfff or '\r' == ch:
            print('%s:%d: U+%04X' % (p, s.count('\n', 0, i) + 1, o)); bad += 1
print('checked %d file(s), %d problem(s)' % (len(sys.argv) - 1, bad))
sys.exit(1 if bad else 0)
