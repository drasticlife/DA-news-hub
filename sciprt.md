// DA News Hub 통합 스크립트 (v15.0 - Full Version)
//
// [기능 1] 웹 앱 (JSON API) -> doGet
// [기능 2] GitHub Sync (New!) -> pushToGitHub
// [기능 3] 이미지 자동화 & 번역 (기존 기능 유지)

// ==========================================
// [설정] 사용자 환경 변수 (Script Properties 권장)
// ==========================================
// \* 중요: 프로젝트 설정 > 스크립트 속성에서 'GITHUB_TOKEN'을 꼭 설정해주세요.
var GITHUB_OWNER = "drasticlife"; // 깃허브 아이디
var GITHUB_REPO = "DA-news-hub"; // 레포지토리 이름
var GITHUB_PATH = "data.json"; // 저장할 파일 경로
var GITHUB_BRANCH = "main"; // 브랜치 이름

// ==========================================
// [설정] 기존 설정값 유지
// ==========================================
var FOLDER*ID = "11OsMn-4WoNhg9QfxgraLQSJtkmG7PXTj";
var MAX_RUNTIME = 1000 * 60 \_ 3.5;
var DEFAULT_IMAGE_URL = "https://drasticlife.github.io/DA-news-hub/default_news_cover.jpg";
var SKIP_EXTENSIONS = ['.pdf', '.xls', '.xlsx', '.doc', '.docx', '.zip', '.hwp', '.ppt', '.pptx'];
var SKIP_DOMAINS = [
'cmegroup.com', 'tradingeconomics.com', 'lme.com', 'bloomberg.com', 'metal.com',
'sunsirs.com', 'ptonline.com', 'reuters.com', 'wsj.com', 'investing.com', 'marketwatch.com',
'cnbc.com', 'ft.com', 'chosun.com', 'yna.co.kr', 'donga.com', 'hani.co.kr',
'mk.co.kr', 'hankyung.com', 'joins.com', 'khan.co.kr'
];
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

// ==========================================
// [메인] 메뉴 구성
// ==========================================
function onOpen() {
SpreadsheetApp.getUi()
.createMenu('News Hub Tools')
.addItem('🚀 GitHub로 데이터 전송 (JSON)', 'pushToGitHub') // [신규 기능]
.addSeparator()
.addItem('1. 이미지 가져오기 (기본)', 'updateNewsImages')
.addItem('2. 영문 번역 실행', 'translateEmptyEnglishFields')
.addSeparator()
.addItem('이미지 백업하기 (드라이브 저장)', 'updateNewsImages_DriveBackup')
.addItem('파일 권한 수정', 'fixExistingImagePermissions')
.addToUi();
}

// ==========================================
// [기능 1] 웹 앱 API (기본)
// ==========================================
function doGet(e) {
var data = getSheetDataAsJson();
return ContentService.createTextOutput(JSON.stringify(data))
.setMimeType(ContentService.MimeType.JSON);
}

// 데이터 추출 헬퍼 함수
function getSheetDataAsJson() {
var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
var data = sheet.getDataRange().getValues();

if (data.length === 0) return [];

var headers = data[0];
var rows = data.slice(1);

return rows.map(function(row) {
var obj = {};
headers.forEach(function(header, index) {
if(header) {
// 날짜 데이터 ISO 포맷 통일 (선택사항, 필요 없으면 row[index]만 사용)
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

// ==========================================
// [기능 2] GitHub Sync (신규)
// ==========================================
function pushToGitHub() {
var token = PropertiesService.getScriptProperties().getProperty("GITHUB_TOKEN");

if (!token) {
SpreadsheetApp.getUi().alert("⚠️ 설정 오류\n\n'GITHUB_TOKEN'이 스크립트 속성에 지정되지 않았습니다.\n[프로젝트 설정] -> [스크립트 속성] -> 속성 추가('GITHUB_TOKEN')를 진행해주세요.");
return;
}

// 1. 데이터 가져오기
var data = getSheetDataAsJson();
var content = JSON.stringify(data, null, 2); // 보기 좋게 들여쓰기 적용
var encodedContent = Utilities.base64Encode(Utilities.newBlob(content).getBytes());

var url = "https://api.github.com/repos/" + GITHUB_OWNER + "/" + GITHUB_REPO + "/contents/" + GITHUB_PATH;

// 2. 기존 파일의 SHA 값 확인 (덮어쓰기 위해 필요)
var sha = null;
try {
var getRes = UrlFetchApp.fetch(url + "?ref=" + GITHUB_BRANCH, {
"method": "get",
"headers": { "Authorization": "Bearer " + token },
"muteHttpExceptions": true
});
if (getRes.getResponseCode() === 200) {
sha = JSON.parse(getRes.getContentText()).sha;
}
} catch(e) {}

// 3. 파일 생성/업데이트 요청
var payload = {
"message": "Update data.json via Google Sheets",
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

    if (putRes.getResponseCode() === 200 || putRes.getResponseCode() === 201) {
      SpreadsheetApp.getActiveSpreadsheet().toast("GitHub에 성공적으로 반영되었습니다!", "성공");
    } else {
      SpreadsheetApp.getUi().alert("실패: " + putRes.getContentText());
    }

} catch(e) {
SpreadsheetApp.getUi().alert("오류 발생: " + e);
}
}

// ==========================================
// [기능 3] 기존 유틸리티 (이미지/번역)
// ==========================================

function translateEmptyEnglishFields() {
var startTime = new Date().getTime();
var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
var data = sheet.getDataRange().getValues();
var headers = data[0];
var lastCol = sheet.getLastColumn();

var requiredCols = ['Title_en', 'Summary_en', 'Category_en', 'Tag_en', 'Region_en'];
var colIndex = {};

headers.forEach(function(h, i) { colIndex[h] = i; });

var newColCount = 0;
requiredCols.forEach(function(colName) {
if (colIndex[colName] === undefined) {
sheet.getRange(1, lastCol + 1 + newColCount).setValue(colName);
colIndex[colName] = lastCol + newColCount;
newColCount++;
}
});

if (newColCount > 0) {
SpreadsheetApp.flush();
SpreadsheetApp.getActiveSpreadsheet().toast(newColCount + "개 영문 컬럼이 생성되었습니다.", "알림");
}

// 인덱스 다시 조회
headers = sheet.getDataRange().getValues()[0];
headers.forEach(function(h, i) { colIndex[h] = i; });

var idxTitle = colIndex['Title'];
var idxSummary = colIndex['Summary'];
var idxCategory = colIndex['Category'];
var idxTag = colIndex['Tag'] !== undefined ? colIndex['Tag'] : colIndex['Tags'];
var idxRegion = colIndex['Region'];

var idxTitleEn = colIndex['Title_en'];
var idxSummaryEn = colIndex['Summary_en'];
var idxCategoryEn = colIndex['Category_en'];
var idxTagEn = colIndex['Tag_en'];
var idxRegionEn = colIndex['Region_en'];

var updatedCount = 0;
var isTimeOut = false;

for (var i = 1; i < data.length; i++) {
if (new Date().getTime() - startTime > MAX_RUNTIME) {
isTimeOut = true;
break;
}

    var row = data[i];
    var rowNum = i + 1;
    var rowUpdated = false;

    // Title
    if (idxTitle !== undefined && idxTitleEn !== undefined) {
       if (row[idxTitle] && !row[idxTitleEn]) {
         try {
           sheet.getRange(rowNum, idxTitleEn + 1).setValue(LanguageApp.translate(row[idxTitle], 'ko', 'en'));
           rowUpdated = true;
         } catch(e) {}
       }
    }
    // Summary
    if (idxSummary !== undefined && idxSummaryEn !== undefined) {
       if (row[idxSummary] && !row[idxSummaryEn]) {
         try {
           sheet.getRange(rowNum, idxSummaryEn + 1).setValue(LanguageApp.translate(row[idxSummary], 'ko', 'en'));
           rowUpdated = true;
         } catch(e) {}
       }
    }
    // Category (Map -> Translate)
    if (idxCategory !== undefined && idxCategoryEn !== undefined) {
       var ko = row[idxCategory];
       if (ko && !row[idxCategoryEn]) {
         var translated = CATEGORY_MAP_EN[ko];
         if (!translated) {
             try { translated = LanguageApp.translate(ko, 'ko', 'en'); } catch(e) {}
         }
         if (translated) {
           sheet.getRange(rowNum, idxCategoryEn + 1).setValue(translated);
           rowUpdated = true;
         }
       }
    }
    // Tags
    if (idxTag !== undefined && idxTagEn !== undefined) {
       var ko = row[idxTag];
       if (ko && !row[idxTagEn]) {
         try {
             var tags = ko.toString().split(',').map(function(t) { return t.trim(); });
             var translatedTags = tags.map(function(t) { return LanguageApp.translate(t, 'ko', 'en'); });
             sheet.getRange(rowNum, idxTagEn + 1).setValue(translatedTags.join(', '));
             rowUpdated = true;
         } catch(e) {}
       }
    }
    // Region
    if (idxRegion !== undefined && idxRegionEn !== undefined) {
       var ko = row[idxRegion];
       if (ko && !row[idxRegionEn]) {
         try {
             var regions = ko.toString().split(',').map(function(r) { return r.trim(); });
             var translatedRegions = regions.map(function(r) { return LanguageApp.translate(r, 'ko', 'en'); });
             sheet.getRange(rowNum, idxRegionEn + 1).setValue(translatedRegions.join(', '));
             rowUpdated = true;
         } catch(e) {}
       }
    }

    if (rowUpdated) {
        updatedCount++;
        if (updatedCount % 5 === 0) {
            SpreadsheetApp.flush();
            SpreadsheetApp.getActiveSpreadsheet().toast(i + "행까지 확인... (" + updatedCount + "건 번역)", "진행 중");
        }
    }

}

SpreadsheetApp.flush();
var msg = "번역 완료! 총 " + updatedCount + "개 행 업데이트.";
if (isTimeOut) msg += "\n(시간 제한으로 중단됨)";
SpreadsheetApp.getUi().alert(msg);
}

function updateNewsImages() {
var startTime = new Date().getTime();
var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
var lastRow = sheet.getLastRow();

if (lastRow < 2) {
SpreadsheetApp.getUi().alert("데이터가 없습니다.");
return;
}

var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
var idxUrl = headers.indexOf('URL');
var idxImage = headers.indexOf('Image');

if (idxUrl === -1 || idxImage === -1) {
SpreadsheetApp.getUi().alert("'URL' 또는 'Image' 헤더가 필요합니다.");
return;
}

var data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
var updateCount = 0;
var isTimeOut = false;

SpreadsheetApp.getActiveSpreadsheet().toast("이미지 추출 시작...", "Start");

for (var i = 0; i < data.length; i++) {
if (i % 5 === 0) SpreadsheetApp.getActiveSpreadsheet().toast((i + 1) + " / " + data.length, "진행 중");

    if (new Date().getTime() - startTime > MAX_RUNTIME) {
      isTimeOut = true;
      break;
    }

    var urlInput = data[i][idxUrl];
    var currentImage = data[i][idxImage];

    if (currentImage && currentImage.toString() !== "") continue; // 이미 있으면 패스
    if (!urlInput || typeof urlInput !== 'string') {
        sheet.getRange(i + 2, idxImage + 1).setValue(DEFAULT_IMAGE_URL);
        continue;
    }

    var urls = urlInput.split(/[\n,]+/).map(function(u){return u.trim()}).filter(function(u){return u.startsWith('http')});
    var finalImg = null;

    // URL 순회하며 이미지 찾기
    for (var j = 0; j < urls.length; j++) {
      var target = urls[j];
      var skip = false;
      // Skip logic
      for(var k=0; k<SKIP_EXTENSIONS.length; k++) if(target.toLowerCase().endsWith(SKIP_EXTENSIONS[k])) { skip=true; break; }
      if(skip) continue;
      for(var k=0; k<SKIP_DOMAINS.length; k++) if(target.toLowerCase().includes(SKIP_DOMAINS[k])) { skip=true; break; }
      if(skip) continue;

      try {
        var res = UrlFetchApp.fetch(target, { muteHttpExceptions:true, validateHttpsCertificates:false, headers:{'User-Agent':'Mozilla/5.0'} });
        if (res.getResponseCode() === 200) {
           var html = res.getContentText();
           var match = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
                       html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
           if (match && match[1]) {
             finalImg = match[1];
             if(!finalImg.startsWith('http')) {
               var dom = target.match(/^https?:\/\/[^\/]+/);
               if(dom) finalImg = (finalImg.startsWith('/') ? dom[0] : dom[0]+'/') + finalImg;
             }
             break;
           }
        }
      } catch(e) {}
    }

    if (!finalImg) finalImg = DEFAULT_IMAGE_URL;
    sheet.getRange(i + 2, idxImage + 1).setValue(finalImg);
    updateCount++;

}

SpreadsheetApp.flush();
var msg = "✅ 이미지 업데이트 완료 (" + updateCount + "건)";
if (isTimeOut) msg += "\n(시간 부족으로 중단)";
SpreadsheetApp.getUi().alert(msg);
}

function updateNewsImages_DriveBackup() {
SpreadsheetApp.getUi().alert("유지보수 중입니다.");
}

function fixExistingImagePermissions() {
var folder = DriveApp.getFolderById(FOLDER_ID);
var files = folder.getFiles();
var c = 0;
while(files.hasNext()) {
files.next().setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
c++;
}
SpreadsheetApp.getUi().alert(c + "개 권한 수정 완료.");
}
