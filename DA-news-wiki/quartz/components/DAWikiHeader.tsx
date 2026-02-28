import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { pathToRoot } from "../util/path"
// @ts-ignore
import darkmodeScript from "./scripts/darkmode.inline"

// wiki.html 헤더를 1:1 복제한 커스텀 상단 헤더 컴포넌트
const DAWikiHeader: QuartzComponent = ({ fileData }: QuartzComponentProps) => {
  // Quartz 페이지(wiki/...)에서 바깥 바탕(DA-news-hub/)으로 나가기 위한 경로 계산
  const baseDir = pathToRoot(fileData.slug!)
  const rootDir = `${baseDir}/../`

  return (
    <header class="da-wiki-header">
      {/* 좌측: 로고 + 사이트명 */}
      <div class="da-header-left">
        <a href={`${rootDir}index.html`} class="da-hamburger-btn" aria-label="메인 허브로 돌아가기">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="4" x2="20" y1="12" y2="12" /><line x1="4" x2="20" y1="6" y2="6" /><line x1="4" x2="20" y1="18" y2="18" />
          </svg>
        </a>
        <a href={`${rootDir}index.html?view=hub`} class="da-logo-link">
          <div class="da-logo-badge">DA</div>
          <span class="da-site-name">Purchase Intelligence</span>
        </a>
        <div class="da-header-divider">/</div>
        <span class="da-page-label">Product Wiki</span>
      </div>

      {/* 우측: 네비게이션 + 다크모드 */}
      <div class="da-header-right">
        <a href={`${rootDir}index.html?view=hub`} class="da-nav-btn da-nav-outline">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v2" />
            <path d="M4 22a2 2 0 0 1-2-2v-7l3-3 3 3v9" />
            <path d="M14 13h4" /><path d="M14 9h4" /><path d="M14 17h4" />
          </svg>
          News Hub
        </a>
        <a href={`${rootDir}dashboard_mod.html`} class="da-nav-btn da-nav-solid">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect width="7" height="9" x="3" y="3" rx="1" /><rect width="7" height="5" x="14" y="3" rx="1" />
            <rect width="7" height="9" x="14" y="12" rx="1" /><rect width="7" height="5" x="3" y="16" rx="1" />
          </svg>
          Dashboard
        </a>
        {/* 다크모드 버튼 – 기존 darkmode 스크립트 재사용 */}
        <button class="darkmode da-darkmode-btn" aria-label="테마 전환">
          <svg xmlns="http://www.w3.org/2000/svg" class="dayIcon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
          </svg>
          <svg xmlns="http://www.w3.org/2000/svg" class="nightIcon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
          </svg>
        </button>
      </div>
    </header>
  )
}

DAWikiHeader.beforeDOMLoaded = darkmodeScript

DAWikiHeader.css = `
/* ═══════════════════════════════════════════
   DA Wiki 글로벌 헤더 (wiki.html 1:1 복제)
   ═══════════════════════════════════════════ */
.da-wiki-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  height: 56px;
  background: #0033A0;
  color: white;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  box-shadow: 0 2px 16px rgba(0, 51, 160, 0.35);
}

/* 헤더가 있으므로 페이지 상단 여백 추가 */
body {
  padding-top: 56px !important;
}

/* Quartz 기본 상단 spacing 보정 */
.page > #quartz-body .sidebar.left,
.page > #quartz-body .sidebar.right {
  top: 56px !important;
  height: calc(100vh - 56px) !important;
}

.da-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.da-logo-link {
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  color: white;
  opacity: 0.95;
  transition: opacity 0.15s;
}
.da-logo-link:hover { opacity: 1; }

.da-logo-badge {
  background: white;
  color: #0033A0;
  font-size: 10px;
  font-weight: 900;
  padding: 2px 6px;
  border-radius: 4px;
  letter-spacing: 0.05em;
}

.da-site-name {
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
}

.da-header-divider {
  color: rgba(255,255,255,0.4);
  font-size: 12px;
}

.da-page-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: rgba(255,255,255,0.8);
}

.da-header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.da-nav-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 99px;
  font-size: 10px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  text-decoration: none;
  transition: all 0.15s;
  white-space: nowrap;
}

.da-nav-outline {
  background: rgba(255,255,255,0.12);
  color: white;
  border: none;
}
.da-nav-outline:hover {
  background: rgba(255,255,255,0.22);
  color: white;
}

.da-nav-solid {
  background: #3b82f6;
  color: white;
  border: none;
}
.da-nav-solid:hover {
  background: #60a5fa;
  color: white;
}

.da-darkmode-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 6px;
  border-radius: 99px;
  color: rgba(255,255,255,0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}
.da-darkmode-btn:hover {
  background: rgba(255,255,255,0.12);
  color: white;
}

/* 다크모드 아이콘 전환 */
.da-darkmode-btn .nightIcon { display: none; }
[saved-theme="dark"] .da-darkmode-btn .dayIcon { display: none; }
[saved-theme="dark"] .da-darkmode-btn .nightIcon { display: block; }

/* 다크모드 헤더 색상 유지 */
[saved-theme="dark"] .da-wiki-header {
  background: #001a6b;
  box-shadow: 0 2px 24px rgba(0,0,0,0.4);
}

/* 모바일 hide */
@media (max-width: 600px) {
  .da-site-name, .da-header-divider, .da-page-label { display: none; }
  .da-nav-btn span { display: none; }
}
`

export default (() => DAWikiHeader) satisfies QuartzComponentConstructor
