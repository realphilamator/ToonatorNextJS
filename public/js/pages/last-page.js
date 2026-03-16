// Last Page Controller - Main logic for last toons page
import { db } from "/js/config.js";
import { loadIncludes } from "/js/utils/includes.js";
import { colorUsernames } from "/js/color-username.js";
import { initI18n, t } from "/js/i18n.js";

const SUPABASE_URL = "https://ytyhhmwnnlkhhpvsurlm.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0eWhobXdubmxraGhwdnN1cmxtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NzcwNTAsImV4cCI6MjA4ODU1MzA1MH0.XZVH3j6xftSRULfhdttdq6JGIUSgHHJt9i-vXnALjH0";
const TOONS_PER_PAGE = 12;

function escapeHTML(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// preview_url is now always provided by the animations_feed view

function getPage() {
  return parseInt(new URLSearchParams(window.location.search).get("page") || "1", 10);
}

async function apiFetch(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });
  if (!res.ok) return null;
  return res.json();
}

async function rpc(fn, params) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });
  if (!res.ok) return null;
  return res.json();
}

function toonCardHTML(toon, username) {
  const frameCount = parseInt(toon.frame_count) || 0;
  const frameStr = frameCount >= 50 ? `<b>${frameCount}</b> ${t("frames")}` : `${frameCount} ${t("frames")}`;
  const commentCount = parseInt(toon.comment_count) || 0;
  const commentStr = commentCount > 0
    ? `${commentCount} ${commentCount !== 1 ? t("comments") : t("comment")}`
    : `<span class="grayb">${t("no_comments", "toon")}</span>`;
  const medal = toon.featured ? `<img class="toonmedal" src="/img/medal.gif"/>` : "";
  const title = escapeHTML(toon.title || "Untitled");
  const toonId = escapeHTML(String(toon.id));
  const encodedUsername = encodeURIComponent(username);

  return `
    <div class="toon_preview owned">
      ${medal}
      <div class="toon_image">
        <a href="/toon/${toonId}" title="${title}">
          <img alt="${title}" title="${title}" src="${toon.preview_url}" onerror="this.onerror=null;this.src='/img/avatar100.gif'">
        </a>
      </div>
      <div class="toon_name"><a class="link" href="/toon/${toonId}">${title}</a></div>
      <div class="toon_tagline">
        <a href="/user/${encodedUsername}" class="username">${escapeHTML(username)}</a>,
        ${frameStr}
      </div>
      <div class="toon_tagline">${commentStr}</div>
    </div>`;
}

function paginatorHTML(currentPage, totalPages) {
  if (totalPages <= 1) return "";
  let html = '<ul class="paginator">';
  const visible = Math.min(5, totalPages);
  for (let i = 1; i <= visible; i++) {
    html += `<li class="${i === currentPage ? "current" : ""}"><a href="/last?page=${i}">${i}</a></li>`;
  }
  if (totalPages > visible) html += `<li class="dots">...</li>`;
  html += "</ul>";
  return html;
}

async function loadToons() {
  const page = getPage();
  const from = (page - 1) * TOONS_PER_PAGE;
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/animations_feed?select=*&order=created_at.desc&offset=${from}&limit=${TOONS_PER_PAGE}`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Prefer: "count=exact",
      },
    },
  );
  const toonsList = document.getElementById("toons-list");
  if (!res.ok) {
    toonsList.innerHTML = `<div style="text-align:center;color:#888;padding:20px;">${t('loading')}</div>`;
    return;
  }

  const toons = await res.json();
  const totalCount = parseInt(res.headers.get("Content-Range")?.split("/")[1] || "0", 10);
  if (!toons || toons.length === 0) {
    toonsList.innerHTML = `<div style="text-align:center;color:#888;padding:20px;">${t('loading')}</div>`;
    return;
  }

  const userMap = {};
  await Promise.all(
    toons.map(async (toon) => {
      if (toon.user_id && !userMap[toon.user_id]) {
        const userData = await rpc("get_user_by_id", { p_user_id: toon.user_id });
        userMap[toon.user_id] = userData?.[0]?.username || "unknown";
      }
    }),
  );

  toonsList.innerHTML = toons.map((t) => toonCardHTML(t, userMap[t.user_id] || "unknown")).join("");
  await colorUsernames();

  const totalPages = Math.ceil(totalCount / TOONS_PER_PAGE);
  const pager = paginatorHTML(page, totalPages);
  document.getElementById("paginator-top").innerHTML = pager;
  document.getElementById("paginator-bottom").innerHTML = pager;
}

async function loadGoodPlace() {
  const toons = await apiFetch("/animations_feed?featured=eq.true&order=created_at.desc&limit=1");
  if (!toons || toons.length === 0) return;

  const toon = toons[0];
  const userData = toon.user_id ? await rpc("get_user_by_id", { p_user_id: toon.user_id }) : null;
  const username = userData?.[0]?.username || "unknown";
  const frameCount = parseInt(toon.frame_count) || 0;
  const commentCount = parseInt(toon.comment_count) || 0;
  const commentStr = commentCount > 0
    ? `${commentCount} comments`
    : `<span class="grayb">${t('no_comments', 'toon')}</span>`;
  const title = escapeHTML(toon.title || "Untitled");
  const toonId = escapeHTML(String(toon.id));
  const encodedUsername = encodeURIComponent(username);

  document.getElementById("good-place-toon").innerHTML = `
    <div class="toon_preview large owned">
      <img class="toonmedal" src="/img/medal.gif"/>
      <div class="toon_image"><a href="/toon/${toonId}" title="${title}"><img alt="${title}" src="${toon.preview_url}" onerror="this.onerror=null;this.src='/img/avatar100.gif'"></a></div>
      <div class="toon_name"><a class="link" href="/toon/${toonId}">${title}</a></div>
      <div class="toon_tagline">
        <a href="/user/${encodedUsername}" class="username">${escapeHTML(username)}</a>,
        ${frameCount} frames
      </div>
      <div class="toon_tagline">${commentStr}</div>
    </div>`;
  await colorUsernames();
}

async function loadLastComments() {
  const comments = await apiFetch("/comments?order=created_at.desc&limit=10");
  if (!comments || comments.length === 0) return;

  document.getElementById("last-comments").innerHTML = comments
    .map((c, i) => {
      const uname = escapeHTML(c.author_username || "unknown");
      const animId = escapeHTML(String(c.animation_id));
      const text = escapeHTML(c.text || "");
      const encodedUsername = encodeURIComponent(uname);
      return `
  <div class="comment ${i % 2 !== 0 ? "gray" : ""} last_comments">
    <div class="avatar">
      <a href="/toon/${animId}">
        <img src="${SUPABASE_URL}/storage/v1/object/public/previews/${animId}_100.gif" width="80"/>
      </a>
    </div>
    <div class="head">
      <a href="/user/${encodedUsername}" class="username">${uname}</a>: ${text}
    </div>
  </div>`;
    })
    .join("");
  await colorUsernames();
}

export async function initLastPage() {
  await initI18n('last');
  await loadIncludes();
  await loadToons();
  await loadGoodPlace();
  await loadLastComments();
}