/**
 * Google Apps Script — Farm HR System Backend
 */

const SPREADSHEET_ID = "1Q6yJc0q2pLeTqhJNv1jfIOWRWOr1_YXiPbAiIxXzZTM";

const SHEET_HEADERS = {
  "พนักงาน":    ["emp_id","first_name","last_name","position","department",
                  "start_date","phone","base_salary","status","address","notes"],
  "เวลาทำงาน": ["date","emp_id","emp_name","time_in","time_out",
                  "work_hours","status","ot_hours","notes"],
  "เงินเดือน":  ["month","emp_id","emp_name","base_salary","ot_pay",
                  "bonus","deduction","net_pay","payment_status","notes"],
  "ประเมินผล":  ["eval_date","emp_id","emp_name","year","quarter",
                  "quality","punctuality","teamwork","responsibility",
                  "total_score","grade","comments"],
  "การลา":      ["leave_id","request_date","emp_id","emp_name","leave_type",
                  "start_date","end_date","days","reason","status",
                  "approved_by","approved_date","notes"],
  "ข้อมูลส่วนตัว": ["emp_id","national_id","birth_date","gender","nationality",
                     "religion","blood_type","marital_status","emergency_name",
                     "emergency_relation","emergency_phone","bank_name",
                     "bank_account","education_level","education_institution",
                     "skills","notes"]
};

function doGet(e) {
  try {
    const action = e.parameter.action;
    const sheet  = e.parameter.sheet;
    if (action === "getAll") {
      const rows = getAllRows(sheet);
      return jsonResponse({ rows });
    }
    return jsonResponse({ error: "Unknown action: " + action });
  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}

function doPost(e) {
  try {
    const body   = JSON.parse(e.postData.contents);
    const action = body.action;
    const sheet  = body.sheet;
    if (action === "append") {
      appendRow(sheet, body.values);
      return jsonResponse({ success: true });
    }
    if (action === "update") {
      updateRow(sheet, body.rowIndex, body.values);
      return jsonResponse({ success: true });
    }
    if (action === "delete") {
      deleteRow(sheet, body.rowIndex);
      return jsonResponse({ success: true });
    }
    return jsonResponse({ error: "Unknown action: " + action });
  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}

function getSheet(name) {
  const ss = SPREADSHEET_ID
    ? SpreadsheetApp.openById(SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    const headers = SHEET_HEADERS[name];
    if (headers) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length)
        .setBackground("#1e293b")
        .setFontColor("#ffffff")
        .setFontWeight("bold");
      sheet.setFrozenRows(1);
    }
  }
  return sheet;
}

function getAllRows(sheetName) {
  const sheet = getSheet(sheetName);
  const data  = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  return data.slice(1);
}

function appendRow(sheetName, values) {
  const sheet = getSheet(sheetName);
  sheet.appendRow(values);
}

function updateRow(sheetName, rowIndex, values) {
  const sheet  = getSheet(sheetName);
  const sheetRow = rowIndex + 1;
  sheet.getRange(sheetRow, 1, 1, values.length).setValues([values]);
}

function deleteRow(sheetName, rowIndex) {
  const sheet  = getSheet(sheetName);
  const sheetRow = rowIndex + 1;
  sheet.deleteRow(sheetRow);
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function setupSheets() {
  Object.keys(SHEET_HEADERS).forEach(name => getSheet(name));
  SpreadsheetApp.getUi().alert("✅ สร้าง Sheets สำเร็จ!");
}
