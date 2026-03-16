// Settings Page Controller - Main logic for settings page
import {
  getProfileByUsername,
  updateUserAvatar,
} from "/js/api.js";
import { loadIncludes } from "/js/utils/includes.js";
import { db } from "/js/config.js";
import { colorUsernames } from "/js/color-username.js";

const SUPABASE_URL = "https://ytyhhmwnnlkhhpvsurlm.supabase.co";

// ── Rank definitions (from wiki) ──
const RANKS = {
  unknown_animal: {
    label: "Unknown animal",
    desc: "Your toons go neither to New nor to Sandbox. ",
    alts: ["Hamster", "Chipmunk"],
    canApply: true,
  },
  archeologist: {
    label: "Archeologist",
    desc: "Your toons go directly to the Sandbox. ",
    alts: ["Toddler", "Treasure Hunter", "Gravedigger"],
    canApply: true,
  },
  passer: {
    label: "Passer",
    desc: "You're finding your way — between Sandbox and New.",
    alts: ["Horse in a Coat", "Baba Yaga", "Ilya Muromets", "Newcomer"],
    canApply: false,
  },
  animator: {
    label: "Animator",
    desc: "A trusted regular user of Toonator.",
    alts: ["Turuck Makto", "Zmey Gorynych", "Artist"],
    canApply: false,
  },
};

// ── Colour palette (6 rows × 32 cols) ──
const PALETTE = [
  "#000000","#0a0000","#140000","#1e0000","#280000","#320000","#3c0000","#460000",
  "#001400","#001e00","#002800","#003200","#003c00","#004600","#005000","#005a00",
  "#000014","#00001e","#000028","#000032","#00003c","#000046","#000050","#00005a",
  "#140014","#1e001e","#280028","#320032","#3c003c","#460046","#500050","#5a005a",
  "#ff0000","#ff2200","#ff4400","#ff6600","#ff8800","#ffaa00","#ffcc00","#ffee00",
  "#ddff00","#bbff00","#99ff00","#77ff00","#55ff00","#33ff00","#11ff00","#00ff00",
  "#00ff22","#00ff44","#00ff66","#00ff88","#00ffaa","#00ffcc","#00ffee","#00ffff",
  "#00eeff","#00ccff","#00aaff","#0088ff","#0066ff","#0044ff","#0022ff","#0000ff",
  "#cc0000","#cc3300","#cc6600","#cc9900","#cccc00","#99cc00","#66cc00","#33cc00",
  "#00cc00","#00cc33","#00cc66","#00cc99","#00cccc","#0099cc","#0066cc","#0033cc",
  "#0000cc","#3300cc","#6600cc","#9900cc","#cc00cc","#cc0099","#cc0066","#cc0033",
  "#993300","#996600","#999900","#669900","#339900","#009900","#009933","#009966",
  "#006666","#007777","#008888","#009999","#00aaaa","#00bbbb","#33cccc","#66dddd",
  "#99eeee","#ccffff","#eeffff","#ffffff","#ffeeff","#ffccff","#ff99ff","#ff66ff",
  "#ff33ff","#ff00ff","#cc00ff","#9900ff","#6600ff","#3300ff","#0000aa","#000088",
  "#220044","#440033","#660022","#880011","#aa0000","#cc1100","#dd2200","#ee3300",
  "#fff5e6","#ffe8cc","#ffdbb3","#ffce99","#ffc180","#ffb466","#ffa74d","#ff9a33",
  "#ff8d1a","#ff8000","#e67300","#cc6600","#b35900","#994c00","#804000","#663300",
  "#aa8866","#bb9977","#ccaa88","#ddbb99","#eeccaa","#f5ddbb","#faebd7","#fff0dc",
  "#ffffcc","#ffff99","#ffff66","#ffff33","#ffff00","#eeee00","#dddd00","#cccc00",
  "#f0f0f0","#e0e0e0","#d0d0d0","#c0c0c0","#b0b0b0","#a0a0a0","#909090","#808080",
  "#707070","#606060","#505050","#404040","#303030","#202020","#101010","#000000",
  "#cce0ff","#99c2ff","#66a3ff","#3385ff","#0066ff","#0052cc","#003d99","#002966",
  "#001433","#aabbcc","#8899aa","#667788","#445566","#223344","#112233","#001122",
];

let selectedColor = "#005500";
let currentUser = null;

export async function initSettings() {
  await loadIncludes();

  // Get the logged-in user — same pattern as user-page.js
  const { data: { user } } = await db.auth.getUser();
  if (!user) {
    window.location.href = "/";
    return;
  }
  currentUser = user;

  const username = user.user_metadata?.username || user.email;
  const meta = user.user_metadata || {};

  // Fetch full profile from DB — same pattern as user-page.js
  const { profile } = await getProfileByUsername(username);

  // ── Sidebar ──
  document.getElementById("page_title").textContent = "Settings - Toonator";

  const usernameEl = document.getElementById("sidebar_username");
  usernameEl.textContent = username;
  usernameEl.href = `/user/${encodeURIComponent(username)}`;

  document.getElementById("my_page_link").href = `/user/${encodeURIComponent(username)}`;

  // Avatar — prefer user_metadata, fall back to DB profile (same as user-page.js)
  const avatarToon = meta.avatar_toon || profile?.avatar_toon;
  const avatarEl = document.getElementById("sidebar_avatar");
  if (avatarToon) {
    avatarEl.src = `${SUPABASE_URL}/storage/v1/object/public/previews/${avatarToon}_100.gif`;
  }
  avatarEl.onerror = () => { avatarEl.src = "/img/avatar100.gif"; };

  // Change avatar link — same pattern as user-page.js
  avatarEl.insertAdjacentHTML(
    "afterend",
    '<br/><a href="#" id="change_avatar_link" style="font-size:9pt;">[Change avatar]</a>',
  );

  // Color the sidebar username — same as user-page.js
  await colorUsernames();

  // ── Pre-fill all form fields ──
  prefillFields(meta, profile);

  // ── Nick colour palette ──
  if (meta.nick_color) selectedColor = meta.nick_color;
  buildPalette();
  document.getElementById("nick_preview").textContent = username;
  document.getElementById("nick_preview").style.color = selectedColor;
  markSelectedSwatch();

  // ── Rank-conditional UI ──
  const rank = meta.rank || profile?.rank || "passer";
  const status = meta.status || profile?.status || "";
  applyRankUI(rank, status, meta);

  // ── Event listeners ──
  document.getElementById("settings_submit").addEventListener("click", saveSettings);
  document.getElementById("promotion_submit")?.addEventListener("click", submitPromotion);
  document.getElementById("change_avatar_link").addEventListener("click", async (e) => {
    e.preventDefault();
    await changeAvatar(username);
  });
}

// ── Pre-fill form from metadata + profile ──
function prefillFields(meta, profile) {
  if (meta.gender) {
    const el = document.getElementById(meta.gender === "girl" ? "gender_girl" : "gender_boy");
    if (el) el.checked = true;
  }

  if (meta.birth_date)
    document.getElementById("birth_date").value = meta.birth_date;

  if (meta.show_birthdate)
    document.getElementById("show_birthdate").value = meta.show_birthdate;

  if (meta.hide_rank)
    document.getElementById("hide_rank").checked = true;

  const status = meta.status || profile?.status || "";
  if (status) document.getElementById("status_value").textContent = status;

  if (meta.status_free_date)
    document.getElementById("status_free_date").textContent = meta.status_free_date;

  // Rank select (read-only — set by moderators)
  const rank = meta.rank || profile?.rank || "passer";
  const rankSel = document.getElementById("rank_select");
  if (rankSel) {
    [...rankSel.options].forEach(o => { if (o.value === rank) o.selected = true; });
  }
}

// ── Build colour palette grid ──
function buildPalette() {
  const grid = document.getElementById("palette_grid");
  if (!grid) return;
  PALETTE.forEach(hex => {
    const s = document.createElement("div");
    s.className = "swatch";
    s.style.background = hex;
    s.title = hex;
    s.addEventListener("click", () => {
      grid.querySelectorAll(".swatch").forEach(sw => sw.classList.remove("selected"));
      s.classList.add("selected");
      selectedColor = hex;
      document.getElementById("nick_preview").style.color = hex;
    });
    grid.appendChild(s);
  });
}

function markSelectedSwatch() {
  document.querySelectorAll(".swatch").forEach(s => {
    s.classList.toggle("selected", s.title.toLowerCase() === selectedColor.toLowerCase());
  });
}

// ── Show/hide rank-conditional sections ──
function applyRankUI(rank, status, meta) {
  const rankDef = RANKS[rank] || RANKS["passer"];

  // Promotion request — Archeologist and Unknown Animal only
  const promoSection = document.getElementById("rank_promotion_section");
  if (promoSection) {
    if (rankDef.canApply) {
      promoSection.style.display = "";
      document.getElementById("promo_rank_name").textContent = rankDef.label;
      document.getElementById("promo_rank_desc").textContent = rankDef.desc;

      const used = meta.promotion_requests_this_month || 0;
      const last = meta.last_promotion_request
        ? new Date(meta.last_promotion_request).toLocaleDateString()
        : null;
      document.getElementById("promo_cooldown").textContent = last
        ? `Last request: ${last}. Requests used this month: ${used}/2.`
        : "You haven't submitted a request yet. You may apply up to twice per month.";
    } else {
      promoSection.style.display = "none";
    }
  }

  // Alt rank names — Boyar status only
  const altSection = document.getElementById("alt_rank_section");
  if (altSection) {
    if (status && status.toLowerCase() === "boyar") {
      altSection.style.display = "";
      buildAltRankSelect(rank, meta.alt_rank);
    } else {
      altSection.style.display = "none";
    }
  }
}

function buildAltRankSelect(rank, currentAlt) {
  const sel = document.getElementById("alt_rank_select");
  if (!sel) return;
  sel.innerHTML = "";
  const rankDef = RANKS[rank];
  if (!rankDef) return;

  const defOpt = document.createElement("option");
  defOpt.value = "";
  defOpt.textContent = rankDef.label + " (default)";
  sel.appendChild(defOpt);

  rankDef.alts.forEach(alt => {
    const o = document.createElement("option");
    o.value = alt;
    o.textContent = alt;
    if (alt === currentAlt) o.selected = true;
    sel.appendChild(o);
  });
}

// ── Change avatar — same pattern as user-page.js ──
async function changeAvatar(username) {
  const toonId = prompt("Enter toon ID to use as avatar:");
  if (!toonId) return;
  const { success, error } = await updateUserAvatar(username, toonId);
  if (success) {
    document.getElementById("sidebar_avatar").src =
      `${SUPABASE_URL}/storage/v1/object/public/previews/${toonId}_100.gif`;
  } else {
    alert("Error saving avatar: " + (error?.message || "Unknown error"));
  }
}

// ── Save main settings ──
async function saveSettings() {
  const btn = document.getElementById("settings_submit");
  btn.disabled = true;
  btn.textContent = "Saving...";

  const updates = {
    gender:         document.querySelector("input[name='gender']:checked")?.value || "boy",
    birth_date:     document.getElementById("birth_date").value.trim(),
    show_birthdate: document.getElementById("show_birthdate").value,
    hide_rank:      document.getElementById("hide_rank").checked,
    nick_color:     selectedColor,
  };

  // Alt rank name (Boyar only)
  const altSection = document.getElementById("alt_rank_section");
  if (altSection && altSection.style.display !== "none") {
    updates.alt_rank = document.getElementById("alt_rank_select").value;
  }

  try {
    const { error } = await db.auth.updateUser({ data: updates });
    showMessage("settings_msg", error ? "err" : "ok",
      error ? "Error saving settings: " + error.message : "Settings saved!");
    if (!error) setTimeout(() => hideMessage("settings_msg"), 3000);
  } catch (err) {
    showMessage("settings_msg", "err", "Unexpected error: " + err.message);
  }

  btn.disabled = false;
  btn.textContent = "Submit";
}

// ── Submit rank promotion request ──
async function submitPromotion() {
  const btn = document.getElementById("promotion_submit");
  const text = document.getElementById("promotion_text").value.trim();

  if (!text) {
    showMessage("promotion_msg", "err", "Please write something about yourself before submitting.");
    return;
  }

  btn.disabled = true;
  btn.textContent = "Sending...";

  try {
    const meta = currentUser.user_metadata || {};
    const used = meta.promotion_requests_this_month || 0;

    if (used >= 2) {
      showMessage("promotion_msg", "err", "You have already submitted 2 promotion requests this month.");
      btn.disabled = false;
      btn.textContent = "Send promotion request";
      return;
    }

    const now = new Date().toISOString();
    const newCount = used + 1;

    const { error } = await db.auth.updateUser({
      data: {
        last_promotion_request: now,
        promotion_requests_this_month: newCount,
        promotion_request_text: text,
      }
    });

    if (error) {
      showMessage("promotion_msg", "err", "Error submitting request: " + error.message);
    } else {
      showMessage("promotion_msg", "ok", "Promotion request submitted! Moderators will review it.");
      document.getElementById("promotion_text").value = "";
      document.getElementById("promo_cooldown").textContent =
        `Last request: ${new Date(now).toLocaleDateString()}. Requests used this month: ${newCount}/2.`;
      // Refresh local user reference
      const { data: { user } } = await db.auth.getUser();
      currentUser = user;
    }
  } catch (err) {
    showMessage("promotion_msg", "err", "Unexpected error: " + err.message);
  }

  btn.disabled = false;
  btn.textContent = "Send promotion request";
}

// ── Helpers ──
function showMessage(id, type, text) {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = type;
  el.textContent = text;
  el.style.display = "block";
}

function hideMessage(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = "none";
}