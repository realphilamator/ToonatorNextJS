// ============================================================
// Auth Legacy State & Config
// ============================================================

let authMode = "login";

// ============================================================
// XSS FIX: escape all user-supplied strings before inserting
// into innerHTML. Used in updateAuthUI() for username.
// ============================================================
function escapeHTML(str) {
  const d = document.createElement("div");
  d.textContent = str ?? "";
  return d.innerHTML;
}

// ============================================================
// Notification bell helpers
// ============================================================

window.updateNotifyBell = async function updateNotifyBell(userId) {
  const { count } = await db
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false);

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

let notifyChannel = null;
function subscribeToNotifications(userId) {
  if (notifyChannel) {
    db.removeChannel(notifyChannel);
    notifyChannel = null;
  }
  notifyChannel = db
    .channel("notify-bell-" + userId)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
      () => updateNotifyBell(userId)
    )
    .subscribe();
}

function clearNotifyBell() {
  const notifyLi = document.getElementById("notify");
  if (!notifyLi) return;
  notifyLi.querySelector("a")?.classList.remove("active");
  const counter = notifyLi.querySelector(".counter");
  if (counter) counter.textContent = "";
  if (notifyChannel) {
    db.removeChannel(notifyChannel);
    notifyChannel = null;
  }
}

// ============================================================
// Spiders bell helpers
// ============================================================

window.updateSpidersBell = async function updateSpidersBell(userId) {
  const { count } = await db
    .from("spooder_transactions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false);

  const spidersLi = document.getElementById("spiders");
  const anchor = spidersLi?.querySelector("a");
  if (!anchor) return;

  if (count > 0) {
    anchor.classList.add("active");
  } else {
    anchor.classList.remove("active");
  }
}

let spidersChannel = null;
function subscribeToSpooderTransactions(userId) {
  if (spidersChannel) {
    db.removeChannel(spidersChannel);
    spidersChannel = null;
  }
  spidersChannel = db
    .channel("spiders-bell-" + userId)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "spooder_transactions", filter: `user_id=eq.${userId}` },
      () => updateSpidersBell(userId)
    )
    .subscribe();
}


function clearSpidersBell() {
  if (spidersChannel) {
    db.removeChannel(spidersChannel);
    spidersChannel = null;
  }
}

// ============================================================
// Auth UI
// ============================================================

async function updateAuthUI() {
  const {
    data: { user },
  } = await db.auth.getUser();

  const guestItems = document.querySelectorAll("#guest_join, #guest_login");
  const authItems = document.querySelectorAll(".auth_only");

  if (user) {
    const username = user.user_metadata?.username || user.email;
    const escaped = escapeHTML(username);

    guestItems.forEach((item) => (item.style.display = "none"));
    authItems.forEach((item) => (item.style.display = ""));

    const profileLink = document.querySelector(".profile_link");
    const fansLink = document.querySelector(".fans_link");
    const myToonsLink = document.querySelector(".my_toons_link");

    const profileUrl = `/user/${escaped}`;
    if (profileLink) {
      profileLink.href = profileUrl;
      profileLink.textContent = escaped;
    }
    if (fansLink) fansLink.href = `/spiders`;

    const { data: profile } = await db
      .from("profiles")
      .select("spiders")
      .eq("id", user.id)
      .single();

    const spidersCounter = document.querySelector("#spiders .counter");
    if (spidersCounter && profile?.spiders > 0) {
      spidersCounter.textContent = profile.spiders >= 100000
        ? Math.floor(profile.spiders / 1000) + "k"
        : profile.spiders;
    }

    if (myToonsLink) myToonsLink.href = profileUrl;

    if (!window.location.pathname.startsWith('/notifications')) {
      await updateNotifyBell(user.id);
    }
    subscribeToNotifications(user.id);

    if (!window.location.pathname.startsWith('/spiders')) {
      await updateSpidersBell(user.id);
    }
    subscribeToSpooderTransactions(user.id);
  } else {
    guestItems.forEach((item) => (item.style.display = ""));
    authItems.forEach((item) => (item.style.display = "none"));

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
  await db.auth.signOut();
  updateAuthUI();
}

function showAuth(mode) {
  authMode = mode;

  if (mode === "join") {
    window.location.href = "/register/";
    return;
  }

  const modal = document.getElementById("authModal");
  modal.style.display = "block";
  document.getElementById("authError").innerText = "";
  document.getElementById("authEmail").value = "";
  document.getElementById("authPassword").value = "";
}

function closeAuth() {
  document.getElementById("authModal").style.display = "none";
}

async function submitAuth() {
  const email = document.getElementById("authEmail").value.trim();
  const password = document.getElementById("authPassword").value;
  const errorEl = document.getElementById("authError");

  if (!email || !password) {
    errorEl.textContent = "Please enter your email and password.";
    return;
  }

  let result;
  if (authMode === "join") {
    result = await db.auth.signUp({ email, password });
  } else {
    result = await db.auth.signInWithPassword({ email, password });
  }

  if (result.error) {
    errorEl.textContent = result.error.message;
  } else {
    closeAuth();
    updateAuthUI();
  }
}

function toggleOldSignin() {
  const el = document.getElementById("signin-old");
  if (el) el.classList.toggle("hidden");
}

// ============================================================
// Auto-initialize auth UI on all pages
// ============================================================

async function waitForDb(maxWait = 5000) {
  const start = Date.now();
  while (!window.db && Date.now() - start < maxWait) {
    await new Promise((r) => setTimeout(r, 10));
  }
  return window.db;
}

let previousAuthState = null;

document.addEventListener("DOMContentLoaded", async () => {
  await waitForDb();
  updateAuthUI();

  // Set initial auth state
  const { data: { user } } = await db.auth.getUser();
  previousAuthState = user ? 'authenticated' : 'unauthenticated';

  db.auth.onAuthStateChange(async (_event, session) => {
    const currentAuthState = session?.user ? 'authenticated' : 'unauthenticated';
    
    // Only refresh if auth state actually changed
    if (previousAuthState !== currentAuthState) {
      previousAuthState = currentAuthState;
      if (_event === "SIGNED_IN" || _event === "SIGNED_OUT") {
        window.location.href = window.location.origin;
      }
    }
  });
});
