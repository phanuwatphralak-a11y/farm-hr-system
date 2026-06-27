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
      tbody.innerHTML = `<tr><td colspan="10" class="empty-msg">ไม่พบข้อมูลเงินเดือน</td></tr>`;
      this.updateSummary([]);
      return;
    }

    tbody.innerHTML = list.map(s => `
      <tr>
        <td>${formatMonth(s.month)}</td>
        <td><strong>${s.emp_id}</strong></td>
        <td>${s.emp_name || "-"}</td>
        <td>${formatMoney(s.base_salary)}</td>
        <td>${formatMoney(s.ot_pay)}</td>
        <td>${formatMoney(s.bonus)}</td>
        <td style="color:var(--danger)">${formatMoney(s.deduction)}</td>
        <td><strong>${formatMoney(s.net_pay)}</strong></td>
        <td>${statusBadge(s.payment_status)}</td>
        <td>
          <div class="action-btns">
            <button class="btn-sm btn-sm-edit" onclick="SALARY.openEdit(${s._row - 1})">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn-sm btn-sm-del" onclick="SALARY.confirmDelete(${s._row})">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>`).join("");

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
  },

  bindSalaryCalc(form) {
    // Auto-fill base salary when employee selected
    const empSelect = form.querySelector("[name=emp_id]");
    empSelect.addEventListener("change", () => {
      const emp = STATE.employees.find(e => e.emp_id === empSelect.value);
      if (emp && emp.base_salary) {
        form.querySelector("[name=base_salary]").value = emp.base_salary;
        this.recalc(form);
      }
    });

    // Recalculate net when any number changes
    ["base_salary","ot_pay","bonus","deduction"].forEach(name => {
      form.querySelector(`[name=${name}]`).addEventListener("input", () => this.recalc(form));
    });
  },

  recalc(form) {
    const base = parseFloat(form.querySelector("[name=base_salary]").value) || 0;
    const ot = parseFloat(form.querySelector("[name=ot_pay]").value) || 0;
    const bonus = parseFloat(form.querySelector("[name=bonus]").value) || 0;
    const ded = parseFloat(form.querySelector("[name=deduction]").value) || 0;
    form.querySelector("[name=net_pay]").value = (base + ot + bonus - ded).toFixed(0);
  },

  async save(form) {
    const fd = new FormData(form);
    const empId = fd.get("emp_id");
    const emp = STATE.employees.find(e => e.emp_id === empId);
    const empName = emp ? `${emp.first_name} ${emp.last_name}` : "";

    const base = fd.get("base_salary") || "0";
    const ot = fd.get("ot_pay") || "0";
    const bonus = fd.get("bonus") || "0";
    const ded = fd.get("deduction") || "0";
    const net = this.calcNet(base, ot, bonus, ded).toFixed(0);

    const obj = {
      month: fd.get("month"),
      emp_id: empId,
      emp_name: empName,
      base_salary: base,
      ot_pay: ot,
      bonus: bonus,
      deduction: ded,
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
      const list = await this.load(month);
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
      const list = await this.load(month);
      this.render(list);
    } catch (err) {
      showToast("❌ เกิดข้อผิดพลาด: " + err.message, "error");
    } finally {
      showLoading(false);
    }
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
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
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
