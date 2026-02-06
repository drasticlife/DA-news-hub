// DA News Hub 통합 스크립트 (v15.3 - Strong Sync Version)
// -----------------------------------------------------------------
// [주요 변경] data.json과 data_new.json을 확실하게 순차적으로 업로드합니다.
// -----------------------------------------------------------------

var GITHUB_OWNER = "drasticlife";
var GITHUB_REPO = "DA-news-hub";
var GITHUB_BRANCH = "main";

// 설정값
var FOLDER_ID = "11OsMn-4WoNhg9QfxgraLQSJtkmG7PXTj";
var MAX_RUNTIME = 210000;
var DEFAULT_IMAGE_URL = "https://drasticlife.github.io/DA-news-hub/default_news_cover.jpg";
var SKIP_EXTENSIONS = [".pdf", ".xls", ".xlsx", ".doc", ".docx", ".zip", ".hwp", ".ppt", ".pptx"];
var SKIP_DOMAINS = ["cmegroup.com", "tradingeconomics.com", "lme.com", "bloomberg.com", "metal.com", "sunsirs.com", "ptonline.com", "reuters.com", "wsj.com", "investing.com", "marketwatch.com", "cnbc.com", "ft.com", "chosun.com", "yna.co.kr", "donga.com", "hani.co.kr", "mk.co.kr", "hankyung.com", "joins.com", "khan.co.kr"];

var CATEGORY_MAP_EN = {
"전략 시황": "Strategic Market",
"원자재": "Raw Materials",
"거시경제": "Macro/Policy",
"생산지역": "Production Region",
"경쟁사": "Competitors",
"신기술동향": "New Tech Trends",
"AI기술": "AI Tech",
"신기술": "New Tech"
};

function onOpen() {
SpreadsheetApp.getUi()
.createMenu("News Hub Tools")
.addItem("🚀 GitHub로 데이터 전송 (JSON)", "pushToGitHub")
.addSeparator()
.addItem("1. 이미지 가져오기 (기본)", "updateNewsImages")
.addItem("2. 영문 번역 실행", "translateEmptyEnglishFields")
.addSeparator()
.addItem("파일 권한 수정", "fixExistingImagePermissions")
.addToUi();
}

function doGet(e) {
var data = getSheetDataAsJson();
return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function getSheetDataAsJson() {
var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
var data = sheet.getDataRange().getValues();
if (data.length === 0) return [];
var headers = data[0];
var rows = data.slice(1);
return rows.map(function(row) {
var obj = {};
headers.forEach(function(header, index) {
if (header) {
if (row[index] instanceof Date) {
obj[header] = row[index].toISOString();
} else {
obj[header] = row[index];
}
}
});
return obj;
});
}

// [핵심] GitHub 데이터 전송 메인 함수
function pushToGitHub() {
var token = PropertiesService.getScriptProperties().getProperty("GITHUB_TOKEN");
if (!token) {
SpreadsheetApp.getUi().alert("GITHUB_TOKEN이 필요합니다. [프로젝트 설정]에서 추가해주세요.");
return;
}

var data = getSheetDataAsJson();
var content = JSON.stringify(data, null, 2);
var encodedContent = Utilities.base64Encode(Utilities.newBlob(content).getBytes());

// 1. data.json 업로드
var res1 = uploadSingleFile("data.json", encodedContent, token);
Utilities.sleep(1000); // 1초 휴식

// 2. data_new.json 업로드
var res2 = uploadSingleFile("data_new.json", encodedContent, token);

if (res1.success && res2.success) {
SpreadsheetApp.getActiveSpreadsheet().toast("data.json & data_new.json 업데이트 성공", "성공");
} else {
var msg = (res1.success ? "" : "data.json 실패: " + res1.message + "\n") + (res2.success ? "" : "data_new.json 실패: " + res2.message);
SpreadsheetApp.getUi().alert("일부 전송 실패:\n" + msg);
}
}

// 단일 파일 업로드 유틸리티
function uploadSingleFile(fileName, encodedContent, token) {
var url = "https://api.github.com/repos/" + GITHUB_OWNER + "/" + GITHUB_REPO + "/contents/" + fileName;
var sha = null;
try {
var res = UrlFetchApp.fetch(url + "?ref=" + GITHUB_BRANCH, {
"method": "get",
"headers": { "Authorization": "Bearer " + token },
"muteHttpExceptions": true
});
if (res.getResponseCode() === 200) {
sha = JSON.parse(res.getContentText()).sha;
}
} catch (e) {}

var payload = {
"message": "Update " + fileName + " via Google Sheets",
"content": encodedContent,
"branch": GITHUB_BRANCH
};
if (sha) payload.sha = sha;

try {
var putRes = UrlFetchApp.fetch(url, {
"method": "put",
"headers": {
"Authorization": "Bearer " + token,
"Content-Type": "application/json"
},
"payload": JSON.stringify(payload),
"muteHttpExceptions": true
});
var code = putRes.getResponseCode();
if (code === 200 || code === 201) {
return { success: true };
} else {
return { success: false, message: putRes.getContentText() };
}
} catch (e) {
return { success: false, message: e.toString() };
}
}

// 이미지 및 번역 유틸리티 (기존 로직 유지)
function translateEmptyEnglishFields() {
var startTime = new Date().getTime();
var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
var data = sheet.getDataRange().getValues();
var headers = data[0];
var lastCol = sheet.getLastColumn();
var required = ["Title_en", "Summary_en", "Category_en", "Tag_en", "Region_en"];
var colMap = {};
headers.forEach(function(h, i) { colMap[h] = i; });

required.forEach(function(c) {
if (colMap[c] === undefined) {
sheet.getRange(1, sheet.getLastColumn() + 1).setValue(c);
colMap[c] = sheet.getLastColumn() - 1;
}
});

var idxT = colMap["Title"], idxS = colMap["Summary"], idxC = colMap["Category"], idxR = colMap["Region"];
var idxTe = colMap["Title_en"], idxSe = colMap["Summary_en"], idxCe = colMap["Category_en"], idxRe = colMap["Region_en"];
var count = 0;

for (var i = 1; i < data.length; i++) {
if (new Date().getTime() - startTime > MAX_RUNTIME) break;
var rowNum = i + 1;
if (idxT !== undefined && data[i][idxT] && !data[i][idxTe]) {
sheet.getRange(rowNum, idxTe + 1).setValue(LanguageApp.translate(data[i][idxT], "ko", "en"));
count++;
}
if (idxS !== undefined && data[i][idxS] && !data[i][idxSe]) {
sheet.getRange(rowNum, idxSe + 1).setValue(LanguageApp.translate(data[i][idxS], "ko", "en"));
count++;
}
if (idxC !== undefined && data[i][idxC] && !data[i][idxCe]) {
var trans = CATEGORY_MAP_EN[data[i][idxC]] || LanguageApp.translate(data[i][idxC], "ko", "en");
sheet.getRange(rowNum, idxCe + 1).setValue(trans);
count++;
}
if (idxR !== undefined && data[i][idxR] && !data[i][idxRe]) {
sheet.getRange(rowNum, idxRe + 1).setValue(LanguageApp.translate(data[i][idxR], "ko", "en"));
count++;
}
}
SpreadsheetApp.getUi().alert("번역 완료: " + count + "건");
}

function updateNewsImages() {
var startTime = new Date().getTime();
var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
var data = sheet.getDataRange().getValues();
var headers = data[0];
var idxU = headers.indexOf("URL"), idxI = headers.indexOf("Image");
if (idxU === -1 || idxI === -1) return;
var count = 0;

for (var i = 1; i < data.length; i++) {
if (new Date().getTime() - startTime > MAX_RUNTIME) break;

if (!data[i][idxI] && data[i][idxU]) {
// URL 셀에 여러 개가 있을 경우 첫 번째 것만 사용 & 공백 제거
var rawUrl = String(data[i][idxU]);
var url = rawUrl.split(/[\n,]/)[0].trim();

var imageUrl = DEFAULT_IMAGE_URL; // 기본값

// 1. 스킵 조건 확인
var shouldSkip = false;
for (var k = 0; k < SKIP_EXTENSIONS.length; k++) {
if (url.toLowerCase().indexOf(SKIP_EXTENSIONS[k]) !== -1) { shouldSkip = true; break; }
}
if (!shouldSkip) {
for (var k = 0; k < SKIP_DOMAINS.length; k++) {
if (url.toLowerCase().indexOf(SKIP_DOMAINS[k]) !== -1) { shouldSkip = true; break; }
}
}

// 2. 이미지 가져오기 시도
if (!shouldSkip) {
try {
// User-Agent 추가로 봇 차단 우회 시도
var options = {
"muteHttpExceptions": true,
"followRedirects": true,
"headers": {
"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}
};
var response = UrlFetchApp.fetch(url, options);
if (response.getResponseCode() === 200) {
var html = response.getContentText();

// og:image 또는 twitter:image 추출 (정규식 개선)
var match = html.match(/<meta\s+(?:name|property)=["'](?:og:image|twitter:image)["']\s+content=["']([^"']+)["']/i) ||
html.match(/<meta\s+content=["']([^"']+)["']\s+(?:name|property)=["'](?:og:image|twitter:image)["']/i);
if (match && match[1]) {
imageUrl = match[1];
// 상대 경로인 경우 절대 경로로 변환 (간단한 처리)
if (imageUrl.indexOf("http") !== 0) {
var baseUrl = url.match(/^https?:\/\/[^/]+/)[0];
imageUrl = baseUrl + (imageUrl.indexOf("/") === 0 ? "" : "/") + imageUrl;
}
}
}
} catch (e) {
// fetch 실패 시 기본값 유지 (Logger.log(e)로 확인 가능)
}
}

sheet.getRange(i + 1, idxI + 1).setValue(imageUrl);
count++;
}
}
SpreadsheetApp.getUi().alert("이미지 작업 완료: " + count + "건");
}

function fixExistingImagePermissions() {
var folder = DriveApp.getFolderById(FOLDER_ID);
var files = folder.getFiles();
while (files.hasNext()) {
files.next().setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
}
SpreadsheetApp.getUi().alert("권한 수정 완료");
}
