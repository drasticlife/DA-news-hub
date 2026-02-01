// DA News Hub 통합 스크립트 (v14.0)
//
// [기능 1] 웹 앱 (JSON API)
// - 구글 시트의 모든 데이터를 JSON 형태로 제공합니다.
// - doGet 함수가 이 역할을 수행합니다.
//
// [기능 2] 이미지 자동화
// - 외부 링크에서 이미지를 가져와 시트에 저장합니다.
//
// [기능 3] 영문 번역 (NEW)
// - Title, Summary, Category, Tag를 영문으로 번역하여 \_en 컬럼에 저장합니다.

// ==========================================
// [기능 1] 웹 앱 API (데이터 서빙)
// ==========================================
function doGet(e) {
var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
var data = sheet.getDataRange().getValues();

if (data.length === 0) {
return ContentService.createTextOutput(JSON.stringify([]))
.setMimeType(ContentService.MimeType.JSON);
}

var headers = data[0];
var rows = data.slice(1);

var result = rows.map(function(row) {
var obj = {};
headers.forEach(function(header, index) {
if(header) {
obj[header] = row[index];
}
});
return obj;
});

return ContentService.createTextOutput(JSON.stringify(result))
.setMimeType(ContentService.MimeType.JSON);
}

// ==========================================
// [기능 2] 이미지 자동화 도구 & 번역 도구
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

function onOpen() {
SpreadsheetApp.getUi()
.createMenu('News Hub Tools')
.addItem('1. 이미지 가져오기 (기본)', 'updateNewsImages')
.addItem('2. 영문 번역 실행 (Title/Summary/...\_en)', 'translateEmptyEnglishFields')
.addSeparator()
.addItem('이미지 백업하기 (드라이브 저장)', 'updateNewsImages_DriveBackup')
.addItem('파일 권한 수정', 'fixExistingImagePermissions')
.addToUi();
}

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

    if (idxTitle !== undefined && idxTitleEn !== undefined) {
       var ko = row[idxTitle];
       var en = row[idxTitleEn];
       if (ko && !en) {
         try {
           var translated = LanguageApp.translate(ko, 'ko', 'en');
           sheet.getRange(rowNum, idxTitleEn + 1).setValue(translated);
           rowUpdated = true;
         } catch(e) {}
       }
    }

    if (idxSummary !== undefined && idxSummaryEn !== undefined) {
       var ko = row[idxSummary];
       var en = row[idxSummaryEn];
       if (ko && !en) {
         try {
           var translated = LanguageApp.translate(ko, 'ko', 'en');
           sheet.getRange(rowNum, idxSummaryEn + 1).setValue(translated);
           rowUpdated = true;
         } catch(e) {}
       }
    }

    if (idxCategory !== undefined && idxCategoryEn !== undefined) {
       var ko = row[idxCategory];
       var en = row[idxCategoryEn];
       if (ko && !en) {
         var translated = CATEGORY_MAP_EN[ko];
         if (!translated) {
             try {
               translated = LanguageApp.translate(ko, 'ko', 'en');
             } catch(e) {}
         }
         if (translated) {
           sheet.getRange(rowNum, idxCategoryEn + 1).setValue(translated);
           rowUpdated = true;
         }
       }
    }

    if (idxTag !== undefined && idxTagEn !== undefined) {
       var ko = row[idxTag];
       var en = row[idxTagEn];
       if (ko && !en) {
         try {
             var tags = ko.toString().split(',').map(function(t) { return t.trim(); });
             var translatedTags = tags.map(function(t) {
                return LanguageApp.translate(t, 'ko', 'en');
             });
             sheet.getRange(rowNum, idxTagEn + 1).setValue(translatedTags.join(', '));
             rowUpdated = true;
         } catch(e) {}
       }
    }

    if (idxRegion !== undefined && idxRegionEn !== undefined) {
       var ko = row[idxRegion];
       var en = row[idxRegionEn];
       if (ko && !en) {
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
        if (updatedCount % 5 === 0) { // 5개마다 알림 (사용자 피드백 개선)
            SpreadsheetApp.flush();
            SpreadsheetApp.getActiveSpreadsheet().toast(i + "행까지 처리 중... (" + updatedCount + "건 완료)", "번역 진행");
        }
    }

}

SpreadsheetApp.flush();
var msg = "번역 완료! 총 " + updatedCount + "개 행이 업데이트되었습니다.";
if (isTimeOut) msg += "\n⏳ 시간 제한으로 중단되었습니다. 다시 실행해주세요.";
SpreadsheetApp.getUi().alert(msg);
}

function updateNewsImages() {
var startTime = new Date().getTime();
var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
var lastRow = sheet.getLastRow();

if (lastRow < 2) {
SpreadsheetApp.getUi().alert("처리할 데이터가 없습니다.");
return;
}

var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
var idxUrl = headers.indexOf('URL');
var idxImage = headers.indexOf('Image');

if (idxUrl === -1 || idxImage === -1) {
SpreadsheetApp.getUi().alert("'URL' 또는 'Image' 헤더를 찾을 수 없습니다.");
return;
}

var data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
var updateCount = 0;
var defaultCount = 0;
var isTimeOut = false;

SpreadsheetApp.getActiveSpreadsheet().toast("이미지 링크 가져오기를 시작합니다...", "🚀 시작");

for (var i = 0; i < data.length; i++) {
if (i % 5 === 0) {
var msg = "진행 중: " + (i + 1) + "행 / " + data.length + "행";
SpreadsheetApp.getActiveSpreadsheet().toast(msg, "🔍 진행 현황");
}

    if (new Date().getTime() - startTime > MAX_RUNTIME) {
      isTimeOut = true;
      break;
    }

    var urlInput = data[i][idxUrl];
    var currentImageVal = data[i][idxImage];

    if (currentImageVal && currentImageVal.toString() !== "") {
        continue;
    }

    if (!urlInput || typeof urlInput !== 'string') {
        sheet.getRange(i + 2, idxImage + 1).setValue(DEFAULT_IMAGE_URL);
        defaultCount++;
        continue;
    }

    var urls = urlInput.split(/[\n,]+/).map(function(u) { return u.trim(); }).filter(function(u) { return u.startsWith('http'); });
    var finalImgUrl = null;

    for (var j = 0; j < urls.length; j++) {
      var targetUrl = urls[j];
      var lowerUrl = targetUrl.toLowerCase();
      var skip = false;

      for(var k=0; k<SKIP_EXTENSIONS.length; k++) {
          if(lowerUrl.endsWith(SKIP_EXTENSIONS[k])) { skip = true; break; }
      }
      if(skip) continue;

      for(var k=0; k<SKIP_DOMAINS.length; k++) {
          if(lowerUrl.includes(SKIP_DOMAINS[k])) { skip = true; break; }
      }
      if(skip) continue;

      try {
        var response = UrlFetchApp.fetch(targetUrl, {
            muteHttpExceptions: true,
            validateHttpsCertificates: false,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        if (response.getResponseCode() === 200) {
            var html = response.getContentText();
            var imgMatch =
                html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
                html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);

            if (imgMatch && imgMatch[1]) {
                finalImgUrl = imgMatch[1];
                if (!finalImgUrl.startsWith('http')) {
                    var domainMatch = targetUrl.match(/^https?:\/\/[^\/]+/);
                    if(domainMatch) finalImgUrl = (finalImgUrl.startsWith('/') ? domainMatch[0] : domainMatch[0] + '/') + finalImgUrl;
                }
                break;
            }
        }
      } catch (e) {}
    }

    if (!finalImgUrl) finalImgUrl = DEFAULT_IMAGE_URL;

    if (finalImgUrl) {
      sheet.getRange(i + 2, idxImage + 1).setValue(finalImgUrl);
      updateCount++;
    }

}

SpreadsheetApp.flush();

var msg = "✅ 이미지 업데이트 완료! (" + updateCount + "건)";
if (isTimeOut) msg += "\n⏳ 시간 제한으로 중단됨.";
SpreadsheetApp.getUi().alert(msg);
}

function updateNewsImages_DriveBackup() {
SpreadsheetApp.getUi().alert("유지보수 중.");
}

function fixExistingImagePermissions() {
var folder = DriveApp.getFolderById(FOLDER_ID);
var files = folder.getFiles();
var count = 0;
while (files.hasNext()) {
files.next().setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
count++;
}
SpreadsheetApp.getUi().alert(count + "개 파일 권한 수정 완료.");
}
