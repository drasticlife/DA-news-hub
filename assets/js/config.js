/* ================================================================
   DA News Hub - config.js
   Shared configuration constants used by both index.html and dashboard_mod.html
   ================================================================ */

// ===== API Endpoints =====
const GAS_URL =
  "https://script.google.com/macros/s/AKfycbz3JPX-l0el2AeczemnklBAlLVlZ4aINMm5hKsWgiElXoBojUz7a88_XfZtAQWpafEjlA/exec";

// [월별 분할] 뉴스 데이터 base URL
const GITHUB_NEWS_BASE =
  "https://raw.githubusercontent.com/drasticlife/DA-news-hub/main/news";

// 월별 파일 URL 생성 헬퍼
function getNewsUrl(yearMonth) {
  // yearMonth: "2026-M03" 형태
  return `${GITHUB_NEWS_BASE}/${yearMonth}.json`;
}

// news/index.json URL (월 목록)
const GITHUB_NEWS_INDEX_URL = `${GITHUB_NEWS_BASE}/index.json`;

// [하위 호환] 기존 변수명 유지 → 현재 달 파일로 자동 연결
const _now = new Date();
const _curMonthKey = `${_now.getFullYear()}-M${String(_now.getMonth() + 1).padStart(2, "0")}`;
const GITHUB_DATA_URL = getNewsUrl(_curMonthKey);

// ===== Supabase Configuration =====
const SUPABASE_URL = "https://plgvkrczrwxowyqrktyk.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsZ3ZrcmN6cnd4b3d5cXJrdHlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxOTAzNTQsImV4cCI6MjA4Nzc2NjM1NH0.4G0ZcjrHbXvPj_HjJZG0v5N38G1x_NtBMeSjmAjcFdQ";
