/**
 * leave.js — จัดการการลาหยุด
 * คอลัมน์ Sheet "การลา":
 *   leave_id | request_date | emp_id | emp_name | leave_type |
 *   start_date | end_date | days | reason | status |
 *   approved_by | approved_date | notes
 */

const LEAVE = {
  COLS: [
    "leave_id","request_date","emp_id","emp_name","leave_type",
    "start_date","end_date","days","reason","status",
    "approved_by","approved_date","notes"
  ],

  // โควต้าวันลาต่อปี (null = ไม่จำกัด)
  QUOTA: {
    "ลาป่วย":    30,
    "ลากิจ":     3,
    "ลาพักร้อน": 6,
    "ลาคลอด":   90,
    "ลาอื่นๆ":   null
  },

  _currentTab: "requests",

  rowToObj(row) {
    const obj = {};
    this.COLS.forEach((k, i) => obj[k] = row[i] !== undefined ? String(row[i]) : "");
    return obj;
  },

  objToRow(obj) {
    return this.COLS.map(k => obj[k] !== undefined ? obj[k] : "");
  },

  calcDays(start, end) {
    if (!start || !end) return 1;
    // ใช้ HOLIDAYS.calcWorkdays ถ้ามี (ไม่นับวันหยุดและเสาร์-อาทิตย์)
    if (typeof HOLIDAYS !== "undefined") {
      return HOLIDAYS.calcWorkdays(start, end);
    }
    // fallback: นับรวมทุกวัน
    const s = new Date(start), e = new Date(end);
    const d = Math.round((e - s) / 86400000) + 1;
    return d > 0 ? d : 1;
  },

  genId(empId) {
    const d = new Date().toISOString().slice(0,10).replace(/-/g,"");
    const t = Date.now().toString().slice(-4);
    return `LV-${d}-${empId}-${t}`;
  },

  async load(year = "", empId = "", status = "") {
    const rows = await API.getAll(CONFIG.SHEETS.LEAVE);
    STATE.leave = rows.map((r, i) => ({ ...this.rowToObj(r), _row: i + 1 }));

    let filtered = STATE.leave;
    if (year)   filtered = filtered.filter(l => l.start_date && l.start_date.startsWith(year));
    if (empId)  filtered = filtered.filter(l => l.emp_id === empId);
    if (status) filtered = filtered.filter(l => l.status === status);
    return filtered;
  },

  render(list) {
    const tbody = document.getElementById("leave-tbody");
    if (!list?.length) {
      tbody.innerHTML = `<tr><td colspan="10" class="empty-msg">ไม่พบข้อมูลการลา</td></tr>`;
      return;
    }
    const sorted = [...list].sort((a,b) => (b.request_date||"").localeCompare(a.request_date||""));
    tbody.innerHTML = sorted.map(l => `
      <tr>
        <td>${formatDate(l.request_date)}</td>
        <td><strong>${l.emp_id}</strong></td>
        <td>${l.emp_name || "-"}</td>
        <td><span class="badge badge-blue">${l.leave_type || "-"}</span></td>
        <td>${formatDate(l.start_date)}</td>
        <td>${formatDate(l.end_date)}</td>
        <td><strong>${l.days || 1}</strong> วัน</td>
        <td class="td-reason">${l.reason || "-"}</td>
        <td>${this.statusBadge(l.status)}</td>
        <td>
          <div class="action-btns">
            ${l.status === "รอการอนุมัติ" ? `
              <button class="btn-sm btn-sm-approve" onclick="LEAVE.approve(${l._row})" title="อนุมัติ">
                <i class="fas fa-check"></i>
              </button>
              <button class="btn-sm btn-sm-reject" onclick="LEAVE.reject(${l._row})" title="ปฏิเสธ">
                <i class="fas fa-times"></i>
              </button>
            ` : ""}
            <button class="btn-sm btn-sm-del" onclick="LEAVE.confirmDelete(${l._row})" title="ลบ">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>`).join("");
  },

  statusBadge(status) {
    const map = {
      "รอการอนุมัติ": "badge-orange",
      "อนุมัติ":      "badge-green",
      "ปฏิเสธ":       "badge-red"
    };
    return `<span class="badge ${map[status] || "badge-gray"}">${status || "-"}</span>`;
  },

  renderQuota() {
    const year = new Date().getFullYear().toString();
    const container = document.getElementById("leave-quota-list");
    const emps = STATE.employees.filter(e => e.status !== "ลาออก");

    if (!emps.length) {
      container.innerHTML = `<p class="empty-msg">ไม่มีข้อมูลพนักงาน</p>`;
      return;
    }

    // คำนวณวันลาที่ใช้ไปแล้ว (เฉพาะที่ "อนุมัติ" ในปีปัจจุบัน)
    const usedMap = {};
    STATE.leave
      .filter(l => l.status === "อนุมัติ" && l.start_date && l.start_date.startsWith(year))
      .forEach(l => {
        if (!usedMap[l.emp_id]) usedMap[l.emp_id] = {};
        usedMap[l.emp_id][l.leave_type] =
          (usedMap[l.emp_id][l.leave_type] || 0) + (parseInt(l.days) || 1);
      });

    const types = Object.keys(this.QUOTA);
    const thYear = parseInt(year) + 543;

    container.innerHTML = `
      <div class="quota-year-label">
        <i class="fas fa-calendar-check"></i> โควต้าวันลา ปี ${thYear}
      </div>
      <div class="card">
        <div class="quota-table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>พนักงาน</th>
                ${types.map(t => {
                  const q = this.QUOTA[t];
                  return `<th>${t}<br><small>${q !== null ? q + " วัน/ปี" : "ไม่จำกัด"}</small></th>`;
                }).join("")}
              </tr>
            </thead>
            <tbody>
              ${emps.map(e => {
                const used = usedMap[e.emp_id] || {};
                return `<tr>
                  <td>
                    <strong>${e.emp_id}</strong><br>
                    <small style="color:var(--text-muted)">${e.first_name} ${e.last_name}</small>
                  </td>
                  ${types.map(t => {
                    const quota = this.QUOTA[t];
                    const u = used[t] || 0;
                    if (quota === null) {
                      return `<td><span style="color:var(--text-muted)">${u} วัน</span></td>`;
                    }
                    const pct = Math.min(100, Math.round(u / quota * 100));
                    const over = u > quota;
                    return `<td>
                      <div class="quota-cell">
                        <span class="${over ? "text-danger" : ""}">
                          ${u}/${quota} วัน
                          ${quota - u > 0 ? `<small style="color:var(--text-muted)"> (เหลือ ${quota-u})</small>` : ""}
                        </span>
                        <div class="quota-bar">
                          <div class="quota-fill${over ? " over" : ""}" style="width:${pct}%"></div>
                        </div>
                      </div>
                    </td>`;
                  }).join("")}
                </tr>`;
              }).join("")}
            </tbody>
          </table>
        </div>
      </div>`;
  },

  openAdd() {
    const form = document.getElementById("form-leave");
    form.reset();
    form.querySelector("[name=row_index]").value = "";
    const today = new Date().toISOString().slice(0,10);
    form.querySelector("[name=request_date]").value = today;
    form.querySelector("[name=start_date]").value = today;
    form.querySelector("[name=end_date]").value = today;
    document.getElementById("modal-leave-title").textContent = "ยื่นคำขอลา";
    this.updateDaysDisplay();
    openModal("modal-leave");
  },

  updateDaysDisplay() {
    const s = document.querySelector("#form-leave [name=start_date]")?.value;
    const e = document.querySelector("#form-leave [name=end_date]")?.value;
    const d = this.calcDays(s, e);
    const el = document.getElementById("leave-days-calc");
    if (el) el.textContent = d;
    const hi = document.querySelector("#form-leave [name=days]");
    if (hi) hi.value = d;
  },

  async save(form) {
    const fd = new FormData(form);
    const empId = fd.get("emp_id");
    if (!empId) { showToast("⚠️ กรุณาเลือกพนักงาน", "error"); return; }

    const emp = STATE.employees.find(e => e.emp_id === empId);
    const empName = emp ? `${emp.first_name} ${emp.last_name}` : "";
    const start = fd.get("start_date");
    const end = fd.get("end_date");

    const obj = {
      leave_id:     this.genId(empId),
      request_date: fd.get("request_date"),
      emp_id:       empId,
      emp_name:     empName,
      leave_type:   fd.get("leave_type"),
      start_date:   start,
      end_date:     end,
      days:         this.calcDays(start, end),
      reason:       fd.get("reason"),
      status:       "รอการอนุมัติ",
      approved_by:  "",
      approved_date:"",
      notes:        fd.get("notes")
    };

    showLoading(true);
    try {
      await API.append(CONFIG.SHEETS.LEAVE, this.objToRow(obj));
      showToast("✅ ยื่นคำขอลาสำเร็จ");
      closeModal("modal-leave");
      const year = document.getElementById("leave-year-filter")?.value || "";
      await this.load(year);
      this._refreshCurrentTab();
    } catch (err) {
      showToast("❌ เกิดข้อผิดพลาด: " + err.message, "error");
    } finally {
      showLoading(false);
    }
  },

  async approve(rowIndex) {
    const item = STATE.leave.find(l => l._row === rowIndex);
    if (!item) return;
    if (!confirm(
      `อนุมัติการลา?\n\nพนักงาน: ${item.emp_name}\nประเภท: ${item.leave_type}\nวันที่: ${formatDate(item.start_date)} – ${formatDate(item.end_date)}\nจำนวน: ${item.days} วัน`
    )) return;

    const updated = { ...item,
      status:       "อนุมัติ",
      approved_by:  STATE.currentUser?.name || "admin",
      approved_date: new Date().toISOString().slice(0,10)
    };
    showLoading(true);
    try {
      await API.update(CONFIG.SHEETS.LEAVE, rowIndex, this.objToRow(updated));
      showToast("✅ อนุมัติการลาสำเร็จ");
      const year = document.getElementById("leave-year-filter")?.value || "";
      await this.load(year);
      this._refreshCurrentTab();
    } catch (err) {
      showToast("❌ เกิดข้อผิดพลาด: " + err.message, "error");
    } finally {
      showLoading(false);
    }
  },

  async reject(rowIndex) {
    const item = STATE.leave.find(l => l._row === rowIndex);
    if (!item) return;
    const reason = prompt(`เหตุผลที่ปฏิเสธการลาของ ${item.emp_name} (${item.leave_type}):\n(กด Cancel เพื่อยกเลิก)`);
    if (reason === null) return;

    const updated = { ...item,
      status:        "ปฏิเสธ",
      approved_by:   STATE.currentUser?.name || "admin",
      approved_date: new Date().toISOString().slice(0,10),
      notes:         reason ? `[ปฏิเสธ] ${reason}` : "[ปฏิเสธ]"
    };
    showLoading(true);
    try {
      await API.update(CONFIG.SHEETS.LEAVE, rowIndex, this.objToRow(updated));
      showToast("🚫 ปฏิเสธคำขอลาแล้ว");
      const year = document.getElementById("leave-year-filter")?.value || "";
      await this.load(year);
      this._refreshCurrentTab();
    } catch (err) {
      showToast("❌ เกิดข้อผิดพลาด: " + err.message, "error");
    } finally {
      showLoading(false);
    }
  },

  confirmDelete(rowIndex) {
    if (!confirm("ต้องการลบคำขอลานี้ใช่หรือไม่?")) return;
    this._deleteRow(rowIndex);
  },

  async _deleteRow(rowIndex) {
    showLoading(true);
    try {
      await API.delete(CONFIG.SHEETS.LEAVE, rowIndex);
      showToast("🗑️ ลบคำขอลาสำเร็จ");
      const year = document.getElementById("leave-year-filter")?.value || "";
      await this.load(year);
      this._refreshCurrentTab();
    } catch (err) {
      showToast("❌ เกิดข้อผิดพลาด: " + err.message, "error");
    } finally {
      showLoading(false);
    }
  },

  switchTab(tab) {
    this._currentTab = tab;
    document.querySelectorAll(".leave-tab-btn").forEach(b =>
      b.classList.toggle("active", b.dataset.tab === tab)
    );
    document.getElementById("leave-tab-requests").classList.toggle("hidden", tab !== "requests");
    document.getElementById("leave-tab-quota").classList.toggle("hidden", tab !== "quota");
    if (tab === "quota") this.renderQuota();
  },

  _refreshCurrentTab() {
    if (this._currentTab === "quota") {
      this.renderQuota();
    } else {
      const year   = document.getElementById("leave-year-filter")?.value || "";
      const status = document.getElementById("leave-status-filter")?.value || "";
      const empId  = document.getElementById("leave-emp-filter-req")?.value || "";
      const filtered = STATE.leave
        .filter(l => !year   || l.start_date?.startsWith(year))
        .filter(l => !status || l.status === status)
        .filter(l => !empId  || l.emp_id === empId);
      this.render(filtered);
    }
  }
};
