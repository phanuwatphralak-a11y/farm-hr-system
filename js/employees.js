/**
 * employees.js â à¸à¸±à¸à¸à¸²à¸£à¸à¹à¸­à¸¡à¸¹à¸¥à¸à¸à¸±à¸à¸à¸²à¸
 * à¸à¸­à¸¥à¸±à¸¡à¸à¹ Sheet: emp_id | first_name | last_name | position | department |
 *                start_date | phone | base_salary | status | address | notes
 */

const EMPLOYEES = {
  COLS: ["emp_id","first_name","last_name","position","department",
         "start_date","phone","base_salary","status","address","notes"],

  rowToObj(row) {
    const obj = {};
    this.COLS.forEach((k, i) => obj[k] = row[i] || "");
    return obj;
  },

  objToRow(obj) {
    return this.COLS.map(k => obj[k] || "");
  },

  async load() {
    const rows = await API.getAll(CONFIG.SHEETS.EMPLOYEES);
    STATE.employees = rows.map((r, i) => ({ ...this.rowToObj(r), _row: i + 1 }));
    return STATE.employees;
  },

  render(filter = "") {
    const tbody = document.getElementById("employees-tbody");
    const lower = filter.toLowerCase();
    const list = filter
      ? STATE.employees.filter(e =>
          `${e.emp_id} ${e.first_name} ${e.last_name} ${e.position} ${e.department}`
            .toLowerCase().includes(lower))
      : STATE.employees;

    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="8" class="empty-msg">à¹à¸¡à¹à¸à¸à¸à¹à¸­à¸¡à¸¹à¸¥à¸à¸à¸±à¸à¸à¸²à¸</td></tr>`;
      return;
    }

    tbody.innerHTML = list.map(e => `
      <tr>
        <td><strong>${e.emp_id}</strong></td>
        <td>${e.first_name} ${e.last_name}</td>
        <td>${e.position || "-"}</td>
        <td>${e.department || "-"}</td>
        <td>${formatDate(e.start_date)}</td>
        <td>${e.phone || "-"}</td>
        <td>${statusBadge(e.status)}</td>
        <td>
          <div class="action-btns">
            <button class="btn-sm btn-sm-edit" onclick="EMPLOYEES.openEdit(${e._row - 1})">
              <i class="fas fa-edit"></i> à¹à¸à¹à¹à¸
            </button>
            <button class="btn-sm btn-sm-del" onclick="EMPLOYEES.confirmDelete(${e._row}, '${e.first_name} ${e.last_name}')">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>`).join("");
  },

  openAdd() {
    const form = document.getElementById("form-employee");
    form.reset();
    form.querySelector("[name=row_index]").value = "";
    form.querySelector("[name=start_date]").value = new Date().toISOString().slice(0,10);
    document.getElementById("modal-emp-title").textContent = "à¹à¸à¸´à¹à¸¡à¸à¸à¸±à¸à¸à¸²à¸";
    openModal("modal-employee");
  },

  openEdit(index) {
    const e = STATE.employees[index];
    if (!e) return;
    const form = document.getElementById("form-employee");
    form.reset();
    this.COLS.forEach(k => {
      const el = form.querySelector(`[name=${k}]`);
      if (el) el.value = e[k] || "";
    });
    form.querySelector("[name=row_index]").value = e._row;
    document.getElementById("modal-emp-title").textContent = "à¹à¸à¹à¹à¸à¸à¹à¸­à¸¡à¸¹à¸¥à¸à¸à¸±à¸à¸à¸²à¸";
    openModal("modal-employee");
  },

  async save(form) {
    const fd = new FormData(form);
    const obj = {};
    this.COLS.forEach(k => obj[k] = fd.get(k) || "");
    const rowIndex = fd.get("row_index");

    showLoading(true);
    try {
      if (rowIndex) {
        await API.update(CONFIG.SHEETS.EMPLOYEES, parseInt(rowIndex), this.objToRow(obj));
        showToast("â à¹à¸à¹à¹à¸à¸à¹à¸­à¸¡à¸¹à¸¥à¸ªà¸³à¹à¸£à¹à¸");
      } else {
        await API.append(CONFIG.SHEETS.EMPLOYEES, this.objToRow(obj));
        showToast("â à¹à¸à¸´à¹à¸¡à¸à¸à¸±à¸à¸à¸²à¸à¸ªà¸³à¹à¸£à¹à¸");
      }
      closeModal("modal-employee");
      await this.load();
      this.render();
      populateEmpSelects();
    } catch (err) {
      showToast("â à¹à¸à¸´à¸à¸à¹à¸­à¸à¸´à¸à¸à¸¥à¸²à¸: " + err.message, "error");
    } finally {
      showLoading(false);
    }
  },

  confirmDelete(rowIndex, name) {
    if (!confirm(`à¸à¹à¸­à¸à¸à¸²à¸£à¸¥à¸à¸à¸à¸±à¸à¸à¸²à¸ "${name}" à¹à¸à¹à¸«à¸£à¸·à¸­à¹à¸¡à¹?`)) return;
    this.deleteRow(rowIndex);
  },

  async deleteRow(rowIndex) {
    showLoading(true);
    try {
      await API.delete(CONFIG.SHEETS.EMPLOYEES, rowIndex);
      showToast("ðï¸ à¸¥à¸à¸à¸à¸±à¸à¸à¸²à¸à¸ªà¸³à¹à¸£à¹à¸");
      await this.load();
      this.render();
      populateEmpSelects();
    } catch (err) {
      showToast("â à¹à¸à¸´à¸à¸à¹à¸­à¸à¸´à¸à¸à¸¥à¸²à¸: " + err.message, "error");
    } finally {
      showLoading(false);
    }
  }
};
