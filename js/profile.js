/**
 * profile.js — จัดการข้อมูลส่วนตัว + ประวัติรายบุคคล
 */

const PROFILE = {
  COLS: [
    "emp_id","national_id","birth_date","gender","nationality","religion",
    "blood_type","marital_status","emergency_name","emergency_relation",
    "emergency_phone","bank_name","bank_account","education_level",
    "education_institution","skills","notes"
  ],

  _cache: [],
  _currentEmpId: null,

  rowToObj(row) {
    const obj = {};
    this.COLS.forEach((k, i) => obj[k] = row[i] !== undefined ? String(row[i]) : "");
    return obj;
  },

  objToRow(obj) {
    return this.COLS.map(k => obj[k] !== undefined ? obj[k] : "");
  },

  async loadAll() {
    const rows = await API.getAll(CONFIG.SHEETS.PERSONAL);
    this._cache = rows.map((r, i) => ({ ...this.rowToObj(r), _row: i + 1 }));
    return this._cache;
  },

  getByEmpId(empId) {
    return this._cache.find(p => String(p.emp_id) === String(empId)) || null;
  },

  calcAge(birthDate) {
    if (!birthDate) return "-";
    const b = new Date(birthDate);
    const today = new Date();
    const age = today.getFullYear() - b.getFullYear()
      - (today < new Date(today.getFullYear(), b.getMonth(), b.getDate()) ? 1 : 0);
    return age + " ปี";
  },

  async openProfile(empId) {
    const emp = STATE.employees.find(e => String(e.emp_id) === String(empId));
    if (!emp) {
      showToast("⚠️ ไม่พบข้อมูลพนักงาน (emp_id: " + empId + ")", "error");
      return;
    }

    this._currentEmpId = String(empId);

    showLoading(true);
    try {
      await this.loadAll();
    } catch (err) {
      showToast("⚠️ โหลดข้อมูลส่วนตัวไม่สำเร็จ: " + err.message, "error");
    } finally {
      showLoading(false);
    }

    const personal = this.getByEmpId(empId);

    // ===== Header =====
    document.getElementById("profile-emp-name").textContent =
      `${emp.first_name} ${emp.last_name}`;
    document.getElementById("profile-emp-meta").textContent =
      `${emp.position || "-"}  •  ${emp.department || "-"}`;
    document.getElementById("profile-emp-id-badge").textContent = emp.emp_id || "-";

    const startBadge = document.getElementById("profile-emp-start");
    if (startBadge) startBadge.textContent = emp.start_date
      ? "เริ่มงาน " + formatDate(emp.start_date) : "";

    const statusEl = document.getElementById("profile-emp-status");
    if (statusEl) statusEl.innerHTML = statusBadge(emp.status);

    // ===== Form =====
    const form = document.getElementById("form-profile");
    form.reset();
    form.querySelector("[name=emp_id]").value = String(empId);
    form.querySelector("[name=row_index]").value = personal?._row || "";

    if (personal) {
      this.COLS.slice(1).forEach(k => {
        const el = form.querySelector(`[name=${k}]`);
        if (el) el.value = personal[k] || "";
      });
    }

    this._updateAge();
    this.switchTab("personal");
    openModal("modal-profile");
  },

  _updateAge() {
    const bdInput = document.querySelector("#form-profile [name=birth_date]");
    const ageEl = document.getElementById("profile-age-display");
    if (bdInput && ageEl) {
      ageEl.textContent = bdInput.value ? this.calcAge(bdInput.value) : "";
    }
  },

  switchTab(tab) {
    document.querySelectorAll(".profile-tab-btn").forEach(b =>
      b.classList.toggle("active", b.dataset.tab === tab)
    );
    document.querySelectorAll(".profile-tab-pane").forEach(p =>
      p.classList.toggle("hidden", p.dataset.tab !== tab)
    );
    // Load history tabs on demand
    if (tab === "hist-attendance") this._renderAttendance();
    if (tab === "hist-salary")     this._renderSalary();
    if (tab === "hist-leave")      this._renderLeave();
    if (tab === "hist-perf")       this._renderPerformance();
  },

  // ===== HISTORY RENDERERS =====

  async _renderAttendance() {
    const el = document.getElementById("profile-hist-att");
    el.innerHTML = `<p class="empty-msg">กำลังโหลด...</p>`;
    try {
      const rows = await API.getAll(CONFIG.SHEETS.ATTENDANCE);
      const empId = this._currentEmpId;
      const list = rows
        .map((r, i) => ({ date: r[0], emp_id: String(r[1]), emp_name: r[2],
          time_in: r[3], time_out: r[4], work_hours: r[5],
          status: r[6], ot_hours: r[7] }))
        .filter(r => r.emp_id === empId)
        .sort((a, b) => b.date.localeCompare(a.date));

      if (!list.length) {
        el.innerHTML = `<p class="empty-msg">ไม่มีข้อมูลเวลาทำงาน</p>`; return;
      }
      el.innerHTML = `
        <div class="hist-summary">
          <span>รวม ${list.length} วัน</span>
          <span>มา ${list.filter(r=>r.status==="มา").length}</span>
          <span>ขาด ${list.filter(r=>r.status==="ขาด").length}</span>
          <span>ลา ${list.filter(r=>["ลาป่วย","ลากิจ"].includes(r.status)).length}</span>
        </div>
        <div class="hist-table-wrap">
          <table class="data-table">
            <thead><tr><th>วันที่</th><th>เข้า</th><th>ออก</th><th>ชม.</th><th>OT</th><th>สถานะ</th></tr></thead>
            <tbody>
              ${list.map(r => `<tr>
                <td>${formatDate(r.date)}</td>
                <td>${r.time_in||"-"}</td>
                <td>${r.time_out||"-"}</td>
                <td>${r.work_hours||"-"}</td>
                <td>${r.ot_hours||"-"}</td>
                <td>${statusBadge(r.status)}</td>
              </tr>`).join("")}
            </tbody>
          </table>
        </div>`;
    } catch (err) {
      el.innerHTML = `<p class="empty-msg text-danger">โหลดไม่สำเร็จ: ${err.message}</p>`;
    }
  },

  async _renderSalary() {
    const el = document.getElementById("profile-hist-sal");
    el.innerHTML = `<p class="empty-msg">กำลังโหลด...</p>`;
    try {
      const rows = await API.getAll(CONFIG.SHEETS.SALARY);
      const empId = this._currentEmpId;
      const list = rows
        .map(r => ({ month: r[0], emp_id: String(r[1]), base_salary: r[3],
          ot_pay: r[4], bonus: r[5], deduction: r[6],
          net_pay: r[7], payment_status: r[8] }))
        .filter(r => r.emp_id === empId)
        .sort((a, b) => String(b.month).localeCompare(String(a.month)));

      if (!list.length) {
        el.innerHTML = `<p class="empty-msg">ไม่มีข้อมูลเงินเดือน</p>`; return;
      }
      const totalNet = list.reduce((s,r)=>s+(parseFloat(r.net_pay)||0),0);
      el.innerHTML = `
        <div class="hist-summary">
          <span>รวม ${list.length} เดือน</span>
          <span>รวมสุทธิ ฿${totalNet.toLocaleString("th-TH",{maximumFractionDigits:0})}</span>
        </div>
        <div class="hist-table-wrap">
          <table class="data-table">
            <thead><tr><th>เดือน</th><th>เงินเดือน</th><th>OT</th><th>โบนัส</th><th>หัก</th><th>สุทธิ</th><th>สถานะ</th></tr></thead>
            <tbody>
              ${list.map(r => `<tr>
                <td>${r.month||"-"}</td>
                <td class="text-right">฿${(parseFloat(r.base_salary)||0).toLocaleString("th-TH")}</td>
                <td class="text-right">฿${(parseFloat(r.ot_pay)||0).toLocaleString("th-TH")}</td>
                <td class="text-right">฿${(parseFloat(r.bonus)||0).toLocaleString("th-TH")}</td>
                <td class="text-right text-danger">฿${(parseFloat(r.deduction)||0).toLocaleString("th-TH")}</td>
                <td class="text-right"><strong>฿${(parseFloat(r.net_pay)||0).toLocaleString("th-TH")}</strong></td>
                <td>${statusBadge(r.payment_status)}</td>
              </tr>`).join("")}
            </tbody>
          </table>
        </div>`;
    } catch (err) {
      el.innerHTML = `<p class="empty-msg text-danger">โหลดไม่สำเร็จ: ${err.message}</p>`;
    }
  },

  async _renderLeave() {
    const el = document.getElementById("profile-hist-leave");
    el.innerHTML = `<p class="empty-msg">กำลังโหลด...</p>`;
    try {
      const rows = await API.getAll(CONFIG.SHEETS.LEAVE);
      const empId = this._currentEmpId;
      const COLS_L = ["leave_id","request_date","emp_id","emp_name","leave_type",
                      "start_date","end_date","days","reason","status","approved_by","approved_date","notes"];
      const list = rows
        .map(r => { const o={}; COLS_L.forEach((k,i)=>o[k]=r[i]!==undefined?String(r[i]):""); return o; })
        .filter(r => r.emp_id === empId)
        .sort((a,b)=>b.request_date.localeCompare(a.request_date));

      if (!list.length) {
        el.innerHTML = `<p class="empty-msg">ไม่มีข้อมูลการลา</p>`; return;
      }
      const approved = list.filter(r=>r.status==="อนุมัติ");
      const totalDays = approved.reduce((s,r)=>s+(parseFloat(r.days)||0),0);
      el.innerHTML = `
        <div class="hist-summary">
          <span>รวม ${list.length} รายการ</span>
          <span>อนุมัติ ${approved.length} รายการ (${totalDays} วัน)</span>
        </div>
        <div class="hist-table-wrap">
          <table class="data-table">
            <thead><tr><th>วันที่ยื่น</th><th>ประเภท</th><th>เริ่ม</th><th>สิ้นสุด</th><th>วัน</th><th>สถานะ</th></tr></thead>
            <tbody>
              ${list.map(r => `<tr>
                <td>${formatDate(r.request_date)}</td>
                <td>${r.leave_type||"-"}</td>
                <td>${formatDate(r.start_date)}</td>
                <td>${formatDate(r.end_date)}</td>
                <td>${r.days||"-"}</td>
                <td>${statusBadge(r.status)}</td>
              </tr>`).join("")}
            </tbody>
          </table>
        </div>`;
    } catch (err) {
      el.innerHTML = `<p class="empty-msg text-danger">โหลดไม่สำเร็จ: ${err.message}</p>`;
    }
  },

  async _renderPerformance() {
    const el = document.getElementById("profile-hist-perf");
    el.innerHTML = `<p class="empty-msg">กำลังโหลด...</p>`;
    try {
      const rows = await API.getAll(CONFIG.SHEETS.PERFORMANCE);
      const empId = this._currentEmpId;
      const list = rows
        .map(r => ({ eval_date: r[0], emp_id: String(r[1]),
          year: r[3], quarter: r[4], quality: r[5],
          punctuality: r[6], teamwork: r[7], responsibility: r[8],
          total_score: r[9], grade: r[10], comments: r[11] }))
        .filter(r => r.emp_id === empId)
        .sort((a,b)=>String(b.eval_date).localeCompare(String(a.eval_date)));

      if (!list.length) {
        el.innerHTML = `<p class="empty-msg">ไม่มีข้อมูลการประเมิน</p>`; return;
      }
      el.innerHTML = `
        <div class="hist-table-wrap">
          <table class="data-table">
            <thead><tr><th>ปี</th><th>ไตรมาส</th><th>คุณภาพ</th><th>ตรงเวลา</th><th>ทีม</th><th>ความรับผิดชอบ</th><th>รวม</th><th>เกรด</th></tr></thead>
            <tbody>
              ${list.map(r => {
                const gc = gradeClass(r.grade);
                return `<tr>
                  <td>${r.year||"-"}</td>
                  <td>${r.quarter||"-"}</td>
                  <td>${r.quality||"-"}</td>
                  <td>${r.punctuality||"-"}</td>
                  <td>${r.teamwork||"-"}</td>
                  <td>${r.responsibility||"-"}</td>
                  <td><strong>${r.total_score||"-"}</strong></td>
                  <td><span class="${gc}">${r.grade||"-"}</span></td>
                </tr>`;
              }).join("")}
            </tbody>
          </table>
        </div>`;
    } catch (err) {
      el.innerHTML = `<p class="empty-msg text-danger">โหลดไม่สำเร็จ: ${err.message}</p>`;
    }
  },

  // ===== SAVE PERSONAL DATA =====
  async save(form) {
    const fd = new FormData(form);
    const empId = fd.get("emp_id");
    if (!empId) return;

    const obj = { emp_id: empId };
    this.COLS.slice(1).forEach(k => obj[k] = fd.get(k) || "");

    const rowIndex = parseInt(fd.get("row_index") || "0");

    showLoading(true);
    try {
      if (rowIndex) {
        await API.update(CONFIG.SHEETS.PERSONAL, rowIndex, this.objToRow(obj));
      } else {
        await API.append(CONFIG.SHEETS.PERSONAL, this.objToRow(obj));
      }
      showToast("✅ บันทึกข้อมูลส่วนตัวสำเร็จ");
      closeModal("modal-profile");
      await this.loadAll();
    } catch (err) {
      showToast("❌ เกิดข้อผิดพลาด: " + err.message, "error");
    } finally {
      showLoading(false);
    }
  }
};
