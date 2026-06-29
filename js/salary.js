/**
 * salary.js — จัดการเงินเดือน/ค่าจ้าง
 * คอลัมน์ Sheet: month | emp_id | emp_name | base_salary | ot_pay |
 *                bonus | deduction | net_pay | payment_status | notes |
 *                ot_hours | ot_rate | ss_enrolled
 *
 * ot_rate     : ตัวเลขคูณ OT (0, 1, 1.5, 2)
 * ss_enrolled : "1" = เข้าร่วมประกันสังคม, "0" = ไม่เข้าร่วม
 */

const SALARY = {
  COLS: [
    "month","emp_id","emp_name","base_salary","ot_pay",
    "bonus","deduction","net_pay","payment_status","notes",
    "ot_hours","ot_rate","ss_enrolled"
  ],

  rowToObj(row) {
    const obj = {};
    this.COLS.forEach((k, i) => obj[k] = row[i] !== undefined ? String(row[i]) : "");
    return obj;
  },

  objToRow(obj) {
    return this.COLS.map(k => obj[k] !== undefined ? obj[k] : "");
  },

  /* ── ค่าชั่วโมงปกติ ── */
  _hourlyRate(base) {
    const dpm = CONFIG.WORK?.DAYS_PER_MONTH ?? 26;
    const hpd = CONFIG.WORK?.HOURS_PER_DAY  ?? 8;
    return (parseFloat(base) || 0) / dpm / hpd;
  },

  /* ── คำนวณค่า OT ── */
  calcOTPay(base, otHours, otRate) {
    const h = parseFloat(otHours) || 0;
    const r = parseFloat(otRate)  || 0;
    if (h === 0 || r === 0) return 0;
    return Math.round(this._hourlyRate(base) * h * r);
  },

  /* ── ประกันสังคม ── */
  calcSS(base, enrolled = true) {
    if (!enrolled) return 0;
    const rate = CONFIG.WORK?.SS_RATE ?? 0.05;
    const max  = CONFIG.WORK?.SS_MAX  ?? 750;
    return Math.min(Math.round((parseFloat(base) || 0) * rate), max);
  },

  /* ── ภาษีหัก ณ ที่จ่าย (ประมาณการรายเดือน) ── */
  calcTax(base, ot = 0, bonus = 0) {
    const monthly = (parseFloat(base)||0) + (parseFloat(ot)||0) + (parseFloat(bonus)||0);
    const annual  = monthly * 12;
    const expense  = Math.min(annual * 0.5, 100000);
    const personal = 60000;
    const taxable  = Math.max(0, annual - expense - personal);
    const brackets = [
      [150000, 0], [150000, 0.05], [200000, 0.10],
      [250000, 0.15], [250000, 0.20], [1000000, 0.25], [3000000, 0.30]
    ];
    let annualTax = 0, rem = taxable;
    for (const [limit, rate] of brackets) {
      if (rem <= 0) break;
      annualTax += Math.min(rem, limit) * rate;
      rem -= limit;
    }
    if (rem > 0) annualTax += rem * 0.35;
    return Math.round(annualTax / 12);
  },

  /* ── คำนวณ net pay ── */
  calcNet(base, otPay, bonus, ss, tax, deduction) {
    return Math.max(0,
      (parseFloat(base)      || 0) +
      (parseFloat(otPay)     || 0) +
      (parseFloat(bonus)     || 0) -
      (parseFloat(ss)        || 0) -
      (parseFloat(tax)       || 0) -
      (parseFloat(deduction) || 0)
    );
  },

  async load(month = "") {
    const rows = await API.getAll(CONFIG.SHEETS.SALARY);
    STATE.salary = rows.map((r, i) => ({ ...this.rowToObj(r), _row: i + 1 }));
    let filtered = STATE.salary;
    if (month) filtered = filtered.filter(s => s.month === month);
    return filtered;
  },

  render(list) {
    const tbody = document.getElementById("salary-tbody");
    if (!list?.length) {
      tbody.innerHTML = `<tr><td colspan="12" class="empty-msg">ไม่พบข้อมูลเงินเดือน</td></tr>`;
      this.updateSummary([]);
      return;
    }

    tbody.innerHTML = list.map(s => {
      const ssEnrolled = s.ss_enrolled !== "0";
      const ss  = this.calcSS(s.base_salary, ssEnrolled);
      const ssBadge = ssEnrolled
        ? `<span style="color:var(--primary);font-size:11px">${formatMoney(ss)}</span>`
        : `<span style="color:var(--text-muted);font-size:11px">ไม่เข้าร่วม</span>`;
      const otInfo = parseFloat(s.ot_hours) > 0
        ? `<small style="color:var(--text-muted)"><br>${s.ot_hours}ชม.×${s.ot_rate}x</small>` : "";
      return `
      <tr>
        <td>${formatMonth(s.month)}</td>
        <td><strong>${s.emp_id}</strong></td>
        <td>${s.emp_name || "-"}</td>
        <td>${formatMoney(s.base_salary)}</td>
        <td>${formatMoney(s.ot_pay)}${otInfo}</td>
        <td>${formatMoney(s.bonus)}</td>
        <td style="color:var(--danger)">${formatMoney(s.deduction)}</td>
        <td>${ssBadge}</td>
        <td><strong>${formatMoney(s.net_pay)}</strong></td>
        <td>${statusBadge(s.payment_status)}</td>
        <td>
          <div class="action-btns">
            <button class="btn-sm" onclick="SALARY.printPayslip(${s._row - 1})" title="พิมพ์สลิป" style="background:#dcfce7;color:#16a34a">
              <i class="fas fa-print"></i>
            </button>
            <button class="btn-sm btn-sm-edit" onclick="SALARY.openEdit(${s._row - 1})">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn-sm btn-sm-del" onclick="SALARY.confirmDelete(${s._row})">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>`;
    }).join("");

    this.updateSummary(list);
  },

  updateSummary(list) {
    const total = list.reduce((s, r) => s + (parseFloat(r.net_pay) || 0), 0);
    const count = list.length;
    document.getElementById("sal-total").textContent = "฿" + total.toLocaleString("th-TH");
    document.getElementById("sal-count").textContent = count;
    document.getElementById("sal-avg").textContent   = count
      ? "฿" + Math.round(total / count).toLocaleString("th-TH") : "฿0";
  },

  openAdd() {
    const form = document.getElementById("form-salary");
    form.reset();
    form.querySelector("[name=row_index]").value = "";
    const now = new Date();
    form.querySelector("[name=month]").value =
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    // ค่าเริ่มต้น
    form.querySelector("[name=ot_rate]").value   = "1.5";
    form.querySelector("[name=ss_enrolled]").checked = true;
    document.getElementById("modal-sal-title").textContent = "บันทึกเงินเดือน";
    openModal("modal-salary");
    this.bindSalaryCalc(form);
    this.recalc(form);
  },

  openEdit(dataIndex) {
    const s = STATE.salary[dataIndex];
    if (!s) return;
    const form = document.getElementById("form-salary");
    form.reset();
    // fill existing cols (ยกเว้น ss_enrolled ที่เป็น checkbox)
    this.COLS.forEach(k => {
      if (k === "ss_enrolled") return;
      const el = form.querySelector(`[name=${k}]`);
      if (el) el.value = s[k] || "";
    });
    // ss_enrolled checkbox
    form.querySelector("[name=ss_enrolled]").checked = s.ss_enrolled !== "0";
    form.querySelector("[name=row_index]").value = s._row;
    form.querySelector("[name=ot_rate]").value   = s.ot_rate  || "1.5";
    document.getElementById("modal-sal-title").textContent = "แก้ไขเงินเดือน";
    openModal("modal-salary");
    this.bindSalaryCalc(form);
    this.recalc(form);
  },

  bindSalaryCalc(form) {
    // auto-fill base_salary เมื่อเลือกพนักงาน
    form.querySelector("[name=emp_id]")?.addEventListener("change", () => {
      const empId = form.querySelector("[name=emp_id]").value;
      const emp   = STATE.employees.find(e => e.emp_id === empId);
      if (emp?.base_salary) {
        form.querySelector("[name=base_salary]").value = emp.base_salary;
        this.recalc(form);
      }
    });
    // recalc เมื่อค่าเปลี่ยน
    ["base_salary","ot_hours","ot_rate","bonus","deduction"].forEach(name => {
      form.querySelector(`[name=${name}]`)?.addEventListener("input", () => this.recalc(form));
    });
    form.querySelector("[name=ss_enrolled]")?.addEventListener("change", () => this.recalc(form));
  },

  recalc(form) {
    const base      = parseFloat(form.querySelector("[name=base_salary]").value) || 0;
    const otHours   = parseFloat(form.querySelector("[name=ot_hours]").value)    || 0;
    const otRate    = parseFloat(form.querySelector("[name=ot_rate]").value)     || 0;
    const bonus     = parseFloat(form.querySelector("[name=bonus]").value)       || 0;
    const ded       = parseFloat(form.querySelector("[name=deduction]").value)   || 0;
    const ssEnrolled = form.querySelector("[name=ss_enrolled]").checked;

    const otPay = this.calcOTPay(base, otHours, otRate);
    const ss    = this.calcSS(base, ssEnrolled);
    const tax   = this.calcTax(base, otPay, bonus);
    const net   = this.calcNet(base, otPay, bonus, ss, tax, ded);

    // อัปเดต ot_pay field
    form.querySelector("[name=ot_pay]").value = otPay;

    // อัปเดต display
    const ssEl  = document.getElementById("sal-ss-display");
    const taxEl = document.getElementById("sal-tax-display");
    const otEl  = document.getElementById("sal-ot-display");
    if (ssEl)  ssEl.textContent  = ssEnrolled ? "฿" + ss.toLocaleString("th-TH") : "ไม่เข้าร่วม";
    if (taxEl) taxEl.textContent = "฿" + tax.toLocaleString("th-TH");
    if (otEl)  otEl.textContent  = "฿" + otPay.toLocaleString("th-TH");

    form.querySelector("[name=net_pay]").value = net.toFixed(0);
  },

  async save(form) {
    const fd      = new FormData(form);
    const empId   = fd.get("emp_id");
    const emp     = STATE.employees.find(e => e.emp_id === empId);
    const empName = emp ? `${emp.first_name} ${emp.last_name}` : "";
    const base    = parseFloat(fd.get("base_salary")) || 0;
    const otHours = parseFloat(fd.get("ot_hours"))    || 0;
    const otRate  = parseFloat(fd.get("ot_rate"))     || 0;
    const otPay   = this.calcOTPay(base, otHours, otRate);
    const bonus   = parseFloat(fd.get("bonus"))       || 0;
    const ded     = parseFloat(fd.get("deduction"))   || 0;
    const ssEnrolled = form.querySelector("[name=ss_enrolled]").checked;
    const ss      = this.calcSS(base, ssEnrolled);
    const tax     = this.calcTax(base, otPay, bonus);
    const net     = this.calcNet(base, otPay, bonus, ss, tax, ded);

    const obj = {
      month:          fd.get("month"),
      emp_id:         empId,
      emp_name:       empName,
      base_salary:    String(base),
      ot_pay:         String(otPay),
      bonus:          String(bonus),
      deduction:      String(ded),
      net_pay:        net.toFixed(0),
      payment_status: fd.get("payment_status"),
      notes:          fd.get("notes"),
      ot_hours:       String(otHours),
      ot_rate:        String(otRate),
      ss_enrolled:    ssEnrolled ? "1" : "0"
    };

    const rowIndex = fd.get("row_index");
    showLoading(true);
    try {
      if (rowIndex) {
        await API.update(CONFIG.SHEETS.SALARY, parseInt(rowIndex), this.objToRow(obj));
        showToast("✅ แก้ไขข้อมูลสำเร็จ");
      } else {
        await API.append(CONFIG.SHEETS.SALARY, this.objToRow(obj));
        showToast("✅ บันทึกเงินเดือนสำเร็จ");
      }
      closeModal("modal-salary");
      const month = document.getElementById("sal-month").value;
      const list  = await this.load(month);
      this.render(list);
    } catch (err) {
      showToast("❌ เกิดข้อผิดพลาด: " + err.message, "error");
    } finally {
      showLoading(false);
    }
  },

  confirmDelete(rowIndex) {
    if (!confirm("ต้องการลบรายการนี้ใช่หรือไม่?")) return;
    this.deleteRow(rowIndex);
  },

  async deleteRow(rowIndex) {
    showLoading(true);
    try {
      await API.delete(CONFIG.SHEETS.SALARY, rowIndex);
      showToast("🗑️ ลบรายการสำเร็จ");
      const month = document.getElementById("sal-month").value;
      const list  = await this.load(month);
      this.render(list);
    } catch (err) {
      showToast("❌ เกิดข้อผิดพลาด: " + err.message, "error");
    } finally {
      showLoading(false);
    }
  },

  /* ── สลิปเงินเดือน ── */
  printPayslip(dataIndex) {
    const s = STATE.salary[dataIndex];
    if (!s) return;
    const emp       = STATE.employees.find(e => String(e.emp_id) === String(s.emp_id));
    const base      = parseFloat(s.base_salary) || 0;
    const ot        = parseFloat(s.ot_pay)      || 0;
    const bonus     = parseFloat(s.bonus)       || 0;
    const otherDed  = parseFloat(s.deduction)   || 0;
    const ssEnrolled = s.ss_enrolled !== "0";
    const ss        = this.calcSS(base, ssEnrolled);
    const tax       = this.calcTax(base, ot, bonus);
    const net       = parseFloat(s.net_pay)     || 0;

    const w = window.open("", "_blank", "width=720,height=960");
    if (!w) { showToast("⚠️ กรุณาอนุญาต Popup ในเบราว์เซอร์", "error"); return; }
    w.document.write(this.getPayslipHTML({
      s, emp, base, ot, bonus, otherDed, ss, tax, net, ssEnrolled,
      otHours: parseFloat(s.ot_hours) || 0,
      otRate:  parseFloat(s.ot_rate)  || 0
    }));
    w.document.close();
    setTimeout(() => w.print(), 600);
  },

  _fmtMonth(m) {
    if (!m) return "-";
    const [y, mo] = m.split("-");
    const months = ["","ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.",
                    "ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
    return `${months[parseInt(mo)||0]} ${parseInt(y)+543}`;
  },

  getPayslipHTML({ s, emp, base, ot, bonus, otherDed, ss, tax, net, ssEnrolled, otHours, otRate }) {
    const gross    = base + ot + bonus;
    const totalDed = ss + tax + otherDed;
    const fmt      = n => Math.round(parseFloat(n)||0).toLocaleString("th-TH");

    return `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<title>สลิปเงินเดือน ${s.emp_name} ${s.month}</title>
<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Sarabun',Arial,sans-serif;font-size:13px;background:#f1f5f9;color:#1e293b;padding:24px}
.slip{max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.12)}
.hdr{background:#1e293b;color:#fff;padding:24px;text-align:center}
.hdr h1{font-size:20px;font-weight:700;margin-bottom:4px}
.hdr p{font-size:13px;opacity:.7}
.emp-bar{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:16px 20px;background:#f8fafc;border-bottom:1px solid #e2e8f0}
.emp-item label{font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:3px}
.emp-item strong{font-size:14px}
.sec{padding:16px 20px;border-bottom:1px solid #e2e8f0}
.sec-hdr{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:#94a3b8;margin-bottom:10px}
.line{display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px dotted #f1f5f9}
.line:last-child{border-bottom:none}
.line.sub{font-weight:600;border-top:1px solid #e2e8f0;margin-top:6px;padding-top:10px;border-bottom:none}
.inc{color:#1e293b;font-weight:500}
.ded{color:#dc2626;font-weight:500}
.note{font-size:11px;color:#94a3b8;margin-left:6px;font-weight:400}
.net-bar{background:#1e293b;color:#fff;padding:20px 24px;display:flex;justify-content:space-between;align-items:center}
.net-bar .lbl{font-size:14px;opacity:.8}
.net-bar .amt{font-size:28px;font-weight:700;letter-spacing:-.5px}
.badge{display:inline-block;padding:2px 8px;border-radius:9px;font-size:11px;background:#dcfce7;color:#16a34a;font-weight:600;margin-left:8px}
.footer{padding:14px 20px;text-align:center;font-size:11px;color:#94a3b8}
.print-btn{margin-top:8px;padding:6px 16px;background:#1e293b;color:#fff;border:none;border-radius:6px;cursor:pointer;font-family:inherit;font-size:12px}
@media print{body{background:#fff;padding:0}.slip{box-shadow:none;border-radius:0}.print-btn{display:none}}
</style>
</head>
<body>
<div class="slip">
  <div class="hdr">
    <h1>สลิปเงินเดือน</h1>
    <p>ประจำเดือน ${this._fmtMonth(s.month)}</p>
  </div>
  <div class="emp-bar">
    <div class="emp-item"><label>ชื่อ-นามสกุล</label><strong>${s.emp_name||"-"}</strong></div>
    <div class="emp-item"><label>รหัสพนักงาน</label><strong>${s.emp_id}</strong></div>
    <div class="emp-item"><label>ตำแหน่ง</label><strong>${emp?.position||"-"}</strong></div>
    <div class="emp-item"><label>แผนก</label><strong>${emp?.department||"-"}</strong></div>
  </div>
  <div class="sec">
    <div class="sec-hdr">รายได้</div>
    <div class="line"><span>เงินเดือนฐาน</span><span class="inc">฿${fmt(base)}</span></div>
    ${ot>0?`<div class="line"><span>ค่าล่วงเวลา (OT)<span class="note">${otHours} ชม. × ${otRate}x</span></span><span class="inc">฿${fmt(ot)}</span></div>`:""}
    ${bonus>0?`<div class="line"><span>โบนัส</span><span class="inc">฿${fmt(bonus)}</span></div>`:""}
    <div class="line sub"><span>รวมรายได้</span><span class="inc">฿${fmt(gross)}</span></div>
  </div>
  <div class="sec">
    <div class="sec-hdr">รายการหัก</div>
    ${ssEnrolled
      ? `<div class="line"><span>ประกันสังคม (5%)<span class="note">เพดาน ฿750</span></span><span class="ded">-฿${fmt(ss)}</span></div>`
      : `<div class="line"><span>ประกันสังคม</span><span style="color:#94a3b8;font-size:12px">ไม่เข้าร่วม</span></div>`}
    ${tax>0?`<div class="line"><span>ภาษีหัก ณ ที่จ่าย<span class="note">ประมาณการ</span></span><span class="ded">-฿${fmt(tax)}</span></div>`:""}
    ${otherDed>0?`<div class="line"><span>หักอื่นๆ</span><span class="ded">-฿${fmt(otherDed)}</span></div>`:""}
    <div class="line sub"><span>รวมรายการหัก</span><span class="ded">-฿${fmt(totalDed)}</span></div>
  </div>
  <div class="net-bar">
    <span class="lbl">เงินได้สุทธิ</span>
    <span class="amt">฿${fmt(net)}${s.payment_status?`<span class="badge">${s.payment_status}</span>`:""}</span>
  </div>
  <div class="footer">
    เอกสารออกโดยระบบ HR ฟาร์ม &bull; ${new Date().toLocaleDateString("th-TH",{year:"numeric",month:"long",day:"numeric"})}
    <br><button class="print-btn" onclick="window.print()">&#128424; พิมพ์ / บันทึก PDF</button>
  </div>
</div>
</body>
</html>`;
  },

  exportCSV(list) {
    if (!list?.length) { showToast("ไม่มีข้อมูลสำหรับ Export", "error"); return; }
    const headers = ["เดือน","รหัส","ชื่อ","เงินเดือนฐาน","OT","โบนัส","หัก","สุทธิ","ประกันสังคม","สถานะ"];
    const rows = list.map(s => [
      s.month, s.emp_id, s.emp_name, s.base_salary, s.ot_pay,
      s.bonus, s.deduction, s.net_pay,
      s.ss_enrolled !== "0" ? "เข้าร่วม" : "ไม่เข้าร่วม",
      s.payment_status
    ]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.download = `salary_${document.getElementById("sal-month").value || "all"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },

  getCurrentList() {
    const month = document.getElementById("sal-month").value;
    return month ? STATE.salary.filter(s => s.month === month) : STATE.salary;
  }
};
