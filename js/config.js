/**
 * config.js — ตั้งค่าระบบ
 * กรอกค่าด้านล่างให้ครบก่อนใช้งาน
 */
const CONFIG = {
  // ============================================================
  // 1. Google Apps Script Web App URL
  //    หลังจาก Deploy Apps Script แล้ว ให้วาง URL ที่นี่
  //    เช่น "https://script.google.com/macros/s/XXXXXX/exec"
  // ============================================================
  SCRIPT_URL: "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec",

  // ============================================================
  // 2. Google Sheets ID
  //    เปิด Google Sheets → ดูจาก URL:
  //    https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
  // ============================================================
  SPREADSHEET_ID: "YOUR_SPREADSHEET_ID",

  // ============================================================
  // 3. ชื่อ Sheet (แท็บ) ในไฟล์ Google Sheets
  // ============================================================
  SHEETS: {
    EMPLOYEES:   "พนักงาน",
    ATTENDANCE:  "เวลาทำงาน",
    SALARY:      "เงินเดือน",
    PERFORMANCE: "ประเมินผล"
  },

  // ============================================================
  // 4. ชื่อองค์กร (แสดงใน UI)
  // ============================================================
  ORG_NAME: "HR ฟาร์ม"
};
