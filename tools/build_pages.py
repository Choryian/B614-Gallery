#!/usr/bin/env python3
"""
B614 앨범 빌드 — PDF 원본 페이지를 웹 뷰어용 이미지로 렌더한다.

  p1        → assets/cover/   (입장 화면 배경)
  p2        → 건너뜀 (상영관 인트로가 이 연표를 이미 소비함)
  p3 ~ p72  → assets/pages/   (앨범 본문 70장)
              + content/pages.json (순번·원본페이지·연도·날짜)

사용:
  python build_pages.py --check     검증만, 파일은 쓰지 않음
  python build_pages.py             렌더 + pages.json 생성
"""

import argparse
import io
import json
import re
import sys
from pathlib import Path

import fitz  # PyMuPDF
from PIL import Image

SITE = Path(__file__).resolve().parent.parent        # 저장소 루트 = 배포 루트
# 원본 PDF는 저장소 밖에 둔다(16MB). 없으면 --pdf 로 경로를 준다.
PDF = SITE.parent / "source" / "B614_album_2nd_edition.pdf"
ROOT = SITE

COVER_PAGE = 1          # 표지
INTRO_PAGE = 2          # 연표 — 상영관 인트로가 대신함
FIRST_ALBUM_PAGE = 3    # 본문 시작

WEBP_DPI, WEBP_Q = 200, 80    # 기본 (2000x1500)
JPEG_DPI, JPEG_Q = 150, 82    # 구형 기기 폴백 (1500x1125)

# "2004.10.19" / "2003.2.22(목)" 처럼 온점으로 이어진 완전한 날짜
RE_FULL_DATE = re.compile(r"(20[0-2]\d)\s*\.\s*(\d{1,2})\s*\.\s*(\d{1,2})")
# "2012년어느여름" 처럼 연도만 있는 경우
RE_YEAR_ONLY = re.compile(r"(20[0-2]\d)\s*년")


def page_text(page) -> str:
    """PDF 추출 텍스트는 공백이 소실돼 있어 표시용으로는 쓸 수 없다. 날짜 판독 전용."""
    return " ".join(page.get_text().split())


def read_meta(doc):
    """각 본문 페이지의 연도·날짜를 판독한다.

    같은 모임이 여러 페이지에 걸치면 뒤 페이지엔 날짜가 없다(p061 등).
    그런 페이지는 직전 페이지 값을 승계한다.

    p070은 커뮤니티 개설 연표라 연도가 4개(2000/2007/2012/2018) 등장한다.
    연도만 있는 경우는 **단일 연도일 때만** 채택해 이런 페이지에 오판정이 나지 않게 한다.
    """
    meta = []
    last_year, last_date = None, None

    for n in range(FIRST_ALBUM_PAGE, doc.page_count + 1):
        text = page_text(doc[n - 1])
        year = date = None

        m = RE_FULL_DATE.search(text)
        if m:
            y, mo, d = (int(x) for x in m.groups())
            year, date = y, f"{y}.{mo}.{d}"
        else:
            years = {int(y) for y in RE_YEAR_ONLY.findall(text)}
            if len(years) == 1:
                year = years.pop()

        if year is None:
            year, date = last_year, last_date
        elif date is None and year == last_year:
            date = last_date

        last_year, last_date = year, date
        meta.append(
            {
                "i": n - FIRST_ALBUM_PAGE + 1,
                "page": n,
                "src": f"p{n:03d}",
                "year": year,
                "date": date,
            }
        )
    return meta


def render(page, dpi):
    pm = page.get_pixmap(dpi=dpi)
    return Image.frombytes("RGB", (pm.width, pm.height), pm.samples)


def save_pair(page, out_dir, stem):
    """WebP(기본) + JPEG(폴백) 한 쌍을 저장하고 바이트 수를 돌려준다."""
    out_dir.mkdir(parents=True, exist_ok=True)
    webp = out_dir / f"{stem}.webp"
    jpg = out_dir / f"{stem}.jpg"
    render(page, WEBP_DPI).save(webp, "WEBP", quality=WEBP_Q, method=5)
    render(page, JPEG_DPI).save(jpg, "JPEG", quality=JPEG_Q, optimize=True, progressive=True)
    return webp.stat().st_size, jpg.stat().st_size


def check(meta, doc):
    """렌더 전에 판독 결과가 말이 되는지 확인한다."""
    problems = []

    expected = doc.page_count - FIRST_ALBUM_PAGE + 1
    if len(meta) != expected:
        problems.append(f"항목 수 {len(meta)} != 기대 {expected}")

    missing = [m["src"] for m in meta if m["year"] is None]
    if missing:
        problems.append(f"연도 판독 실패: {', '.join(missing)}")

    # 앨범은 시간순이므로 연도가 거꾸로 가면 판독 오류다
    for a, b in zip(meta, meta[1:]):
        if a["year"] and b["year"] and b["year"] < a["year"]:
            problems.append(f"연도 역행: {a['src']}({a['year']}) → {b['src']}({b['year']})")

    firsts = {}
    for m in meta:
        firsts.setdefault(m["year"], m)

    print(f"본문 {len(meta)}장 (p{FIRST_ALBUM_PAGE:03d}~p{doc.page_count:03d})")
    print(f"연도 {len(firsts)}종: {', '.join(str(y) for y in sorted(firsts))}")
    print("\n연도별 첫 페이지")
    for y in sorted(firsts):
        m = firsts[y]
        print(f"  {y} → {m['src']} (순번 {m['i']:2d}) {m['date'] or '(날짜 없음)'}")

    gaps = [y for y in range(min(firsts), max(firsts) + 1) if y not in firsts]
    if gaps:
        print(f"\n원본에 없는 연도(유실): {', '.join(map(str, gaps))} — 연도 바에 비활성 표시")

    undated = [m["src"] for m in meta if not m["date"]]
    if undated:
        print(f"날짜 없이 연도만: {', '.join(undated)}")

    if problems:
        print("\n[문제]")
        for p in problems:
            print("  ! " + p)
        return False
    print("\n검증 통과")
    return True


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true", help="검증만 수행, 파일 쓰지 않음")
    ap.add_argument("--pdf", type=Path, default=PDF)
    args = ap.parse_args()

    if not args.pdf.exists():
        sys.exit(f"원본 PDF 없음: {args.pdf}")

    doc = fitz.open(args.pdf)
    meta = read_meta(doc)

    ok = check(meta, doc)
    if args.check:
        sys.exit(0 if ok else 1)
    if not ok:
        sys.exit("검증 실패 — 렌더를 중단한다")

    print(f"\n렌더 시작  webp {WEBP_DPI}dpi q{WEBP_Q} / jpeg {JPEG_DPI}dpi q{JPEG_Q}")

    w_tot = j_tot = 0
    cw, cj = save_pair(doc[COVER_PAGE - 1], SITE / "assets" / "cover", "p001")
    w_tot, j_tot = w_tot + cw, j_tot + cj
    print(f"  표지 p001  webp {cw // 1024}KB / jpg {cj // 1024}KB")

    pages_dir = SITE / "assets" / "pages"
    for m in meta:
        w, j = save_pair(doc[m["page"] - 1], pages_dir, m["src"])
        w_tot, j_tot = w_tot + w, j_tot + j
        if m["i"] % 10 == 0 or m["i"] == len(meta):
            print(f"  {m['i']:2d}/{len(meta)}  {m['src']}  webp {w // 1024}KB")

    out = SITE / "content" / "pages.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(meta, ensure_ascii=False, indent=1), encoding="utf-8")

    print(f"\n완료  webp {w_tot // 1048576}MB + jpg {j_tot // 1048576}MB = {(w_tot + j_tot) // 1048576}MB")
    print(f"      {out.relative_to(ROOT)} ({len(meta)}건)")


if __name__ == "__main__":
    main()
