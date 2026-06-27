/**
 * attendance.js — จัดการเวลาเข้า-ออกงาน
 * คอลัมน์ Sheet: date | emp_id | emp_name | time_in | time_out |
 *                work_hours | status | ot_hours | notes
 */

const ATTENDANCE = {
  COLS: ["date","emp_id","emp_name","time_in","time_out","work_hours","status","ot_hours","notes"],

  rowToObj(row) {
    const obj = {};
    this.COLS.forEach((k, i) => obj[k] = row[i] || "");
    return obj;
  },

  objToRow(obj) {
    return this.COLS.map(k => obj[k] || "");
  },

  calcHours(timeIn, timeOut) {
    if (!timeIn || !timeOut) return "";
    try {
      const [h1, m1] = timeIn.split(":").map(Number);
      const [h2, m2] = timeOut.split(":").map(Number);
      const mins = (h2 * 60 + m2) - (h1 * 60 + m1);
      if (mins <= 0) return "";
      return (mins / 60).toFixed(1);
    } catch { return ""; }
  },

  async load(month = "", empId = "") {
    const rows = await API.getAll(CONFIG.SHEETS.ATTENDANCE);
    STATE.attendance = rows.map((r, i) => ({ ...this.rowToObj(r), _row: i + 1 }));

    let filtered = STATE.attendance;
    if (month) filtered = filtered.filter(a => a.date && a.date.startsWith(month));
    if (empId) filtered = filtered.filter(a => a.emp_id === empId);

    return filtered;
  },

  render(list) {
    const tbody = document.getElementById("attendance-tbody");
    if (!list || !list.length) {
      tbody.innerHTML = `<tr><td colspan="9" class="empty-msg">ไม่พบข้อมูลการเข้างาน</td></tr>`;
      return;
    }

    const sorted = [...list].sort((a, b) => (b.date || "").localeCompare(a.date || ""));

    tbody.innerHTML = sorted.map(a => `
      <tr>
        <td>${formatDate(a.date)}</td>
        <td><strong>${a.emp_id}</strong></td>
        <td>${a.emp_name || "-"}</td>
        <td>${a.time_in || "-"}</td>
        <td>${a.time_out || "-"}</td>
        <td>${a.work_hours ? a.work_hours + " ชม." : "-"}</td>
        <td>${statusBadge(a.status)}</td>
        <td>${a.ot_hours ? a.ot_hours + " ชม." : "-"}</td>
        <td>${a.notes || "-"}</td>
        <td>
          <div class="action-btns">
            <button class="btn-sm btn-sm-edit" onclick="ATTENDANCE.openEdit(${a._row - 1})">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn-sm btn-sm-del" onclick="ATTENDANCE.confirmDelete(${a._row})">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>`).join("");
  },

  openAdd() {
    const form = document.getElementById("form-attendance");
    form.reset();
    form.querySelector("[name=row_index]").value = "";
    form.querySelector("[name=date]").value = new Date().toISOString().slice(0,10);
    document.getElementById("modal-att-title").textContent = "บันทึกเวลาทำงาน";
    openModal("modal-attendance");
  },

  openEdit(dataIndex) {
    const list = STATE.attendance;
    const a = list[dataIndex];
    if (!a) return;
    const form = document.getElementById("form-attendance");
    form.reset();
    form.querySelector("[name=date]").value = a.date || "";
    form.querySelector("[name=emp_id]").value = a.emp_id || "";
    form.querySelector("[name=time_in]").value = a.time_in || "";
    form.querySelector("[name=time_out]").value = a.time_out || "";
    form.querySelector("[name=status]").value = a.status || "มา";
    form.querySelector("[name=ot_hours]").value = a.ot_hours || "0";
    form.querySelector("[name=notes]").value = a.notes || "";
    form.querySelector("[name=row_index]").value = a._row;
    document.getElementById("modal-att-title").textContent = "แก้ไขเวลาทำงาน";
    openModal("modal-attendance");
  },

  async save(form) {
    const fd = new FormData(form);
    const empId = fd.get("emp_id");
    const emp = STATE.employees.find(e => e.emp_id === empId);
    const empName = emp ? `${emp.first_name} ${emp.last_name}` : "";

    const timeIn = fd.get("time_in");
    const timeOut = fd.get("time_out");
    const workHours = this.calcHours(timeIn, timeOut);

    const obj = {
      date: fd.get("date"),
      emp_id: empId,
      emp_name: empName,
      time_in: timeIn,
      time_out: timeOut,
      work_hours: workHours,
      status: fd.get("status"),
      ot_hours: fd.get("ot_hours") || "0",
      notes: fd.get("notes")
    };

    const rowIndex = fd.get("row_index");
    showLoading(true);
    try {
      if (rowIndex) {
        await API.update(CONFIG.SHEETS.ATTENDANCE, parseInt(rowIndex), this.objToRow(obj));
        showToast("✅ แก้ไขข้อมูลสำเร็จ");
      } else {
        await API.append(CONFIG.SHEETS.ATTENDANCE, this.objToRow(obj));
        showToast("✅ บันทึกเวลาทำงานสำเร็จ");
      }
      closeModal("modal-attendance");
      const month = document.getElementById("att-month").value;
      const empFilter = document.getElementById("att-emp-filter").value;
      const list = await this.load(month, empFilter);
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
      await API.delete(CONFIG.SHEETS.ATTENDANCE, rowIndex);
      showToast("🗑️ ลบรายการสำเร็จ");
      const month = document.getElementById("att-month").value;
      const empFilter = document.getElementById("att-emp-filter").value;
      const list = await this.load(month, empFilter);
      this.render(list);
    } catch (err) {
      showToast("❌ เกิดข้อผิดพลาด: " + err.message, "error");
    } finally {
      showLoading(false);
    }
  },

  getTodaySummary() {
    const today = new Date().toISOString().slice(0, 10);
    return STATE.attendance.filter(a => a.date === today);
  }
};
