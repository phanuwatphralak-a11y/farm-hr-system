/**
 * api.js — ติดต่อ Google Apps Script Web App
 */

const API = {
  async getAll(sheet) {
    const url = `${CONFIG.SCRIPT_URL}?action=getAll&sheet=${encodeURIComponent(sheet)}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data.rows || [];
  },
  async append(sheet, values) {
    const res = await fetch(CONFIG.SCRIPT_URL, {
      method: "POST", headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ action: "append", sheet, values })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data;
  },
  async update(sheet, rowIndex, values) {
    const res = await fetch(CONFIG.SCRIPT_URL, {
      method: "POST", headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ action: "update", sheet, rowIndex, values })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data;
  },
  async delete(sheet, rowIndex) {
    const res = await fetch(CONFIG.SCRIPT_URL, {
      method: "POST", headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ action: "delete", sheet, rowIndex })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data;
  }
};

const STATE = {
  employees: [], attendance: [], salary: [], performance: [], leave: [],
  currentUser: null
};

function showLoading(show = true) {
  document.getElementById("loading").classList.toggle("hidden", !show);
}

function showToast(msg, type = "success") {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.className = `toast ${type}`;
  toast.classList.remove("hidden");
  setTimeout(() => toast.classList.add("hidden"), 3500);
}

function formatDate(dateStr) {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" });
  } catch { return dateStr; }
}

function formatMoney(n) {
  if (n === "" || n === undefined || n === null) return "฿0";
  return "฿" + Number(n).toLocaleString("th-TH");
}

function formatMonth(monthStr) {
  if (!monthStr) return "-";
  try {
    const [y, m] = monthStr.split("-");
    const d = new Date(y, m - 1, 1);
    return d.toLocaleDateString("th-TH", { year: "numeric", month: "long" });
  } catch { return monthStr; }
}

function statusBadge(status) {
  const map = {
    "ทำงาน":"badge-green","มา":"badge-green","จ่ายแล้ว":"badge-green",
    "ลาออก":"badge-red","ขาด":"badge-red",
    "ลาป่วย":"badge-orange","ลากิจ":"badge-orange","พักงาน":"badge-orange","รอจ่าย":"badge-orange",
    "วันหยุด":"badge-gray"
  };
  const cls = map[status] || "badge-gray";
  return `<span class="badge ${cls}">${status || "-"}</span>`;
}

function gradeClass(grade) {
  const map = { A: "score-a", B: "score-b", C: "score-c", D: "score-d" };
  return map[grade] || "";
}

function openModal(id) { document.getElementById(id).classList.remove("hidden"); }
function closeModal(id) { document.getElementById(id).classList.add("hidden"); }

function calcGrade(score) {
  const n = parseFloat(score);
  if (n >= 4.5) return "A";
  if (n >= 3.5) return "B";
  if (n >= 2.5) return "C";
  return "D";
}
