"""
LME Price Scraper for Korea Nonferrous Metal Association
Fetches daily spot prices (Cu, Al, Zn, Pb, Ni, Sn) and saves to data/lme_prices.json

Usage:
  python crawl_lme.py          # Daily mode: fetch latest page only
  python crawl_lme.py --full   # Full mode: fetch all 290 pages of history
"""

import requests
import json
import os
import sys
import time

BASE_URL = "https://www.nonferrous.or.kr/stats/?act=sub3&page={}"
DATA_PATH = "data/lme_prices.json"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8",
    "Referer": "https://www.nonferrous.or.kr/",
}


def parse_html(html):
    """Parse LME table rows from HTML using string split (no regex needed)."""
    rows = []
    for tr_block in html.split("</tr>"):
        if "<td" not in tr_block:
            continue
        cells = []
        for td_block in tr_block.split("</td>"):
            last_gt = td_block.rfind(">")
            if last_gt == -1:
                continue
            # Strip tags inside cell (e.g. <td class="sp">)
            cell_text = td_block[last_gt + 1:].strip()
            if cell_text:
                cells.append(cell_text)

        # Valid data row: 7 cells, first cell starts with a 4-digit year
        if len(cells) >= 7 and len(cells[0]) >= 4 and cells[0][:4].isdigit():
            try:
                rows.append({
                    "date": cells[0],
                    "cu":   float(cells[1].replace(",", "")),
                    "al":   float(cells[2].replace(",", "")),
                    "zn":   float(cells[3].replace(",", "")),
                    "pb":   float(cells[4].replace(",", "")),
                    "ni":   float(cells[5].replace(",", "")),
                    "sn":   float(cells[6].replace(",", "")),
                })
            except (ValueError, IndexError):
                pass
    return rows


def fetch_page(session, page):
    """Fetch and parse a single page. Returns list of row dicts."""
    url = BASE_URL.format(page)
    try:
        resp = session.get(url, timeout=20)
        resp.raise_for_status()
        return parse_html(resp.text)
    except Exception as exc:
        print(f"  ⚠️  Page {page} error: {exc}")
        return []


def load_existing():
    """Load existing JSON data if it exists."""
    if os.path.exists(DATA_PATH):
        with open(DATA_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


def save(all_data):
    """Save all data sorted by date."""
    all_data.sort(key=lambda x: x["date"])
    os.makedirs("data", exist_ok=True)
    with open(DATA_PATH, "w", encoding="utf-8") as f:
        json.dump(all_data, f, ensure_ascii=False, indent=2)


def main():
    full_mode = "--full" in sys.argv

    # Load what we already have
    existing_data = load_existing()
    existing_dates = {item["date"] for item in existing_data}
    print(f"기존 데이터: {len(existing_data)}건")

    session = requests.Session()
    session.headers.update(HEADERS)

    new_rows = []

    if full_mode:
        print("📚 전체 이력 수집 모드 (최대 290페이지)...")
        # Find total pages first (page 1 shows navigation)
        total_pages = 290
        for page in range(total_pages, 0, -1):
            print(f"  페이지 {page}/{total_pages} 수집 중...", end="\r")
            rows = fetch_page(session, page)
            for row in reversed(rows):
                if row["date"] not in existing_dates:
                    new_rows.append(row)
                    existing_dates.add(row["date"])
            time.sleep(0.3)  # 서버 부하 방지
        print()
    else:
        print("📅 일일 업데이트 모드 (최신 1~2 페이지)...")
        for page in [1, 2]:  # 최근 2페이지 확인 (주말/휴일 대비)
            rows = fetch_page(session, page)
            for row in reversed(rows):
                if row["date"] not in existing_dates:
                    new_rows.append(row)
                    existing_dates.add(row["date"])

    if new_rows:
        all_data = existing_data + new_rows
        save(all_data)
        print(f"✅ {len(new_rows)}건 신규 추가 → 전체 {len(all_data)}건 저장 완료")
    else:
        print("ℹ️  신규 데이터 없음 (이미 최신 상태)")


if __name__ == "__main__":
    main()
