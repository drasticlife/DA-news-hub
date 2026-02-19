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
var DEFAULT_IMAGE_URL =
  "https://drasticlife.github.io/DA-news-hub/default_news_cover.jpg";
var SKIP_EXTENSIONS = [
  ".pdf",
  ".xls",
  ".xlsx",
  ".doc",
  ".docx",
  ".zip",
  ".hwp",
  ".ppt",
  ".pptx",
];
var SKIP_DOMAINS = [
  "cmegroup.com",
  "tradingeconomics.com",
  "lme.com",
  "bloomberg.com",
  "metal.com",
  "sunsirs.com",
  "ptonline.com",
  "reuters.com",
  "wsj.com",
  "investing.com",
  "marketwatch.com",
  "cnbc.com",
  "ft.com",
  "chosun.com",
  "yna.co.kr",
  "donga.com",
  "hani.co.kr",
  "mk.co.kr",
  "hankyung.com",
  "joins.com",
  "khan.co.kr",
];

var CATEGORY_MAP_EN = {
  "전략 시황": "Strategic Market",
  원자재: "Raw Materials",
  거시경제: "Macro/Policy",
  생산지역: "Production Region",
  경쟁사: "Competitors",
  신기술동향: "New Tech Trends",
  AI기술: "AI Tech",
  신기술: "New Tech",
};

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("News Hub Tools")
    .addItem(
      "⚡ 한 번에 처리 (Clean → Translate → Image → GitHub)",
      "runAllProcesses",
    )
    .addSeparator()
    .addItem("🚀 GitHub로 데이터 전송 (JSON)", "pushToGitHub")
    .addSeparator()
    .addItem("1. 이미지 가져오기 (기본)", "updateNewsImages")
    .addItem("2. 영문 번역 실행", "translateEmptyEnglishFields")
    .addItem("3. 🎤 앵커 브리핑 생성 및 배포", "runAnchorBotAutomation")
    .addSeparator()
    .addItem("파일 권한 수정", "fixExistingImagePermissions")
    .addSeparator()
    .addItem("🛠️ 사용자 승인 드롭다운 설정", "setupUserValidation")
    .addToUi();
}

function doGet(e) {
  var type = e.parameter.type;
  if (type === "monthly") {
    return ContentService.createTextOutput(
      JSON.stringify(getMonthlyStatsJson()),
    ).setMimeType(ContentService.MimeType.JSON);
  }
  var data = getSheetDataAsJson();
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

function doPost(e) {
  try {
    var params = JSON.parse(e.postData.contents);
    var action = params.action; // view, register, login, like, comment, board_post, board
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    if (action === "register") {
      return handleRegister(ss, params);
    } else if (action === "login") {
      return handleLogin(ss, params);
    } else if (action === "like") {
      return handleLike(ss, params);
    } else if (action === "board" || action === "board_post") {
      return handleBoard(ss, params);
    } else if (action === "get_board_posts") {
      return handleGetBoardPosts(ss);
    } else {
      // Default behavior: view tracking (title check inside)
      if (params.title) {
        return handleView(ss, params);
      }
      return ContentService.createTextOutput(
        JSON.stringify({
          success: false,
          message: "Invalid action or missing title",
        }),
      ).setMimeType(ContentService.MimeType.JSON);
    }
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ success: false, message: err.toString() }),
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

function handleRegister(ss, params) {
  var userSheet = ss.getSheetByName("Users") || createUsersSheet(ss);
  var userId = params.userId;
  var userName = params.userName;
  var password = params.password;

  if (!userId || !userName || !password)
    throw new Error("Missing registration fields");

  var data = userSheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === userId) throw new Error("UserID already exists");
  }

  userSheet.appendRow([userId, userName, password, "Pending", new Date()]);
  return ContentService.createTextOutput(
    JSON.stringify({
      success: true,
      message: "Registration successful. Please wait for admin approval.",
    }),
  ).setMimeType(ContentService.MimeType.JSON);
}

function handleLogin(ss, params) {
  var userSheet = ss.getSheetByName("Users");
  if (!userSheet) throw new Error("No users registered yet");

  var data = userSheet.getDataRange().getValues();
  var userId = params.userId;
  var password = params.password;

  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === userId && String(data[i][2]) === String(password)) {
      if (data[i][3] !== "Approved") {
        return ContentService.createTextOutput(
          JSON.stringify({
            success: false,
            message: "Account is pending approval.",
          }),
        ).setMimeType(ContentService.MimeType.JSON);
      }
      return ContentService.createTextOutput(
        JSON.stringify({
          success: true,
          userId: userId,
          userName: data[i][1],
        }),
      ).setMimeType(ContentService.MimeType.JSON);
    }
  }
  return ContentService.createTextOutput(
    JSON.stringify({ success: false, message: "Invalid credentials" }),
  ).setMimeType(ContentService.MimeType.JSON);
}

function handleView(ss, params) {
  var targetTitle = params.title;
  var targetDate = params.date;
  var targetUrl = params.url;
  var sessionId = params.sessionId || "unknown";
  var category = params.category || "MISC";
  var risk = params.risk || "Low";

  if (!targetTitle) throw new Error("Title is required");

  var sheet = ss.getSheets()[0];
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
      var rowDate =
        row[idxDate] instanceof Date
          ? row[idxDate].toISOString()
          : String(row[idxDate]);
      var matchDate =
        !targetDate || rowDate.indexOf(targetDate.split("T")[0]) !== -1;
      var matchUrl =
        !targetUrl || String(row[idxUrl]).indexOf(targetUrl) !== -1;
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
    var currentView =
      Number(sheet.getRange(foundIndex, idxView + 1).getValue()) || 0;
    sheet.getRange(foundIndex, idxView + 1).setValue(currentView + 1);
    // 2. 월간 통계 업데이트
    updateMonthlyStats(targetTitle, category, risk, sessionId);
    return ContentService.createTextOutput(
      JSON.stringify({ success: true, count: currentView + 1 }),
    ).setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput(
    JSON.stringify({ success: false, message: "Article not found" }),
  ).setMimeType(ContentService.MimeType.JSON);
}

function handleLike(ss, params) {
  var targetTitle = params.title;
  if (!targetTitle) throw new Error("Title is required");

  var sheet = ss.getSheets()[0];
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var idxTitle = headers.indexOf("Title");
  var idxLike = headers.indexOf("LikeCount");

  if (idxLike === -1) {
    idxLike = headers.length;
    sheet.getRange(1, idxLike + 1).setValue("LikeCount");
  }

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idxTitle]) === String(targetTitle)) {
      var currentLike =
        Number(sheet.getRange(i + 1, idxLike + 1).getValue()) || 0;
      sheet.getRange(i + 1, idxLike + 1).setValue(currentLike + 1);
      return ContentService.createTextOutput(
        JSON.stringify({ success: true, count: currentLike + 1 }),
      ).setMimeType(ContentService.MimeType.JSON);
    }
  }
  throw new Error("Article not found");
}

function handleBoard(ss, params) {
  var boardSheet = ss.getSheetByName("Board") || createBoardSheet(ss);
  var userId = params.userId;
  var userName = params.userName;
  var content = params.content;
  var type = params.type || "General";

  if (!userId || !content) throw new Error("Missing board fields");

  boardSheet.appendRow([userId, userName, content, type, new Date()]);
  return ContentService.createTextOutput(
    JSON.stringify({ success: true }),
  ).setMimeType(ContentService.MimeType.JSON);
}

function getSheetDataAsJson() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  var data = sheet.getDataRange().getValues();
  if (data.length === 0) return [];
  var headers = data[0];
  var rows = data.slice(1);
  return rows.map(function (row) {
    var obj = {};
    headers.forEach(function (header, index) {
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
  var token =
    PropertiesService.getScriptProperties().getProperty("GITHUB_TOKEN");
  if (!token) {
    SpreadsheetApp.getUi().alert(
      "GITHUB_TOKEN이 필요합니다. [프로젝트 설정]에서 추가해주세요.",
    );
    return;
  }

  var data = getSheetDataAsJson();
  var content = JSON.stringify(data, null, 2);
  var encodedContent = Utilities.base64Encode(
    Utilities.newBlob(content).getBytes(),
  );

  var res1 = uploadSingleFile("data.json", encodedContent, token);
  Utilities.sleep(1000);

  var res2 = uploadSingleFile("data_new.json", encodedContent, token);

  if (res1.success && res2.success) {
    SpreadsheetApp.getActiveSpreadsheet().toast(
      "data.json & data_new.json 업데이트 성공",
      "성공",
    );
  } else {
    var msg =
      (res1.success ? "" : "data.json 실패: " + res1.message + "\n") +
      (res2.success ? "" : "data_new.json 실패: " + res2.message);
    SpreadsheetApp.getUi().alert("일부 전송 실패:\n" + msg);
  }
}

function uploadSingleFile(fileName, encodedContent, token) {
  var url =
    "https://api.github.com/repos/" +
    GITHUB_OWNER +
    "/" +
    GITHUB_REPO +
    "/contents/" +
    fileName;
  var sha = null;
  try {
    var res = UrlFetchApp.fetch(url + "?ref=" + GITHUB_BRANCH, {
      method: "get",
      headers: { Authorization: "Bearer " + token },
      muteHttpExceptions: true,
    });
    if (res.getResponseCode() === 200) {
      sha = JSON.parse(res.getContentText()).sha;
    }
  } catch (e) {}

  var payload = {
    message: "Update " + fileName + " via Google Sheets",
    content: encodedContent,
    branch: GITHUB_BRANCH,
  };
  if (sha) payload.sha = sha;

  try {
    var putRes = UrlFetchApp.fetch(url, {
      method: "put",
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
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
  var required = [
    "Title_en",
    "Summary_en",
    "Category_en",
    "Tag_en",
    "Region_en",
  ];
  var colMap = {};
  headers.forEach(function (h, i) {
    colMap[h] = i;
  });

  required.forEach(function (c) {
    if (colMap[c] === undefined) {
      sheet.getRange(1, sheet.getLastColumn() + 1).setValue(c);
      colMap[c] = sheet.getLastColumn() - 1;
    }
  });

  var idxT = colMap["Title"],
    idxS = colMap["Summary"],
    idxC = colMap["Category"],
    idxR = colMap["Region"],
    idxTa = colMap["Tag"];
  var idxTe = colMap["Title_en"],
    idxSe = colMap["Summary_en"],
    idxCe = colMap["Category_en"],
    idxRe = colMap["Region_en"],
    idxTae = colMap["Tag_en"];
  var count = 0;

  for (var i = 1; i < data.length; i++) {
    if (new Date().getTime() - startTime > 330000) break;
    var rowNum = i + 1;
    if (idxT !== undefined && data[i][idxT] && !data[i][idxTe]) {
      sheet
        .getRange(rowNum, idxTe + 1)
        .setValue(LanguageApp.translate(data[i][idxT], "ko", "en"));
      count++;
    }
    if (idxS !== undefined && data[i][idxS] && !data[i][idxSe]) {
      sheet
        .getRange(rowNum, idxSe + 1)
        .setValue(LanguageApp.translate(data[i][idxS], "ko", "en"));
      count++;
    }
    if (idxC !== undefined && data[i][idxC] && !data[i][idxCe]) {
      var trans =
        CATEGORY_MAP_EN[data[i][idxC]] ||
        LanguageApp.translate(data[i][idxC], "ko", "en");
      sheet.getRange(rowNum, idxCe + 1).setValue(trans);
      count++;
    }
    if (idxR !== undefined && data[i][idxR] && !data[i][idxRe]) {
      sheet
        .getRange(rowNum, idxRe + 1)
        .setValue(LanguageApp.translate(data[i][idxR], "ko", "en"));
      count++;
    }
    if (idxTa !== undefined && data[i][idxTa] && !data[i][idxTae]) {
      sheet
        .getRange(rowNum, idxTae + 1)
        .setValue(LanguageApp.translate(data[i][idxTa], "ko", "en"));
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
  var idxU = headers.indexOf("URL"),
    idxI = headers.indexOf("Image"),
    idxC = headers.indexOf("Category");

  if (idxU === -1 || idxI === -1) return;
  var count = 0;

  for (var i = 1; i < data.length; i++) {
    if (new Date().getTime() - startTime > 330000) break;

    if (!data[i][idxI] && data[i][idxU]) {
      var rawUrl = String(data[i][idxU]);
      var urls = rawUrl
        .split(/[\n,]/)
        .map(function (u) {
          return u.trim();
        })
        .filter(Boolean);
      var category = idxC !== -1 ? String(data[i][idxC]).trim() : "";

      var imageFound = false;
      var imageUrl = DEFAULT_IMAGE_URL;

      for (var j = 0; j < urls.length; j++) {
        var url = urls[j];
        var shouldSkip = false;

        for (var k = 0; k < SKIP_EXTENSIONS.length; k++) {
          if (url.toLowerCase().indexOf(SKIP_EXTENSIONS[k]) !== -1) {
            shouldSkip = true;
            break;
          }
        }
        if (!shouldSkip) {
          for (var k = 0; k < SKIP_DOMAINS.length; k++) {
            if (url.toLowerCase().indexOf(SKIP_DOMAINS[k]) !== -1) {
              shouldSkip = true;
              break;
            }
          }
        }

        if (
          category === "원자재" &&
          url.toLowerCase().indexOf("tradingeconomics.com") !== -1
        ) {
          shouldSkip = true;
        }

        if (shouldSkip) continue;

        try {
          var options = {
            muteHttpExceptions: true,
            followRedirects: true,
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            },
          };
          var response = UrlFetchApp.fetch(url, options);
          if (response.getResponseCode() === 200) {
            var html = response.getContentText();
            var match =
              html.match(
                /<meta\s+(?:name|property)=["'](?:og:image|twitter:image)["']\s+content=["']([^"']+)["']/i,
              ) ||
              html.match(
                /<meta\s+content=["']([^"']+)["']\s+(?:name|property)=["'](?:og:image|twitter:image)["']/i,
              );

            if (match && match[1]) {
              imageUrl = match[1];
              if (imageUrl.indexOf("http") !== 0) {
                var baseUrlMatch = url.match(/^https?:\/\/[^/]+/);
                if (baseUrlMatch) {
                  var baseUrl = baseUrlMatch[0];
                  imageUrl =
                    baseUrl +
                    (imageUrl.indexOf("/") === 0 ? "" : "/") +
                    imageUrl;
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
    files
      .next()
      .setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  }
  SpreadsheetApp.getUi().alert("권한 수정 완료");
}

function updateMonthlyStats(title, category, risk, sessionId) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var statsSheet = ss.getSheetByName("MonthlyStats") || createStatsSheet(ss);
  var logSheet = ss.getSheetByName("SessionLog") || createLogSheet(ss);

  var now = new Date();
  var monthKey =
    now.getFullYear() + "-" + ("0" + (now.getMonth() + 1)).slice(-2);

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
    var currentViews = Number(statsData[foundRow - 1][4]) || 0;
    statsSheet.getRange(foundRow, 5).setValue(currentViews + 1);

    // Sessions 증가 여부 확인
    var logData = logSheet.getDataRange().getValues();
    var isNewSession = true;
    for (var j = 1; j < logData.length; j++) {
      if (
        logData[j][0] === monthKey &&
        logData[j][1] === title &&
        logData[j][2] === sessionId
      ) {
        isNewSession = false;
        break;
      }
    }

    if (isNewSession) {
      var currentSessions = Number(statsData[foundRow - 1][5]) || 0;
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

function createUsersSheet(ss) {
  var sheet = ss.insertSheet("Users");
  sheet.appendRow(["UserID", "UserName", "Password", "Status", "CreatedAt"]);
  sheet.getRange(1, 1, 1, 5).setFontWeight("bold").setBackground("#f3f3f3");
  setupUserValidation(sheet);
  return sheet;
}

function setupUserValidation(sheet) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var targetSheet = sheet || ss.getSheetByName("Users");
  if (!targetSheet) {
    if (!sheet)
      SpreadsheetApp.getUi().alert("'Users' 시트를 찾을 수 없습니다.");
    return;
  }

  // D열 (Status) 2행부터 끝까지 드롭다운 설정
  var range = targetSheet.getRange("D2:D");
  var rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(["Pending", "Approved", "Rejected"], true)
    .setAllowInvalid(false)
    .setHelpText("Pending, Approved, Rejected 중 하나를 선택해주세요.")
    .build();
  range.setDataValidation(rule);

  if (!sheet)
    SpreadsheetApp.getActiveSpreadsheet().toast(
      "사용자 상태 드롭다운 설정이 완료되었습니다.",
      "성공",
    );
}

function createBoardSheet(ss) {
  var sheet = ss.insertSheet("Board");
  sheet.appendRow(["UserID", "UserName", "Content", "Type", "Timestamp"]);
  sheet.getRange(1, 1, 1, 5).setFontWeight("bold").setBackground("#f3f3f3");
  return sheet;
}

function getMonthlyStatsJson() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("MonthlyStats");
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var rows = data.slice(1);
  return rows.map(function (row) {
    var obj = {};
    headers.forEach(function (header, index) {
      obj[header] = row[index];
    });
    return obj;
  });
}

function runAllProcesses() {
  var ui = SpreadsheetApp.getUi();
  var response = ui.alert(
    "자동화를 시작하시겠습니까?",
    "데이터 정리 → 번역 → 이미지 → GitHub 전송이 순차적으로 실행됩니다.",
    ui.ButtonSet.YES_NO,
  );

  if (response !== ui.Button.YES) return;

  try {
    cleanPastedData();
    SpreadsheetApp.flush();
    SpreadsheetApp.getActiveSpreadsheet().toast(
      "데이터 정리가 완료되었습니다.",
      "진행 중",
      3,
    );

    translateEmptyEnglishFields();
    SpreadsheetApp.flush();
    SpreadsheetApp.getActiveSpreadsheet().toast(
      "영문 번역이 완료되었습니다.",
      "진행 중",
      3,
    );

    updateNewsImages();
    SpreadsheetApp.flush();
    SpreadsheetApp.getActiveSpreadsheet().toast(
      "이미지 업데이트가 완료되었습니다.",
      "진행 중",
      3,
    );

    runAnchorBotAutomation();
    SpreadsheetApp.flush();
    SpreadsheetApp.getActiveSpreadsheet().toast(
      "앵커 브리핑 생성이 완료되었습니다.",
      "진행 중",
      3,
    );

    pushToGitHub();
    SpreadsheetApp.getActiveSpreadsheet().toast(
      "모든 프로세스가 성공적으로 완료되었습니다.",
      "완료",
    );
  } catch (err) {
    ui.alert("프로세스 중 오류 발생: " + err.toString());
  }
}

function cleanPastedData() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var idxI = headers.indexOf("Image");
  var idxD = headers.indexOf("Date");

  if (idxD === -1) {
    // 만약 Date 컬럼이 없으면 (잘못된 시트 등) 중단
    return;
  }

  // 역순으로 돌면서 중복 헤더 제거 (1행 제외)
  for (var i = data.length - 1; i >= 1; i--) {
    var rowValue = String(data[i][idxD]);
    // Date 컬럼 값이 "Date"인 경우 (헤더 붙여넣기 됨)
    if (rowValue === "Date") {
      sheet.deleteRow(i + 1);
    } else {
      // 헤더가 아닌 일반 행인 경우, Image 열이 "-"이면 삭제
      if (idxI !== -1 && String(data[i][idxI]).trim() === "-") {
        sheet.getRange(i + 1, idxI + 1).clearContent();
      }
    }
  }
}
function handleGetBoardPosts(ss) {
  var boardSheet = ss.getSheetByName("Board");
  if (!boardSheet)
    return ContentService.createTextOutput(
      JSON.stringify({ success: true, posts: [] }),
    ).setMimeType(ContentService.MimeType.JSON);

  var data = boardSheet.getDataRange().getValues();
  var headers = data[0];
  var rows = data.slice(1);

  var posts = rows
    .map(function (row) {
      return {
        userId: row[0],
        userName: row[1],
        content: row[2],
        type: row[3],
        timestamp: row[4],
      };
    })
    .reverse(); // Latest first

  return ContentService.createTextOutput(
    JSON.stringify({ success: true, posts: posts }),
  ).setMimeType(ContentService.MimeType.JSON);
}

// 앵커 봇 브리핑 자동화 (카테고리x기간 확장 버전)
function runAnchorBotAutomation() {
  var data = getSheetDataAsJson();
  if (!data || data.length === 0) {
    SpreadsheetApp.getUi().alert("데이터가 없습니다.");
    return;
  }

  var today = new Date();
  var categorizedData = categorizeAndFilterData(data, today);

  // 1단계: 카테고리/기간별 Perplexity 대본 생성
  SpreadsheetApp.getActiveSpreadsheet().toast(
    "AI 대본 생성 중 (기간별/카네고리별 확장)... 약 1~2분 소요",
    "진행중",
    120,
  );
  var scripts = generateMultiPeriodScripts(categorizedData, today);

  // 2단계: Insight 시트에 저장
  saveMultiPeriodScriptsToSheet(scripts, today, categorizedData);

  // 3단계: intel_report.json 생성 및 GitHub 배포
  var intelReport = {
    last_updated: Utilities.formatDate(today, "GMT+9", "yyyy-MM-dd HH:mm:ss"),
    dailyBriefing: {
      anchor_name: "Strategic-Bot",
      script: (scripts.thisWeek && scripts.thisWeek.all) || "데이터 로드 중...",
    },
    scripts: scripts,
    categoryScripts: scripts.thisWeek, // [하위 호환성] 기존의 categoryScripts 구조도 유지
    categorized_issues: categorizedData,
  };

  var token =
    PropertiesService.getScriptProperties().getProperty("GITHUB_TOKEN");
  if (!token) {
    SpreadsheetApp.getUi().alert(
      "GITHUB_TOKEN이 없습니다. [프로젝트 설정]에서 추가해주세요.",
    );
    return;
  }

  var content = JSON.stringify(intelReport, null, 2);
  var encodedContent = Utilities.base64Encode(
    Utilities.newBlob(content).getBytes(),
  );

  var res = uploadSingleFile("intel_report.json", encodedContent, token);
  if (res.success) {
    SpreadsheetApp.getActiveSpreadsheet().toast(
      "✅ 완료! Insight 시트 저장 + intel_report.json GitHub 배포 성공",
      "완료",
    );
  } else {
    SpreadsheetApp.getUi().alert("GitHub 배포 실패: " + res.message);
  }
}

// Insight 시트에 대본 저장 (카테고리별 확장 버전)
function saveScriptToInsightSheet(
  globalScript,
  categoryScripts,
  today,
  categorizedData,
) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Insight");
  var CATS = ["원자재", "거시경제", "생산지역", "경쟁사", "신기술동향"];

  if (!sheet) {
    sheet = ss.insertSheet("Insight");
    var headers = ["날짜", "종합 대본"];
    CATS.forEach(function (c) {
      headers.push(c + " 대본");
    });
    headers.push(
      "금주 TOP 제목",
      "전주 TOP 제목",
      "이번달 TOP 제목",
      "저번달 TOP 제목",
    );
    sheet.appendRow(headers);
    sheet
      .getRange(1, 1, 1, headers.length)
      .setFontWeight("bold")
      .setBackground("#e8f0fe");
    sheet.setColumnWidth(1, 130);
    sheet.setColumnWidth(2, 400);
    for (var i = 0; i < CATS.length; i++) sheet.setColumnWidth(3 + i, 350);
    sheet.setColumnWidth(3 + CATS.length, 220);
    sheet.setColumnWidth(4 + CATS.length, 220);
    sheet.setColumnWidth(5 + CATS.length, 220);
    sheet.setColumnWidth(6 + CATS.length, 220);
  }

  var dateStr = Utilities.formatDate(today, "GMT+9", "yyyy-MM-dd HH:mm");
  var thisWeekTitles = (categorizedData.thisWeek || [])
    .map(function (d) {
      return d.Title;
    })
    .join("\n");
  var lastWeekTitles = (categorizedData.lastWeek || [])
    .map(function (d) {
      return d.Title;
    })
    .join("\n");
  var thisMonthTitles = (categorizedData.thisMonth || [])
    .map(function (d) {
      return d.Title;
    })
    .join("\n");
  var lastMonthTitles = (categorizedData.lastMonth || [])
    .map(function (d) {
      return d.Title;
    })
    .join("\n");

  var row = [dateStr, globalScript];
  CATS.forEach(function (c) {
    row.push(categoryScripts[c] || "");
  });
  row.push(thisWeekTitles, lastWeekTitles, thisMonthTitles, lastMonthTitles);

  sheet.insertRowBefore(2);
  sheet.getRange(2, 1, 1, row.length).setValues([row]);
  for (var j = 0; j <= CATS.length; j++) sheet.getRange(2, 2 + j).setWrap(true);
}

// 오늘 날짜 기준 데이터 분류 (기간별 + 카테고리별 중첩)
function categorizeAndFilterData(data, baseDate) {
  var CATS = ["원자재", "거시경제", "생산지역", "경쟁사", "신기술동향"];
  var PERIODS = ["thisWeek", "lastWeek", "thisMonth", "lastMonth"];
  var riskScore = { "Very High": 4, High: 3, Med: 2, Low: 1 };
  var oneDay = 24 * 60 * 60 * 1000;

  var baseDate = baseDate || new Date();
  var dayOfWeek = baseDate.getDay();
  // 주의 시작(일요일 00:00:00) 계산
  var startOfThisWeek = new Date(baseDate.getTime() - dayOfWeek * oneDay);
  startOfThisWeek.setHours(0, 0, 0, 0);
  var startOfLastWeek = new Date(startOfThisWeek.getTime() - 7 * oneDay);
  var endOfLastWeek = new Date(startOfThisWeek.getTime() - oneDay);
  var startOfThisMonth = new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    1,
  );
  var startOfLastMonth = new Date(
    baseDate.getFullYear(),
    baseDate.getMonth() - 1,
    1,
  );
  var endOfLastMonth = new Date(baseDate.getFullYear(), baseDate.getMonth(), 0);

  // 결과 구조 초기화
  var result = { byCategory: {} };
  PERIODS.forEach(function (p) {
    result[p] = [];
  });
  CATS.forEach(function (c) {
    result.byCategory[c] = {};
    PERIODS.forEach(function (p) {
      result.byCategory[c][p] = [];
    });
  });

  data.forEach(function (item) {
    var dateVal = item.Date || item.date;
    if (!dateVal) return;
    var cleanDate = String(dateVal).replace(/\s/g, "").replace(/\./g, "-");
    var itemDate = new Date(cleanDate);
    if (isNaN(itemDate.getTime())) return;

    // 기간 판별
    var periods = [];
    if (itemDate >= startOfThisWeek) periods.push("thisWeek");
    else if (itemDate >= startOfLastWeek && itemDate <= endOfLastWeek)
      periods.push("lastWeek");
    if (itemDate >= startOfThisMonth) periods.push("thisMonth");
    else if (itemDate >= startOfLastMonth && itemDate <= endOfLastMonth)
      periods.push("lastMonth");
    if (periods.length === 0) return;

    // 카테고리 매핑 - 가능한 모든 필드명에서 카테고리 추출
    var rawCatVal =
      item.Category ||
      item.category ||
      item.C ||
      item.I ||
      item.J ||
      item["카테고리"] ||
      item["분류"] ||
      item["Category_en"] ||
      "";
    var rawCat = String(rawCatVal).trim();
    var rawCatLower = rawCat.toLowerCase();

    var matchedCat = null;

    // 1) 정확한 카테고리명 포함 여부
    CATS.forEach(function (c) {
      if (rawCat.indexOf(c) !== -1) matchedCat = c;
    });

    // AI기술 -> 신기술동향 예외 처리 (더 포괄적으로 변경)
    if (!matchedCat) {
      if (
        rawCatLower.indexOf("ai") !== -1 ||
        rawCatLower.indexOf("tech") !== -1 ||
        rawCat.indexOf("신기술") !== -1 ||
        rawCat.indexOf("기술") !== -1
      ) {
        matchedCat = "신기술동향";
      }
    }

    // 디버깅: 2월 18일 기사 중 매핑 안 된 것 확인
    if (!matchedCat && cleanDate.indexOf("02-18") !== -1) {
      Logger.log(
        "[DEBUG-SKIP] Unmapped item on 02-18: Title='" +
          item.Title +
          "', rawCat='" +
          rawCat +
          "' (Keys: " +
          Object.keys(item).join(",") +
          ")",
      );
    }

    // 2) 별칭·변형 처리 (대소문자 구분 없이)
    if (!matchedCat) {
      var rawCatLower = rawCat.toLowerCase();
      if (
        rawCat.indexOf("거시") !== -1 ||
        rawCat.indexOf("정책") !== -1 ||
        rawCat.indexOf("환율") !== -1
      ) {
        matchedCat = "거시경제";
      } else if (
        rawCat.indexOf("신기술") !== -1 || // "신기술"이 포함된 모든 경우
        rawCatLower.indexOf("ai기술") !== -1 || // "AI기술", "ai기술" 대소문자 무관
        rawCatLower.indexOf("ai ") === 0 || // "AI "로 시작
        rawCatLower === "ai기술" // 정확히 "AI기술"
      ) {
        matchedCat = "신기술동향";
      }
    }
    Logger.log("[CAT] rawCat='" + rawCat + "' → " + (matchedCat || "(미분류)"));

    periods.forEach(function (p) {
      result[p].push(item);
      if (matchedCat) result.byCategory[matchedCat][p].push(item);
    });
  });

  // 기간별 전체 TOP5, 카테고리별 TOP5 정렬
  PERIODS.forEach(function (p) {
    result[p] = result[p]
      .sort(function (a, b) {
        return (riskScore[b.Risk] || 0) - (riskScore[a.Risk] || 0);
      })
      .slice(0, 5);
    CATS.forEach(function (c) {
      result.byCategory[c][p] = result.byCategory[c][p]
        .sort(function (a, b) {
          return (riskScore[b.Risk] || 0) - (riskScore[a.Risk] || 0);
        })
        .slice(0, 5);
    });
  });

  return result;
}

// [신규] 모든 기간(4종) x 카테고리(6종) 대본 일괄 생성
function generateMultiPeriodScripts(categorizedData, today) {
  var PERIODS = ["thisWeek", "lastWeek", "thisMonth", "lastMonth"];
  var CATS = ["all", "원자재", "거시경제", "생산지역", "경쟁사", "신기술동향"];
  var CAT_EN = {
    all: "Unified Supply Chain",
    원자재: "Raw Materials",
    거시경제: "Macro/Policy",
    생산지역: "Production Region",
    경쟁사: "Competitors",
    신기술동향: "New Tech Trends",
  };
  var scripts = {};

  PERIODS.forEach(function (p) {
    scripts[p] = {};
    CATS.forEach(function (cat) {
      var targetData;
      if (cat === "all") {
        targetData = categorizedData[p] || [];
      } else {
        targetData =
          (categorizedData.byCategory[cat] &&
            categorizedData.byCategory[cat][p]) ||
          [];
      }

      // 데이터가 있거나 신기술동향인 경우에만 생성 (API 호출 최적화)
      if (targetData.length > 0 || cat === "신기술동향") {
        Logger.log("[AI-GEN] " + p + " / " + cat + " 생성 중...");
        scripts[p][cat] = callPerplexityForSpecificPeriod(
          p,
          cat,
          CAT_EN[cat],
          targetData,
          today,
        );
        Utilities.sleep(1100); // Rate limit 방지
      } else {
        scripts[p][cat] = null;
      }
    });
  });

  return scripts;
}

// [신규] 기간 맞춤형 Perplexity 호출
function callPerplexityForSpecificPeriod(
  periodKey,
  catKey,
  catNameEn,
  targetData,
  today,
) {
  var apiKey =
    PropertiesService.getScriptProperties().getProperty("PERPLEXITY_API_KEY");
  if (!apiKey) return "API Key Missing";

  var periodLabel = {
    thisWeek: "금주",
    lastWeek: "전주",
    thisMonth: "이번달",
    lastMonth: "저번달",
  };
  var dateStr = Utilities.formatDate(today, "GMT+9", "yyyy-MM-dd");

  var dataLines =
    targetData.length > 0
      ? targetData
          .map(
            (d) => "- " + d.Title + (d.Risk ? "(리스크:" + d.Risk + ")" : ""),
          )
          .join("\n")
      : catKey === "신기술동향"
        ? "최신 AI 및 신기술 트렌드 정보 활용"
        : "데이터 없음";

  var userPrompt = [
    "오늘 날짜: " +
      dateStr +
      " (현재 " +
      periodLabel[periodKey] +
      " 리포트 작성 중)",
    "카테고리: " + catKey + " (" + catNameEn + ")",
    "",
    "[분석 대상 데이터]",
    dataLines,
    "",
    "[미션]",
    "1. 반드시 " +
      periodLabel[periodKey] +
      "의 흐름을 중심으로 6-8문장의 앵커 브리핑을 작성하세요.",
    "2. 첫 문장은 기간과 카테고리에 맞는 자연스러운 전문 직업인의 말투로 시작하세요.",
    "3. 핵심 수치나 리스크는 <b>굵게</b>, 가장 중요한 시사점은 <mark>하이라이트</mark> 태그를 사용하세요.",
    "4. '전망됩니다', '주시기 바랍니다' 등의 공적인 어조를 사용하세요.",
    "5. 단순 나열이 아닌, " +
      periodLabel[periodKey] +
      " 전체를 관통하는 전략적 통찰을 담으세요.",
    "6. [중요] 출처 인용번호([1], [2] 등) 및 마크다운 기호(*, #)를 절대 포함하지 마세요.",
  ].join("\n");

  var payload = {
    model: "sonar",
    messages: [
      {
        role: "system",
        content: "당신은 삼성전자 공급망 전략 분석가이자 전문 뉴스 앵커입니다.",
      },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.6,
  };

  try {
    var response = UrlFetchApp.fetch(
      "https://api.perplexity.ai/chat/completions",
      {
        method: "post",
        headers: {
          Authorization: "Bearer " + apiKey,
          "Content-Type": "application/json",
        },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true,
      },
    );
    var json = JSON.parse(response.getContentText());
    if (json.choices && json.choices.length > 0)
      return json.choices[0].message.content;
    return "대본 생성 중 구조적 오류가 발생했습니다.";
  } catch (e) {
    return "API 호출 오류: " + e.toString();
  }
}

// [신규] 기간별 대본을 Insight 시트에 저장
function saveMultiPeriodScriptsToSheet(scripts, today, categorizedData) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Insight");

  // 이름으로 못 찾은 경우 전체 시트를 순회하며 확인 (가장 확실함)
  if (!sheet) {
    var allSheets = ss.getSheets();
    for (var i = 0; i < allSheets.length; i++) {
      if (allSheets[i].getName().trim() === "Insight") {
        sheet = allSheets[i];
        break;
      }
    }
  }

  // 그래도 없으면 생성 (동시성 이슈 대비 try-catch)
  if (!sheet) {
    try {
      sheet = ss.insertSheet("Insight");
    } catch (e) {
      sheet = ss.getSheetByName("Insight");
      if (!sheet)
        throw new Error(
          "Insight 시트를 찾거나 생성할 수 없습니다. 수동으로 'Insight' 시트를 만들어주세요.",
        );
    }
  }

  sheet.clear();
  var CATS = ["all", "원자재", "거시경제", "생산지역", "경쟁사", "신기술동향"];
  var PERIODS = ["thisWeek", "lastWeek", "thisMonth", "lastMonth"];

  var headers = [
    "기간",
    "카테고리",
    "생성일시",
    "AI 브리핑 대본",
    "포함된 기사 제목",
  ];
  sheet
    .appendRow(headers)
    .getRange(1, 1, 1, headers.length)
    .setFontWeight("bold")
    .setBackground("#f3f3f3");

  var rows = [];
  var nowStr = Utilities.formatDate(today, "GMT+9", "yyyy-MM-dd HH:mm");

  PERIODS.forEach(function (p) {
    CATS.forEach(function (cat) {
      var script = (scripts[p] && scripts[p][cat]) || "";
      if (!script) return;

      var titles = "";
      if (cat === "all") {
        titles = (categorizedData[p] || []).map((d) => d.Title).join("\n");
      } else {
        titles =
          (categorizedData.byCategory[cat] &&
            categorizedData.byCategory[cat][p]) ||
          [];
        titles = titles.map((d) => d.Title).join("\n");
      }

      rows.push([p, cat, nowStr, script, titles]);
    });
  });

  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
    sheet.setColumnWidth(4, 500);
    sheet.setColumnWidth(5, 300);
    sheet.getRange(2, 4, rows.length, 2).setWrap(true);
  }
}
