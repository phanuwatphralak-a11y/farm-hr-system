/**
 * config.js
 */
const CONFIG = {
  SCRIPT_URL: "https://script.google.com/macros/s/AKfycbziE_p3G6ORqHNuJsivsZ8zPKFSiLnJ0kyd_SP1tOsPEGLwlrf61sIvMsE6_SiPDQd2EQ/exec",
  SPREADSHEET_ID: "1Q6yJc0q2pLeTqhJNv1jfIOWRWOr1_YXiPbAiIxXzZTM",
  SHEETS: {
    EMPLOYEES:   "พนักงาน",
    ATTENDANCE:  "เวลาทำงาน",
    SALARY:      "เงินเดือน",
    PERFORMANCE: "ประเมินผล",
    LEAVE:       "การลา",
    PERSONAL:    "ข้อมูลส่วนตัว",
    HOLIDAYS:    "วันหยุดพิเศษ"
  },
  ORG_NAME: "HR ฟาร์ม",

  // กะทำงาน + OT + ประกันสังคม
  WORK: {
    HOURS_PER_DAY:  8,
    DAYS_PER_MONTH: 26,
    OT_RATES: [
      { label: "ไม่คิด OT",       value: 0   },
      { label: "1 เท่า (1x)",     value: 1   },
      { label: "1.5 เท่า (1.5x)", value: 1.5 },
      { label: "2 เท่า (2x)",     value: 2   }
    ],
    SS_RATE: 0.05,
    SS_MAX:  750,
    SHIFTS: [
      { value: "same_day",  label: "กะปกติ (วันเดียวกัน)"   },
      { value: "overnight", label: "กะดึก (ข้ามเที่ยงคืน)" }
    ]
  },

  // บัญชีผู้ใช้งาน  role: admin | manager | viewer
  USERS: [
    { username: "admin",   password: "admin1234",   name: "ผู้ดูแลระบบ", role: "admin"   },
    { username: "manager", password: "manager1234", name: "ผู้จัดการ",   role: "manager" },
    { username: "viewer",  password: "view1234",    name: "ผู้ดูข้อมูล", role: "viewer"  }
  ]
};
