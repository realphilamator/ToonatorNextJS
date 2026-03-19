import { db, SUPABASE_URL, SUPABASE_ANON_KEY } from "./config";

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns auth headers using the current user's JWT when logged in,
 * falling back to the anon key for public/unauthenticated requests.
 */
async function getAuthHeaders(extraHeaders = {}) {
  const { data: { session } } = await db.auth.getSession();
  const token = session?.access_token ?? SUPABASE_ANON_KEY;
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    ...extraHeaders,
  };
}

/**
 * Throws if there is no authenticated session.
 * Use at the top of any function that requires login.
 */
async function requireAuth() {
  const { data: { session } } = await db.auth.getSession();
  if (!session) throw new Error("Unauthorized: you must be logged in.");
  return session;
}

export async function supabaseRequest(path, options = {}) {
  const headers = await getAuthHeaders(options.headers || {});
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...options,
    headers,
  });
  if (!res.ok) return null;
  return res.json();
}

export async function rpc(fn, params) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers,
    body: JSON.stringify(params),
  });
  if (!res.ok) return null;
  return res.json();
}

export function escapeHTML(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function formatDate(iso) {
  const d = new Date(iso);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${mm}/${dd}/${yyyy} ${hh}:${min}`;
}

// ── Profile ───────────────────────────────────────────────────────────────────

export async function getProfileByUsername(username) {
  const { data: profile, error } = await db.rpc("get_user_by_username", {
    p_username: username,
  });
  return {
    profile: profile && profile.length > 0 ? profile[0] : null,
    error,
  };
}

export async function getProfileStats(userId) {
  const [{ count: totalToons }, { count: draftCount }, { count: commentCount }] =
    await Promise.all([
      db.from("animations").select("*", { count: "exact", head: true }).eq("user_id", userId),
      db.from("animations").select("*", { count: "exact", head: true }).eq("user_id", userId).eq("is_draft", true),
      db.from("comments").select("*", { count: "exact", head: true }).eq("user_id", userId),
    ]);
  return {
    totalToons: totalToons || 0,
    draftCount: draftCount || 0,
    commentCount: commentCount || 0,
  };
}

export async function getUserToons(userId, page = 1, perPage = 12) {
  const offset = (page - 1) * perPage;
  const { data: toons } = await db
    .from("animations")
    .select("id, title, frames, created_at, preview_url, frame_count")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + perPage - 1);

  const toonIds = (toons || []).map((t) => t.id);
  let commentCounts = {};
  if (toonIds.length > 0) {
    const { data: counts } = await db.from("comments").select("animation_id").in("animation_id", toonIds);
    (counts || []).forEach((c) => {
      commentCounts[c.animation_id] = (commentCounts[c.animation_id] || 0) + 1;
    });
  }
  return { toons: toons || [], commentCounts };
}

/**
 * Paginated toons for the profile page.
 * Pass isOwner=true to include drafts and all in_album states.
 * Visitors only see non-draft, in_album=true toons (filtered server-side via RLS).
 */
export async function getUserToonsPaginated(userId, page = 1, perPage = 12, isOwner = false) {
  const offset = (page - 1) * perPage;
  let url = `${SUPABASE_URL}/rest/v1/animations_feed?user_id=eq.${userId}&order=created_at.desc&limit=${perPage}&offset=${offset}`;
  if (!isOwner) url += "&is_draft=eq.false&in_album=eq.true";

  const headers = await getAuthHeaders({ Prefer: "count=exact" });
  const res = await fetch(url, { headers });

  const toons = res.ok ? await res.json() : [];
  const total = parseInt(res.headers?.get("Content-Range")?.split("/")[1] || "0", 10);

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const toonIds = (toons || []).map((t) => t.id).filter((id) => UUID_RE.test(id));
  let commentCounts = {};
  if (toonIds.length > 0) {
    const { data: counts } = await db.from("comments").select("animation_id").in("animation_id", toonIds);
    (counts || []).forEach((c) => {
      commentCounts[c.animation_id] = (commentCounts[c.animation_id] || 0) + 1;
    });
  }
  return { toons, total, commentCounts };
}

export async function getUserFavorites(userId, page = 1, perPage = 12) {
  const offset = (page - 1) * perPage;
  const { data: likes } = await db
    .from("likes")
    .select("animation_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + perPage - 1);

  if (!likes || likes.length === 0) return { toons: [], commentCounts: {} };

  const animationIds = likes.map((l) => l.animation_id);
  const { data: toons } = await db
    .from("animations")
    .select("id, title, frames, created_at, preview_url, frame_count")
    .in("id", animationIds)
    .order("created_at", { ascending: false });

  let commentCounts = {};
  if (toons && toons.length > 0) {
    const { data: counts } = await db.from("comments").select("animation_id").in("animation_id", animationIds);
    (counts || []).forEach((c) => {
      commentCounts[c.animation_id] = (commentCounts[c.animation_id] || 0) + 1;
    });
  }
  return { toons: toons || [], commentCounts };
}

export async function getUserCommentedToons(userId, page = 1, perPage = 12) {
  const offset = (page - 1) * perPage;
  const { data: comments } = await db
    .from("comments")
    .select("animation_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + perPage - 1);

  if (!comments || comments.length === 0) return { toons: [], commentCounts: {} };

  const animationIds = [...new Set(comments.map((c) => c.animation_id))];
  const { data: toons } = await db
    .from("animations")
    .select("id, title, frames, created_at, preview_url, frame_count")
    .in("id", animationIds)
    .order("created_at", { ascending: false });

  let commentCounts = {};
  if (toons && toons.length > 0) {
    const { data: counts } = await db.from("comments").select("animation_id").in("animation_id", animationIds);
    (counts || []).forEach((c) => {
      commentCounts[c.animation_id] = (commentCounts[c.animation_id] || 0) + 1;
    });
  }
  return { toons: toons || [], commentCounts };
}

export async function updateUserAvatar(username, toonId) {
  await requireAuth();
  const { error: authError } = await db.auth.updateUser({ data: { avatar_toon: toonId } });
  const { error: profileError } = await db.from("profiles").update({ avatar_toon: toonId }).eq("username", username);
  return { error: authError || profileError, success: !authError && !profileError };
}

export async function getAuthorData(userId) {
  if (!userId) return { username: "unknown", avatar: "/img/avatar100.gif", russian: false };

  const { data } = await db
    .from("profiles")
    .select("id, username, avatar_toon, russian, role")
    .eq("id", userId)
    .maybeSingle();

  if (!data) return { username: "unknown", avatar: "/img/avatar100.gif", russian: false };

  return {
    username: data.username || "unknown",
    avatar: "/img/avatar100.gif",
    russian: data.russian || false,
    role: data.role || "user",
  };
}

export async function resolveUsernames(toons) {
  const userIds = [...new Set(toons.map((t) => t.user_id).filter(Boolean))];
  if (userIds.length === 0) return {};

  const { data } = await db.from("profiles").select("id, username").in("id", userIds);

  const userMap = {};
  (data || []).forEach((u) => {
    userMap[u.id] = { username: u.username || "unknown", avatar: "/img/avatar100.gif", russian: false };
  });
  return userMap;
}

// ── User data ───────────────────────────────────────────────────────

export async function getUserColorData(username) {
  const data = await rpc("get_user_by_username", { p_username: username });
  if (!data || data.length === 0) return { role: "user", russian: false, nick_color: null, status: "ordinary" };
  return {
    role:      data[0].role      || "user",
    russian:   data[0].russian   || false,
    nick_color: data[0].nick_color || null,
    status:    data[0].status    || "ordinary",
  };
}

export async function getUserIconData(username) {
  const headers = await getAuthHeaders();
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?username=eq.${encodeURIComponent(username)}&select=patreon_status,nick_icon`,
    { headers }
  );
  if (!res.ok) return { patreon_status: "inactive", nick_icon: null };
  const rows = await res.json();
  return rows[0] ?? { patreon_status: "inactive", nick_icon: null };
}

// ── Home page ─────────────────────────────────────────────────────────────────

export async function getPopularToons(limit = 6) {
  const afterDate = new Date();
  afterDate.setDate(afterDate.getDate() - 7);
  const { toons } = await fetchPopular({ afterDate, page: 1, perPage: limit });
  return toons;
}

export async function getNewestToons(limit = 6) {
  return supabaseRequest(`/animations_feed?select=*&is_draft=eq.false&order=created_at.desc&limit=${limit}`);
}

export async function getFeaturedToon() {
  const toons = await supabaseRequest(
    "/animations_feed?featured=eq.true&is_draft=eq.false&order=created_at.desc&limit=1"
  );
  return toons?.[0] ?? null;
}

export async function getLastComments() {
  const comments = await supabaseRequest("/comments?order=created_at.desc&limit=10");
  return comments || [];
}

// ── Last page ─────────────────────────────────────────────────────────────────

export async function getLastToons(page = 1, perPage = 12) {
  const offset = (page - 1) * perPage;
  const headers = await getAuthHeaders({ Prefer: "count=exact" });
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/animations_feed?select=*&is_draft=eq.false&rank=in.(passer,animator,artist)&order=created_at.desc&offset=${offset}&limit=${perPage}`,
    { headers, cache: "no-store" }
  );
  if (!res.ok) return { toons: [], total: 0 };
  const toons = await res.json();
  const total = parseInt(res.headers.get("Content-Range")?.split("/")[1] || "0", 10);
  return { toons: toons || [], total };
}

// ── Popular pages ─────────────────────────────────────────────────────────────

const POPULAR_PER_PAGE = 16;

async function fetchPopular({ afterDate, page, perPage = POPULAR_PER_PAGE }) {
  const offset = (page - 1) * perPage;
  const { data, error } = await db.rpc("get_popular", {
    after_date: afterDate ? afterDate.toISOString() : null,
    page_offset: offset,
    page_limit: perPage,
  });
  if (error || !data || data.length === 0) return { toons: [], total: 0 };
  const total = data[0].total_count || 0;
  const toons = data.map(({ total_count, ...toon }) => toon);
  return { toons, total };
}

export async function getPopularAllTime(page = 1) {
  return fetchPopular({ page });
}

export async function getPopularWeek(page = 1) {
  const afterDate = new Date();
  afterDate.setDate(afterDate.getDate() - 7);
  return fetchPopular({ afterDate, page });
}

export async function getPopularDay(page = 1) {
  const afterDate = new Date();
  afterDate.setHours(afterDate.getHours() - 24);
  return fetchPopular({ afterDate, page });
}

export async function getStaticToons(page = 1, perPage = 12) {
  const offset = (page - 1) * perPage;
  const headers = await getAuthHeaders({ Prefer: "count=exact" });
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/animations_feed?select=*&is_draft=eq.false&rank=in.(passer,animator,artist)&frame_count=eq.1&order=created_at.desc&offset=${offset}&limit=${perPage}`,
    { headers, cache: "no-store" }
  );
  if (!res.ok) return { toons: [], total: 0 };
  const toons = await res.json();
  const total = parseInt(res.headers.get("Content-Range")?.split("/")[1] || "0", 10);
  return { toons: toons || [], total };
}
 

// ── Sandbox ───────────────────────────────────────────────────────────────────

export async function getSandboxToons(page = 1, perPage = 16) {
  const offset = (page - 1) * perPage;
  const { data, error } = await db.rpc("get_sandbox", { page_limit: perPage, page_offset: offset });

  if (error || !data || data.length === 0) return { toons: [], total: 0, commentCounts: {} };

  const total = Number(data[0].total_count) || 0;
  const toons = data.map(({ total_count, ...toon }) => toon);

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const toonIds = toons.map((t) => t.id).filter((id) => UUID_RE.test(id));
  const legacyIds = toons.map((t) => t.id).filter((id) => !UUID_RE.test(id));

  // Fetch frame_count from animations_feed (the RPC doesn't return it)
  const allIds = [...toonIds, ...legacyIds];
  if (allIds.length > 0) {
    const { data: feedRows } = await db
      .from("animations_feed")
      .select("id, frame_count")
      .in("id", allIds);
    const frameMap = {};
    (feedRows || []).forEach((f) => { frameMap[f.id] = f.frame_count ?? 0; });
    toons.forEach((t) => { t.frame_count = frameMap[t.id] ?? t.frame_count ?? 0; });
  }

  let commentCounts = {};
  if (toonIds.length > 0) {
    const { data: counts } = await db.from("comments").select("animation_id").in("animation_id", toonIds);
    (counts || []).forEach((c) => {
      commentCounts[c.animation_id] = (commentCounts[c.animation_id] || 0) + 1;
    });
  }
  return { toons, total, commentCounts };
}

export async function setSandboxFlag(toonId, value, isLegacy = false) {
  await requireAuth();
  const table = isLegacy ? "legacy_animations" : "animations";
  const { error } = await db.from(table).update({ sent_to_sandbox: value }).eq("id", toonId);
  return { success: !error, error };
}

// ── Toon of the Day history ───────────────────────────────────────────────────

const TOD_PER_PAGE = 16;

export async function getToonOfDayHistory(page = 1) {
  const offset = (page - 1) * TOD_PER_PAGE;
  const { data: rows, count, error } = await db
    .from("toon_of_day")
    .select("*", { count: "exact" })
    .order("awarded_at", { ascending: false })
    .range(offset, offset + TOD_PER_PAGE - 1);

  if (error || !rows || rows.length === 0) return { entries: [], total: 0 };

  const legacyIds = rows.filter((r) => r.is_legacy).map((r) => r.toon_id);
  const newIds    = rows.filter((r) => !r.is_legacy).map((r) => r.toon_id);

  const [legacyToons, newToons] = await Promise.all([
    legacyIds.length > 0
      ? db.from("legacy_animations").select("id, title, preview_url, frame_count, user_id").in("id", legacyIds).then((r) => r.data || [])
      : Promise.resolve([]),
    newIds.length > 0
      ? db.from("animations").select("id, title, preview_url, frame_count, user_id").in("id", newIds).then((r) => r.data || [])
      : Promise.resolve([]),
  ]);

  const toonMap = {};
  [...legacyToons, ...newToons].forEach((t) => { toonMap[t.id] = t; });

  const userMap = await resolveUsernames(Object.values(toonMap));

  const entries = rows.map((row) => {
    const toon = toonMap[row.toon_id] || null;
    const username = toon ? (userMap[toon.user_id]?.username || "unknown") : "unknown";
    return { ...row, toon, username };
  });

  return { entries, total: count || 0 };
}

export async function awardToonOfDay(toonId, isLegacy = false, awardedAt = null) {
  await requireAuth();
  const dateStr = awardedAt ? awardedAt : new Date().toISOString().slice(0, 10);

  const { data: prevFeatured } = await db.from("animations").select("id").eq("featured", true).maybeSingle();
  const { data: prevFeaturedLegacy } = await db.from("legacy_animations").select("id").eq("featured", true).maybeSingle();

  const { error: insertError } = await db
    .from("toon_of_day")
    .upsert({ awarded_at: dateStr, toon_id: toonId, is_legacy: isLegacy }, { onConflict: "awarded_at" });

  if (insertError) return { success: false, error: insertError };

  if (prevFeatured) await db.from("animations").update({ featured: false }).eq("id", prevFeatured.id);
  if (prevFeaturedLegacy) await db.from("legacy_animations").update({ featured: false }).eq("id", prevFeaturedLegacy.id);

  const { error: featuredError } = await db
    .from(isLegacy ? "legacy_animations" : "animations")
    .update({ featured: true })
    .eq("id", toonId);

  if (featuredError) return { success: false, error: featuredError };
  return { success: true };
}

// ── Good Place ────────────────────────────────────────────────────────────────

export async function getGoodPlaceCurrent() {
  const { data, error } = await db.from("good_place_current").select("*").eq("id", 1).single();
  if (error || !data || data.toon_id === "") return null;

  const { data: toon } = await db
    .from("animations_feed")
    .select("id, frame_count, title, user_id, preview_url")
    .eq("id", data.toon_id)
    .single();

  if (!toon) return null;

  const author = await getAuthorData(toon.user_id);
  db.storage.from(data.is_legacy ? "legacyAnimations" : "previews").getPublicUrl(data.toon_id);

  return {
    toon_id:      data.toon_id,
    is_legacy:    data.is_legacy,
    bid_amount:   data.bid_amount,
    min_next_bid: data.bid_amount + 1,
    acquired_at:  data.acquired_at,
    expires_at:   data.expires_at,
    toon: {
      id:          toon.id,
      frame_count: toon.frame_count ?? 0,
      title:       toon.title || toon.id,
      preview_url: toon.preview_url ?? null,
    },
    author,
  };
}

export async function getGoodPlaceHistory(page = 1, perPage = 16) {
  const from = (page - 1) * perPage;
  const to   = from + perPage - 1;

  const { data, error, count } = await db
    .from("good_place_history")
    .select("*", { count: "exact" })
    .order("acquired_at", { ascending: false })
    .range(from, to);

  if (error || !data) return { entries: [], total: 0 };

  const entries = await Promise.all(
    data.map(async (row) => {
      const { data: toon } = await db
        .from("animations_feed")
        .select("id, frame_count, title, user_id, preview_url")
        .eq("id", row.toon_id)
        .single();

      if (!toon) return null;

      const author = await getAuthorData(toon.user_id);
      db.storage.from(row.is_legacy ? "legacyAnimations" : "previews").getPublicUrl(row.toon_id);

      return {
        id:           row.id,
        toon_id:      row.toon_id,
        is_legacy:    row.is_legacy,
        bid_amount:   row.bid_amount,
        acquired_at:  row.acquired_at,
        expires_at:   row.expires_at,
        toon: {
          id:          toon.id,
          frame_count: toon.frame_count ?? 0,
          title:       toon.title || toon.id,
          preview_url: toon.preview_url ?? null,
        },
        author,
      };
    })
  );

  return { entries: entries.filter(Boolean), total: count ?? 0 };
}

export async function buyGoodPlace(toonId, isLegacy, bidAmount) {
  await requireAuth();
  const { data, error } = await db.rpc("buy_good_place", {
    p_toon_id:   toonId,
    p_is_legacy: isLegacy,
    p_bid:       bidAmount,
  });
  if (error) return { success: false, message: error.message };
  return data;
}

export async function releaseGoodPlace(reason = "Policy violation") {
  await requireAuth();
  const { data, error } = await db.rpc("release_good_place", { p_reason: reason });
  if (error) return { success: false, message: error.message };
  return data;
}

// ── Spooder Transactions ──────────────────────────────────────────────────────

// Known sources that have translation keys in spooderSources.*
const SPOODER_SOURCE_KEYS = new Set(["kofi", "boosty", "patreon", "admin", "mod_helper", "spend"]);

/**
 * Returns a translated label for a spooder transaction.
 * Pass tSources = useTranslations("spooderSources") from the call site.
 * Falls back gracefully if tSources is not provided.
 */
// Known spend notes that have translation keys
const SPEND_NOTE_KEYS = {
  "for Good Place.": "spend_good_place",
};

export function describeSpooderTransaction(t, tSources) {
  if (t.source === "spend") {
    if (tSources && t.note && SPEND_NOTE_KEYS[t.note]) {
      return tSources(SPEND_NOTE_KEYS[t.note]);
    }
    return t.note || (tSources ? tSources("spend") : "spent.");
  }
  if (tSources && SPOODER_SOURCE_KEYS.has(t.source)) {
    return tSources(t.source);
  }
  return t.note ?? t.source;
}

export async function getSpooderTransactions(userId, page = 1, perPage = 20) {
  await requireAuth();
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  const { data, error, count } = await db
    .from("spooder_transactions")
    .select("*", { count: "exact" })
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(from, to);
  return { transactions: data ?? [], total: count ?? 0, error };
}

// ── Notifications ─────────────────────────────────────────────────────────────

export async function getNotifications(userId, page = 1, perPage = 20) {
  await requireAuth();
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  const { data, error, count } = await db
    .from("notifications")
    .select("*", { count: "exact" })
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(from, to);
  return { notifications: data ?? [], total: count ?? 0, error };
}