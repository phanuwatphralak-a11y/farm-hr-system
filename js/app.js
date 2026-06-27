/**
 * app.js — Main application entry point
 */

let tokenClient;
let accessToken = null;
const SCOPES = "";

document.addEventListener("DOMContentLoaded", () => {
  initApp();
});

function initApp() {
  if (CONFIG.SCRIPT_URL.includes("YOUR_SCRIPT_ID")) {
    showConfigError();
    return;
  }
  const savedUser = sessionStorage.getItem("hr_user");
  if (savedUser) {
    try {
      STATE.currentUser = JSON.parse(savedUser);
      showApp();
    } catch {
      showLoginScreen();
    }
  } else {
    showLoginScreen();
  }
  bindEvents();
  setDefaultFilters();
}

function showConfigError() {
  document.getElementById("login-screen").innerHTML = `
    <div class="login-card">
      <div class="login-logo">
        <i class="fas fa-exclamation-triangle" style="color:#d97706"></i>
        <h1>ยังไม่ได้ตั้งค่า</h1>
      </div>
      <p style="color:#64748b;font-size:14px;line-height:1.8">
        กรุณาแก้ไขไฟล์ <strong>js/config.js</strong> แล้วใส่ค่า:<br/>
        • SCRIPT_URL จาก Google Apps Script<br/>
        • SPREADSHEET_ID จาก Google Sheets<br/><br/>
        ดูรายละเอียดได้ที่ <strong>README.md</strong>
      </p>
    </div>`;
}

document.getElementById("btn-login")?.addEventListener("click", async () => {
  const name = prompt("กรอกชื่อผู้ใช้งาน (admin):");
  if (!name) return;
  const user = {
    name: name,
    email: name + "@farm.local",
    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=2563eb&color=fff`
  };
  STATE.currentUser = user;
  sessionStorage.setItem("hr_user", JSON.stringify(user));
  showApp();
});

function showLoginScreen() {
  document.getElementById("login-screen").classList.remove("hidden");
  document.getElementById("app").classList.add("hidden");
}

async function showApp() {
  document.getElementById("login-screen").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");
  const u = STATE.currentUser;
  if (u) {
    document.getElementById("user-name").textContent = u.name;
    document.getElementById("user-email").textContent = u.email;
    const avatar = document.getElementById("user-avatar");
    if (u.avatar) { avatar.src = u.avatar; avatar.style.display = "block"; }
  }
  await loadAllData();
  navigateTo("dashboard");
}

async function loadAllData() {
  showLoading(true);
  try {
    await EMPLOYEES.load();
    populateEmpSelects();
    document.getElementById("last-sync").textContent =
      "ซิงค์ล่าสุด: " + new Date().toLocaleTimeString("th-TH");
  } catch (err) {
    showToast("❌ ไม่สามารถโหลดข้อมูลได้: " + err.message, "error");
  } finally {
    showLoading(false);
  }
}

function navigateTo(page) {
  document.querySelectorAll(".menu-item").forEach(el => el.classList.remove("active"));
  const active = document.querySelector(`[data-page="${page}"]`);
  if (active) active.classList.add("active");
  document.querySelectorAll(".page").forEach(p => {
    p.classList.remove("active");
    p.classList.add("hidden");
  });
  const pageEl = document.getElementById(`page-${page}`);
  if (pageEl) { pageEl.classList.remove("hidden"); pageEl.classList.add("active"); }
  const titles = {
    dashboard: "ภาพรวม",
    employees: "ข้อมูลพนักงาน",
    attendance: "เวลาทำงาน",
    salary: "เงินเดือน/ค่าจ้าง",
    performance: "ประเมินผลงาน",
    leave: "การลาหยุด"
  };
  document.getElementById("page-title").textContent = titles[page] || page;
  loadPageData(page);
  document.getElementById("sidebar").classList.remove("open");
}

async function loadPageData(page) {
  showLoading(true);
  try {
    switch (page) {
      case "dashboard":
        await loadDashboard();
        break;
      case "employees":
        await EMPLOYEES.load();
        EMPLOYEES.render();
        break;
      case "attendance": {
        const month = document.getElementById("att-month").value;
        const emp = document.getElementById("att-emp-filter").value;
        const list = await ATTENDANCE.load(month, emp);
        ATTENDANCE.render(list);
        break;
      }
      case "salary": {
        // โหลดทั้งหมดก่อน ไม่ filter ตามเดือน
        const list = await SALARY.load("");
        SALARY.render(list);
        break;
      }
      case "performance": {
        const year = document.getElementById("perf-year").value;
        const quarter = document.getElementById("perf-quarter").value;
        const list = await PERFORMANCE.load(year, quarter);
        PERFORMANCE.render(list);
        break;
      }
      case "leave": {
        const year = document.getElementById("leave-year-filter").value;
        const status = document.getElementById("leave-status-filter").value;
        const empId = document.getElementById("leave-emp-filter-req").value;
        const list = await LEAVE.load(year, empId, status);
        LEAVE.render(list);
        break;
      }
    }
    document.getElementById("last-sync").textContent =
      "ซิงค์ล่าสุด: " + new Date().toLocaleTimeString("th-TH");
  } catch (err) {
    showToast("❌ โหลดข้อมูลไม่สำเร็จ: " + err.message, "error");
  } finally {
    showLoading(false);
  }
}

async function loadDashboard() {
  await ATTENDANCE.load();
  const totalEmp = STATE.employees.filter(e => e.status !== "ลาออก").length;
  const today = new Date().toISOString().slice(0, 10);
  const todayAtt = STATE.attendance.filter(a => a.date === today);
  const present = todayAtt.filter(a => a.status === "มา").length;
  const absent = todayAtt.filter(a => ["ขาด","ลาป่วย","ลากิจ"].includes(a.status)).length;
  const thisMonth = new Date().toISOString().slice(0, 7);
  await SALARY.load(thisMonth);
  const monthSalary = STATE.salary
    .filter(s => s.month === thisMonth)
    .reduce((sum, s) => sum + (parseFloat(s.net_pay) || 0), 0);
  document.getElementById("stat-total-emp").textContent = totalEmp;
  document.getElementById("stat-present").textContent = present;
  document.getElementById("stat-absent").textContent = absent;
  document.getElementById("stat-salary").textContent = "฿" + monthSalary.toLocaleString("th-TH");
  document.getElementById("today-date").textContent =
    new Date().toLocaleDateString("th-TH", { weekday:"long", day:"numeric", month:"long" });
  const attList = document.getElementById("today-attendance-list");
  if (todayAtt.length) {
    attList.innerHTML = todayAtt.map(a => `
      <div class="mini-list-item">
        <div>
          <div class="name">${a.emp_name || a.emp_id}</div>
          <div class="detail">${a.time_in ? "เข้า " + a.time_in : ""} ${a.time_out ? "• ออก " + a.time_out : ""}</div>
        </div>
        ${statusBadge(a.status)}
      </div>`).join("");
  } else {
    attList.innerHTML = `<p class="empty-msg">ยังไม่มีการบันทึกวันนี้</p>`;
  }
  await PERFORMANCE.load();
  const sorted = [...STATE.performance].sort((a,b) =>
    (b.eval_date || "").localeCompare(a.eval_date || ""));
  const recent = sorted.slice(0, 5);
  const perfList = document.getElementById("recent-performance-list");
  if (recent.length) {
    perfList.innerHTML = recent.map(p => {
      const gc = gradeClass(p.grade);
      return `<div class="mini-list-item">
        <div>
          <div class="name">${p.emp_name || p.emp_id}</div>
          <div class="detail">${p.quarter || ""} / ${p.year || ""}</div>
        </div>
        <span class="${gc}">${p.grade || "-"} (${p.total_score || "-"})</span>
      </div>`;
    }).join("");
  } else {
    perfList.innerHTML = `<p class="empty-msg">ยังไม่มีข้อมูลการประเมิน</p>`;
  }
}

function populateEmpSelects() {
  const selects = [
    document.getElementById("att-emp-select"),
    document.getElementById("att-emp-filter"),
    document.getElementById("sal-emp-select"),
    document.getElementById("perf-emp-select"),
    document.getElementById("leave-emp-select"),
    document.getElementById("leave-emp-filter-req")
  ];
  const options = STATE.employees
    .filter(e => e.status !== "ลาออก")
    .map(e => `<option value="${e.emp_id}">${e.emp_id} — ${e.first_name} ${e.last_name}</option>`)
    .join("");
  selects.forEach(sel => {
    if (!sel) return;
    const firstOption = sel.options[0]?.value === "" ? sel.options[0].outerHTML : "";
    sel.innerHTML = firstOption + options;
  });
}

function setDefaultFilters() {
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
  document.getElementById("att-month").value = ym;
  document.getElementById("sal-month").value = ym;
  const yearSel = document.getElementById("perf-year");
  for (let y = now.getFullYear(); y >= 2020; y--) {
    yearSel.innerHTML += `<option value="${y}">${y}</option>`;
  }
  const leaveYearSel = document.getElementById("leave-year-filter");
  leaveYearSel.innerHTML = `<option value="">ทั้งหมด</option>`;
  for (let y = now.getFullYear(); y >= 2020; y--) {
    const selected = y === now.getFullYear() ? "selected" : "";
    leaveYearSel.innerHTML += `<option value="${y}" ${selected}>${y}</option>`;
  }
}

function bindEvents() {
  document.querySelectorAll(".menu-item").forEach(item => {
    item.addEventListener("click", e => {
      e.preventDefault();
      navigateTo(item.dataset.page);
    });
  });
  document.getElementById("menu-toggle").addEventListener("click", () => {
    document.getElementById("sidebar").classList.toggle("open");
  });
  document.getElementById("btn-refresh").addEventListener("click", () => {
    const active = document.querySelector(".menu-item.active");
    if (active) loadPageData(active.dataset.page);
  });
  document.getElementById("btn-logout").addEventListener("click", () => {
    sessionStorage.removeItem("hr_user");
    STATE.currentUser = null;
    showLoginScreen();
  });
  document.querySelectorAll(".modal-close").forEach(btn => {
    btn.addEventListener("click", () => {
      const modalId = btn.dataset.modal;
      if (modalId) closeModal(modalId);
    });
  });
  document.querySelectorAll(".modal").forEach(modal => {
    modal.addEventListener("click", e => {
      if (e.target === modal) closeModal(modal.id);
    });
  });

  // EMPLOYEES
  document.getElementById("btn-add-employee").addEventListener("click", () => EMPLOYEES.openAdd());
  document.getElementById("emp-search").addEventListener("input", e => EMPLOYEES.render(e.target.value));
  document.getElementById("form-employee").addEventListener("submit", e => {
    e.preventDefault();
    EMPLOYEES.save(e.target);
  });

  // ATTENDANCE
  document.getElementById("btn-add-attendance").addEventListener("click", () => ATTENDANCE.openAdd());
  document.getElementById("btn-load-att").addEventListener("click", async () => {
    showLoading(true);
    try {
      const month = document.getElementById("att-month").value;
      const emp = document.getElementById("att-emp-filter").value;
      const list = await ATTENDANCE.load(month, emp);
      ATTENDANCE.render(list);
    } finally { showLoading(false); }
  });
  document.getElementById("form-attendance").addEventListener("submit", e => {
    e.preventDefault();
    ATTENDANCE.save(e.target);
  });

  // SALARY
  document.getElementById("btn-add-salary").addEventListener("click", () => SALARY.openAdd());
  document.getElementById("btn-load-sal").addEventListener("click", async () => {
    showLoading(true);
    try {
      const month = document.getElementById("sal-month").value;
      const list = await SALARY.load(month);
      SALARY.render(list);
    } finally { showLoading(false); }
  });
  document.getElementById("btn-export-salary").addEventListener("click", () => {
    SALARY.exportCSV(SALARY.getCurrentList());
  });
  document.getElementById("form-salary").addEventListener("submit", e => {
    e.preventDefault();
    SALARY.save(e.target);
  });

  // PERFORMANCE
  document.getElementById("btn-add-performance").addEventListener("click", () => PERFORMANCE.openAdd());
  document.getElementById("btn-load-perf").addEventListener("click", async () => {
    showLoading(true);
    try {
      const year = document.getElementById("perf-year").value;
      const quarter = document.getElementById("perf-quarter").value;
      const list = await PERFORMANCE.load(year, quarter);
      PERFORMANCE.render(list);
    } finally { showLoading(false); }
  });
  document.getElementById("form-performance").addEventListener("submit", e => {
    e.preventDefault();
    PERFORMANCE.save(e.target);
  });

  // LEAVE
  document.getElementById("btn-add-leave").addEventListener("click", () => LEAVE.openAdd());
  document.getElementById("btn-load-leave").addEventListener("click", async () => {
    showLoading(true);
    try {
      const year   = document.getElementById("leave-year-filter").value;
      const empId  = document.getElementById("leave-emp-filter-req").value;
      const status = document.getElementById("leave-status-filter").value;
      const list = await LEAVE.load(year, empId, status);
      LEAVE.render(list);
    } finally { showLoading(false); }
  });
  document.getElementById("form-leave").addEventListener("submit", e => {
    e.preventDefault();
    LEAVE.save(e.target);
  });
  document.getElementById("leave-start").addEventListener("change", () => LEAVE.updateDaysDisplay());
  document.getElementById("leave-end").addEventListener("change", () => LEAVE.updateDaysDisplay());

  // PROFILE
  document.getElementById("form-profile").addEventListener("submit", e => {
    e.preventDefault();
    PROFILE.save(e.target);
  });
}
