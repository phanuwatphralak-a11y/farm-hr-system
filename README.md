# 🌾 ระบบ HR ฟาร์ม

ระบบบริหารทรัพยากรบุคคล (HR) สำหรับฟาร์ม  
Frontend: GitHub Pages (HTML + JS) | Backend: Google Apps Script | Database: Google Sheets

---

## ✅ ฟีเจอร์
- **พนักงาน** — เพิ่ม/แก้ไข/ลบ ข้อมูลพนักงาน
- **เวลาทำงาน** — บันทึกเข้า-ออก กรองตามเดือนและคนงาน
- **เงินเดือน** — บันทึกเงินเดือน คำนวณสุทธิ Export CSV
- **ประเมินผล** — บันทึกคะแนน คำนวณ Grade อัตโนมัติ

---

## 🚀 ขั้นตอนการตั้งค่า

### 1. สร้าง Google Sheets

1. ไปที่ [sheets.new](https://sheets.new) เพื่อสร้างไฟล์ใหม่
2. ตั้งชื่อไฟล์ว่า **"ระบบ HR ฟาร์ม"**
3. คัดลอก **Spreadsheet ID** จาก URL:
   ```
   https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit
   ```

### 2. ตั้งค่า Google Apps Script

1. ใน Google Sheets ไปที่ **Extensions → Apps Script**
2. ลบโค้ดเดิมทิ้ง แล้ววางโค้ดจากไฟล์ `google-apps-script/Code.gs`
3. รันฟังก์ชัน `setupSheets` ครั้งแรก (เพื่อสร้าง sheet tabs อัตโนมัติ)
4. **Deploy → New Deployment:**
   - Type: **Web App**
   - Execute as: **Me**
   - Who has access: **Anyone**
5. คัดลอก **Web App URL**

### 3. แก้ไข js/config.js

```javascript
const CONFIG = {
  SCRIPT_URL: "https://script.google.com/macros/s/YOUR_ID/exec",  // ← ใส่ URL จากข้อ 2
  SPREADSHEET_ID: "YOUR_SPREADSHEET_ID",                           // ← ใส่ ID จากข้อ 1
  // ... (ส่วนที่เหลือไม่ต้องแก้)
};
```

### 4. สร้าง GitHub Repository

```bash
# ใน terminal (ในโฟลเดอร์ farm-hr-system)
git init
git add .
git commit -m "feat: initial HR system"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/farm-hr-system.git
git push -u origin main
```

### 5. เปิด GitHub Pages

1. ไปที่ GitHub repo → **Settings → Pages**
2. Source: **Deploy from a branch**
3. Branch: **main** / folder: **/ (root)**
4. บันทึก — รอสักครู่แล้วเข้า URL: `https://YOUR_USERNAME.github.io/farm-hr-system`

---

## 📁 โครงสร้างไฟล์

```
farm-hr-system/
├── index.html                    # หน้าหลัก SPA
├── css/
│   └── style.css                 # สไตล์ทั้งหมด
├── js/
│   ├── config.js                 # ⚙️ ตั้งค่า (แก้ไขก่อนใช้!)
│   ├── api.js                    # HTTP client → Apps Script
│   ├── employees.js              # โมดูลพนักงาน
│   ├── attendance.js             # โมดูลเวลาทำงาน
│   ├── salary.js                 # โมดูลเงินเดือน
│   ├── performance.js            # โมดูลประเมินผล
│   └── app.js                    # Main app + routing
└── google-apps-script/
    └── Code.gs                   # วางใน Google Apps Script
```

---

## 🎯 เกรดประเมินผล

| คะแนน | เกรด | ความหมาย |
|-------|------|-----------|
| 4.5 – 5.0 | **A** | ดีเยี่ยม |
| 3.5 – 4.4 | **B** | ดี |
| 2.5 – 3.4 | **C** | พอใช้ |
| < 2.5 | **D** | ต้องปรับปรุง |

---

## 🔒 ความปลอดภัย

- Apps Script Web App ใช้ Execute as "Me" → ข้อมูลปลอดภัยใน Google Drive ของคุณ
- สำหรับองค์กร แนะนำเพิ่ม Google OAuth หรือเปลี่ยน "Who has access" เป็น **Anyone with Google account**
