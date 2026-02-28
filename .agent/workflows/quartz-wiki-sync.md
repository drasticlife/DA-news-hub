---
description: Obsidian에서 Quartz wiki 콘텐츠 작성 후 반영하는 방법
---

## 옵시디언 → Quartz 자동 동기화 워크플로우

### 구조 설명
```
옵시디언 볼트 (Moon Life Planner)
  └── 04. Resources/생활가전제품 WIKI/
           ↕ (Junction 심볼릭 링크)
DA-news-wiki/content/wiki/
  └── (Quartz 빌드 대상)
```

`DA-news-wiki/content/wiki`가 옵시디언 폴더에 **Junction(심볼릭 링크)**으로 연결되어있어,  
옵시디언에서 파일을 저장하면 Quartz content 폴더에 **즉시 반영**됩니다.

---

## 개발(로컬) 모드 — 실시간 반영

// turbo
### 1. Quartz 개발 서버 시작 (VS Code 터미널에서)
```powershell
cd C:\Users\drast\Documents\DA-news-hub\DA-news-wiki
npx quartz build --serve
```

→ `http://localhost:8080` 에서 확인 가능  
→ 옵시디언에서 파일 저장 시 **자동으로 브라우저 새로고침**

---

## 배포 모드 — GitHub Pages or 파일 배포

// turbo
### 2. 프로덕션 빌드 (public 폴더 생성)
```powershell
cd C:\Users\drast\Documents\DA-news-hub\DA-news-wiki
npx quartz build
```

→ `DA-news-wiki/public/` 폴더에 정적 사이트 생성  
→ 이 폴더를 GitHub Pages나 서버에 업로드하면 배포 완료

---

## 새 문서 추가하는 방법 (옵시디언에서)

1. `Moon Life Planner/04. Resources/생활가전제품 WIKI/` 안에 원하는 카테고리 폴더에 `.md` 파일 생성
2. `DAWikiSidebar.tsx`에 새 항목 추가 (파일명 기준으로 자동 탐색)
3. 파일 저장 → serve 모드에서 즉시 반영

### 사이드바에 새 항목 추가
`DA-news-wiki/quartz/components/DAWikiSidebar.tsx`를 열어 해당 카테고리에 항목 추가:
```typescript
{ name: "새항목 이름", fileName: "새항목.md의파일명(확장자제외)", icon: "🆕" },
```
