// Toon Page Controller - Main logic for toon page
import {
  getToonById,
  getAuthorData,
  getContinuedFromInfo,
  escapeHTML,
  formatDate,
} from "/js/api.js";
import { loadIncludes } from "/js/utils/includes.js";
import {
  initializeLikes,
  handleLike,
  handleFavorite,
} from "/js/components/likes.js";
import {
  loadComments,
  showCommentForm,
  postCommentHandler,
} from "/js/components/comments.js";
import { colorUsernames } from "/js/color-username.js";

const SUPABASE_URL = "https://ytyhhmwnnlkhhpvsurlm.supabase.co";

// A legacy animation ID is the original toonator alphanumeric format —
// short (typically 4–8 chars), only letters and digits, no hyphens.
// Normal animations are UUIDs: 36 chars with hyphens e.g. "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
function isLegacyId(id) {
  return /^[a-zA-Z0-9]{3,16}$/.test(id);
}

const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0eWhobXdubmxraGhwdnN1cmxtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NzcwNTAsImV4cCI6MjA4ODU1MzA1MH0.XZVH3j6xftSRULfhdttdq6JGIUSgHHJt9i-vXnALjH0";

// Fetch a legacy animation's metadata from legacy_animations table
async function getLegacyToonById(id) {
  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data, error } = await supabase
    .from("legacy_animations")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return data;
}

// Fetch continued_from info from either table depending on ID format
async function getContinuedFromAny(id) {
  if (!id) return null;
  if (isLegacyId(id)) {
    // Look up in legacy_animations
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data } = await supabase
      .from("legacy_animations")
      .select("id, title, user_id")
      .eq("id", id)
      .maybeSingle();
    if (!data) return null;
    const authorData = await getAuthorData(data.user_id);
    return { id: data.id, title: data.title || "Untitled", author: authorData.username };
  } else {
    // Fall back to existing api.js helper for modern animations
    return getContinuedFromInfo(id);
  }
}
// Ruffle must already be loaded on the page via a <script> tag pointing to ruffle.js.
// The SWF is fetched from the legacyAnimations storage bucket and played back.
function loadLegacyPlayer(containerId, toonId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Ruffle is loaded globally via <script src="/ruffle/ruffle.js"> in the HTML
  const ruffle = window.RufflePlayer.newest();
  const player = ruffle.createPlayer();

  player.style.width  = "610px";
  player.style.height = "350px";

  container.innerHTML = "";
  container.appendChild(player);

  // Load the player SWF and pass the toon ID as a FlashVar.
  // The SWF reads `toonId` from stage.loaderInfo.parameters and fetches
  // the binary from Supabase storage itself.
  player.load({
    url: "/swf/player28en.swf",
    parameters: { toonId },
    allowScriptAccess: false,
    backgroundColor: "#FFFFFF",
  });
}

export async function initToon(toonId) {
  await loadIncludes();

  const legacy = isLegacyId(toonId);

  if (legacy) {
    await initLegacyToon(toonId);
  } else {
    await initModernToon(toonId);
  }
}

// ─── Modern (HTML5) animation ────────────────────────────────────────────────

async function initModernToon(toonId) {
  const toonData = await getToonById(toonId);
  if (!toonData) {
    document.getElementById("toon_page").innerHTML =
      '<p style="color:#888888;font-size:10pt;padding:10px 0;">Toon not found.</p>';
    return;
  }

  await populatePage(toonId, toonData, false);
  const frames = toonData.frames ? Object.values(toonData.frames) : [];
  const toonSettings = toonData.settings || {};
  if (window.initToonPlayer) initToonPlayer("player_container", frames, toonSettings);

  await initializeLikes(toonId);
  await loadComments(toonId);
  await colorUsernames();
  setupEventHandlers(toonId);
}

// ─── Legacy (SWF/Ruffle) animation ───────────────────────────────────────────

async function initLegacyToon(toonId) {
  const toonData = await getLegacyToonById(toonId);
  if (!toonData) {
    document.getElementById("toon_page").innerHTML =
      '<p style="color:#888888;font-size:10pt;padding:10px 0;">Toon not found.</p>';
    return;
  }

  await populatePage(toonId, toonData, true);  // it fetches the binary from Supabase using the toon ID
  loadLegacyPlayer("player_container", toonId);

  await initializeLikes(toonId, true);
  await loadComments(toonId, true);
  await colorUsernames();
  setupEventHandlers(toonId, true);
}
// Works for both modern and legacy since schema is mirrored

async function populatePage(toonId, toonData, isLegacy = false) {
  const authorData = await getAuthorData(toonData.user_id);
  const authorUsername = authorData.username;

  const title       = escapeHTML(toonData.title || "Untitled");
  const description = escapeHTML(toonData.description || "");

  document.getElementById("page_title").textContent = title + " - Toonator";
  document.getElementById("og_title").content       = title + " - Toonator. Draw animation yourself!";
  document.getElementById("og_description").content = description || title;
  document.getElementById("og_image").content       = toonData.preview_url || `${SUPABASE_URL}/storage/v1/object/public/previews/${toonId}_100.gif`;
  document.getElementById("og_url").content         = `https://toonator.site/toon/${toonId}`;

  document.getElementById("toon_title").textContent = title;
  document.getElementById("toon_date").textContent  = formatDate(toonData.created_at);

  const authorLink      = document.getElementById("author_link");
  authorLink.href       = `/user/${encodeURIComponent(authorUsername)}`;
  authorLink.textContent = authorUsername;
  authorLink.className  = "username";

  const avatarEl = document.getElementById("author_avatar");
  avatarEl.src   = authorData.avatar;

  // Show "continued from" info for both legacy and modern animations
  if (toonData.continued_from) {
    const contInfo = await getContinuedFromAny(toonData.continued_from);
    if (contInfo) {
      const previewUrl = isLegacyId(contInfo.id)
        ? `${SUPABASE_URL}/storage/v1/object/public/legacyAnimations/${contInfo.id}_100.gif`
        : `${SUPABASE_URL}/storage/v1/object/public/previews/${contInfo.id}_100.gif`;
      document.getElementById("continued_from").innerHTML = `
        <h4>Original</h4>
        <div class="line_1"><img src="/img/1.gif"/></div>
        <ul class="continues_list">
          <li>
            <a href="/toon/${contInfo.id}">
              <img class="p100" src="${previewUrl}" onerror="this.src='/img/avatar100.gif'"/>
              <div class="name">${escapeHTML(contInfo.title)}</div>
            </a>
            <div class="cauthor"><a href="/user/${encodeURIComponent(contInfo.author)}" class="username">${escapeHTML(contInfo.author)}</a></div>
          </li>
        </ul>
      `;
    }
  }

  if (description) {
    document.getElementById("description_text").textContent = description;
    document.getElementById("description_div").style.display = "block";
  }

  if (toonData.keywords) {
    const tagsHtml = toonData.keywords
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean)
      .map((k) => `<a href="#" class="tag">${escapeHTML(k)}</a>`)
      .join(" ");
    if (tagsHtml) {
      document.getElementById("tags_container").innerHTML    = tagsHtml;
      document.getElementById("tags_container").style.display = "block";
    }
  }

  const encodedTitle = encodeURIComponent(toonData.title || "Untitled");
  document.getElementById("share_twitter").href =
    `https://twitter.com/intent/tweet?url=https://toonator.site/toon/${toonId}&text=${encodedTitle}`;
  document.getElementById("share_reddit").href =
    `https://reddit.com/submit?url=https://toonator.site/toon/${toonId}&title=${encodedTitle}`;

  const drawBase = isLegacy ? '/draw/classic/' : '/draw/';
  document.getElementById("continue_link").href = `${drawBase}?cont=${toonId}`;
}

// ─── Event handlers ───────────────────────────────────────────────────────────

function setupEventHandlers(toonId, isLegacy = false) {
  const likeLink = document.getElementById("like_link");
  if (likeLink) likeLink.onclick = (e) => { e.preventDefault(); handleLike(toonId, isLegacy); };

  const favLink = document.getElementById("favlink");
  if (favLink) favLink.onclick = (e) => { e.preventDefault(); handleFavorite(); };

  const addCommentBtn = document.getElementById("addCommentBtn");
  if (addCommentBtn) addCommentBtn.onclick = (e) => { e.preventDefault(); showCommentForm(); };

  const postBtn = document.querySelector('button[onclick*="postCommentHandler"]');
  if (postBtn) postBtn.onclick = (e) => { e.preventDefault(); postCommentHandler(toonId, isLegacy); };

  const cancelBtn = document.querySelector("button:last-of-type");
  if (cancelBtn) {
    cancelBtn.onclick = (e) => {
      e.preventDefault();
      document.getElementById("comments_form").style.display = "none";
    };
  }
}