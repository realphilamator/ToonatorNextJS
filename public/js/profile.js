// Profile Page Logic
import {
  getProfileByUsername,
  getProfileStats,
  getUserToons,
  loadIncludes,
} from "/js/api.js";
import { renderPaginator, calculateTotalPages, getCurrentPageFromURL } from "/js/paginator.js";
import { db } from "/js/config.js";
import { colorUsernames } from "/js/color-username.js";

export async function initProfile(username, userId = null) {
  const PROFILE_USERNAME = username;
  const CURRENT_PAGE = getCurrentPageFromURL();
  const PER_PAGE = 12;

  const { header, footer, donate, modal } = await loadIncludes();
  if (header) document.getElementById("header_placeholder").innerHTML = header;
  if (footer) document.getElementById("footer_placeholder").innerHTML = footer;
  if (donate) document.getElementById("donate_placeholder").innerHTML = donate;
  if (modal) document.body.insertAdjacentHTML("beforeend", modal);
  if (window.updateAuthUI) updateAuthUI();

  const { profile } = await getProfileByUsername(PROFILE_USERNAME);
  if (!profile) {
    document.getElementById("toons_list").innerHTML =
      '<p style="color:#888888;font-size:10pt;padding:10px 0;">User not found.</p>';
    document.getElementById("stat_toons").textContent = "0";
    return;
  }

  document.getElementById("page_title").textContent = `${PROFILE_USERNAME} - Toonator`;
  document.getElementById("profile_username_wrap").href = `/user/${encodeURIComponent(PROFILE_USERNAME)}`;
  document.getElementById("profile_username").textContent = PROFILE_USERNAME;

  const profileUserId = profile.id;
  const { totalToons, draftCount, commentCount } = await getProfileStats(profileUserId);
  document.getElementById("stat_toons").textContent = totalToons;
  document.getElementById("stat_comments").textContent = commentCount;

  const { data: { user: currentUser } } = await db.auth.getUser();
  const isOwnProfile = currentUser && currentUser.user_metadata?.username === PROFILE_USERNAME;

  const avatarEl = document.getElementById("profile_avatar");
  const avatarToon = isOwnProfile
    ? currentUser?.user_metadata?.avatar_toon || profile.avatar_toon
    : profile.avatar_toon;

  if (avatarToon) {
    avatarEl.src =
      "https://ytyhhmwnnlkhhpvsurlm.supabase.co/storage/v1/object/public/previews/" +
      avatarToon + "_100.gif";
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
    pmLink.href = "/messages/" + PROFILE_USERNAME + "/";
    pmLink.style.display = "";
  }

  const { toons, commentCounts } = await getUserToons(profileUserId, CURRENT_PAGE, PER_PAGE);
  renderToons(toons, commentCounts);

  // Color the profile username in the sidebar
  await colorUsernames();

  const totalPages = calculateTotalPages(totalToons, PER_PAGE);
  renderPaginator(totalPages, PROFILE_USERNAME, CURRENT_PAGE, "paginator_top");
  renderPaginator(totalPages, PROFILE_USERNAME, CURRENT_PAGE, "paginator_bottom");

  window.changeAvatar = async function () {
    const toonId = prompt("Enter toon ID to use as avatar:");
    if (!toonId) return;
    const { error: authError } = await db.auth.updateUser({ data: { avatar_toon: toonId } });
    const { error: profileError } = await db
      .from("profiles")
      .update({ avatar_toon: toonId })
      .eq("username", PROFILE_USERNAME);
    if (!authError && !profileError) {
      document.getElementById("profile_avatar").src =
        "https://ytyhhmwnnlkhhpvsurlm.supabase.co/storage/v1/object/public/previews/" +
        toonId + "_100.gif";
    } else {
      alert("Error saving avatar: " + (authError?.message || profileError?.message));
    }
  };
}

function renderToons(toons, commentCounts) {
  const list = document.getElementById("toons_list");
  if (toons.length === 0) {
    list.innerHTML = '<p style="color:#888888;font-size:10pt;padding:10px 0;">No toons yet.</p>';
    return;
  }

  list.innerHTML = toons
    .map((toon) => {
      const frames = Array.isArray(toon.frames) ? toon.frames : toon.frames ? Object.values(toon.frames) : [];
      const frameCount = frames.length || 1;
      const title = toon.title || "Untitled";
      const frameLabel = frameCount === 1 ? "1 frame" : `<b>${frameCount}</b> frames`;
      const cc = commentCounts[toon.id] || 0;
      const commentLabel = cc === 0
        ? '<span class="grayb">No comments</span>'
        : `<b>${cc}</b> comment${cc === 1 ? "" : "s"}`;

      return `<div class="toon_preview toon_preview_${toon.id}">
      <div class="toon_image"><a href="/toon/${toon.id}" title="${title}">
        <img src="https://ytyhhmwnnlkhhpvsurlm.supabase.co/storage/v1/object/public/previews/${toon.id}_100.gif" width="200" height="100" alt="${title}" onerror="this.src='/img/avatar100.gif'"/>
      </a></div>
      <div class="toon_name"><a class="link" href="/toon/${toon.id}">${title}</a></div>
      <div class="toon_tagline">${frameLabel}</div>
      <div class="toon_tagline">${commentLabel}</div>
    </div>`;
    })
    .join("");
}