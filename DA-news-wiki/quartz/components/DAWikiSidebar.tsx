import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { resolveRelative, FullSlug } from "../util/path"

// wiki.html의 사이드바 카테고리 메뉴를 1:1 복제한 컴포넌트
// allFiles를 사용해 실제 Quartz slug를 동적으로 탐색 (하드코딩 제거)
const DAWikiSidebar: QuartzComponent = ({ fileData, allFiles }: QuartzComponentProps) => {
  const currentSlug = fileData.slug ?? ""

  // 파일명으로 실제 slug 탐색 헬퍼
  const findSlug = (fileName: string): string => {
    const found = allFiles.find(
      (f) => f.slug?.split("/").pop()?.toLowerCase() === fileName.toLowerCase()
    )
    return found?.slug ?? ""
  }

  // wiki.html 카테고리 구조 (파일명으로 동적 탐색)
  const categories = [
    {
      label: "냉장·냉동",
      items: [
        { name: "냉장고", fileName: "냉장고", icon: "🌡" },
        { name: "냉매", fileName: "냉매", icon: "⚗" },
      ],
    },
    {
      label: "세탁·건조",
      items: [
        { name: "세탁기", fileName: "세탁기", icon: "💧" },
        { name: "건조기", fileName: "건조기", icon: "💨" },
      ],
    },
    {
      label: "공조·청정",
      items: [
        { name: "에어컨", fileName: "에어컨", icon: "❄" },
        { name: "공기청정기", fileName: "공기청정기", icon: "☁" },
      ],
    },
    {
      label: "조리·주방",
      items: [
        { name: "오븐·전자레인지", fileName: "오븐·전자레인지", icon: "🔥" },
        { name: "식기세척기", fileName: "식기세척기", icon: "✨" },
      ],
    },
    {
      label: "핵심 기술·소재",
      items: [
        { name: "압축기(Compressor)", fileName: "압축기", icon: "⚙" },
        { name: "모터·인버터", fileName: "모터·인버터", icon: "🔄" },
        { name: "PCM·강판 소재", fileName: "PCM·강판 소재", icon: "◈" },
      ],
    },
  ]

  return (
    <div class="da-wiki-sidebar-wrap">
      {/* 검색 */}
      <div class="da-wiki-search-wrap">
        <input
          type="text"
          class="da-wiki-search"
          placeholder="항목 검색..."
          id="da-sidebar-search"
        />
      </div>

      {/* 전체 보기 */}
      <div class="da-cat-title">카테고리</div>
      <a
        href={resolveRelative(fileData.slug!, "index" as FullSlug)}
        class={`da-cat-link${currentSlug === "index" ? " active" : ""}`}
      >
        <span class="da-cat-icon">≡</span>
        전체 보기
      </a>

      {/* 카테고리 목록 */}
      {categories.map((cat) => (
        <div class="da-category-group">
          <div class="da-cat-title" style="margin-top:14px;">{cat.label}</div>
          {cat.items.map((item) => {
            const slug = findSlug(item.fileName)
            const isActive = currentSlug === slug
            // 상대 경로 기반 동적 주소 생성
            const href = slug ? resolveRelative(fileData.slug!, slug as FullSlug) : "#"
            return (
              <a
                href={href}
                class={`da-cat-link${isActive ? " active" : ""}`}
              >
                <span class="da-cat-icon">{item.icon}</span>
                {item.name}
              </a>
            )
          })}
        </div>
      ))}
    </div>
  )
}

DAWikiSidebar.css = `
/* ═══════════════════════════════════════════
   DA Wiki 사이드바 (wiki.html 1:1 복제)
   ═══════════════════════════════════════════ */
.da-wiki-sidebar-wrap {
  width: 100%;
  padding: 8px 0;
}

/* 검색창 */
.da-wiki-search-wrap {
  margin-bottom: 16px;
}

.da-wiki-search {
  width: 100%;
  padding: 9px 12px 9px 32px;
  border: 1.5px solid #e2e8f0;
  border-radius: 8px;
  font-size: 13px;
  font-family: var(--bodyFont);
  background: white url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Ccircle cx='11' cy='11' r='8'/%3E%3Cpath d='m21 21-4.35-4.35'/%3E%3C/svg%3E") no-repeat 10px center;
  background-size: 14px;
  box-sizing: border-box;
  color: #374151;
  transition: border-color 0.15s, box-shadow 0.15s;
  outline: none;
}
.da-wiki-search:focus {
  border-color: #0033A0;
  box-shadow: 0 0 0 3px rgba(0,51,160,0.08);
}
.da-wiki-search::placeholder { color: #94a3b8; }

/* 카테고리 타이틀 */
.da-cat-title {
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.18em;
  color: #94a3b8;
  text-transform: uppercase;
  padding: 0 8px;
  margin: 6px 0 4px;
}

/* 카테고리 링크 */
.da-cat-link {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 12px;
  font-size: 13px;
  font-weight: 600;
  color: #475569;
  border-left: 3px solid transparent;
  text-decoration: none;
  transition: all 0.15s;
  border-radius: 0 6px 6px 0;
  cursor: pointer;
}
.da-cat-link:hover {
  background: #f1f5f9;
  color: #0033A0;
  border-left-color: #93c5fd;
}
.da-cat-link.active {
  background: #eff6ff;
  color: #0033A0;
  border-left-color: #0033A0;
  font-weight: 800;
}

.da-cat-icon {
  font-size: 13px;
  width: 18px;
  text-align: center;
  flex-shrink: 0;
}

/* 다크모드 */
[saved-theme="dark"] .da-wiki-search {
  background-color: #1e293b;
  border-color: #2d3748;
  color: #e2e8f0;
}
[saved-theme="dark"] .da-wiki-search:focus {
  border-color: #3b82f6;
}
[saved-theme="dark"] .da-cat-link {
  color: #94a3b8;
}
[saved-theme="dark"] .da-cat-link:hover {
  background: #1e293b;
  color: #93c5fd;
  border-left-color: #3b82f6;
}
[saved-theme="dark"] .da-cat-link.active {
  background: #1e3a5f;
  color: #60a5fa;
  border-left-color: #3b82f6;
}
[saved-theme="dark"] .da-cat-title {
  color: #4b5563;
}
`

export default (() => DAWikiSidebar) satisfies QuartzComponentConstructor
