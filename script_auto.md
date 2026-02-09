var PERPLEXITY_API_URL = "https://api.perplexity.ai/chat/completions";
var MODEL_NAME = "sonar-reasoning-pro";

var MACRO*PROMPT_TEMPLATE = "당신은 삼성전자 생활가전(DA) 구매팀의 거시경제 모니터링 및 환율·금리·통상정책 분석 담당 전문가입니다. " +
"지침에 따라 기준일({{TARGET_DATE}})의 USD/KRW 환율, FRB 금리, 글로벌 통상정책·관세 관련 뉴스를 조사하고, 반드시 지정된 마크다운 표 형식으로 출력해주세요.\n\n" +
"[필수 요구사항]\n" +
"1. 날짜(Date): {{TARGET_DATE}} (YYYY.MM.DD 형식)\n" +
"2. 출력 형식: 마크다운 표\n" +
"3. 요약(Summary): 삼성 관점의 시사점과 액션을 포함한 친근한 반말 톤 (<b>, <mark> 태그 활용)\n" +
"4. URL: 정확히 3개씩 <br> 태그로 연결\n\n" +
"상세 지침은 프롬프트 파일(예약*거시경제.md)을 준수하며, 결과는 표 형식 이외에 어떤 텍스트도 포함하지 마세요.";

function onOpen() {
var ui = SpreadsheetApp.getUi();
ui.createMenu("🚀 Macro Automation")
.addItem("거시경제 데이터 업데이트 (Perplexity)", "runMacroEconomyAutomation")
.addToUi();
}

function runMacroEconomyAutomation() {
var ui = SpreadsheetApp.getUi();
var scriptProperties = PropertiesService.getScriptProperties();
var apiKey = scriptProperties.getProperty("PERPLEXITY_API_KEY");

if (!apiKey) {
ui.alert("PERPLEXITY_API_KEY가 설정되지 않았습니다. 프로젝트 설정에서 등록해주세요.");
return;
}

var yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
var formattedDate = Utilities.formatDate(yesterday, "GMT+9", "yyyy.MM.dd");

ui.showModelessDialog(HtmlService.createHtmlOutput("<p>가져오는 중: " + formattedDate + "</p>"), "작업중");

try {
var response = fetchPerplexityData(apiKey, formattedDate);
var tableData = parseMarkdownTable(response);

    if (tableData && tableData.length > 0) {
      appendDataToSheet(tableData);
      ui.alert("성공: " + formattedDate);
    } else {
      ui.alert("데이터 없음");
    }

} catch (error) {
ui.alert("오류: " + error.toString());
}
}

function fetchPerplexityData(apiKey, targetDate) {
var finalPrompt = MACRO_PROMPT_TEMPLATE.replace(/{{TARGET_DATE}}/g, targetDate);

var payload = {
model: MODEL_NAME,
messages: [
{ role: "system", content: "Professional economic analyst. JSON Markdown Table output only." },
{ role: "user", content: finalPrompt }
],
temperature: 0.2
};

var options = {
method: "post",
headers: {
"Authorization": "Bearer " + apiKey,
"Content-Type": "application/json"
},
payload: JSON.stringify(payload),
muteHttpExceptions: true
};

var response = UrlFetchApp.fetch(PERPLEXITY_API_URL, options);
var json = JSON.parse(response.getContentText());

if (response.getResponseCode() !== 200) {
throw new Error(json.error ? json.error.message : "API Error");
}

return json.choices[0].message.content;
}

function parseMarkdownTable(markdown) {
var lines = markdown.split("\n");
var data = [];
var isTable = false;

for (var i = 0; i < lines.length; i++) {
var line = lines[i].trim();
if (line.startsWith("|") && line.endsWith("|")) {
if (line.indexOf("---") !== -1) {
isTable = true;
continue;
}

      var cells = line.split("|").map(function(cell) { return cell.trim(); }).filter(function(_, idx, arr) {
        return idx > 0 && idx < arr.length - 1;
      });

      if (isTable && cells.length > 0) {
        if (cells[0].toLowerCase() === "date") continue;
        data.push(cells);
      }
    }

}
return data;
}

function appendDataToSheet(rows) {
var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
rows.forEach(function(row) {
sheet.appendRow(row);
});
}
