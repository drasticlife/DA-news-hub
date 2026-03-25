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
    """Fetch and parse a single page with retries."""
    url = BASE_URL.format(page)
    max_retries = 3
    for attempt in range(max_retries):
        try:
            resp = session.get(url, timeout=30)
            resp.raise_for_status()
            return parse_html(resp.text)
        except Exception as exc:
            if attempt < max_retries - 1:
                wait = (attempt + 1) * 5
                print(f"\n  ⚠️  Page {page} error: {exc}. {wait}초 후 재시도 ({attempt+1}/{max_retries})...")
                time.sleep(wait)
            else:
                print(f"\n  ❌ Page {page} failed after {max_retries} attempts.")
                return []


def load_existing():
    """Load existing JSON data if it exists."""
    if os.path.exists(DATA_PATH):
        try:
            with open(DATA_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except json.JSONDecodeError:
            return []
    return []


def save(all_data):
    """Save all data sorted by date, removing duplicates."""
    # Remove duplicates by date
    unique_data = {item["date"]: item for item in all_data}
    sorted_list = sorted(unique_data.values(), key=lambda x: x["date"])
    
    os.makedirs("data", exist_ok=True)
    with open(DATA_PATH, "w", encoding="utf-8") as f:
        json.dump(sorted_list, f, ensure_ascii=False, indent=2)


def main():
    full_mode = "--full" in sys.argv

    # Load what we already have
    all_data = load_existing()
    existing_dates = {item["date"] for item in all_data}
    print(f"기존 데이터: {len(all_data)}건")

    session = requests.Session()
    session.headers.update(HEADERS)

    if full_mode:
        print("📚 전체 이력 수집 모드 (최대 290페이지)...", flush=True)
        total_pages = 290
        new_count = 0
        print(f"  🚀 수집을 시작합니다. (대상: {total_pages}페이지)", flush=True)
        for page in range(total_pages, 0, -1):
            rows = fetch_page(session, page)
            added_in_page = 0
            if rows:
                for row in reversed(rows):
                    if row["date"] not in existing_dates:
                        all_data.append(row)
                        existing_dates.add(row["date"])
                        new_count += 1
                        added_in_page += 1
            
            # 10페이지마다 로그 출력 (GitHub Actions에서 진행 상황 확인용)
            if page % 10 == 0 or page == 1:
                print(f"  [진행상황] {page}/{total_pages} 페이지 완료 (신규 수집: {new_count}건)", flush=True)
            
            # 5페이지마다 중간 저장 (혹시 모를 중단 대비)
            if page % 5 == 0 and added_in_page > 0:
                save(all_data)
            
            time.sleep(1.5)  # 간격 늘림 (서버 차단 방지)
        print()
    else:
        print("📅 일일 업데이트 모드 (최근 1~3 페이지)...", flush=True)
        new_count = 0
        for page in [1, 2, 3]:
            rows = fetch_page(session, page)
            if rows:
                for row in reversed(rows):
                    if row["date"] not in existing_dates:
                        all_data.append(row)
                        existing_dates.add(row["date"])
                        new_count += 1
            time.sleep(1.0)

    if new_count > 0:
        save(all_data)
        print(f"✅ {new_count}건 신규 추가 → 전체 {len(all_data)}건 저장 완료", flush=True)
    else:
        print("ℹ️  신규 데이터 없음 (이미 최신 상태)", flush=True)


if __name__ == "__main__":
    main()
