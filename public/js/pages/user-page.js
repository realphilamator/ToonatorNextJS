// Profile Page Controller - Main logic for profile page
import {
  getProfileByUsername,
  getProfileStats,
  getUserToons,
  getUserFavorites,
  getUserCommentedToons,
  updateUserAvatar,
} from "/js/api.js";
import { loadIncludes } from "/js/utils/includes.js";
import { renderPaginator, calculateTotalPages, getCurrentPageFromURL } from "/js/paginator.js";
import { db } from "/js/config.js";
import { colorUsernames } from "/js/color-username.js";

const PER_PAGE = 12;
const SUPABASE_URL = "https://ytyhhmwnnlkhhpvsurlm.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0eWhobXdubmxraGhwdnN1cmxtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NzcwNTAsImV4cCI6MjA4ODU1MzA1MH0.XZVH3j6xftSRULfhdttdq6JGIUSgHHJt9i-vXnALjH0";
let currentUsername = "";
let currentPage = 1;
let currentTab = "album";

export async function initProfile(username) {
  currentUsername = username;
  currentPage = getCurrentPageFromURL();

  await loadIncludes();

  const { profile } = await getProfileByUsername(username);
  if (!profile) {
    document.getElementById("toons_list").innerHTML =
      '<p style="color:#888888;font-size:10pt;padding:10px 0;">User not found.</p>';
    document.getElementById("stat_toons").textContent = "0";
    return;
  }

  document.getElementById("page_title").textContent = `${username} - Toonator`;
  document.getElementById("profile_username_wrap").href = `/user/${encodeURIComponent(username)}`;
  document.getElementById("profile_username").textContent = username;

  const userId = profile.id;
  const { totalToons, draftCount, commentCount } = await getProfileStats(userId);
  document.getElementById("stat_toons").textContent = totalToons;
  document.getElementById("stat_comments").textContent = commentCount;

  const { data: { user: currentUser } } = await db.auth.getUser();
  const isOwnProfile = currentUser && currentUser.user_metadata?.username === username;

  const avatarEl = document.getElementById("profile_avatar");
  const avatarToon = isOwnProfile
    ? currentUser?.user_metadata?.avatar_toon || profile.avatar_toon
    : profile.avatar_toon;

  if (avatarToon) {
    avatarEl.src = `https://ytyhhmwnnlkhhpvsurlm.supabase.co/storage/v1/object/public/previews/${avatarToon}_100.gif`;
  }
  avatarEl.onerror = () => { avatarEl.src = "/img/avatar100.gif"; };

  if (isOwnProfile) {
    avatarEl.insertAdjacentHTML(
      "afterend",
      '<br/><a href="#" onclick="changeAvatar(); return false;" style="font-size:9pt;">[Change avatar]</a>',
    );
    document.getElementById("stat_drafts_row").style.display = "";
    document.getElementById("stat_drafts").textContent = draftCount;
  }

  if (currentUser && !isOwnProfile) {
    const pmLink = document.getElementById("private_messages_link");
    pmLink.href = `/messages?username=${encodeURIComponent(username)}`;
    pmLink.style.display = "";
  }

  // Color the profile username link in the sidebar
  await colorUsernames();

  setupTabSwitching(userId, totalToons);
  await loadAlbumView(userId);

  window.changeAvatar = async function () {
    const toonId = prompt("Enter toon ID to use as avatar:");
    if (!toonId) return;
    const { success, error } = await updateUserAvatar(username, toonId);
    if (success) {
      document.getElementById("profile_avatar").src =
        `https://ytyhhmwnnlkhhpvsurlm.supabase.co/storage/v1/object/public/previews/${toonId}_100.gif`;
    } else {
      alert("Error saving avatar: " + (error?.message || "Unknown error"));
    }
  };
}

function setupTabSwitching(userId, totalToons) {
  const tabContainer = document.querySelector(".nmenu").parentElement;
  const tabs = tabContainer.querySelectorAll(".nmenu");

  tabs.forEach((tab) => {
    tab.addEventListener("click", async (e) => {
      e.preventDefault();
      tabs.forEach((t) => t.classList.remove("selected"));
      tab.classList.add("selected");
      const tabText = tab.textContent.toLowerCase();
      if (tabText.includes("album")) {
        currentTab = "album";
        await loadAlbumView(userId, totalToons);
      } else if (tabText.includes("favorites")) {
        currentTab = "favorites";
        await loadFavoritesView(userId);
      } else if (tabText.includes("comments")) {
        currentTab = "comments";
        await loadCommentsView(userId);
      }
    });
  });
}

async function loadAlbumView(userId, totalToons) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/animations_feed?user_id=eq.${userId}&order=created_at.desc&limit=${PER_PAGE}`,
    { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, Prefer: "count=exact" } }
  );
  const toons = res.ok ? await res.json() : [];
  const total = parseInt(res.headers?.get("Content-Range")?.split("/")[1] || totalToons, 10);

  // comment counts still come from the existing API call for modern toons
  const { commentCounts } = await getUserToons(userId, 1, PER_PAGE);
  renderToons(toons, commentCounts);
  renderPaginator(calculateTotalPages(total, PER_PAGE), currentUsername, 1, "paginator_top");
  renderPaginator(calculateTotalPages(total, PER_PAGE), currentUsername, 1, "paginator_bottom");
}

async function loadFavoritesView(userId) {
  const { toons, commentCounts } = await getUserFavorites(userId, 1, PER_PAGE);
  if (toons.length === 0) {
    document.getElementById("toons_list").innerHTML =
      '<p style="color:#888888;font-size:10pt;padding:10px 0;">No favorites yet.</p>';
    document.getElementById("paginator_top").innerHTML = "";
    document.getElementById("paginator_bottom").innerHTML = "";
    return;
  }
  renderToons(toons, commentCounts);
  document.getElementById("paginator_top").innerHTML = "";
  document.getElementById("paginator_bottom").innerHTML = "";
}

async function loadCommentsView(userId) {
  const { toons, commentCounts } = await getUserCommentedToons(userId, 1, PER_PAGE);
  if (toons.length === 0) {
    document.getElementById("toons_list").innerHTML =
      '<p style="color:#888888;font-size:10pt;padding:10px 0;">No commented toons yet.</p>';
    document.getElementById("paginator_top").innerHTML = "";
    document.getElementById("paginator_bottom").innerHTML = "";
    return;
  }
  renderToons(toons, commentCounts);
  document.getElementById("paginator_top").innerHTML = "";
  document.getElementById("paginator_bottom").innerHTML = "";
}

function renderToons(toons, commentCounts) {
  const list = document.getElementById("toons_list");
  if (toons.length === 0) {
    list.innerHTML = '<p style="color:#888888;font-size:10pt;padding:10px 0;">No toons yet.</p>';
    return;
  }

  list.innerHTML = toons
    .map((toon) => {
      const frameCount = toon.frame_count ?? 0;
      const title = toon.title || "Untitled";
      const frameLabel = frameCount === 1 ? "1 frame" : `<b>${frameCount}</b> frames`;
      const cc = commentCounts?.[toon.id] || 0;
      const commentLabel = cc === 0
        ? '<span class="grayb">No comments</span>'
        : `<b>${cc}</b> comment${cc === 1 ? "" : "s"}`;

      return `<div class="toon_preview toon_preview_${toon.id}">
        <div class="toon_image"><a href="/toon/${toon.id}" title="${title}">
          <img src="${toon.preview_url}" width="200" height="100" alt="${title}" onerror="this.src='/img/avatar100.gif'"/>
        </a></div>
        <div class="toon_name"><a class="link" href="/toon/${toon.id}">${title}</a></div>
        <div class="toon_tagline">${frameLabel}</div>
        <div class="toon_tagline">${commentLabel}</div>
      </div>`;
    })
    .join("");
  // No usernames in profile toon cards, no colorUsernames() needed here
}