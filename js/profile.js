/**
 * profile.js — จัดการข้อมูลส่วนตัวรายบุคคล
 */

const PROFILE = {
  COLS: [
    "emp_id","national_id","birth_date","gender","nationality","religion",
    "blood_type","marital_status","emergency_name","emergency_relation",
    "emergency_phone","bank_name","bank_account","education_level",
    "education_institution","skills","notes"
  ],

  _cache: [],

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

    showLoading(true);
    try {
      await this.loadAll();
    } catch (err) {
      showToast("⚠️ โหลดข้อมูลส่วนตัวไม่สำเร็จ: " + err.message, "error");
    } finally {
      showLoading(false);
    }

    const personal = this.getByEmpId(empId);

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
  },

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
