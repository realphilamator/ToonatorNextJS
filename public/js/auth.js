// ============================================================
// Auth — JWT-based, replaces Supabase auth
// ============================================================

let authMode = "login";

// ============================================================
// XSS helper
// ============================================================
function escapeHTML(str) {
  const d = document.createElement("div");
  d.textContent = str ?? "";
  return d.innerHTML;
}

// ============================================================
// Current user — decoded from JWT + profile fetch
// ============================================================

let _currentUser = null;

async function getCurrentUser() {
  const token = getToken();
  if (!token) return null;

  const payload = parseToken(token);
  if (!payload) { removeToken(); return null; }

  // Check token expiry
  if (payload.exp && payload.exp * 1000 < Date.now()) {
    removeToken();
    return null;
  }

  // Fetch full profile
  const profile = await apiFetch("/profiles/me");
  if (!profile) { removeToken(); return null; }

  return {
    id: profile.id,
    email: payload.email,
    username: profile.username,
    spiders: profile.spiders ?? 0,
    avatar_toon: profile.avatar_toon,
    role: profile.role,
  };
}

// ============================================================
// Notification bell
// ============================================================

let _notifyPollInterval = null;

window.updateNotifyBell = async function updateNotifyBell(userId) {
  const data = await apiFetch("/notifications/unread-count");
  const count = data?.count ?? 0;

  const notifyLi = document.getElementById("notify");
  const anchor   = notifyLi?.querySelector("a");
  const counter  = notifyLi?.querySelector(".counter");
  if (!anchor || !counter) return;

  if (count > 0) {
    counter.textContent = count;
    anchor.classList.add("active");
  } else {
    counter.textContent = "";
    anchor.classList.remove("active");
  }
}

function subscribeToNotifications(userId) {
  if (_notifyPollInterval) clearInterval(_notifyPollInterval);
  updateNotifyBell(userId);
  _notifyPollInterval = setInterval(() => updateNotifyBell(userId), 30000);
}

function clearNotifyBell() {
  if (_notifyPollInterval) { clearInterval(_notifyPollInterval); _notifyPollInterval = null; }
  const notifyLi = document.getElementById("notify");
  if (!notifyLi) return;
  notifyLi.querySelector("a")?.classList.remove("active");
  const counter = notifyLi.querySelector(".counter");
  if (counter) counter.textContent = "";
}

// ============================================================
// Spiders bell
// ============================================================

let _spidersPollInterval = null;

window.updateSpidersBell = async function updateSpidersBell(userId) {
  const data = await apiFetch("/spooders/unread-count");
  const count = data?.count ?? 0;

  const spidersLi = document.getElementById("spiders");
  const anchor = spidersLi?.querySelector("a");
  if (!anchor) return;

  if (count > 0) {
    anchor.classList.add("active");
  } else {
    anchor.classList.remove("active");
  }
}

function subscribeToSpooderTransactions(userId) {
  if (_spidersPollInterval) clearInterval(_spidersPollInterval);
  updateSpidersBell(userId);
  _spidersPollInterval = setInterval(() => updateSpidersBell(userId), 30000);
}

function clearSpidersBell() {
  if (_spidersPollInterval) { clearInterval(_spidersPollInterval); _spidersPollInterval = null; }
}

// ============================================================
// Auth UI
// ============================================================

async function updateAuthUI() {
  _currentUser = await getCurrentUser();

  const guestItems = document.querySelectorAll("#guest_join, #guest_login");
  const authItems  = document.querySelectorAll(".auth_only");

  if (_currentUser) {
    const escaped = escapeHTML(_currentUser.username);

    guestItems.forEach((el) => (el.style.display = "none"));
    authItems.forEach((el)  => (el.style.display = ""));

    const profileUrl = `/user/${escaped}`;

    const profileLink = document.querySelector(".profile_link");
    if (profileLink) { profileLink.href = profileUrl; profileLink.textContent = escaped; }

    const fansLink = document.querySelector(".fans_link");
    if (fansLink) fansLink.href = "/spiders";

    const myToonsLink = document.querySelector(".my_toons_link");
    if (myToonsLink) myToonsLink.href = profileUrl;

    // Spiders counter
    const spidersCounter = document.querySelector("#spiders .counter");
    if (spidersCounter && _currentUser.spiders > 0) {
      spidersCounter.textContent = _currentUser.spiders >= 100000
        ? Math.floor(_currentUser.spiders / 1000) + "k"
        : _currentUser.spiders;
    }

    if (!window.location.pathname.startsWith("/notifications")) {
      await updateNotifyBell(_currentUser.id);
    }
    subscribeToNotifications(_currentUser.id);

    if (!window.location.pathname.startsWith("/spiders")) {
      await updateSpidersBell(_currentUser.id);
    }
    subscribeToSpooderTransactions(_currentUser.id);

  } else {
    guestItems.forEach((el) => (el.style.display = ""));
    authItems.forEach((el)  => (el.style.display = "none"));
    clearNotifyBell();
    clearSpidersBell();
  }

  setupHeaderEvents();

  const menu = document.getElementById("newmenu");
  if (menu) menu.style.display = "";
}

function setupHeaderEvents() {
  document.getElementById("join_btn")?.addEventListener("click", (e) => {
    e.preventDefault();
    showAuth("join");
  });

  document.getElementById("login_btn")?.addEventListener("click", (e) => {
    e.preventDefault();
    showAuth("login");
  });

  document.getElementById("logout_btn")?.addEventListener("click", (e) => {
    e.preventDefault();
    signOut();
  });

  const accountLi = document.getElementById("account");
  if (accountLi) {
    accountLi.addEventListener("mouseenter", () => {
      const menu = accountLi.querySelector("ul");
      if (menu) menu.style.display = "block";
    });
    accountLi.addEventListener("mouseleave", () => {
      const menu = accountLi.querySelector("ul");
      if (menu) menu.style.display = "none";
    });
  }
}

async function signOut() {
  removeToken();
  _currentUser = null;
  window.location.href = "/";
}

function showAuth(mode) {
  authMode = mode;

  if (mode === "join") {
    window.location.href = "/register/";
    return;
  }

  const modal = document.getElementById("authModal");
  if (!modal) return;
  modal.style.display = "block";
  document.getElementById("authError").innerText = "";
  document.getElementById("authEmail").value = "";
  document.getElementById("authPassword").value = "";
}

function closeAuth() {
  const modal = document.getElementById("authModal");
  if (modal) modal.style.display = "none";
}

async function submitAuth() {
  const email    = document.getElementById("authEmail").value.trim();
  const password = document.getElementById("authPassword").value;
  const errorEl  = document.getElementById("authError");

  if (!email || !password) {
    errorEl.textContent = "Please enter your email and password.";
    return;
  }

  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();

  if (!res.ok) {
    if (data.error === "password_reset_required") {
      errorEl.textContent = "You must reset your password before logging in.";
      setTimeout(() => { window.location.href = "/recover/"; }, 2000);
    } else {
      errorEl.textContent = data.error || "Login failed.";
    }
    return;
  }

  setToken(data.token);
  closeAuth();
  window.location.reload();
}

function toggleOldSignin() {
  const el = document.getElementById("signin-old");
  if (el) el.classList.toggle("hidden");
}

// ============================================================
// Init
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  updateAuthUI();
});