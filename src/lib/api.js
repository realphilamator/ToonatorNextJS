import { apiFetch, API_URL, getToken } from "./config";

// ── Helpers ───────────────────────────────────────────────────────────────────

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
  const profile = await apiFetch(`/profiles/${encodeURIComponent(username)}`);
  return { profile: profile ?? null, error: profile ? null : "Not found" };
}

export async function getProfileStats(userId) {
  const data = await apiFetch(`/profiles/stats/${userId}`);
  return {
    totalToons: data?.totalToons ?? 0,
    draftCount: data?.draftCount ?? 0,
    commentCount: data?.commentCount ?? 0,
  };
}

export async function getUserToons(userId, page = 1, perPage = 12) {
  const offset = (page - 1) * perPage;
  const data = await apiFetch(`/animations/user-by-id/${userId}?limit=${perPage}&offset=${offset}`);
  return { toons: data?.toons ?? [], commentCounts: data?.commentCounts ?? {} };
}

export async function getUserToonsPaginated(userId, page = 1, perPage = 12, isOwner = false) {
  const offset = (page - 1) * perPage;
  const data = await apiFetch(`/animations/user-by-id/${userId}?limit=${perPage}&offset=${offset}&isOwner=${isOwner}`);
  return { toons: data?.toons ?? [], total: data?.total ?? 0, commentCounts: data?.commentCounts ?? {} };
}

export async function getUserFavorites(userId, page = 1, perPage = 12) {
  const offset = (page - 1) * perPage;
  const data = await apiFetch(`/likes/user/${userId}?limit=${perPage}&offset=${offset}`);
  return { toons: data?.toons ?? [], commentCounts: data?.commentCounts ?? {} };
}

export async function getUserCommentedToons(userId, page = 1, perPage = 12) {
  const offset = (page - 1) * perPage;
  const data = await apiFetch(`/comments/user/${userId}/toons?limit=${perPage}&offset=${offset}`);
  return { toons: data?.toons ?? [], commentCounts: data?.commentCounts ?? {} };
}

export async function updateUserAvatar(username, toonId) {
  const data = await apiFetch("/profiles/me", {
    method: "PATCH",
    body: JSON.stringify({ avatar_toon: toonId }),
  });
  return { error: data ? null : "Failed to update avatar", success: !!data };
}

export async function getAuthorData(userId) {
  if (!userId) return { username: "unknown", avatar: "/img/avatar100.gif", russian: false };
  const data = await apiFetch(`/profiles/by-id/${userId}`);
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
  const data = await apiFetch(`/profiles/bulk?ids=${userIds.join(",")}`);
  const userMap = {};
  (data || []).forEach((u) => {
    userMap[u.id] = { username: u.username || "unknown", avatar: "/img/avatar100.gif", russian: false };
  });
  return userMap;
}

export async function getUserColorData(username) {
  const data = await apiFetch(`/profiles/${encodeURIComponent(username)}`);
  if (!data) return { role: "user", russian: false, nick_color: null, status: "ordinary" };
  return {
    role: data.role || "user",
    russian: data.russian || false,
    nick_color: data.nick_color || null,
    status: data.status || "ordinary",
  };
}

export async function getUserIconData(username) {
  const data = await apiFetch(`/profiles/${encodeURIComponent(username)}`);
  if (!data) return { patreon_status: "inactive", nick_icon: null };
  return { patreon_status: data.patreon_status ?? "inactive", nick_icon: data.nick_icon ?? null };
}

// ── Home page ─────────────────────────────────────────────────────────────────

export async function getPopularToons(limit = 6) {
  const data = await apiFetch(`/animations/popular?limit=${limit}`);
  return data?.toons ?? [];
}

export async function getNewestToons(limit = 6) {
  const data = await apiFetch(`/animations?limit=${limit}`);
  return data ?? [];
}

export async function getFeaturedToon() {
  const data = await apiFetch("/animations/featured");
  return data ?? null;
}

export async function getLastComments() {
  const data = await apiFetch("/comments/latest");
  return data ?? [];
}

// ── Last page ─────────────────────────────────────────────────────────────────

export async function getLastToons(page = 1, perPage = 12) {
  const offset = (page - 1) * perPage;
  const data = await apiFetch(`/animations/last?limit=${perPage}&offset=${offset}`);
  return { toons: data?.toons ?? [], total: data?.total ?? 0 };
}

// ── Popular pages ─────────────────────────────────────────────────────────────

export async function getPopularAllTime(page = 1, perPage = 16) {
  const data = await apiFetch(`/animations/popular?page=${page}&perPage=${perPage}`);
  return { toons: data?.toons ?? [], total: data?.total ?? 0 };
}

export async function getPopularWeek(page = 1, perPage = 16) {
  const data = await apiFetch(`/animations/popular?page=${page}&perPage=${perPage}&period=week`);
  return { toons: data?.toons ?? [], total: data?.total ?? 0 };
}

export async function getPopularDay(page = 1, perPage = 16) {
  const data = await apiFetch(`/animations/popular?page=${page}&perPage=${perPage}&period=day`);
  return { toons: data?.toons ?? [], total: data?.total ?? 0 };
}

export async function getStaticToons(page = 1, perPage = 12) {
  const offset = (page - 1) * perPage;
  const data = await apiFetch(`/animations/static?limit=${perPage}&offset=${offset}`);
  return { toons: data?.toons ?? [], total: data?.total ?? 0 };
}

// ── Sandbox ───────────────────────────────────────────────────────────────────

export async function getSandboxToons(page = 1, perPage = 16) {
  const offset = (page - 1) * perPage;
  const data = await apiFetch(`/animations/sandbox?limit=${perPage}&offset=${offset}`);
  return { toons: data?.toons ?? [], total: data?.total ?? 0, commentCounts: data?.commentCounts ?? {} };
}

export async function setSandboxFlag(toonId, value, isLegacy = false) {
  const data = await apiFetch(`/animations/${toonId}/sandbox`, {
    method: "PATCH",
    body: JSON.stringify({ sent_to_sandbox: value, isLegacy }),
  });
  return { success: !!data, error: data ? null : "Failed" };
}

// ── Toon of the Day ───────────────────────────────────────────────────────────

export async function getToonOfDayHistory(page = 1) {
  const data = await apiFetch(`/toon-of-day?page=${page}`);
  return { entries: data?.entries ?? [], total: data?.total ?? 0 };
}

export async function awardToonOfDay(toonId, isLegacy = false, awardedAt = null) {
  const data = await apiFetch("/toon-of-day", {
    method: "POST",
    body: JSON.stringify({ toonId, isLegacy, awardedAt }),
  });
  return { success: !!data, error: data ? null : "Failed" };
}

// ── Good Place ────────────────────────────────────────────────────────────────

export async function getGoodPlaceCurrent() {
  return apiFetch("/good-place/current");
}

export async function getGoodPlaceHistory(page = 1, perPage = 16) {
  const data = await apiFetch(`/good-place/history?page=${page}&perPage=${perPage}`);
  return { entries: data?.entries ?? [], total: data?.total ?? 0 };
}

export async function buyGoodPlace(toonId, isLegacy, bidAmount) {
  const data = await apiFetch("/good-place/buy", {
    method: "POST",
    body: JSON.stringify({ toonId, isLegacy, bidAmount }),
  });
  return data ?? { success: false, message: "Failed" };
}

export async function releaseGoodPlace(reason = "Policy violation") {
  const data = await apiFetch("/good-place/release", {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
  return data ?? { success: false, message: "Failed" };
}

// ── Spooder Transactions ──────────────────────────────────────────────────────

const SPOODER_SOURCE_KEYS = new Set(["kofi", "boosty", "patreon", "admin", "mod_helper", "spend"]);
const SPEND_NOTE_KEYS = { "for Good Place.": "spend_good_place" };

export function describeSpooderTransaction(t, tSources) {
  if (t.source === "spend") {
    if (tSources && t.note && SPEND_NOTE_KEYS[t.note]) return tSources(SPEND_NOTE_KEYS[t.note]);
    return t.note || (tSources ? tSources("spend") : "spent.");
  }
  if (tSources && SPOODER_SOURCE_KEYS.has(t.source)) return tSources(t.source);
  return t.note ?? t.source;
}

export async function getSpooderTransactions(userId, page = 1, perPage = 20) {
  const data = await apiFetch(`/spooders/transactions?page=${page}&perPage=${perPage}`);
  return { transactions: data?.transactions ?? [], total: data?.total ?? 0, error: null };
}

// ── Notifications ─────────────────────────────────────────────────────────────

export async function getNotifications(userId, page = 1, perPage = 20) {
  const data = await apiFetch(`/notifications?limit=${perPage}&offset=${(page - 1) * perPage}`);
  return { notifications: data ?? [], total: 0, error: null };
}