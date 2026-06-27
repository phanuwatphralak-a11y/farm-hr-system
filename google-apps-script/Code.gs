/**
 * Google Apps Script — Farm HR System Backend
 * ======================================================
 * วิธี deploy:
 * 1. เปิด Google Sheets ที่สร้างไว้
 * 2. ไปที่ Extensions → Apps Script
 * 3. วางโค้ดนี้ทับ Code.gs
 * 4. กด Deploy → New Deployment → Web App
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 5. คัดลอก Web App URL ไปใส่ใน js/config.js
 *
 * Sheet ที่ต้องสร้าง (ชื่อแท็บให้ตรงกับ config.js):
 *   - พนักงาน
 *   - เวลาทำงาน
 *   - เงินเดือน
 *   - ประเมินผล
 */

const SPREADSHEET_ID = ""; // ถ้าว่าง จะใช้ไฟล์ที่ script นี้อยู่

// ===== Headers สำหรับแต่ละ Sheet =====
const SHEET_HEADERS = {
  "พนักงาน":    ["emp_id","first_name","last_name","position","department",
                  "start_date","phone","base_salary","status","address","notes"],
  "เวลาทำงาน": ["date","emp_id","emp_name","time_in","time_out",
                  "work_hours","status","ot_hours","notes"],
  "เงินเดือน":  ["month","emp_id","emp_name","base_salary","ot_pay",
                  "bonus","deduction","net_pay","payment_status","notes"],
  "ประเมินผล":  ["eval_date","emp_id","emp_name","year","quarter",
                  "quality","punctuality","teamwork","responsibility",
                  "total_score","grade","comments"]
};

// ===== GET Handler =====
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

// ===== POST Handler =====
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

// ===== CRUD Functions =====

function getSheet(name) {
  const ss = SPREADSHEET_ID
    ? SpreadsheetApp.openById(SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();

  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    // สร้าง sheet ใหม่พร้อม header ถ้ายังไม่มี
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
  if (data.length <= 1) return []; // no data rows
  return data.slice(1); // skip header row
}

function appendRow(sheetName, values) {
  const sheet = getSheet(sheetName);
  sheet.appendRow(values);
}

function updateRow(sheetName, rowIndex, values) {
  // rowIndex = 1-based data row (excludes header)
  const sheet  = getSheet(sheetName);
  const sheetRow = rowIndex + 1; // +1 for header
  sheet.getRange(sheetRow, 1, 1, values.length).setValues([values]);
}

function deleteRow(sheetName, rowIndex) {
  // rowIndex = 1-based data row (excludes header)
  const sheet  = getSheet(sheetName);
  const sheetRow = rowIndex + 1; // +1 for header
  sheet.deleteRow(sheetRow);
}

// ===== Response Helper =====
function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ===== Setup Function (รันครั้งเดียวเพื่อสร้าง Sheets) =====
function setupSheets() {
  Object.keys(SHEET_HEADERS).forEach(name => getSheet(name));
  SpreadsheetApp.getUi().alert("✅ สร้าง Sheets สำเร็จ!");
}
