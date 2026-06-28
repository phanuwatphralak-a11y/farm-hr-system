/**
 * salary.js — จัดการเงินเดือน/ค่าจ้าง
 * คอลัมน์ Sheet: month | emp_id | emp_name | base_salary | ot_pay |
 *                bonus | deduction | net_pay | payment_status | notes
 */

const SALARY = {
  COLS: ["month","emp_id","emp_name","base_salary","ot_pay",
         "bonus","deduction","net_pay","payment_status","notes"],

  rowToObj(row) {
    const obj = {};
    this.COLS.forEach((k, i) => obj[k] = row[i] || "");
    return obj;
  },

  objToRow(obj) {
    return this.COLS.map(k => obj[k] || "");
  },

  // ===== ประกันสังคม 5% เพดาน 750 บาท =====
  calcSS(base) {
    const b = parseFloat(base) || 0;
    return Math.min(Math.round(b * 0.05), 750);
  },

  // ===== ภาษีหัก ณ ที่จ่าย (ประมาณการรายเดือน) =====
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

  calcNet(base, ot, bonus, deduction) {
    return (parseFloat(base)||0) + (parseFloat(ot)||0) +
           (parseFloat(bonus)||0) - (parseFloat(deduction)||0);
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
    if (!list || !list.length) {
      tbody.innerHTML = `<tr><td colspan="11" class="empty-msg">ไม่พบข้อมูลเงินเดือน</td></tr>`;
      this.updateSummary([]);
      return;
    }

    tbody.innerHTML = list.map(s => {
      const ss = this.calcSS(s.base_salary);
      return `
      <tr>
        <td>${formatMonth(s.month)}</td>
        <td><strong>${s.emp_id}</strong></td>
        <td>${s.emp_name || "-"}</td>
        <td>${formatMoney(s.base_salary)}</td>
        <td>${formatMoney(s.ot_pay)}</td>
        <td>${formatMoney(s.bonus)}</td>
        <td style="color:var(--danger)">${formatMoney(s.deduction)}</td>
        <td style="color:var(--text-muted);font-size:12px">${formatMoney(ss)}</td>
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
    document.getElementById("sal-avg").textContent = count ? "฿" + Math.round(total / count).toLocaleString("th-TH") : "฿0";
  },

  openAdd() {
    const form = document.getElementById("form-salary");
    form.reset();
    form.querySelector("[name=row_index]").value = "";
    const now = new Date();
    form.querySelector("[name=month]").value =
      `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
    document.getElementById("modal-sal-title").textContent = "บันทึกเงินเดือน";
    openModal("modal-salary");
    this.bindSalaryCalc(form);
    this._refreshSSDisplay(form);
  },

  openEdit(dataIndex) {
    const s = STATE.salary[dataIndex];
    if (!s) return;
    const form = document.getElementById("form-salary");
    form.reset();
    this.COLS.forEach(k => {
      const el = form.querySelector(`[name=${k}]`);
      if (el) el.value = s[k] || "";
    });
    form.querySelector("[name=row_index]").value = s._row;
    document.getElementById("modal-sal-title").textContent = "แก้ไขเงินเดือน";
    openModal("modal-salary");
    this.bindSalaryCalc(form);
    this._refreshSSDisplay(form);
  },

  _refreshSSDisplay(form) {
    const base  = parseFloat(form.querySelector("[name=base_salary]")?.value) || 0;
    const ot    = parseFloat(form.querySelector("[name=ot_pay]")?.value) || 0;
    const bonus = parseFloat(form.querySelector("[name=bonus]")?.value) || 0;
    const ssEl  = document.getElementById("sal-ss-display");
    const taxEl = document.getElementById("sal-tax-display");
    if (ssEl)  ssEl.textContent  = "฿" + this.calcSS(base).toLocaleString("th-TH");
    if (taxEl) taxEl.textContent = "฿" + this.calcTax(base, ot, bonus).toLocaleString("th-TH");
  },

  bindSalaryCalc(form) {
    const empSelect = form.querySelector("[name=emp_id]");
    empSelect.addEventListener("change", () => {
      const emp = STATE.employees.find(e => e.emp_id === empSelect.value);
      if (emp && emp.base_salary) {
        form.querySelector("[name=base_salary]").value = emp.base_salary;
        this.recalc(form);
      }
    });
    ["base_salary","ot_pay","bonus","deduction"].forEach(name => {
      form.querySelector(`[name=${name}]`).addEventListener("input", () => this.recalc(form));
    });
  },

  recalc(form) {
    const base  = parseFloat(form.querySelector("[name=base_salary]").value) || 0;
    const ot    = parseFloat(form.querySelector("[name=ot_pay]").value) || 0;
    const bonus = parseFloat(form.querySelector("[name=bonus]").value) || 0;
    const ded   = parseFloat(form.querySelector("[name=deduction]").value) || 0;
    const ss    = this.calcSS(base);
    const tax   = this.calcTax(base, ot, bonus);

    const ssEl  = document.getElementById("sal-ss-display");
    const taxEl = document.getElementById("sal-tax-display");
    if (ssEl)  ssEl.textContent  = "฿" + ss.toLocaleString("th-TH");
    if (taxEl) taxEl.textContent = "฿" + tax.toLocaleString("th-TH");

    const net = Math.max(0, base + ot + bonus - ss - tax - ded);
    form.querySelector("[name=net_pay]").value = net.toFixed(0);
  },

  async save(form) {
    const fd = new FormData(form);
    const empId   = fd.get("emp_id");
    const emp     = STATE.employees.find(e => e.emp_id === empId);
    const empName = emp ? `${emp.first_name} ${emp.last_name}` : "";
    const base  = parseFloat(fd.get("base_salary")) || 0;
    const ot    = parseFloat(fd.get("ot_pay")) || 0;
    const bonus = parseFloat(fd.get("bonus")) || 0;
    const ded   = parseFloat(fd.get("deduction")) || 0;
    const ss    = this.calcSS(base);
    const tax   = this.calcTax(base, ot, bonus);
    const net   = Math.max(0, base + ot + bonus - ss - tax - ded).toFixed(0);

    const obj = {
      month: fd.get("month"),
      emp_id: empId,
      emp_name: empName,
      base_salary: String(base),
      ot_pay: String(ot),
      bonus: String(bonus),
      deduction: String(ded),
      net_pay: net,
      payment_status: fd.get("payment_status"),
      notes: fd.get("notes")
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

  // ===== สลิปเงินเดือน =====
  printPayslip(dataIndex) {
    const s = STATE.salary[dataIndex];
    if (!s) return;
    const emp      = STATE.employees.find(e => String(e.emp_id) === String(s.emp_id));
    const base     = parseFloat(s.base_salary) || 0;
    const ot       = parseFloat(s.ot_pay) || 0;
    const bonus    = parseFloat(s.bonus) || 0;
    const otherDed = parseFloat(s.deduction) || 0;
    const ss       = this.calcSS(base);
    const tax      = this.calcTax(base, ot, bonus);
    const net      = parseFloat(s.net_pay) || 0;

    const w = window.open("", "_blank", "width=720,height=920");
    if (!w) { showToast("⚠️ กรุณาอนุญาต Popup ในเบราว์เซอร์", "error"); return; }
    w.document.write(this.getPayslipHTML({ s, emp, base, ot, bonus, otherDed, ss, tax, net }));
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

  getPayslipHTML({ s, emp, base, ot, bonus, otherDed, ss, tax, net }) {
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
    <div class="emp-item"><label>ตำแหน่ง</label><strong>${emp&&emp.position?emp.position:"-"}</strong></div>
    <div class="emp-item"><label>แผนก</label><strong>${emp&&emp.department?emp.department:"-"}</strong></div>
  </div>
  <div class="sec">
    <div class="sec-hdr">รายได้</div>
    <div class="line"><span>เงินเดือนฐาน</span><span class="inc">฿${fmt(base)}</span></div>
    ${ot>0?`<div class="line"><span>ค่าล่วงเวลา (OT)</span><span class="inc">฿${fmt(ot)}</span></div>`:""}
    ${bonus>0?`<div class="line"><span>โบนัส</span><span class="inc">฿${fmt(bonus)}</span></div>`:""}
    <div class="line sub"><span>รวมรายได้</span><span class="inc">฿${fmt(gross)}</span></div>
  </div>
  <div class="sec">
    <div class="sec-hdr">รายการหัก</div>
    <div class="line"><span>ประกันสังคม (5%)<span class="note">เพดาน ฿750</span></span><span class="ded">-฿${fmt(ss)}</span></div>
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
    if (!list || !list.length) { showToast("ไม่มีข้อมูลสำหรับ Export", "error"); return; }
    const headers = ["เดือน","รหัส","ชื่อ","เงินเดือนฐาน","OT","โบนัส","หัก","สุทธิ","สถานะ"];
    const rows = list.map(s => [
      s.month, s.emp_id, s.emp_name, s.base_salary, s.ot_pay,
      s.bonus, s.deduction, s.net_pay, s.payment_status
    ]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `salary_${document.getElementById("sal-month").value || "all"}.csv`;
    a.click(); URL.revokeObjectURL(url);
  },

  getCurrentList() {
    const month = document.getElementById("sal-month").value;
    return month ? STATE.salary.filter(s => s.month === month) : STATE.salary;
  }
};
