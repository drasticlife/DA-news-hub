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
var type = e.parameter.type;
if (type === "monthly") {
return ContentService.createTextOutput(JSON.stringify(getMonthlyStatsJson()))
.setMimeType(ContentService.MimeType.JSON);
}
var data = getSheetDataAsJson();
return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
try {
var params = JSON.parse(e.postData.contents);
var targetTitle = params.title;
var targetDate = params.date;
var targetUrl = params.url;
var sessionId = params.sessionId || "unknown";
var category = params.category || "MISC";
var risk = params.risk || "Low";

    if (!targetTitle) throw new Error("Title is required");

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getActiveSheet();
    var data = sheet.getDataRange().getValues();
    var headers = data[0];

    var idxTitle = headers.indexOf("Title");
    var idxDate = headers.indexOf("Date");
    var idxUrl = headers.indexOf("URL");
    var idxView = headers.indexOf("ViewCount");

    if (idxTitle === -1) throw new Error("Title column not found");

    if (idxView === -1) {
      idxView = headers.length;
      sheet.getRange(1, idxView + 1).setValue("ViewCount");
    }

    // 1. 누적 조회 업데이트
    var foundIndex = -1;
    for (var i = 1; i < data.length; i++) {
        var row = data[i];
        if (String(row[idxTitle]) === String(targetTitle)) {
            var rowDate = row[idxDate] instanceof Date ? row[idxDate].toISOString() : String(row[idxDate]);
            var matchDate = !targetDate || rowDate.indexOf(targetDate.split('T')[0]) !== -1;
            var matchUrl = !targetUrl || String(row[idxUrl]).indexOf(targetUrl) !== -1;
            if (matchDate && matchUrl) {
                foundIndex = i + 1;
                break;
            }
        }
    }

    if (foundIndex === -1) {
      for (var i = 1; i < data.length; i++) {
        if (String(data[i][idxTitle]) === String(targetTitle)) {
          foundIndex = i + 1;
          break;
        }
      }
    }

    if (foundIndex !== -1) {
      var currentView = Number(sheet.getRange(foundIndex, idxView + 1).getValue()) || 0;
      sheet.getRange(foundIndex, idxView + 1).setValue(currentView + 1);
    }

    // 2. 월간 통계 업데이트
    updateMonthlyStats(targetTitle, category, risk, sessionId);

    return ContentService.createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);

} catch (err) {
return ContentService.createTextOutput(JSON.stringify({ success: false, message: err.toString() }))
.setMimeType(ContentService.MimeType.JSON);
}
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

function pushToGitHub() {
var token = PropertiesService.getScriptProperties().getProperty("GITHUB_TOKEN");
if (!token) {
SpreadsheetApp.getUi().alert("GITHUB_TOKEN이 필요합니다. [프로젝트 설정]에서 추가해주세요.");
return;
}

var data = getSheetDataAsJson();
var content = JSON.stringify(data, null, 2);
var encodedContent = Utilities.base64Encode(Utilities.newBlob(content).getBytes());

var res1 = uploadSingleFile("data.json", encodedContent, token);
Utilities.sleep(1000);

var res2 = uploadSingleFile("data_new.json", encodedContent, token);

if (res1.success && res2.success) {
SpreadsheetApp.getActiveSpreadsheet().toast("data.json & data_new.json 업데이트 성공", "성공");
} else {
var msg = (res1.success ? "" : "data.json 실패: " + res1.message + "\n") + (res2.success ? "" : "data_new.json 실패: " + res2.message);
SpreadsheetApp.getUi().alert("일부 전송 실패:\n" + msg);
}
}

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
if (new Date().getTime() - startTime > 330000) break;
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
var idxU = headers.indexOf("URL"), idxI = headers.indexOf("Image"), idxC = headers.indexOf("Category");

if (idxU === -1 || idxI === -1) return;
var count = 0;

for (var i = 1; i < data.length; i++) {
if (new Date().getTime() - startTime > 330000) break;

    if (!data[i][idxI] && data[i][idxU]) {
      var rawUrl = String(data[i][idxU]);
      var urls = rawUrl.split(/[\n,]/).map(function(u) { return u.trim(); }).filter(Boolean);
      var category = idxC !== -1 ? String(data[i][idxC]) : "";

      var imageFound = false;
      var imageUrl = DEFAULT_IMAGE_URL;

      for (var j = 0; j < urls.length; j++) {
        var url = urls[j];
        var shouldSkip = false;

        for (var k = 0; k < SKIP_EXTENSIONS.length; k++) {
          if (url.toLowerCase().indexOf(SKIP_EXTENSIONS[k]) !== -1) { shouldSkip = true; break; }
        }
        if (!shouldSkip) {
          for (var k = 0; k < SKIP_DOMAINS.length; k++) {
            if (url.toLowerCase().indexOf(SKIP_DOMAINS[k]) !== -1) { shouldSkip = true; break; }
          }
        }

        if (category === "원자재" && url.toLowerCase().indexOf("tradingeconomics.com") !== -1) {
          shouldSkip = true;
        }

        if (shouldSkip) continue;

        try {
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
            var match = html.match(/<meta\s+(?:name|property)=["'](?:og:image|twitter:image)["']\s+content=["']([^"']+)["']/i) ||
                        html.match(/<meta\s+content=["']([^"']+)["']\s+(?:name|property)=["'](?:og:image|twitter:image)["']/i);

            if (match && match[1]) {
              imageUrl = match[1];
              if (imageUrl.indexOf("http") !== 0) {
                var baseUrlMatch = url.match(/^https?:\/\/[^/]+/);
                if (baseUrlMatch) {
                  var baseUrl = baseUrlMatch[0];
                  imageUrl = baseUrl + (imageUrl.indexOf("/") === 0 ? "" : "/") + imageUrl;
                }
              }
              imageFound = true;
              break;
            }
          }
        } catch (e) {}
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

function updateMonthlyStats(title, category, risk, sessionId) {
var ss = SpreadsheetApp.getActiveSpreadsheet();
var statsSheet = ss.getSheetByName("MonthlyStats") || createStatsSheet(ss);
var logSheet = ss.getSheetByName("SessionLog") || createLogSheet(ss);

var now = new Date();
var monthKey = now.getFullYear() + "-" + ("0" + (now.getMonth() + 1)).slice(-2);

var statsData = statsSheet.getDataRange().getValues();
var foundRow = -1;
for (var i = 1; i < statsData.length; i++) {
if (statsData[i][0] === monthKey && statsData[i][1] === title) {
foundRow = i + 1;
break;
}
}

if (foundRow === -1) {
statsSheet.appendRow([monthKey, title, category, risk, 1, 1]);
logSheet.appendRow([monthKey, title, sessionId]);
} else {
// Views 증가
var currentViews = Number(statsData[foundRow-1][4]) || 0;
statsSheet.getRange(foundRow, 5).setValue(currentViews + 1);

    // Sessions 증가 여부 확인
    var logData = logSheet.getDataRange().getValues();
    var isNewSession = true;
    for (var j = 1; j < logData.length; j++) {
      if (logData[j][0] === monthKey && logData[j][1] === title && logData[j][2] === sessionId) {
        isNewSession = false;
        break;
      }
    }

    if (isNewSession) {
      var currentSessions = Number(statsData[foundRow-1][5]) || 0;
      statsSheet.getRange(foundRow, 6).setValue(currentSessions + 1);
      logSheet.appendRow([monthKey, title, sessionId]);
    }

}
}

function createStatsSheet(ss) {
var sheet = ss.insertSheet("MonthlyStats");
sheet.appendRow(["Month", "Title", "Category", "Risk", "Views", "Sessions"]);
sheet.getRange(1, 1, 1, 6).setFontWeight("bold").setBackground("#f3f3f3");
return sheet;
}

function createLogSheet(ss) {
var sheet = ss.insertSheet("SessionLog");
sheet.appendRow(["Month", "Title", "SessionID"]);
sheet.getRange(1, 1, 1, 3).setFontWeight("bold").setBackground("#f3f3f3");
sheet.hideSheet();
return sheet;
}

function getMonthlyStatsJson() {
var ss = SpreadsheetApp.getActiveSpreadsheet();
var sheet = ss.getSheetByName("MonthlyStats");
if (!sheet) return [];
var data = sheet.getDataRange().getValues();
var headers = data[0];
var rows = data.slice(1);
return rows.map(function(row) {
var obj = {};
headers.forEach(function(header, index) {
obj[header] = row[index];
});
return obj;
});
}
