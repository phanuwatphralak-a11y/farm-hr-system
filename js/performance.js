/**
 * performance.js — จัดการประเมินผลงาน
 * คอลัมน์ Sheet: eval_date | emp_id | emp_name | year | quarter |
 *                quality | punctuality | teamwork | responsibility |
 *                total_score | grade | comments
 */

const PERFORMANCE = {
  COLS: ["eval_date","emp_id","emp_name","year","quarter",
         "quality","punctuality","teamwork","responsibility",
         "total_score","grade","comments"],

  rowToObj(row) {
    const obj = {};
    this.COLS.forEach((k, i) => obj[k] = row[i] || "");
    return obj;
  },

  objToRow(obj) {
    return this.COLS.map(k => obj[k] || "");
  },

  calcScore(quality, punctuality, teamwork, responsibility) {
    const vals = [quality, punctuality, teamwork, responsibility]
      .map(v => parseFloat(v) || 0);
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    return avg.toFixed(2);
  },

  async load(year = "", quarter = "") {
    const rows = await API.getAll(CONFIG.SHEETS.PERFORMANCE);
    STATE.performance = rows.map((r, i) => ({ ...this.rowToObj(r), _row: i + 1 }));

    let filtered = STATE.performance;
    if (year) filtered = filtered.filter(p => p.year == year);
    if (quarter) filtered = filtered.filter(p => p.quarter === quarter);
    return filtered;
  },

  render(list) {
    const tbody = document.getElementById("performance-tbody");
    if (!list || !list.length) {
      tbody.innerHTML = `<tr><td colspan="10" class="empty-msg">ไม่พบข้อมูลการประเมิน</td></tr>`;
      return;
    }

    const sorted = [...list].sort((a, b) =>
      (b.eval_date || "").localeCompare(a.eval_date || ""));

    tbody.innerHTML = sorted.map(p => {
      const gc = gradeClass(p.grade);
      return `<tr>
        <td>${formatDate(p.eval_date)}</td>
        <td><strong>${p.emp_id}</strong></td>
        <td>${p.emp_name || "-"}</td>
        <td>${p.quarter || "-"} / ${p.year || "-"}</td>
        <td>${p.quality || "-"}</td>
        <td>${p.punctuality || "-"}</td>
        <td>${p.teamwork || "-"}</td>
        <td><strong>${p.total_score || "-"}</strong></td>
        <td><span class="${gc}">${p.grade || "-"}</span></td>
        <td>
          <div class="action-btns">
            <button class="btn-sm btn-sm-edit" onclick="PERFORMANCE.openEdit(${p._row - 1})">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn-sm btn-sm-del" onclick="PERFORMANCE.confirmDelete(${p._row})">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>`;
    }).join("");
  },

  openAdd() {
    const form = document.getElementById("form-performance");
    form.reset();
    form.querySelector("[name=row_index]").value = "";
    const now = new Date();
    form.querySelector("[name=eval_date]").value = now.toISOString().slice(0,10);
    form.querySelector("[name=year]").value = now.getFullYear();
    // Default quarter
    const q = Math.ceil((now.getMonth() + 1) / 3);
    form.querySelector("[name=quarter]").value = `Q${q}`;
    document.getElementById("modal-perf-title").textContent = "บันทึกประเมินผลงาน";
    openModal("modal-performance");
    this.bindScoreCalc(form);
  },

  openEdit(dataIndex) {
    const p = STATE.performance[dataIndex];
    if (!p) return;
    const form = document.getElementById("form-performance");
    form.reset();
    this.COLS.forEach(k => {
      const el = form.querySelector(`[name=${k}]`);
      if (el) el.value = p[k] || "";
    });
    form.querySelector("[name=row_index]").value = p._row;
    document.getElementById("modal-perf-title").textContent = "แก้ไขผลการประเมิน";
    openModal("modal-performance");
    this.bindScoreCalc(form);
  },

  bindScoreCalc(form) {
    const fields = ["quality","punctuality","teamwork","responsibility"];
    const handler = () => {
      const vals = fields.map(f => form.querySelector(`[name=${f}]`).value);
      const score = this.calcScore(...vals);
      const grade = calcGrade(score);
      form.querySelector("[name=total_score]").value = score;
      form.querySelector("[name=grade]").value = grade;
      document.getElementById("perf-total").value = score;
      document.getElementById("perf-grade").value = grade;
    };
    fields.forEach(f => {
      form.querySelector(`[name=${f}]`).addEventListener("input", handler);
    });
    handler(); // initial calc
  },

  async save(form) {
    const fd = new FormData(form);
    const empId = fd.get("emp_id");
    const emp = STATE.employees.find(e => e.emp_id === empId);
    const empName = emp ? `${emp.first_name} ${emp.last_name}` : "";

    const quality = fd.get("quality") || "0";
    const punctuality = fd.get("punctuality") || "0";
    const teamwork = fd.get("teamwork") || "0";
    const responsibility = fd.get("responsibility") || "0";
    const total = this.calcScore(quality, punctuality, teamwork, responsibility);
    const grade = calcGrade(total);

    const obj = {
      eval_date: fd.get("eval_date"),
      emp_id: empId,
      emp_name: empName,
      year: fd.get("year"),
      quarter: fd.get("quarter"),
      quality, punctuality, teamwork, responsibility,
      total_score: total,
      grade: grade,
      comments: fd.get("comments")
    };

    const rowIndex = fd.get("row_index");
    showLoading(true);
    try {
      if (rowIndex) {
        await API.update(CONFIG.SHEETS.PERFORMANCE, parseInt(rowIndex), this.objToRow(obj));
        showToast("✅ แก้ไขข้อมูลสำเร็จ");
      } else {
        await API.append(CONFIG.SHEETS.PERFORMANCE, this.objToRow(obj));
        showToast("✅ บันทึกการประเมินสำเร็จ");
      }
      closeModal("modal-performance");
      const year = document.getElementById("perf-year").value;
      const quarter = document.getElementById("perf-quarter").value;
      const list = await this.load(year, quarter);
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
      await API.delete(CONFIG.SHEETS.PERFORMANCE, rowIndex);
      showToast("🗑️ ลบรายการสำเร็จ");
      const year = document.getElementById("perf-year").value;
      const quarter = document.getElementById("perf-quarter").value;
      const list = await this.load(year, quarter);
      this.render(list);
    } catch (err) {
      showToast("❌ เกิดข้อผิดพลาด: " + err.message, "error");
    } finally {
      showLoading(false);
    }
  }
};
