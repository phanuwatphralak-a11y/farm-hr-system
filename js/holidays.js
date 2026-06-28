/**
 * holidays.js — ปฏิทินวันหยุดนักขัตฤกษ์ไทย
 * - วันหยุดราชการ 2567-2569 (hardcoded)
 * - โหลดวันหยุดพิเศษเพิ่มเติมจาก Google Sheets (HOLIDAYS sheet)
 * - ฟังก์ชัน calcWorkdays() สำหรับระบบลา
 */

const HOLIDAYS = {

  // ===== วันหยุดราชการไทย (hardcoded) =====
  THAI_HOLIDAYS: {
    // พ.ศ. 2567 / ค.ศ. 2024
    "2024-01-01": "วันขึ้นปีใหม่",
    "2024-02-26": "วันมาฆบูชา",
    "2024-04-06": "วันจักรี",
    "2024-04-08": "ชดเชย วันจักรี",
    "2024-04-12": "วันหยุดเทศกาลสงกรานต์",
    "2024-04-13": "วันสงกรานต์",
    "2024-04-14": "วันสงกรานต์",
    "2024-04-15": "วันสงกรานต์",
    "2024-05-01": "วันแรงงานแห่งชาติ",
    "2024-05-04": "วันฉัตรมงคล",
    "2024-05-22": "วันวิสาขบูชา",
    "2024-06-03": "วันเฉลิมพระชนมพรรษา สมเด็จพระนางเจ้าฯ พระบรมราชินี",
    "2024-07-20": "วันอาสาฬหบูชา",
    "2024-07-22": "วันเข้าพรรษา",
    "2024-08-12": "วันเฉลิมพระชนมพรรษา สมเด็จพระนางเจ้าสิริกิติ์ฯ / วันแม่แห่งชาติ",
    "2024-10-13": "วันนวมินทรมหาราช",
    "2024-10-14": "ชดเชย วันนวมินทรมหาราช",
    "2024-10-23": "วันปิยมหาราช",
    "2024-12-05": "วันเฉลิมพระชนมพรรษา พระบาทสมเด็จพระเจ้าอยู่หัว / วันพ่อแห่งชาติ",
    "2024-12-10": "วันรัฐธรรมนูญ",
    "2024-12-31": "วันสิ้นปี",

    // พ.ศ. 2568 / ค.ศ. 2025
    "2025-01-01": "วันขึ้นปีใหม่",
    "2025-02-12": "วันมาฆบูชา",
    "2025-04-06": "วันจักรี",
    "2025-04-07": "ชดเชย วันจักรี",
    "2025-04-13": "วันสงกรานต์",
    "2025-04-14": "วันสงกรานต์",
    "2025-04-15": "วันสงกรานต์",
    "2025-05-01": "วันแรงงานแห่งชาติ",
    "2025-05-04": "วันฉัตรมงคล",
    "2025-05-05": "ชดเชย วันฉัตรมงคล",
    "2025-06-02": "วันวิสาขบูชา",
    "2025-06-03": "วันเฉลิมพระชนมพรรษา สมเด็จพระนางเจ้าฯ พระบรมราชินี",
    "2025-07-10": "วันอาสาฬหบูชา",
    "2025-07-11": "วันเข้าพรรษา",
    "2025-08-11": "ชดเชย วันแม่แห่งชาติ",
    "2025-08-12": "วันเฉลิมพระชนมพรรษา สมเด็จพระนางเจ้าสิริกิติ์ฯ / วันแม่แห่งชาติ",
    "2025-10-13": "วันนวมินทรมหาราช",
    "2025-10-23": "วันปิยมหาราช",
    "2025-12-05": "วันเฉลิมพระชนมพรรษา พระบาทสมเด็จพระเจ้าอยู่หัว / วันพ่อแห่งชาติ",
    "2025-12-10": "วันรัฐธรรมนูญ",
    "2025-12-31": "วันสิ้นปี",

    // พ.ศ. 2569 / ค.ศ. 2026
    "2026-01-01": "วันขึ้นปีใหม่",
    "2026-03-03": "วันมาฆบูชา",
    "2026-04-06": "วันจักรี",
    "2026-04-13": "วันสงกรานต์",
    "2026-04-14": "วันสงกรานต์",
    "2026-04-15": "วันสงกรานต์",
    "2026-05-01": "วันแรงงานแห่งชาติ",
    "2026-05-04": "วันฉัตรมงคล",
    "2026-05-20": "วันวิสาขบูชา",
    "2026-06-01": "วันวิสาขบูชา (ชดเชย)",
    "2026-06-03": "วันเฉลิมพระชนมพรรษา สมเด็จพระนางเจ้าฯ พระบรมราชินี",
    "2026-07-29": "วันอาสาฬหบูชา",
    "2026-07-30": "วันเข้าพรรษา",
    "2026-08-12": "วันเฉลิมพระชนมพรรษา สมเด็จพระนางเจ้าสิริกิติ์ฯ / วันแม่แห่งชาติ",
    "2026-10-13": "วันนวมินทรมหาราช",
    "2026-10-23": "วันปิยมหาราช",
    "2026-12-05": "วันเฉลิมพระชนมพรรษา พระบาทสมเด็จพระเจ้าอยู่หัว / วันพ่อแห่งชาติ",
    "2026-12-07": "ชดเชย วันรัฐธรรมนูญ",
    "2026-12-10": "วันรัฐธรรมนูญ",
    "2026-12-31": "วันสิ้นปี"
  },

  // วันหยุดพิเศษเพิ่มเติม (โหลดจาก Sheets)
  _custom: {},

  // ===== โหลดวันหยุดพิเศษจาก Sheets =====
  async loadCustom() {
    try {
      if (!CONFIG.SHEETS.HOLIDAYS) return;
      const rows = await API.getAll(CONFIG.SHEETS.HOLIDAYS);
      this._custom = {};
      rows.forEach(r => {
        const date = r[0]; // YYYY-MM-DD
        const name = r[1] || "วันหยุดพิเศษ";
        if (date) this._custom[date] = name;
      });
    } catch {
      // ไม่มี Sheet ก็ข้ามได้
      this._custom = {};
    }
  },

  // ===== ตรวจสอบวันหยุด =====
  isHoliday(dateStr) {
    return !!(this.THAI_HOLIDAYS[dateStr] || this._custom[dateStr]);
  },

  getHolidayName(dateStr) {
    return this.THAI_HOLIDAYS[dateStr] || this._custom[dateStr] || null;
  },

  isWeekend(dateStr) {
    const d = new Date(dateStr);
    return d.getDay() === 0 || d.getDay() === 6;
  },

  isNonWorkday(dateStr) {
    return this.isWeekend(dateStr) || this.isHoliday(dateStr);
  },

  // ===== นับวันทำงาน (ไม่รวมเสาร์-อาทิตย์ + วันหยุดราชการ) =====
  calcWorkdays(startStr, endStr) {
    if (!startStr || !endStr) return 1;
    const s = new Date(startStr);
    const e = new Date(endStr);
    if (isNaN(s) || isNaN(e) || e < s) return 1;
    let count = 0;
    const cur = new Date(s);
    while (cur <= e) {
      const ds = cur.toISOString().slice(0, 10);
      if (!this.isNonWorkday(ds)) count++;
      cur.setDate(cur.getDate() + 1);
    }
    return count || 1;
  },

  // ===== หาวันหยุดถัดไป =====
  getNextHoliday() {
    const today = new Date().toISOString().slice(0, 10);
    const all = { ...this.THAI_HOLIDAYS, ...this._custom };
    const upcoming = Object.keys(all)
      .filter(d => d >= today)
      .sort();
    if (!upcoming.length) return null;
    return { date: upcoming[0], name: all[upcoming[0]] };
  },

  // ===== ดึงวันหยุดทั้งหมดของปี =====
  getByYear(year) {
    const all = { ...this.THAI_HOLIDAYS, ...this._custom };
    return Object.entries(all)
      .filter(([d]) => d.startsWith(String(year)))
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, name]) => ({
        date,
        name,
        dow: new Date(date).toLocaleDateString("th-TH", { weekday: "long" }),
        custom: !!this._custom[date]
      }));
  },

  // ===== Render หน้าวันหยุด =====
  async render(year) {
    year = year || new Date().getFullYear();
    await this.loadCustom();

    const holidays = this.getByYear(year);

    // Header stats
    document.getElementById("hol-count").textContent = holidays.length;
    const next = this.getNextHoliday();
    if (next) {
      const diff = Math.ceil((new Date(next.date) - new Date()) / 86400000);
      document.getElementById("hol-next-name").textContent = next.name;
      document.getElementById("hol-next-date").textContent =
        new Date(next.date).toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" }) +
        ` (อีก ${diff} วัน)`;
    } else {
      document.getElementById("hol-next-name").textContent = "-";
      document.getElementById("hol-next-date").textContent = "";
    }

    // Group by month
    const byMonth = {};
    holidays.forEach(h => {
      const mo = h.date.slice(0, 7);
      if (!byMonth[mo]) byMonth[mo] = [];
      byMonth[mo].push(h);
    });

    const MONTHS = ["","ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.",
                    "ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];

    const tbody = document.getElementById("hol-tbody");
    if (!holidays.length) {
      tbody.innerHTML = `<tr><td colspan="4" class="empty-msg">ไม่พบข้อมูลวันหยุด</td></tr>`;
      return;
    }

    let html = "";
    Object.entries(byMonth).forEach(([mo, days]) => {
      const [y, m] = mo.split("-");
      html += `<tr class="month-header-row">
        <td colspan="4" style="background:var(--bg);font-weight:700;color:var(--primary);padding:10px 14px;font-size:13px">
          📅 ${MONTHS[parseInt(m)]} ${parseInt(y) + 543}
        </td>
      </tr>`;
      days.forEach(h => {
        const isToday = h.date === new Date().toISOString().slice(0, 10);
        html += `<tr ${isToday ? 'style="background:#eff6ff"' : ""}>
          <td style="width:120px;font-weight:600">${h.date}</td>
          <td>${h.dow}</td>
          <td>${h.name}${h.custom ? ' <span style="font-size:11px;color:#d97706">(พิเศษ)</span>' : ""}</td>
          <td>${isToday ? '<span class="badge badge-info">วันนี้</span>' : ""}</td>
        </tr>`;
      });
    });
    tbody.innerHTML = html;
  },

  // ===== Dialog เพิ่มวันหยุดพิเศษ =====
  _openAddModal() {
    const date = prompt("วันที่ (YYYY-MM-DD):\nเช่น 2026-12-25");
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      if (date !== null) showToast("⚠️ รูปแบบวันที่ไม่ถูกต้อง (YYYY-MM-DD)", "error");
      return;
    }
    const name = prompt(`ชื่อวันหยุด (${date}):`);
    if (!name) return;
    this.addCustom(date, name.trim());
  },

  // ===== เพิ่มวันหยุดพิเศษ =====
  async addCustom(date, name) {
    if (!CONFIG.SHEETS.HOLIDAYS) {
      showToast("⚠️ ยังไม่ได้ตั้งค่า SHEETS.HOLIDAYS ใน config.js", "error");
      return;
    }
    showLoading(true);
    try {
      await API.append(CONFIG.SHEETS.HOLIDAYS, [date, name, "custom"]);
      showToast("✅ เพิ่มวันหยุดพิเศษสำเร็จ");
      const year = document.getElementById("hol-year-select")?.value || new Date().getFullYear();
      await this.render(year);
    } catch (err) {
      showToast("❌ " + err.message, "error");
    } finally {
      showLoading(false);
    }
  }
};
