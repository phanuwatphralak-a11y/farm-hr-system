/**
 * attendance.js — จัดการเวลาเข้า-ออกงาน
 * คอลัมน์ Sheet: date | emp_id | emp_name | time_in | time_out |
 *                work_hours | status | ot_hours | notes | shift_type
 *
 * shift_type: "same_day"  = เข้า-ออกวันเดียวกัน
 *             "overnight" = เข้าวันนี้ ออกข้ามเที่ยงคืน (+24h)
 */

const ATTENDANCE = {
  COLS: [
    "date","emp_id","emp_name","time_in","time_out",
    "work_hours","status","ot_hours","notes","shift_type"
  ],

  rowToObj(row) {
    const obj = {};
    this.COLS.forEach((k, i) => obj[k] = row[i] !== undefined ? String(row[i]) : "");
    return obj;
  },

  objToRow(obj) {
    return this.COLS.map(k => obj[k] !== undefined ? obj[k] : "");
  },

  /**
   * คำนวณชั่วโมงทำงาน
   * @param {string} timeIn  "HH:MM"
   * @param {string} timeOut "HH:MM"
   * @param {string} shiftType "same_day" | "overnight"
   * @returns {{ total: number, work: number, ot: number }}
   */
  calcHours(timeIn, timeOut, shiftType = "same_day") {
    if (!timeIn || !timeOut) return { total: 0, work: 0, ot: 0 };
    try {
      const [h1, m1] = timeIn.split(":").map(Number);
      const [h2, m2] = timeOut.split(":").map(Number);
      let inMins  = h1 * 60 + m1;
      let outMins = h2 * 60 + m2;

      // กะดึก: ถ้าออกก่อนเข้า → บวก 24 ชั่วโมง
      if (shiftType === "overnight" || outMins <= inMins) {
        outMins += 24 * 60;
      }

      const totalMins = outMins - inMins;
      if (totalMins <= 0) return { total: 0, work: 0, ot: 0 };

      const stdMins = (CONFIG.WORK?.HOURS_PER_DAY ?? 8) * 60;
      const total   = +(totalMins / 60).toFixed(2);
      const work    = +(Math.min(totalMins, stdMins) / 60).toFixed(2);
      const ot      = +(Math.max(0, totalMins - stdMins) / 60).toFixed(2);
      return { total, work, ot };
    } catch {
      return { total: 0, work: 0, ot: 0 };
    }
  },

  async load(month = "", empId = "") {
    const rows = await API.getAll(CONFIG.SHEETS.ATTENDANCE);
    STATE.attendance = rows.map((r, i) => ({ ...this.rowToObj(r), _row: i + 1 }));

    let filtered = STATE.attendance;
    if (month)  filtered = filtered.filter(a => a.date && a.date.startsWith(month));
    if (empId)  filtered = filtered.filter(a => a.emp_id === empId);
    return filtered;
  },

  render(list) {
    const tbody = document.getElementById("attendance-tbody");
    if (!list?.length) {
      tbody.innerHTML = `<tr><td colspan="10" class="empty-msg">ไม่พบข้อมูลการเข้างาน</td></tr>`;
      return;
    }

    const sorted = [...list].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    tbody.innerHTML = sorted.map(a => {
      const shiftIcon = a.shift_type === "overnight" ? "🌙" : "🌅";
      const otBadge   = parseFloat(a.ot_hours) > 0
        ? `<span class="badge badge-orange" style="font-size:11px">OT ${a.ot_hours} ชม.</span>` : "";
      return `
      <tr>
        <td>${formatDate(a.date)}</td>
        <td><strong>${a.emp_id}</strong></td>
        <td>${a.emp_name || "-"}</td>
        <td>${a.time_in || "-"}</td>
        <td>${a.time_out || "-"} ${shiftIcon}</td>
        <td>${a.work_hours ? a.work_hours + " ชม." : "-"}</td>
        <td>${otBadge || "-"}</td>
        <td>${statusBadge(a.status)}</td>
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
      </tr>`;
    }).join("");
  },

  /* ── เปิดฟอร์มเพิ่ม ── */
  openAdd() {
    const form = document.getElementById("form-attendance");
    form.reset();
    form.querySelector("[name=row_index]").value = "";
    form.querySelector("[name=date]").value = new Date().toISOString().slice(0, 10);
    form.querySelector("[name=shift_type]").value = "same_day";
    document.getElementById("modal-att-title").textContent = "บันทึกเวลาทำงาน";
    this._updateShiftLabel(form);
    this._updateCalcDisplay(form);
    openModal("modal-attendance");
  },

  /* ── เปิดฟอร์มแก้ไข ── */
  openEdit(dataIndex) {
    const a = STATE.attendance[dataIndex];
    if (!a) return;
    const form = document.getElementById("form-attendance");
    form.reset();
    form.querySelector("[name=date]").value       = a.date      || "";
    form.querySelector("[name=emp_id]").value     = a.emp_id    || "";
    form.querySelector("[name=time_in]").value    = a.time_in   || "";
    form.querySelector("[name=time_out]").value   = a.time_out  || "";
    form.querySelector("[name=status]").value     = a.status    || "มา";
    form.querySelector("[name=notes]").value      = a.notes     || "";
    form.querySelector("[name=row_index]").value  = a._row;
    const shift = a.shift_type || "same_day";
    form.querySelector("[name=shift_type]").value = shift;
    document.getElementById("modal-att-title").textContent = "แก้ไขเวลาทำงาน";
    this._updateShiftLabel(form);
    this._updateCalcDisplay(form);
    openModal("modal-attendance");
  },

  /* ── อัปเดตป้ายกะ ── */
  _updateShiftLabel(form) {
    const shiftType = form.querySelector("[name=shift_type]").value;
    const el = document.getElementById("att-shift-label");
    if (!el) return;
    const shifts = CONFIG.WORK?.SHIFTS ?? [];
    const found  = shifts.find(s => s.value === shiftType);
    el.textContent = found ? found.label : "";
  },

  /* ── แสดงชั่วโมงคำนวณ live ── */
  _updateCalcDisplay(form) {
    const timeIn   = form.querySelector("[name=time_in]").value;
    const timeOut  = form.querySelector("[name=time_out]").value;
    const shiftType = form.querySelector("[name=shift_type]").value;
    const { work, ot } = this.calcHours(timeIn, timeOut, shiftType);

    const workEl = document.getElementById("att-work-display");
    const otEl   = document.getElementById("att-ot-display");
    if (workEl) workEl.textContent = work > 0 ? work + " ชม." : "-";
    if (otEl)   otEl.textContent   = ot   > 0 ? ot   + " ชม." : "-";
  },

  /* ── bind events ในฟอร์ม ── */
  bindFormEvents(form) {
    ["time_in","time_out","shift_type"].forEach(name => {
      form.querySelector(`[name=${name}]`)?.addEventListener("change", () => {
        this._updateCalcDisplay(form);
        this._updateShiftLabel(form);
      });
    });
  },

  /* ── บันทึก ── */
  async save(form) {
    const fd    = new FormData(form);
    const empId = fd.get("emp_id");
    const emp   = STATE.employees.find(e => e.emp_id === empId);
    const empName = emp ? `${emp.first_name} ${emp.last_name}` : "";

    const timeIn    = fd.get("time_in");
    const timeOut   = fd.get("time_out");
    const shiftType = fd.get("shift_type") || "same_day";
    const { work, ot } = this.calcHours(timeIn, timeOut, shiftType);

    const obj = {
      date:       fd.get("date"),
      emp_id:     empId,
      emp_name:   empName,
      time_in:    timeIn,
      time_out:   timeOut,
      work_hours: work > 0 ? String(work) : "",
      status:     fd.get("status"),
      ot_hours:   ot  > 0 ? String(ot)   : "0",
      notes:      fd.get("notes"),
      shift_type: shiftType
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
      const month    = document.getElementById("att-month").value;
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
      const month    = document.getElementById("att-month").value;
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
