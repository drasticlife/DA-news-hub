// DA News Hub 통합 스크립트 (v15.18 - Limit Removed & Ultimate Stable Version)
// -----------------------------------------------------------------
// [유지] 기존의 앵커 브리핑, 요약 정제 등 모든 기존 기능 100% 완벽 유지!
// [개선] 30개 개수 제한 해제! (가능한 많은 이미지를 한 번에 수집)
// [개선] 타임아웃을 유발하는 악성 사이트 영구 스킵 + 동적 꼬리표 정제
// -----------------------------------------------------------------

var GITHUB_OWNER = "drasticlife";
var GITHUB_REPO = "DA-news-hub";
var GITHUB_BRANCH = "main";
var RECIPIENT_EMAILS = ["jsman.moon@samsung.com", "drasticlife@gmail.com"];

var FOLDER_ID = "11OsMn-4WoNhg9QfxgraLQSJtkmG7PXTj";
var SAFE_TIME_LIMIT = 240000; // 4분 안전장치 (구글 6분 강제종료 방어용)
var DEFAULT_IMAGE_URL = "https://drasticlife.github.io/DA-news-hub/default_news_cover.jpg";
var SKIP_EXTENSIONS = [".pdf", ".xls", ".xlsx", ".doc", ".docx", ".zip", ".hwp", ".ppt", ".pptx"];

// 악성 무한 대기를 유발하는 사이트 차단
var SKIP_DOMAINS = [
  "cmegroup.com", "tradingeconomics.com", "lme.com", "metal.com", "sunsirs.com",
  "reuters.com", "bloomberg.com", "wsj.com", "ft.com", "nytimes.com", "washingtonpost.com",
  "xe.com", "poundsterlinglive.com", "dyson.com", "dyson.com.sg", "news.samsung.com"
];

var CATEGORY_MAP_EN = {
  "전략 시황": "Strategic Market",
  "원자재": "Raw Materials",
  "거시경제": "Macro/Policy",
  "생산지역": "Production Region",
  "경쟁사": "Competitors",
  "신기술동향": "New Tech Trends",
  "AI기술": "AI Tech",
  "신기술": "New Tech",
};

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("News Hub Tools")
    .addItem("⚡ 한 번에 처리 (앵커 대본 포함)", "runAllProcessesWithAnchor")
    .addItem("⚡ 한 번에 처리 (앵커 대본 제외)", "runAllProcessesWithoutAnchor")
    .addSeparator()
    .addItem("🚀 News 데이터 전송 (JSON)", "pushToGitHub")
    .addItem("🚀 Insight 데이터 전송 (시트 -> GitHub)", "runManualInsightPush")
    .addSeparator()
    .addItem("1. 이미지 가져오기 (무제한/에러 시 재도전)", "updateNewsImages")
    .addItem("2. 영문 번역 실행", "translateEmptyEnglishFields")
    .addItem("3. 🎤 앵커 브리핑 생성 및 배포", "runAnchorBotAutomation")
    .addItem("4. Insight 시트 정비 (중복 제거 및 정제)", "cleanInsightSheet")
    .addItem("5. 🧹 데이터 정제 (제목·요약 찌꺼기 제거)", "cleanDataColumns")
    .addSeparator()
    .addItem("파일 권한 수정", "fixExistingImagePermissions")
    .addItem("📬 Daily News 이메일 발송", "sendDailyNewsEmail")
    .addSeparator()
    .addItem("🛠️ 사용자 승인 드롭다운 설정", "setupUserValidation")
    .addSeparator()
    .addItem("🔄 기존 사용자 Supabase 마이그레이션", "migrateUsersToSupabase")
    .addToUi();
}

function doGet(e) {
  var type = e && e.parameter ? e.parameter.type : null;
  if (type === "monthly") {
    return ContentService.createTextOutput(JSON.stringify(getMonthlyStatsJson())).setMimeType(ContentService.MimeType.JSON);
  }
  return ContentService.createTextOutput(JSON.stringify(getSheetDataAsJson())).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var params = JSON.parse(e.postData.contents);
    var action = params.action;
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    if (action === "register") return handleRegister(ss, params);
    else if (action === "login") return handleLogin(ss, params);
    else if (action === "like") return handleLike(ss, params);
    else if (action === "board" || action === "board_post") return handleBoard(ss, params);
    else if (action === "get_board_posts") return handleGetBoardPosts(ss);
    else {
      if (params.title) return handleView(ss, params);
      return ContentService.createTextOutput(JSON.stringify({ success: false, message: "Invalid action or missing title" })).setMimeType(ContentService.MimeType.JSON);
    }
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, message: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function handleRegister(ss, params) {
  var userSheet = ss.getSheetByName("Users") || createUsersSheet(ss);
  var userId = params.userId, userName = params.userName, password = params.password;
  if (!userId || !userName || !password) throw new Error("Missing registration fields");
  var data = userSheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) { if (data[i][0] === userId) throw new Error("UserID already exists"); }
  userSheet.appendRow([userId, userName, password, "Pending", new Date()]);
  return ContentService.createTextOutput(JSON.stringify({ success: true, message: "Registration successful. Please wait for admin approval." })).setMimeType(ContentService.MimeType.JSON);
}

function handleLogin(ss, params) {
  var userSheet = ss.getSheetByName("Users");
  if (!userSheet) throw new Error("No users registered yet");
  var data = userSheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === params.userId && String(data[i][2]) === String(params.password)) {
      if (data[i][3] !== "Approved") return ContentService.createTextOutput(JSON.stringify({ success: false, message: "Account is pending approval." })).setMimeType(ContentService.MimeType.JSON);
      return ContentService.createTextOutput(JSON.stringify({ success: true, userId: params.userId, userName: data[i][1] })).setMimeType(ContentService.MimeType.JSON);
    }
  }
  return ContentService.createTextOutput(JSON.stringify({ success: false, message: "Invalid credentials" })).setMimeType(ContentService.MimeType.JSON);
}

function handleView(ss, params) {
  var targetTitle = params.title, targetDate = params.date, targetUrl = params.url;
  var sessionId = params.sessionId || "unknown", category = params.category || "MISC", risk = params.risk || "Low";
  if (!targetTitle) throw new Error("Title is required");

  var sheet = ss.getSheetByName("뉴스") || ss.getSheets()[0];
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var idxTitle = headers.indexOf("Title"), idxDate = headers.indexOf("Date"), idxUrl = headers.indexOf("URL"), idxView = headers.indexOf("ViewCount");
  
  if (idxTitle === -1) throw new Error("Title column not found");
  if (idxView === -1) { idxView = headers.length; sheet.getRange(1, idxView + 1).setValue("ViewCount"); }

  var foundIndex = -1;
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idxTitle]) === String(targetTitle)) {
      var rowDate = data[i][idxDate] instanceof Date ? data[i][idxDate].toISOString() : String(data[i][idxDate]);
      var matchDate = !targetDate || rowDate.indexOf(targetDate.split("T")[0]) !== -1;
      var matchUrl = !targetUrl || String(data[i][idxUrl]).indexOf(targetUrl) !== -1;
      if (matchDate && matchUrl) { foundIndex = i + 1; break; }
    }
  }
  if (foundIndex === -1) {
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][idxTitle]) === String(targetTitle)) { foundIndex = i + 1; break; }
    }
  }

  if (foundIndex !== -1) {
    var currentView = Number(sheet.getRange(foundIndex, idxView + 1).getValue()) || 0;
    sheet.getRange(foundIndex, idxView + 1).setValue(currentView + 1);
    updateMonthlyStats(targetTitle, category, risk, sessionId);
    return ContentService.createTextOutput(JSON.stringify({ success: true, count: currentView + 1 })).setMimeType(ContentService.MimeType.JSON);
  }
  return ContentService.createTextOutput(JSON.stringify({ success: false, message: "Article not found" })).setMimeType(ContentService.MimeType.JSON);
}

function handleLike(ss, params) {
  var targetTitle = params.title;
  if (!targetTitle) throw new Error("Title is required");

  var sheet = ss.getSheetByName("뉴스") || ss.getSheets()[0];
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var idxTitle = headers.indexOf("Title"), idxLike = headers.indexOf("LikeCount");
  if (idxLike === -1) { idxLike = headers.length; sheet.getRange(1, idxLike + 1).setValue("LikeCount"); }

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idxTitle]) === String(targetTitle)) {
      var currentLike = Number(sheet.getRange(i + 1, idxLike + 1).getValue()) || 0;
      sheet.getRange(i + 1, idxLike + 1).setValue(currentLike + 1);
      return ContentService.createTextOutput(JSON.stringify({ success: true, count: currentLike + 1 })).setMimeType(ContentService.MimeType.JSON);
    }
  }
  throw new Error("Article not found");
}

function handleBoard(ss, params) {
  var boardSheet = ss.getSheetByName("Board") || createBoardSheet(ss);
  if (!params.userId || !params.content) throw new Error("Missing board fields");
  boardSheet.appendRow([params.userId, params.userName, params.content, params.type || "General", new Date()]);
  return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
}

function getSheetDataAsJson() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("뉴스") || SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  var data = sheet.getDataRange().getValues();
  if (data.length === 0) return [];
  var headers = data[0];
  return data.slice(1).map(function (row) {
    var obj = {};
    headers.forEach(function (header, index) { if (header) obj[header] = row[index] instanceof Date ? row[index].toISOString() : row[index]; });
    return obj;
  });
}

function getSpecificSheetDataAsJson(sheetName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName) || ss.getSheets().find(s => s.getName().trim() === sheetName) || (sheetName === "뉴스" ? ss.getSheets()[0] : null);
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  if (data.length === 0) return [];
  var headers = data[0];
  var dateColIdx = headers.indexOf("Date");
  return data.slice(1).map(function (row) {
    var obj = {};
    headers.forEach(function (header, index) {
      if (!header) return;
      var val = row[index];
      // Date 컬럼은 KST 기준 YYYY.MM.DD 텍스트로 강제 변환 (UTC 변환으로 날짜 밀림 방지)
      if (index === dateColIdx && val instanceof Date) {
        var tz = new Date(val.getTime() + 9 * 60 * 60 * 1000); // KST(+9)
        var y = tz.getUTCFullYear();
        var m = String(tz.getUTCMonth() + 1).padStart(2, "0");
        var d = String(tz.getUTCDate()).padStart(2, "0");
        obj[header] = y + "." + m + "." + d;
      } else {
        obj[header] = val instanceof Date ? val.toISOString() : val;
      }
    });
    // [신규] 고유 ID 생성 (제목 + 날짜 조합의 간단한 해시)
    var rawIdStr = (obj["Title"] || "") + (obj["Date"] || "");
    obj["_uId"] = "n-" + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, rawIdStr)).replace(/=/g, "");
    
    return obj;
  });
}

function pushToGitHub() {
  var token = PropertiesService.getScriptProperties().getProperty("GITHUB_TOKEN");
  if (!token) { SpreadsheetApp.getUi().alert("GITHUB_TOKEN이 필요합니다. [프로젝트 설정]에서 추가해주세요."); return; }

  // [월별 분할] 현재 날짜 기준으로 파일명 자동 결정
  var today = new Date();
  var year = today.getFullYear();
  var month = String(today.getMonth() + 1).padStart(2, "0");
  var monthlyFileName = "news/" + year + "-M" + month + ".json";

  // 전체 데이터 로드
  var allData = getSpecificSheetDataAsJson("뉴스");

  // 현재 달 데이터만 필터링
  var monthPrefix1 = year + "." + month;   // 2026.03 형식
  var monthPrefix2 = year + "-" + month;   // 2026-03 형식
  var monthlyData = allData.filter(function(item) {
    var dateVal = String(item["Date"] || "");
    return dateVal.startsWith(monthPrefix1) || dateVal.startsWith(monthPrefix2);
  });

  var encodedMonthly = Utilities.base64Encode(Utilities.newBlob(JSON.stringify(monthlyData, null, 2)).getBytes());

  // [신규] 월별 파일에 저장 (news/2026-M03.json)
  var res1 = uploadSingleFile(monthlyFileName, encodedMonthly, token);

  // [신규] news/index.json 업데이트 (월 목록)
  var updatedIndex = buildNewsIndex(token);
  if (updatedIndex) {
    var encodedIndex = Utilities.base64Encode(Utilities.newBlob(JSON.stringify(updatedIndex, null, 2)).getBytes());
    uploadSingleFile("news/index.json", encodedIndex, token);
  }

  // [레거시 유지, 주석처리] 기존 data.json 방식 — 하위 호환 필요 시 주석 해제
  // var encodedAll = Utilities.base64Encode(Utilities.newBlob(JSON.stringify(allData, null, 2)).getBytes());
  // uploadSingleFile("data.json", encodedAll, token);

  if (res1.success) {
    SpreadsheetApp.getActiveSpreadsheet().toast(
      monthlyFileName + " 업데이트 성공 (" + monthlyData.length + "건)",
      "성공"
    );
  } else {
    SpreadsheetApp.getUi().alert("전송 실패: " + (res1.message || ""));
  }
}

// [월별 분할] news/index.json 내용 빌드 헬퍼
function buildNewsIndex(token) {
  try {
    var url = "https://api.github.com/repos/" + GITHUB_OWNER + "/" + GITHUB_REPO + "/contents/news?ref=" + GITHUB_BRANCH;
    var res = UrlFetchApp.fetch(url, { method: "get", headers: { Authorization: "Bearer " + token }, muteHttpExceptions: true });
    if (res.getResponseCode() !== 200) return null;
    var files = JSON.parse(res.getContentText());
    var months = files
      .map(function(f) { return f.name.replace(".json", ""); })
      .filter(function(name) { return /^\d{4}-M\d{2}$/.test(name); })
      .sort();
    return {
      months: months,
      latest: months[months.length - 1] || null,
      updated: new Date().toISOString()
    };
  } catch (e) {
    console.warn("buildNewsIndex 실패", e);
    return null;
  }
}

function runManualInsightPush() { runAnchorBotAutomation(false); }

function uploadSingleFile(fileName, encodedContent, token) {
  var url = "https://api.github.com/repos/" + GITHUB_OWNER + "/" + GITHUB_REPO + "/contents/" + fileName;
  var sha = null;
  try {
    var res = UrlFetchApp.fetch(url + "?ref=" + GITHUB_BRANCH, { method: "get", headers: { Authorization: "Bearer " + token }, muteHttpExceptions: true });
    if (res.getResponseCode() === 200) sha = JSON.parse(res.getContentText()).sha;
  } catch (e) {}

  var payload = { message: "Update " + fileName + " via Google Sheets", content: encodedContent, branch: GITHUB_BRANCH };
  if (sha) payload.sha = sha;

  try {
    var putRes = UrlFetchApp.fetch(url, { method: "put", headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" }, payload: JSON.stringify(payload), muteHttpExceptions: true });
    if (putRes.getResponseCode() === 200 || putRes.getResponseCode() === 201) return { success: true };
    return { success: false, message: putRes.getContentText() };
  } catch (e) { return { success: false, message: e.toString() }; }
}

function translateEmptyEnglishFields() {
  var startTime = new Date().getTime();
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var required = ["Title_en", "Summary_en", "Category_en", "Tag_en", "Region_en"];
  var colMap = {};
  
  headers.forEach(function (h, i) { colMap[h] = i; });
  required.forEach(function (c) {
    if (colMap[c] === undefined) {
      sheet.getRange(1, sheet.getLastColumn() + 1).setValue(c);
      colMap[c] = sheet.getLastColumn() - 1;
    }
  });
  
  var idxT = colMap["Title"], idxS = colMap["Summary"], idxC = colMap["Category"], idxR = colMap["Region"], idxTa = colMap["Tag"];
  var idxTe = colMap["Title_en"], idxSe = colMap["Summary_en"], idxCe = colMap["Category_en"], idxRe = colMap["Region_en"], idxTae = colMap["Tag_en"];
  var count = 0;

  for (var i = 1; i < data.length; i++) {
    if (new Date().getTime() - startTime > SAFE_TIME_LIMIT) break;
    var rowNum = i + 1;
    if (idxT !== undefined && data[i][idxT] && !data[i][idxTe]) { sheet.getRange(rowNum, idxTe + 1).setValue(LanguageApp.translate(data[i][idxT], "ko", "en")); count++; }
    if (idxS !== undefined && data[i][idxS] && !data[i][idxSe]) { sheet.getRange(rowNum, idxSe + 1).setValue(LanguageApp.translate(data[i][idxS], "ko", "en")); count++; }
    if (idxC !== undefined && data[i][idxC] && !data[i][idxCe]) { sheet.getRange(rowNum, idxCe + 1).setValue(CATEGORY_MAP_EN[data[i][idxC]] || LanguageApp.translate(data[i][idxC], "ko", "en")); count++; }
    if (idxR !== undefined && data[i][idxR] && !data[i][idxRe]) { sheet.getRange(rowNum, idxRe + 1).setValue(LanguageApp.translate(data[i][idxR], "ko", "en")); count++; }
    if (idxTa !== undefined && data[i][idxTa] && !data[i][idxTae]) { sheet.getRange(rowNum, idxTae + 1).setValue(LanguageApp.translate(data[i][idxTa], "ko", "en")); count++; }
  }
  SpreadsheetApp.getUi().alert("번역 완료: " + count + "건");
}

// =================================================================
// 🚀 V15.18 무제한 이미지 추출 로직 (안전장치만 남기고 30개 제한 해제)
// =================================================================
function updateNewsImages() {
  var startTime = new Date().getTime();
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  
  var idxU = headers.indexOf("URL");
  var idxI = headers.indexOf("Image");
  var idxC = headers.indexOf("Category") !== -1 ? headers.indexOf("Category") : headers.indexOf("카테고리");
    
  if (idxU === -1 || idxI === -1) {
    SpreadsheetApp.getUi().alert("URL 또는 Image 열을 찾을 수 없습니다.");
    return;
  }

  var requestsCount = 0;
  var successCount = 0;

  var imageColumnData = [];
  for (var i = 1; i < data.length; i++) {
    imageColumnData.push([data[i][idxI]]);
  }

  console.log("🔍 역순 탐색 이미지 수집 시작 (전체 진행)");

  for (var i = data.length - 1; i >= 1; i--) {
    
    // 4분 초과 시 깔끔하게 자동 중단 후 저장
    if (new Date().getTime() - startTime > SAFE_TIME_LIMIT) {
      console.warn("⚠️ 4분 시간 제한 도달. 현재까지의 작업을 저장하고 안전 종료합니다.");
      break;
    }

    if (!data[i][idxI] && data[i][idxU]) { 
      
      var rawUrl = String(data[i][idxU]);
      var spacedUrl = rawUrl.replace(/https?:\/\//g, ' $&');
      var urlRegex = /(https?:\/\/[^\s]+)/g;
      var matches = spacedUrl.match(urlRegex) || [];
      
      var urls = [];
      for (var m = 0; m < matches.length; m++) {
        var cleanU = matches[m].split('[')[0]; 
        cleanU = cleanU.replace(/[\u200B-\u200D\uFEFF]/g, ''); 
        cleanU = cleanU.replace(/\+\d+$/, '');
        
        var urlObjMatch = cleanU.match(/^https?:\/\/([^\/]+)/i);
        if (urlObjMatch) {
            var domain = urlObjMatch[1].toLowerCase().replace(/^www\./, '');
            var dParts = domain.split('.');
            
            var s3 = dParts.join("."); 
            var s2 = dParts.length > 1 ? dParts[0] + "." + dParts[1] : ""; 
            var s1 = dParts[0]; 
            
            if (s3 && cleanU.toLowerCase().endsWith(s3)) {
                cleanU = cleanU.substring(0, cleanU.length - s3.length);
            } else if (s2 && cleanU.toLowerCase().endsWith(s2)) {
                cleanU = cleanU.substring(0, cleanU.length - s2.length);
            } else if (s1 && cleanU.toLowerCase().endsWith(s1)) {
                cleanU = cleanU.substring(0, cleanU.length - s1.length);
            }
        }
        
        cleanU = cleanU.replace(/[\.\,\'\"\;]+$/, '').trim();
        
        if (cleanU && cleanU.startsWith("http")) {
          urls.push(cleanU);
        }
      }

      var category = idxC !== -1 ? String(data[i][idxC]).trim() : "";
      var validUrls = [];
      
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

        if (!shouldSkip) validUrls.push(url); 
      }

      if (validUrls.length > 0) {
        requestsCount++;
        var rowNum = i + 1; 
        var finalImageUrl = DEFAULT_IMAGE_URL;

        for (var v = 0; v < validUrls.length; v++) {
          var targetUrl = validUrls[v];
          console.log("▶️ [" + rowNum + "행] URL " + (v+1) + "/" + validUrls.length + " 시도 중: " + targetUrl);
          
          try {
            var response = UrlFetchApp.fetch(targetUrl, {
              muteHttpExceptions: true,
              followRedirects: true,
              headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
            });

            if (response.getResponseCode() === 200) {
              var html = response.getContentText();
              var metaMatch = html.match(/<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]+content=["']([^"']+)["']/i) ||
                              html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image|twitter:image)["']/i);
              
              var foundImage = null;

              if (metaMatch && metaMatch[1]) {
                foundImage = metaMatch[1];
              } else {
                var ldMatch = html.match(/<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
                if (ldMatch && ldMatch[1]) {
                  try {
                    var ldData = JSON.parse(ldMatch[1]);
                    if (ldData.image) {
                      if (typeof ldData.image === 'string') foundImage = ldData.image;
                      else if (Array.isArray(ldData.image) && ldData.image.length > 0) foundImage = typeof ldData.image[0] === 'string' ? ldData.image[0] : (ldData.image[0].url);
                      else if (ldData.image.url) foundImage = ldData.image.url;
                    } else if (ldData.thumbnailUrl) foundImage = ldData.thumbnailUrl;
                  } catch(e) {}
                }
              }

              if (foundImage) {
                if (foundImage.indexOf("http") !== 0) {
                  var baseUrlMatch = targetUrl.match(/^https?:\/\/[^/]+/);
                  if (baseUrlMatch) foundImage = baseUrlMatch[0] + (foundImage.indexOf("/") === 0 ? "" : "/") + foundImage;
                }
                finalImageUrl = foundImage;
                console.log("✅ [" + rowNum + "행] 이미지 찾기 성공!");
                break; 
              }
            }
          } catch (e) {
            console.log("❌ [" + rowNum + "행] 통신 실패. 다음 URL로 재도전!");
          }
        } 
        
        imageColumnData[i - 1][0] = finalImageUrl;
        if (finalImageUrl !== DEFAULT_IMAGE_URL) successCount++;

      } else {
        imageColumnData[i - 1][0] = DEFAULT_IMAGE_URL;
      }
    }
  }

  // 변경된 내용을 한 번에 시트에 업데이트
  if (data.length > 1) {
    sheet.getRange(2, idxI + 1, imageColumnData.length, 1).setValues(imageColumnData);
  }

  // 아직 남은 빈칸 확인
  var remainingCount = 0;
  for (var i = 1; i < data.length; i++) {
    if (!imageColumnData[i - 1][0] && data[i][idxU]) {
      remainingCount++;
    }
  }

  if (remainingCount > 0) {
    SpreadsheetApp.getUi().alert("⏱️ 실행 시간 초과 방지를 위해 " + requestsCount + "건 처리 후 안전하게 자동 종료되었습니다!\n\n아직 이미지를 가져와야 할 기사가 " + remainingCount + "건 남아있습니다.\n[1. 이미지 가져오기] 메뉴를 한 번 더 눌러주시면 이어서 작업합니다.");
  } else {
    SpreadsheetApp.getUi().alert("✅ 모든 이미지 작업 완료! (" + successCount + "건의 이미지를 성공적으로 찾았습니다)");
  }
}

function fixExistingImagePermissions() {
  var folder = DriveApp.getFolderById(FOLDER_ID);
  var files = folder.getFiles();
  while (files.hasNext()) { files.next().setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); }
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
    if (statsData[i][0] === monthKey && statsData[i][1] === title) { foundRow = i + 1; break; }
  }
  if (foundRow === -1) {
    statsSheet.appendRow([monthKey, title, category, risk, 1, 1]);
    logSheet.appendRow([monthKey, title, sessionId]);
  } else {
    var currentViews = Number(statsData[foundRow - 1][4]) || 0;
    statsSheet.getRange(foundRow, 5).setValue(currentViews + 1);
    var logData = logSheet.getDataRange().getValues();
    var isNewSession = true;
    for (var j = 1; j < logData.length; j++) {
      if (logData[j][0] === monthKey && logData[j][1] === title && logData[j][2] === sessionId) { isNewSession = false; break; }
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
  if (!targetSheet) return;
  var range = targetSheet.getRange("D2:D");
  var rule = SpreadsheetApp.newDataValidation().requireValueInList(["Pending", "Approved", "Rejected"], true).setAllowInvalid(false).setHelpText("Pending, Approved, Rejected 중 하나를 선택해주세요.").build();
  range.setDataValidation(rule);
}

function createBoardSheet(ss) {
  var sheet = ss.insertSheet("Board");
  sheet.appendRow(["UserID", "UserName", "Content", "Type", "Timestamp"]);
  sheet.getRange(1, 1, 1, 5).setFontWeight("bold").setBackground("#f3f3f3");
  return sheet;
}

/**
 * 기존 가입자 정보를 Supabase profiles 테이블로 마이그레이션합니다.
 */
function migrateUsersToSupabase() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var userSheet = ss.getSheetByName("Users");
  if (!userSheet) return Browser.msgBox("Users 시트가 없습니다.");

  var props = PropertiesService.getScriptProperties();
  var url = props.getProperty("SUPABASE_URL");
  var key = props.getProperty("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !key) return Browser.msgBox("스크립트 속성에 SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY를 설정해주세요.");

  var data = userSheet.getDataRange().getValues();
  var success = 0;
  for (var i = 1; i < data.length; i++) {
    var email = data[i][0], name = data[i][1];
    if (!email || !name) continue;
    try {
      var res = UrlFetchApp.fetch(url + "/rest/v1/profiles", {
        method: "POST",
        headers: { "Authorization": "Bearer " + key, "apikey": key, "Content-Type": "application/json", "Prefer": "resolution=merge-duplicates" },
        payload: JSON.stringify({ full_name: name, email: email, status: 'approved' }),
        muteHttpExceptions: true
      });
      if (res.getResponseCode() < 300) success++;
    } catch (e) {}
  }
  Browser.msgBox("마이그레이션 완료: " + success + "건 성공");
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
    headers.forEach(function (header, index) { obj[header] = row[index]; });
    return obj;
  });
}

function runAllProcessesWithAnchor() { runAllProcesses(true); }
function runAllProcessesWithoutAnchor() { runAllProcesses(false); }

function runAllProcesses(includeAnchor) {
  var ui = SpreadsheetApp.getUi();
  var anchorSuffix = includeAnchor ? " (앵커 대본 포함)" : " (앵커 대본 제외)";
  var response = ui.alert("자동화를 시작하시겠습니까?" + anchorSuffix, "데이터 정리 → 번역 → 이미지 → " + (includeAnchor ? "앵커 대본 → " : "") + "GitHub 전송이 순차적으로 실행됩니다.", ui.ButtonSet.YES_NO);
  if (response !== ui.Button.YES) return;

  try {
    cleanPastedData();
    SpreadsheetApp.flush();
    SpreadsheetApp.getActiveSpreadsheet().toast("데이터 정리가 완료되었습니다.", "진행 중", 3);
    
    translateEmptyEnglishFields();
    SpreadsheetApp.flush();
    SpreadsheetApp.getActiveSpreadsheet().toast("영문 번역이 완료되었습니다.", "진행 중", 3);
    
    updateNewsImages();
    SpreadsheetApp.flush();
    SpreadsheetApp.getActiveSpreadsheet().toast("이미지 업데이트가 완료되었습니다.", "진행 중", 3);
    
    runAnchorBotAutomation(includeAnchor);
    SpreadsheetApp.flush();
    SpreadsheetApp.getActiveSpreadsheet().toast(includeAnchor ? "앵커 브리핑 생성이 완료되었습니다." : "최신 앵커 브리핑(기존 데이터)을 유지합니다.", "진행 중", 3);
    
    pushToGitHub();
    SpreadsheetApp.flush();
    
    sendDailyNewsEmail();
    SpreadsheetApp.getActiveSpreadsheet().toast("모든 프로세스가 성공적으로 완료되었습니다.", "완료");
  } catch (err) {
    ui.alert("프로세스 중 오류 발생: " + err.toString());
  }
}

function cleanPastedData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("뉴스") || ss.getSheets()[0];
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var idxI = headers.indexOf("Image");
  var idxD = headers.indexOf("Date");
  var idxS = headers.indexOf("Summary");
  var idxT = headers.indexOf("Title");

  if (idxD === -1) return;

  for (var i = data.length - 1; i >= 1; i--) {
    var rowValue = String(data[i][idxD]);
    if (rowValue === "Date") {
      sheet.deleteRow(i + 1);
    } else {
      if (idxI !== -1 && String(data[i][idxI]).trim() === "-") { sheet.getRange(i + 1, idxI + 1).clearContent(); }
      if (idxT !== -1 && data[i][idxT]) {
        var cleanedTitle = cleanTitleText(String(data[i][idxT]));
        if (cleanedTitle !== String(data[i][idxT])) { sheet.getRange(i + 1, idxT + 1).setValue(cleanedTitle); }
      }
      if (idxS !== -1 && data[i][idxS]) {
        var cleaned = cleanSummaryText(String(data[i][idxS]));
        if (cleaned !== String(data[i][idxS])) { sheet.getRange(i + 1, idxS + 1).setValue(cleaned); }
      }
    }
  }
}

function cleanTitleText(text) {
  if (!text) return text;
  // Remove source info like tomsguide+2 or people+2
  text = text.replace(/\s*[a-zA-Z][a-zA-Z0-9\.\-]*\+\d+/g, '');
  return text.trim();
}

function cleanSummaryText(text) {
  if (!text) return text;
  text = text.replace(/\s*참고:\s*[^\n]+/g, '');
  text = text.replace(/\s*[a-zA-Z][a-zA-Z0-9\.\-]*\+\d+/g, '');
  text = text.replace(/(?<![\*=\[\(])\b(reuters|bloomberg|apnews|yonhap|wsj|nikkei|ft|cnn|bbc|apnews|cnbc|techcrunch|theverge|wired|engadget)\b(?![\*=\]\)])/gi, '');
  text = text.replace(/([^\s])==/g, '$1 ==');
  text = text.replace(/==([^\s=])/g, '== $1');
  text = text.replace(/\s*(액션\s*:)\s*/g, '\n\n액션: \n');
  text = text.replace(/\s*(시사점\s*:)\s*/g, '\n\n시사점: \n');
  text = text.replace(/\s*([①②③④⑤⑥⑦⑧⑨⑩])/g, '\n  $1');
  text = text.replace(/[ \t]{2,}/g, ' ');
  text = text.replace(/(\(우선순위:[^)]+기한:[^)]+\))[^①②③④⑤⑥⑦⑧⑨⑩\n]*/g, '$1');
  text = text.replace(/\n{3,}/g, '\n\n');
  return text.trim();
}

function cleanDataColumns() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var idxS = headers.indexOf("Summary");
  var idxT = headers.indexOf("Title");
  
  if (idxS === -1 && idxT === -1) { 
    SpreadsheetApp.getUi().alert("'Summary' 또는 'Title' 컬럼을 찾을 수 없습니다."); 
    return; 
  }
  
  var countS = 0;
  var countT = 0;
  
  for (var i = 1; i < data.length; i++) {
    // Title 정제
    if (idxT !== -1 && data[i][idxT]) {
      var originalT = String(data[i][idxT]);
      var cleanedT = cleanTitleText(originalT);
      if (cleanedT !== originalT) {
        sheet.getRange(i + 1, idxT + 1).setValue(cleanedT);
        countT++;
      }
    }
    
    // Summary 정제
    if (idxS !== -1 && data[i][idxS]) {
      var originalS = String(data[i][idxS]);
      var cleanedS = cleanSummaryText(originalS);
      if (cleanedS !== originalS) {
        sheet.getRange(i + 1, idxS + 1).setValue(cleanedS);
        countS++;
      }
    }
  }
  
  var msg = "";
  if (countT > 0) msg += "제목 " + countT + "건, ";
  if (countS > 0) msg += "요약 " + countS + "건";
  
  if (msg === "") {
    SpreadsheetApp.getActiveSpreadsheet().toast("정제할 데이터가 없습니다.", "✅ 완료");
  } else {
    SpreadsheetApp.getActiveSpreadsheet().toast(msg + "을 정제했습니다.", "✅ 완료", 4);
  }
}

function handleGetBoardPosts(ss) {
  var boardSheet = ss.getSheetByName("Board");
  if (!boardSheet) { return ContentService.createTextOutput(JSON.stringify({ success: true, posts: [] })).setMimeType(ContentService.MimeType.JSON); }
  var data = boardSheet.getDataRange().getValues();
  var headers = data[0];
  var rows = data.slice(1);
  var posts = rows.map(function (row) { return { userId: row[0], userName: row[1], content: row[2], type: row[3], timestamp: row[4] }; }).reverse();
  return ContentService.createTextOutput(JSON.stringify({ success: true, posts: posts })).setMimeType(ContentService.MimeType.JSON);
}

function runAnchorBotAutomation(includeAnchor) {
  if (includeAnchor === undefined) includeAnchor = true;
  var data = getSheetDataAsJson();
  if (!data || data.length === 0) { SpreadsheetApp.getUi().alert("데이터가 없습니다."); return; }
  var today = new Date();
  var categorizedData = categorizeAndFilterData(data, today);
  var scripts;
  if (includeAnchor) {
    SpreadsheetApp.getActiveSpreadsheet().toast("AI 대본 생성 중 (기간별/카테고리별 확장)... 약 1~2분 소요", "진행중", 120);
    scripts = generateMultiPeriodScripts(categorizedData, today);
    saveMultiPeriodScriptsToSheet(scripts, today, categorizedData);
  } else {
    SpreadsheetApp.getActiveSpreadsheet().toast("Insight 시트에서 최신 대본을 불러옵니다...", "진행중", 10);
    scripts = getLatestScriptsFromSheet();
  }
  var intelReport = {
    last_updated: Utilities.formatDate(today, "GMT+9", "yyyy-MM-dd HH:mm:ss"),
    dailyBriefing: { anchor_name: "Strategic-Bot", script: (scripts.thisWeek && scripts.thisWeek.all) || "데이터 로드 중..." },
    scripts: scripts,
    categoryScripts: scripts.thisWeek, 
    categorized_issues: categorizedData,
  };
  var token = PropertiesService.getScriptProperties().getProperty("GITHUB_TOKEN");
  if (!token) { SpreadsheetApp.getUi().alert("GITHUB_TOKEN이 없습니다. [프로젝트 설정]에서 추가해주세요."); return; }
  var content = JSON.stringify(intelReport, null, 2);
  var encodedContent = Utilities.base64Encode(Utilities.newBlob(content).getBytes());
  var res = uploadSingleFile("intel_report.json", encodedContent, token);
  if (res.success) { SpreadsheetApp.getActiveSpreadsheet().toast("✅ 완료! Insight 시트 저장 + intel_report.json GitHub 배포 성공", "완료"); } 
  else { SpreadsheetApp.getUi().alert("GitHub 배포 실패: " + res.message); }
}

function saveScriptToInsightSheet(globalScript, categoryScripts, today, categorizedData) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Insight");
  var CATS = ["원자재", "거시경제", "생산지역", "경쟁사", "신기술동향"];
  if (!sheet) {
    sheet = ss.insertSheet("Insight");
    var headers = ["날짜", "종합 대본"];
    CATS.forEach(function (c) { headers.push(c + " 대본"); });
    headers.push("금주 TOP 제목", "전주 TOP 제목", "이번달 TOP 제목", "저번달 TOP 제목");
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#e8f0fe");
    sheet.setColumnWidth(1, 130);
    sheet.setColumnWidth(2, 400);
    for (var i = 0; i < CATS.length; i++) { sheet.setColumnWidth(3 + i, 350); }
    sheet.setColumnWidth(3 + CATS.length, 220);
    sheet.setColumnWidth(4 + CATS.length, 220);
    sheet.setColumnWidth(5 + CATS.length, 220);
    sheet.setColumnWidth(6 + CATS.length, 220);
  }
  var dateStr = Utilities.formatDate(today, "GMT+9", "yyyy-MM-dd HH:mm");
  var thisWeekTitles = (categorizedData.thisWeek || []).map(function (d) { return d.Title; }).join("\n");
  var lastWeekTitles = (categorizedData.lastWeek || []).map(function (d) { return d.Title; }).join("\n");
  var thisMonthTitles = (categorizedData.thisMonth || []).map(function (d) { return d.Title; }).join("\n");
  var lastMonthTitles = (categorizedData.lastMonth || []).map(function (d) { return d.Title; }).join("\n");
  var row = [dateStr, globalScript];
  CATS.forEach(function (c) { row.push(categoryScripts[c] || ""); });
  row.push(thisWeekTitles, lastWeekTitles, thisMonthTitles, lastMonthTitles);
  sheet.insertRowBefore(2);
  sheet.getRange(2, 1, 1, row.length).setValues([row]);
  for (var j = 0; j <= CATS.length; j++) { sheet.getRange(2, 2 + j).setWrap(true); }
}

function categorizeAndFilterData(data, baseDate) {
  var CATS = ["원자재", "거시경제", "생산지역", "경쟁사", "신기술동향"];
  var PERIODS = ["thisWeek", "lastWeek", "thisMonth", "lastMonth"];
  var riskScore = { "Very High": 4, "High": 3, "Med": 2, "Low": 1 };
  var oneDay = 24 * 60 * 60 * 1000;
  var baseDate = baseDate || new Date();
  var dayOfWeek = baseDate.getDay();
  var startOfThisWeek = new Date(baseDate.getTime() - dayOfWeek * oneDay);
  startOfThisWeek.setHours(0, 0, 0, 0);
  var startOfLastWeek = new Date(startOfThisWeek.getTime() - 7 * oneDay);
  var endOfLastWeek = new Date(startOfThisWeek.getTime() - oneDay);
  var startOfThisMonth = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
  var startOfLastMonth = new Date(baseDate.getFullYear(), baseDate.getMonth() - 1, 1);
  var endOfLastMonth = new Date(baseDate.getFullYear(), baseDate.getMonth(), 0);
  var result = { byCategory: {} };
  PERIODS.forEach(function (p) { result[p] = []; });
  CATS.forEach(function (c) {
    result.byCategory[c] = {};
    PERIODS.forEach(function (p) { result.byCategory[c][p] = []; });
  });
  data.forEach(function (item) {
    var dateVal = item.Date || item.date;
    if (!dateVal) return;
    var cleanDate = String(dateVal).replace(/\s/g, "").replace(/\./g, "-");
    var itemDate = new Date(cleanDate);
    if (isNaN(itemDate.getTime())) return;
    var periods = [];
    if (itemDate >= startOfThisWeek) periods.push("thisWeek");
    else if (itemDate >= startOfLastWeek && itemDate <= endOfLastWeek) periods.push("lastWeek");
    if (itemDate >= startOfThisMonth) periods.push("thisMonth");
    else if (itemDate >= startOfLastMonth && itemDate <= endOfLastMonth) periods.push("lastMonth");
    if (periods.length === 0) return;
    var rawCatVal = item.Category || item.category || item.C || item.I || item.J || item["카테고리"] || item["분류"] || item["Category_en"] || "";
    var rawCat = String(rawCatVal).trim();
    var rawCatLower = rawCat.toLowerCase();
    var matchedCat = null;
    CATS.forEach(function (c) { if (rawCat.indexOf(c) !== -1) matchedCat = c; });
    if (!matchedCat) {
      if (rawCatLower.indexOf("ai") !== -1 || rawCatLower.indexOf("tech") !== -1 || rawCat.indexOf("신기술") !== -1 || rawCat.indexOf("기술") !== -1) { matchedCat = "신기술동향"; }
    }
    if (!matchedCat) {
      if (rawCat.indexOf("거시") !== -1 || rawCat.indexOf("정책") !== -1 || rawCat.indexOf("환율") !== -1) { matchedCat = "거시경제"; }
      else if (rawCat.indexOf("신기술") !== -1 || rawCatLower.indexOf("ai기술") !== -1 || rawCatLower.indexOf("ai ") === 0 || rawCatLower === "ai기술") { matchedCat = "신기술동향"; }
    }
    periods.forEach(function (p) {
      result[p].push(item);
      if (matchedCat) result.byCategory[matchedCat][p].push(item);
    });
  });
  PERIODS.forEach(function (p) {
    result[p] = result[p].sort(function (a, b) { return (riskScore[b.Risk] || 0) - (riskScore[a.Risk] || 0); }).slice(0, 5);
    CATS.forEach(function (c) {
      result.byCategory[c][p] = result.byCategory[c][p].sort(function (a, b) { return (riskScore[b.Risk] || 0) - (riskScore[a.Risk] || 0); }).slice(0, 5);
    });
  });
  return result;
}

function generateMultiPeriodScripts(categorizedData, today) {
  var PERIODS = ["thisWeek", "lastWeek", "thisMonth", "lastMonth"];
  var CATS = ["all", "원자재", "거시경제", "생산지역", "경쟁사", "신기술동향"];
  var CAT_EN = { all: "Unified Supply Chain", "원자재": "Raw Materials", "거시경제": "Macro/Policy", "생산지역": "Production Region", "경쟁사": "Competitors", "신기술동향": "New Tech Trends" };
  var scripts = {};
  PERIODS.forEach(function (p) {
    scripts[p] = {};
    CATS.forEach(function (cat) {
      var targetData;
      if (cat === "all") { targetData = categorizedData[p] || []; }
      else { targetData = (categorizedData.byCategory[cat] && categorizedData.byCategory[cat][p]) || []; }
      if (targetData.length > 0 || cat === "신기술동향") {
        scripts[p][cat] = callPerplexityForSpecificPeriod(p, cat, CAT_EN[cat], targetData, today);
        Utilities.sleep(1100); 
      } else {
        scripts[p][cat] = null;
      }
    });
  });
  return scripts;
}

function callPerplexityForSpecificPeriod(periodKey, catKey, catNameEn, targetData, today) {
  var apiKey = PropertiesService.getScriptProperties().getProperty("PERPLEXITY_API_KEY");
  if (!apiKey) return "API Key Missing";
  var periodLabel = { thisWeek: "금주", lastWeek: "전주", thisMonth: "이번달", lastMonth: "저번달" };
  var dateStr = Utilities.formatDate(today, "GMT+9", "yyyy-MM-dd");
  var dataLines = targetData.length > 0 
      ? targetData.map((d) => "- " + d.Title + (d.Risk ? "(리스크:" + d.Risk + ")" : "")).join("\n") 
      : catKey === "신기술동향" ? "최신 AI 및 신기술 트렌드 정보 활용" : "데이터 없음";
  var userPrompt = [
    "오늘 날짜: " + dateStr + " (현재 " + periodLabel[periodKey] + " 리포트 작성 중)",
    "카테고리: " + catKey + " (" + catNameEn + ")", "",
    "[분석 대상 데이터]", dataLines, "",
    "[미션]",
    "1. 반드시 " + periodLabel[periodKey] + "의 흐름을 중심으로 6-8문장의 앵커 브리핑을 작성하세요.",
    "2. 첫 문장은 기간과 카테고리에 맞는 자연스러운 전문 직업인의 말투로 시작하세요.",
    "3. 핵심 수치나 리스크는 <b>굵게</b>, 가장 중요한 시사점은 <mark>하이라이트</mark> 태그를 사용하세요.",
    "4. '전망됩니다', '주시기 바랍니다' 등의 공적인 어조를 사용하세요.",
    "5. 단순 나열이 아닌, " + periodLabel[periodKey] + " 전체를 관통하는 전략적 통찰을 담으세요.",
    "6. [중요] 출처 인용번호([1], [2] 등) 및 마크다운 기호(*, 시트)를 절대 포함하지 마세요."
  ].join("\n");
  var payload = {
    model: "sonar",
    messages: [
      { role: "system", content: "당신은 삼성전자 공급망 전략 분석가이자 전문 뉴스 앵커입니다." },
      { role: "user", content: userPrompt }
    ],
    temperature: 0.6,
  };
  try {
    var response = UrlFetchApp.fetch("https://api.perplexity.ai/chat/completions", {
      method: "post",
      headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    });
    var json = JSON.parse(response.getContentText());
    if (json.choices && json.choices.length > 0) { return json.choices[0].message.content; }
    var fallback = getLatestValidScriptFromSheet(periodKey, catKey);
    if (fallback) return fallback;
    return "대본 생성 중 구조적 오류가 발생했습니다. (기존 대본 없음)";
  } catch (e) {
    var fallback = getLatestValidScriptFromSheet(periodKey, catKey);
    if (fallback) return fallback;
    return "API 호출 오류: " + e.toString();
  }
}

function saveMultiPeriodScriptsToSheet(scripts, today, categorizedData) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Insight") || ss.insertSheet("Insight");
  var CATS = ["all", "원자재", "거시경제", "생산지역", "경쟁사", "신기술동향"];
  var PERIODS = ["thisWeek", "lastWeek", "thisMonth", "lastMonth"];
  if (sheet.getLastRow() === 0) {
    var headers = ["기간", "카테고리", "생성일시", "AI 브리핑 대본", "포함된 기사 제목"];
    sheet.appendRow(headers).getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#f3f3f3");
    sheet.setColumnWidth(4, 500);
    sheet.setColumnWidth(5, 300);
  }
  var rows = [];
  var nowStr = Utilities.formatDate(today, "GMT+9", "yyyy-MM-dd HH:mm");
  PERIODS.forEach(function (p) {
    CATS.forEach(function (cat) {
      var script = (scripts[p] && scripts[p][cat]) || "";
      if (!script) return;
      var titles = "";
      if (cat === "all") { titles = (categorizedData[p] || []).map((d) => d.Title).join("\n"); } 
      else {
        titles = (categorizedData.byCategory[cat] && categorizedData.byCategory[cat][p]) || [];
        titles = titles.map((d) => d.Title).join("\n");
      }
      rows.push([p, cat, nowStr, script, titles]);
    });
  });
  if (rows.length > 0) {
    sheet.insertRowsBefore(2, rows.length);
    sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
    sheet.getRange(2, 4, rows.length, 2).setWrap(true);
  }
}

function getLatestValidScriptFromSheet(period, category) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Insight");
  if (!sheet) return null;
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === period && data[i][1] === category) {
      var script = data[i][3];
      if (script && script.indexOf("API 호출 오류") === -1 && script.indexOf("대본 생성 중 구조적 오류") === -1) { return script; }
    }
  }
  return null;
}

function getLatestScriptsFromSheet() {
  var PERIODS = ["thisWeek", "lastWeek", "thisMonth", "lastMonth"];
  var CATS = ["all", "원자재", "거시경제", "생산지역", "경쟁사", "신기술동향"];
  var scripts = {};
  PERIODS.forEach(function (p) {
    scripts[p] = {};
    CATS.forEach(function (cat) {
      scripts[p][cat] = getLatestValidScriptFromSheet(p, cat) || "기존 대본을 찾을 수 없습니다.";
    });
  });
  return scripts;
}

function cleanInsightSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Insight");
  if (!sheet) { SpreadsheetApp.getActiveSpreadsheet().toast("Insight 시트를 찾을 수 없습니다.", "오류"); return; }
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return;
  var cleanedCount = 0;
  var deletedCount = 0;
  for (var i = data.length - 1; i >= 1; i--) {
    var row = data[i];
    var isHeader = String(row[0]).trim() === "기간" && String(row[1]).trim() === "카테고리";
    if (isHeader) { sheet.deleteRow(i + 1); deletedCount++; continue; }
    var script = String(row[3]);
    if (script) {
      var newScript = script.replace(/data[a-zA-Z0-9\-_]*\.json/g, "").replace(/\s\s+/g, " ").trim();
      if (script !== newScript) { sheet.getRange(i + 1, 4).setValue(newScript); cleanedCount++; }
    }
  }
  SpreadsheetApp.getActiveSpreadsheet().toast("정비 완료: 헤더 삭제 " + deletedCount + "건, 대본 정제 " + cleanedCount + "건", "완료");
}

/**
 * [신규] 오늘 업데이트된 기사를 카테고리별로 묶어 이메일 발송
 */
function sendDailyNewsEmail() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("뉴스") || ss.getSheets()[0];
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return;

  var headers = data[0];
  var idxDate = headers.indexOf("Date");
  if (idxDate === -1) idxDate = headers.indexOf("날짜");
  if (idxDate === -1) idxDate = 0; // 최후의 수단으로 첫 번째 열 시도

  var idxTitle = headers.indexOf("Title");
  if (idxTitle === -1) idxTitle = headers.indexOf("제목");
  
  var idxCategory = headers.indexOf("Category") !== -1 ? headers.indexOf("Category") : headers.indexOf("카테고리");
  var idxRisk = headers.indexOf("Risk");
  var idxSummary = headers.indexOf("Summary");
  var idxUrl = headers.indexOf("URL");
  var idxImage = headers.indexOf("Image");

  // 날짜 정규화 헬퍼 (YYYY-MM-DD)
  function getNormalizedDateString(d) {
    if (!d) return "";
    var y, m, day;
    if (d instanceof Date) {
      y = d.getFullYear();
      m = d.getMonth() + 1;
      day = d.getDate();
    } else {
      // 숫자만 추출하여 YYYY, MM, DD 분리 (2026.03.15, 2026-03-15 등 대응)
      var s = String(d).trim();
      var match = s.match(/(\d{4})[./-]\s?(\d{1,2})[./-]\s?(\d{1,2})/);
      if (match) {
        y = parseInt(match[1], 10);
        m = parseInt(match[2], 10);
        day = parseInt(match[3], 10);
      } else {
        return "";
      }
    }
    // 정렬이 가능하도록 YYYY-MM-DD (패딩 포함) 형식으로 반환
    return y + "-" + String(m).padStart(2, "0") + "-" + String(day).padStart(2, "0");
  }

  // 시트에 있는 모든 날짜 중 가장 최신 날짜 찾기
  var normalizedDates = data.slice(1).map(row => getNormalizedDateString(row[idxDate])).filter(s => s && s !== "");
  if (normalizedDates.length === 0) {
    SpreadsheetApp.getUi().alert("날짜 데이터를 찾을 수 없습니다. 'Date' 또는 '날짜' 열을 확인해 주세요.");
    return;
  }

  normalizedDates.sort().reverse();
  var latestDateStr = normalizedDates[0]; // 가장 최신 날짜 (YYYY-MM-DD)
  var latestDateStrDot = latestDateStr.replace(/-/g, "."); // 표시용
  
  // 디버깅 메시지
  SpreadsheetApp.getActiveSpreadsheet().toast(latestDateStrDot + " 데이터로 뉴스레터를 생성합니다.", "이메일 준비 중");

  // 최신 날짜 기사 필터링 및 카테고리별 그룹화
  var categorizedToday = {};
  var foundCount = 0;

  for (var i = 1; i < data.length; i++) {
    var rowDateStr = getNormalizedDateString(data[i][idxDate]);
    if (rowDateStr === latestDateStr) {
      var cat = String(data[i][idxCategory] || "기타").trim();
      if (!categorizedToday[cat]) categorizedToday[cat] = [];
      
      // 고유 ID 생성 (JSON 저장 방식과 동일하게)
      var dateStr = data[i][idxDate];
      if (dateStr instanceof Date) {
        var tz = new Date(dateStr.getTime() + 9 * 60 * 60 * 1000);
        dateStr = tz.getUTCFullYear() + "." + String(tz.getUTCMonth() + 1).padStart(2, "0") + "." + String(tz.getUTCDate()).padStart(2, "0");
      }
      var rawIdStr = (data[i][idxTitle] || "") + dateStr;
      var uId = "n-" + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, rawIdStr)).replace(/=/g, "");
      
      categorizedToday[cat].push({
        title: data[i][idxTitle],
        risk: data[i][idxRisk],
        summary: String(data[i][idxSummary] || "").substring(0, 200) + "...",
        url: data[i][idxUrl],
        image: data[i][idxImage] || DEFAULT_IMAGE_URL,
        uId: uId
      });
      foundCount++;
    }
  }

  if (foundCount === 0) {
    SpreadsheetApp.getActiveSpreadsheet().toast("시트에서 기사를 찾을 수 없습니다.", "알림");
    return;
  }

  // HTML 메일 본문 생성 (Premium UI)
  var htmlBody = `
    <div style="font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif; background-color: #f8fafc; padding: 40px 20px; color: #1e293b;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 24px; overflow: hidden; shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);">
        <!-- Header -->
        <div style="background-color: #0033A0; padding: 32px; text-align: center;">
          <div style="display: inline-block; background-color: #ffffff; color: #0033A0; padding: 4px 12px; border-radius: 6px; font-size: 12px; font-weight: 900; margin-bottom: 12px;">DA PROCUREMENT</div>
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.025em;">Daily Insight Hub</h1>
          <p style="color: rgba(255,255,255,0.7); margin: 8px 0 0 0; font-size: 14px;">${latestDateStrDot} 업데이트 리포트</p>
        </div>

        <div style="padding: 32px;">
          <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6;">안녕하세요, <b>Samsung DA News Hub</b>입니다. 오늘 업데이트된 주요 소식을 카테고리별로 전달해 드립니다.</p>
  `;

  var riskColors = {
    "High": "#ef4444",
    "Med": "#f97316",
    "Low": "#3b82f6",
    "Very High": "#7f1d1d"
  };

  for (var cat in categorizedToday) {
    htmlBody += `
      <div style="margin-bottom: 40px;">
        <h2 style="font-size: 18px; font-weight: 800; color: #0033A0; border-left: 4px solid #0033A0; padding-left: 12px; margin-bottom: 20px; text-transform: uppercase;">${cat}</h2>
    `;

    categorizedToday[cat].forEach(function(item) {
      var rColor = riskColors[item.risk] || "#94a3b8";
      htmlBody += `
        <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; margin-bottom: 16px; shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);">
          <div style="display: flex; gap: 16px; margin-bottom: 12px;">
            <div style="flex: 1;">
              <div style="display: inline-block; background-color: ${rColor}15; color: ${rColor}; padding: 2px 8px; border-radius: 99px; font-size: 10px; font-weight: 800; margin-bottom: 8px; text-transform: uppercase;">RISK: ${item.risk}</div>
              <h3 style="margin: 0; font-size: 16px; font-weight: 700; line-height: 1.4; color: #0f172a;">${item.title}</h3>
            </div>
            <img src="${item.image}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 12px; flex-shrink: 0;" />
          </div>
          <p style="margin: 0 0 16px 0; font-size: 13px; line-height: 1.6; color: #64748b;">${item.summary}</p>
          <div style="display: flex; gap: 8px;">
            <a href="https://drasticlife.github.io/DA-news-hub/?targetId=${item.uId}" style="display: inline-block; background-color: #0033A0; color: #ffffff; text-decoration: none; padding: 8px 16px; border-radius: 8px; font-size: 12px; font-weight: 700;">News Hub에서 보기</a>
          </div>
        </div>
      `;
    });

    htmlBody += `</div>`;
  }

  htmlBody += `
          <!-- Footer -->
          <div style="margin-top: 40px; padding-top: 32px; border-top: 1px solid #e2e8f0; text-align: center;">
            <a href="https://drasticlife.github.io/DA-news-hub/" style="display: inline-block; background-color: #0033A0; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-size: 14px; font-weight: 800; shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">News Hub 대시보드 방문하기</a>
            <p style="margin: 24px 0 0 0; font-size: 12px; color: #94a3b8;">본 메일은 Samsung DA News Hub 자동 시스템에 의해 발송되었습니다.</p>
          </div>
        </div>
      </div>
    </div>
  `;

  // 이메일 발송
  RECIPIENT_EMAILS.forEach(function(email) {
    try {
      MailApp.sendEmail({
        to: email,
        subject: "[DA News Hub] " + latestDateStrDot + " 리포트 (" + foundCount + "건)",
        htmlBody: htmlBody
      });
      console.log("메일 발송 완료: " + email);
    } catch (e) {
      console.error("메일 발송 실패 (" + email + "): " + e.toString());
    }
  });

  SpreadsheetApp.getActiveSpreadsheet().toast(latestDateStrDot + " 소식 메일이 성공적으로 발송되었습니다. (" + foundCount + "건)", "완료");
}