const examples = [
    "③ 통상·정책팀과 협의해 향후 232·301 조사 대상(철강, 알루미늄, 자동차·부품, EV, 배터리 등)과 DA 연관 품목을 매핑하고, 신규 관세 발생 시 즉시 반영 가능한 ‘BOM 교체候補 리스트’를 사전 준비 (우선순위: 중, 기한: 2026-04-30)., , , TradeComplianceHub+",
    "① 첫 번째 액션 (우선순위: 상, 기한: 2026-03-31) residue here",
    "② 두 번째 액션 (우선순위: 하, 기한: 2026-05-20) !!!",
    "③ (우선순위: 중, 기한: 2026-04-30). \n④ 다음 액션"
];

const titleExamples = [
    "Roborock Saros 20, StarSight 2.0·36,000Pa·Matter로 ‘집을 해석하는’ 차세대 로봇청소기 상용화tomsguide+2",
    "중국 가전 소비 트렌드 백서, AI·그린·로봇화가 2026년 중국 생활가전 성장의 핵심 엔진으로 부상people+2",
    "정상적인 제목입니다"
];

function cleanTitle(text) {
    if (!text) return text;
    // same regex as summary residue removal for sources
    return text.replace(/\s*[a-zA-Z][a-zA-Z0-9\.\-]*\+\d+/g, '').trim();
}

function cleanSummary(text) {
    if (!text) return text;
    // simplify circle handling for test
    text = text.replace(/\s*([①②③④⑤⑥⑦⑧⑨⑩])/g, '\n  $1');
    
    // ACTION RESIDUE REMOVAL
    // Match (우선순위: ..., 기한: ...) and everything after it UNLESS it's a newline or another circle
    text = text.replace(/(\(우선순위:[^)]+기한:[^)]+\))[^①②③④⑤⑥⑦⑧⑨⑩\n]*/g, '$1');
    
    return text.trim();
}

console.log("=== Summary Test ===");
examples.forEach(ex => {
    console.log("Original:", ex);
    console.log("Cleaned: ", cleanSummary(ex));
    console.log("-------------------");
});

console.log("\n=== Title Test ===");
titleExamples.forEach(ex => {
    console.log("Original:", ex);
    console.log("Cleaned: ", cleanTitle(ex));
    console.log("-------------------");
});
