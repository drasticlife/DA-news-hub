import { QuartzComponent, QuartzComponentConstructor } from "./types"
// @ts-ignore
import darkmodeScript from "./scripts/darkmode.inline"

// wiki.html 헤더를 1:1 복제한 커스텀 상단 헤더 컴포넌트
const DAWikiHeader: QuartzComponent = () => {
  // GitHub Actions 배포 환경인지 확인
  const isProd = process.env.GITHUB_ACTIONS === "true"
  // 로컬 개발 서버(localhost:8080)는 위키 폴더만 서빙하므로 홈페이지가 없습니다.
  // 따라서 로컬에서는 온라인 라이브 버전으로 넘어가도록 절대 주소를 사용합니다.
  const siteRoot = isProd ? "/DA-news-hub" : "https://drasticlife.github.io/DA-news-hub"

  return (
    <header class="da-wiki-header">
      {/* 좌측: 로고 + 사이트명 */}
      <div class="da-header-left">
        <button class="da-hamburger-btn" aria-label="메인 허브 메뉴 열기" id="mobile-menu-btn" data-router-ignore="true">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="4" x2="20" y1="12" y2="12" /><line x1="4" x2="20" y1="6" y2="6" /><line x1="4" x2="20" y1="18" y2="18" />
          </svg>
        </button>
        <a href={`${siteRoot}/index.html?view=hub`} class="da-logo-link" data-router-ignore="true">
          <div class="da-logo-badge">DA</div>
          <span class="da-site-name">Purchase Intelligence</span>
        </a>
        <div class="da-header-divider">/</div>
        <span class="da-page-label">Product Wiki</span>
      </div>

      {/* 우측: 네비게이션 + 다크모드 */}
      <div class="da-header-right">
        <a href={`${siteRoot}/index.html?view=hub`} class="da-nav-btn da-nav-outline" data-router-ignore="true">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v2" />
            <path d="M4 22a2 2 0 0 1-2-2v-7l3-3 3 3v9" />
            <path d="M14 13h4" /><path d="M14 9h4" /><path d="M14 17h4" />
          </svg>
          News Hub
        </a>
        <a href={`${siteRoot}/dashboard_mod.html`} class="da-nav-btn da-nav-solid" data-router-ignore="true">
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

      {/* ── 글로벌 네비 드로어 (Wiki 내장형) ── */}
      <div id="mobile-drawer-overlay"></div>
      <div id="mobile-drawer">
        <div class="drawer-header">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ background: "#0033A0", color: "white", padding: "2px 6px", borderRadius: "4px", fontSize: "10px", fontWeight: "900", letterSpacing: "0.1em" }}>DA</div>
            <span style={{ fontWeight: "700", fontSize: "13px", color: "#0033A0", textTransform: "uppercase", letterSpacing: "0.03em" }}>Purchase Intel</span>
          </div>
          <button id="close-drawer-btn" style={{ padding: "4px", borderRadius: "8px", border: "none", background: "transparent", cursor: "pointer" }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div class="drawer-section-label">NAVIGATE</div>
        <nav class="drawer-nav-global">
          <a href={`${siteRoot}/index.html?view=hub`} class="gnav-item" data-router-ignore="true">
            <span class="gnav-icon" style={{ fontSize: "14px" }}>📰</span>
            <span class="gnav-text">News Hub</span>
          </a>
          <a href={`${siteRoot}/dashboard_mod.html`} class="gnav-item" data-router-ignore="true">
            <span class="gnav-icon" style={{ fontSize: "14px" }}>📊</span>
            <span class="gnav-text">Dashboard</span>
          </a>
          <a href={`${siteRoot}/dashboard_3d.html`} class="gnav-item" data-router-ignore="true">
            <span class="gnav-icon" style={{ fontSize: "14px" }}>🌐</span>
            <span class="gnav-text">3D Globe Briefing</span>
          </a>
          <a href={`${siteRoot}/wiki/index.html`} class="gnav-item gnav-active" data-router-ignore="true">
            <span class="gnav-icon" style={{ fontSize: "14px" }}>📖</span>
            <span class="gnav-text">Product Wiki</span>
            <span class="gnav-badge gnav-badge-new">NEW</span>
          </a>
        </nav>

        <div class="drawer-footer">
          <a href={`${siteRoot}/index.html`} class="gnav-login-btn" data-router-ignore="true" style={{ textDecoration: "none" }}>
            <span style={{ fontSize: "14px" }}>🔑</span> 메인 허브 (로그인)
          </a>
        </div>
      </div>
    </header>
  )
}

DAWikiHeader.beforeDOMLoaded = darkmodeScript
DAWikiHeader.afterDOMLoaded = `
  const btn = document.getElementById('mobile-menu-btn');
  const overlay = document.getElementById('mobile-drawer-overlay');
  const drawer = document.getElementById('mobile-drawer');
  const closeBtn = document.getElementById('close-drawer-btn');

  function toggleDrawer() {
    overlay.classList.toggle('open');
    drawer.classList.toggle('open');
    if (drawer.classList.contains('open')) {
      document.body.style.overflow = 'hidden'; // 스크롤 방지
    } else {
      document.body.style.overflow = '';
    }
  }

  function closeDrawer() {
    overlay.classList.remove('open');
    drawer.classList.remove('open');
    document.body.style.overflow = '';
  }

  if (btn) btn.addEventListener('click', toggleDrawer);
  if (overlay) overlay.addEventListener('click', closeDrawer);
  if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
`

DAWikiHeader.css = `
/* ═══════════════════════════════════════════
   DA Wiki 글로벌 헤더 (wiki.html 1:1 복제)
   ═══════════════════════════════════════════ */
.da-wiki-header {
  position: fixed;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  margin: 0 !important;
  z-index: 99999 !important;
  height: 56px;
  background-color: #0033A0 !important; /* 투명도 0으로 오버라이드 보장 */
  color: white;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  box-shadow: 0 2px 16px rgba(0, 51, 160, 0.5);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  transform: translateZ(0); /* 강제 GPU 렌더링으로 겹침 방지 */
}

/* 헤더가 있으므로 페이지 상단 여백 추가 */
body {
  padding-top: 56px !important;
}

#quartz-root {
  margin-top: 0 !important;
  padding-top: 56px !important;
}

/* Quartz 기본 상단 spacing 보정 */
.page > #quartz-body .sidebar.left,
.page > #quartz-body .sidebar.right {
  top: 56px !important;
  height: calc(100vh - 56px) !important;
}

.da-hamburger-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  color: white !important;
  opacity: 0.8 !important;
  transition: opacity 0.15s;
  cursor: pointer;
  text-decoration: none;
}
.da-hamburger-btn:hover {
  opacity: 1 !important;
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

/* ===== 모바일 드로어(Drawer) 사이드바 ===== */
#mobile-drawer-overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 100000;
  backdrop-filter: blur(2px);
}
#mobile-drawer-overlay.open {
  display: block;
}
#mobile-drawer {
  position: fixed;
  top: 0;
  left: -100%;
  width: 280px;
  height: 100%;
  background: white;
  z-index: 100001;
  transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow-y: auto;
  padding: 16px;
  box-shadow: 4px 0 24px rgba(0, 0, 0, 0.15);
  color: #1e293b;
}
[saved-theme="dark"] #mobile-drawer {
  background: #25282c;
  color: #e2e8f0;
}
#mobile-drawer.open {
  left: 0;
}
.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e2e8f0;
}
[saved-theme="dark"] .drawer-header {
  border-color: #3f444a;
}
.drawer-section-label {
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.18em;
  color: #94a3b8;
  text-transform: uppercase;
  padding: 0 4px;
  margin-bottom: 6px;
}
[saved-theme="dark"] .drawer-section-label {
  color: #4b5563;
}
.drawer-nav-global {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.gnav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 700;
  color: #1e293b;
  text-decoration: none;
  transition: background 0.18s, color 0.18s;
  position: relative;
}
[saved-theme="dark"] .gnav-item {
  color: #e2e8f0;
}
.gnav-item:hover {
  background: #eff6ff;
  color: #0033A0;
}
[saved-theme="dark"] .gnav-item:hover {
  background: #1e293b;
  color: #93c5fd;
}
.gnav-active {
  background: #eff6ff;
  color: #0033A0 !important;
}
[saved-theme="dark"] .gnav-active {
  background: #1e3a5f;
  color: #93c5fd !important;
}
.gnav-icon {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f1f5f9;
  border-radius: 7px;
  flex-shrink: 0;
}
[saved-theme="dark"] .gnav-icon {
  background: #2d3748;
}
.gnav-active .gnav-icon {
  background: #dbeafe;
  color: #0033A0;
}
.gnav-text {
  flex: 1;
}
.gnav-badge {
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.08em;
  padding: 2px 7px;
  border-radius: 99px;
  background: #e2e8f0;
  color: #64748b;
}
.gnav-badge-new {
  background: #fef3c7;
  color: #d97706;
}
.drawer-footer {
  margin-top: auto;
  padding-top: 16px;
  border-top: 1px solid #e2e8f0;
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
[saved-theme="dark"] .drawer-footer {
  border-color: #3f444a;
}
.gnav-login-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 9px 12px;
  border-radius: 8px;
  border: none;
  background: #f0fdf4;
  color: #16a34a;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s;
  text-align: left;
}
.gnav-login-btn:hover {
  background: #dcfce7;
}
`

export default (() => DAWikiHeader) satisfies QuartzComponentConstructor
