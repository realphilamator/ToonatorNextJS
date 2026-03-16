// Home Page Controller - Load and display popular/newest toons
import { supabaseRequest, rpc, escapeHTML } from "/js/api.js";
import { loadIncludes } from "/js/utils/includes.js";
import { colorUsernames } from "/js/color-username.js";
import { initI18n, t } from "/js/i18n.js";

const SUPABASE_URL = "https://ytyhhmwnnlkhhpvsurlm.supabase.co";

// preview_url is always provided by the animations_feed view

function toonCardHTML(toon, username) {
  const frameCount = toon.frame_count ?? 0;
  const frameStr =
    frameCount >= 50 ? `<b>${frameCount}</b> ${t("frames")}` : `${frameCount} ${t("frames")}`;
  const commentStr = `<span class="grayb">${t('no_comments', 'toon')}</span>`;
  const title = escapeHTML(toon.title || "Untitled");
  const toonUrl = `/toon/${toon.id}`;
  const profileUrl = `/user/${encodeURIComponent(username)}`;
  return `
      <div class="toon_preview owned">
        <div class="toon_image">
          <a href="${toonUrl}" title="${title}">
            <img alt="${title}" title="${title}" src="${toon.preview_url}" onerror="this.onerror=null;this.src='/img/avatar100.gif'">
          </a>
        </div>
        <div class="toon_name"><a class="link" href="${toonUrl}">${title}</a></div>
        <div class="toon_tagline">
          <a href="${profileUrl}" class="username">${escapeHTML(username)}</a>,
          ${frameStr}
        </div>
        <div class="toon_tagline">${commentStr}</div>
      </div>`;
}

async function resolveUsernames(toons) {
  const userMap = {};
  await Promise.all(
    toons.map(async (toon) => {
      if (toon.user_id && !userMap[toon.user_id]) {
        const userData = await rpc("get_user_by_id", { p_user_id: toon.user_id });
        userMap[toon.user_id] = userData?.[0]?.username || "unknown";
      }
    }),
  );
  return userMap;
}

async function loadPopular() {
  const toons = await supabaseRequest(
    "/animations_feed?select=*&order=likes.desc.nullslast&limit=6",
  );
  const list = document.getElementById("popular-list");
  if (!toons || toons.length === 0) {
    list.innerHTML = `<div style="text-align:center;color:#888;padding:10px;">${t('loading')}</div>`;
    return;
  }
  const userMap = await resolveUsernames(toons);
  list.innerHTML = toons.map((t) => toonCardHTML(t, userMap[t.user_id] || "unknown")).join("");
  await colorUsernames();
}

async function loadNewest() {
  const toons = await supabaseRequest(
    "/animations_feed?select=*&order=created_at.desc&limit=6",
  );
  const list = document.getElementById("newest-list");
  if (!toons || toons.length === 0) {
    list.innerHTML = `<div style="text-align:center;color:#888;padding:10px;">${t('loading')}</div>`;
    return;
  }
  const userMap = await resolveUsernames(toons);
  list.innerHTML = toons.map((t) => toonCardHTML(t, userMap[t.user_id] || "unknown")).join("");
  await colorUsernames();
}

async function loadGoodPlace() {
  // TODO: implement Good Place feature
}

export async function initHome() {
  await initI18n('home');
  await loadIncludes();
  await loadPopular();
  await loadNewest();
  await loadGoodPlace();
}