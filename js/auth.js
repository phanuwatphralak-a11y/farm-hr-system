/**
 * auth.js — ระบบล็อกอิน / จัดการสิทธิ์
 * รองรับ role: admin | manager | viewer
 */
const AUTH = {
  SESSION_KEY: "hr_session",

  /* ─── Session ─── */
  getSession() {
    try {
      const raw =
        sessionStorage.getItem(this.SESSION_KEY) ||
        localStorage.getItem(this.SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  saveSession(session, remember) {
    const data = JSON.stringify(session);
    if (remember) {
      localStorage.setItem(this.SESSION_KEY, data);
    } else {
      sessionStorage.setItem(this.SESSION_KEY, data);
    }
  },

  clearSession() {
    sessionStorage.removeItem(this.SESSION_KEY);
    localStorage.removeItem(this.SESSION_KEY);
  },

  /* ─── Login ─── */
  login(username, password, remember = false) {
    const users = CONFIG.USERS || [];
    const user = users.find(
      (u) =>
        u.username.toLowerCase() === username.toLowerCase().trim() &&
        u.password === password
    );

    if (!user) {
      return { ok: false, error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" };
    }

    const session = {
      username: user.username,
      name: user.name,
      role: user.role,
      email: user.email || user.username + "@farm.local",
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(
        user.name
      )}&background=2563eb&color=fff&size=64`,
      loginAt: Date.now(),
    };

    this.saveSession(session, remember);
    STATE.currentUser = session;
    return { ok: true, user: session };
  },

  /* ─── Logout ─── */
  logout() {
    this.clearSession();
    STATE.currentUser = null;
    showLoginScreen();
  },

  /* ─── Role Checks ─── */
  isLoggedIn() {
    return !!this.getSession();
  },

  isAdmin() {
    return this.getSession()?.role === "admin";
  },

  isManager() {
    const role = this.getSession()?.role;
    return role === "admin" || role === "manager";
  },

  /* ─── Login Form Handler ─── */
  handleLoginForm(e) {
    e.preventDefault();
    const username = document.getElementById("login-username").value.trim();
    const password = document.getElementById("login-password").value;
    const remember = document.getElementById("login-remember").checked;

    // Loading state
    const btn = document.getElementById("btn-login");
    const btnText = document.getElementById("btn-login-text");
    btn.disabled = true;
    btnText.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> กำลังเข้าสู่ระบบ...';

    // Short delay สำหรับ UX
    setTimeout(() => {
      const result = this.login(username, password, remember);
      if (result.ok) {
        showApp();
      } else {
        document.getElementById("login-error").classList.remove("hidden");
        document.getElementById("login-error-msg").textContent = result.error;
        document.getElementById("login-password").value = "";
        document.getElementById("login-password").focus();
        btn.disabled = false;
        btnText.innerHTML = '<i class="fas fa-sign-in-alt"></i> เข้าสู่ระบบ';
      }
    }, 400);
  },

  /* ─── Toggle Password Visibility ─── */
  togglePassword() {
    const input = document.getElementById("login-password");
    const icon = document.getElementById("pw-eye-icon");
    if (input.type === "password") {
      input.type = "text";
      icon.className = "fas fa-eye-slash";
    } else {
      input.type = "password";
      icon.className = "fas fa-eye";
    }
  },

  /* ─── Apply role-based UI ─── */
  applyRoleUI() {
    const session = this.getSession();
    if (!session) return;

    const roleMap = {
      admin: { label: "ผู้ดูแลระบบ", cls: "badge-blue" },
      manager: { label: "ผู้จัดการ", cls: "badge-green" },
      viewer: { label: "ผู้ดูข้อมูล", cls: "badge-gray" },
    };
    const info = roleMap[session.role] || { label: session.role, cls: "badge-gray" };

    const roleEl = document.getElementById("user-role");
    if (roleEl) {
      roleEl.textContent = info.label;
      roleEl.className = "badge " + info.cls;
    }

    if (session.role === "viewer") {
      document.body.classList.add("role-viewer");
    } else if (session.role === "manager") {
      document.body.classList.add("role-manager");
    } else {
      document.body.classList.add("role-admin");
    }
  },
};
