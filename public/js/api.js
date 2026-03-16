// API Module - Centralized Supabase and data fetching logic

import { db } from "/js/config.js";

// ============================================================
// Configuration Constants
// ============================================================
const SUPABASE_URL = "https://ytyhhmwnnlkhhpvsurlm.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0eWhobXdubmxraGhwdnN1cmxtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NzcwNTAsImV4cCI6MjA4ODU1MzA1MH0.XZVH3j6xftSRULfhdttdq6JGIUSgHHJt9i-vXnALjH0";

// ============================================================
// Helpers: HTTP Requests & Data Formatting
// ============================================================

export async function supabaseRequest(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  if (!res.ok) return null;
  return res.json();
}

export async function rpc(fn, params) {
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

// ============================================================
// Profile API
// ============================================================

export async function getProfileByUsername(username) {
  const { data: profile, error } = await db.rpc("get_user_by_username", {
    p_username: username,
  });
  return { profile: profile && profile.length > 0 ? profile[0] : null, error };
}

export async function getProfileStats(userId) {
  const [
    { count: totalToons },
    { count: draftCount },
    { count: commentCount },
  ] = await Promise.all([
    db
      .from("animations")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId),
    db
      .from("animations")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("draft", true),
    db
      .from("comments")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId),
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
    .select("id, title, frames, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + perPage - 1);

  // Get comment counts for these toons
  const toonIds = (toons || []).map((t) => t.id);
  let commentCounts = {};
  if (toonIds.length > 0) {
    const { data: counts } = await db
      .from("comments")
      .select("animation_id")
      .in("animation_id", toonIds);
    (counts || []).forEach((c) => {
      commentCounts[c.animation_id] = (commentCounts[c.animation_id] || 0) + 1;
    });
  }

  return { toons: toons || [], commentCounts };
}

export async function getUserFavorites(userId, page = 1, perPage = 12) {
  const offset = (page - 1) * perPage;

  // Get liked toons for this user
  const { data: likes } = await db
    .from("likes")
    .select("animation_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + perPage - 1);

  if (!likes || likes.length === 0) {
    return { toons: [], commentCounts: {} };
  }

  const animationIds = likes.map((l) => l.animation_id);

  // Get toon data for these animations
  const { data: toons } = await db
    .from("animations")
    .select("id, title, frames, created_at")
    .in("id", animationIds)
    .order("created_at", { ascending: false });

  // Get comment counts
  let commentCounts = {};
  if (toons && toons.length > 0) {
    const { data: counts } = await db
      .from("comments")
      .select("animation_id")
      .in("animation_id", animationIds);
    (counts || []).forEach((c) => {
      commentCounts[c.animation_id] = (commentCounts[c.animation_id] || 0) + 1;
    });
  }

  return { toons: toons || [], commentCounts };
}

export async function getUserCommentedToons(userId, page = 1, perPage = 12) {
  const offset = (page - 1) * perPage;

  // Get toons that this user has commented on
  const { data: comments } = await db
    .from("comments")
    .select("animation_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + perPage - 1);

  if (!comments || comments.length === 0) {
    return { toons: [], commentCounts: {} };
  }

  // Get unique animation IDs
  const animationIds = [...new Set(comments.map((c) => c.animation_id))];

  // Get toon data
  const { data: toons } = await db
    .from("animations")
    .select("id, title, frames, created_at")
    .in("id", animationIds)
    .order("created_at", { ascending: false });

  // Get comment counts
  let commentCounts = {};
  if (toons && toons.length > 0) {
    const { data: counts } = await db
      .from("comments")
      .select("animation_id")
      .in("animation_id", animationIds);
    (counts || []).forEach((c) => {
      commentCounts[c.animation_id] = (commentCounts[c.animation_id] || 0) + 1;
    });
  }

  return { toons: toons || [], commentCounts };
}

// ============================================================
// Toon API
// ============================================================

export async function getToonById(id) {
  const toons = await supabaseRequest(`/animations?id=eq.${id}&select=*`);
  if (!toons || toons.length === 0) return null;
  return toons[0];
}

export async function getAuthorData(userId) {
  if (!userId)
    return {
      username: "unknown",
      avatar: "/img/avatar100.gif",
      russian: false,
    };

  const userData = await rpc("get_user_by_id", { p_user_id: userId });
  if (!userData || userData.length === 0) {
    return {
      username: "unknown",
      avatar: "/img/avatar100.gif",
      russian: false,
    };
  }

  const user = userData[0];
  const avatarToonId = user.avatar_toon_id || user.avatar_toon || null;
  const avatar = avatarToonId
    ? `${SUPABASE_URL}/storage/v1/object/public/previews/${avatarToonId}_100.gif`
    : "/img/avatar100.gif";

  return {
    username: user.username || "unknown",
    avatar,
    russian: user.russian || false,
  };
}

export async function getContinuedFromInfo(toonId) {
  if (!toonId) return null;

  const origToons = await supabaseRequest(
    `/animations?id=eq.${toonId}&select=id,title,user_id`,
  );
  if (!origToons || origToons.length === 0) return null;

  const orig = origToons[0];
  const authorData = await getAuthorData(orig.user_id);

  return {
    id: orig.id,
    title: orig.title || "Untitled",
    author: authorData.username,
    authorRussian: authorData.russian,
  };
}

// ============================================================
// REPLACE these four functions in api.js
// ============================================================

export async function getToonComments(toonId, isLegacy = false) {
  const col = isLegacy ? "legacy_animation_id" : "animation_id";
  const { data, error } = await db
    .from("comments")
    .select("*")
    .eq(col, toonId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (!data || data.length === 0) return [];

  const usernames = [...new Set(data.map((c) => c.author_username).filter(Boolean))];
  const userDataMap = {};

  await Promise.all(
    usernames.map(async (uname) => {
      try {
        const userData = await rpc("get_user_by_username", { p_username: uname });
        if (userData && userData.length > 0) {
          const avatarToonId = userData[0].avatar_toon_id || userData[0].avatar_toon || null;
          userDataMap[uname] = {
            avatar: avatarToonId
              ? `${SUPABASE_URL}/storage/v1/object/public/previews/${avatarToonId}_100.gif`
              : "/img/avatar100.gif",
            russian: userData[0].russian || false,
          };
        } else {
          userDataMap[uname] = { avatar: "/img/avatar100.gif", russian: false };
        }
      } catch (e) {
        userDataMap[uname] = { avatar: "/img/avatar100.gif", russian: false };
      }
    }),
  );

  return data.map((c) => ({
    ...c,
    userData: userDataMap[c.author_username] || { avatar: "/img/avatar100.gif", russian: false },
  }));
}

export async function postComment(toonId, text, isLegacy = false) {
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const username = user.user_metadata?.username || user.email;
  const col = isLegacy ? "legacy_animation_id" : "animation_id";

  const { data, error } = await db.from("comments").insert({
    [col]: toonId,
    user_id: user.id,
    author_username: username,
    text,
  });

  return { data, error };
}

export async function getToonLikes(toonId, isLegacy = false) {
  const col = isLegacy ? "legacy_animation_id" : "animation_id";
  const { count } = await db
    .from("likes")
    .select("*", { count: "exact", head: true })
    .eq(col, toonId);
  return count || 0;
}

export async function getToonUserLikeStatus(toonId, userId, isLegacy = false) {
  if (!userId) return false;
  const col = isLegacy ? "legacy_animation_id" : "animation_id";
  const { data: existing } = await db
    .from("likes")
    .select("id")
    .eq(col, toonId)
    .eq("user_id", userId)
    .maybeSingle();
  return !!existing;
}

export async function toggleToonLike(toonId, isLegacy = false) {
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { error: "Not authenticated", success: false };

  const col = isLegacy ? "legacy_animation_id" : "animation_id";
  const table = isLegacy ? "legacy_animations" : "animations";
  const alreadyLiked = await getToonUserLikeStatus(toonId, user.id, isLegacy);
  let error = null;

  if (alreadyLiked) {
    ({ error } = await db
      .from("likes")
      .delete()
      .eq(col, toonId)
      .eq("user_id", user.id));

    if (!error) {
      const { data: toon } = await db.from(table).select("likes").eq("id", toonId).single();
      await db.from(table).update({ likes: Math.max(0, (toon?.likes || 0) - 1) }).eq("id", toonId);
    }
  } else {
    ({ error } = await db
      .from("likes")
      .upsert(
        { [col]: toonId, user_id: user.id },
        { onConflict: `${col},user_id`, ignoreDuplicates: true },
      ));

    if (!error) {
      const { data: toon } = await db.from(table).select("likes").eq("id", toonId).single();
      await db.from(table).update({ likes: (toon?.likes || 0) + 1 }).eq("id", toonId);
    }
  }

  return { success: !error, liked: !alreadyLiked, error };
}

export async function updateUserAvatar(username, toonId) {
  const { error: authError } = await db.auth.updateUser({
    data: { avatar_toon: toonId },
  });
  const { error: profileError } = await db
    .from("profiles")
    .update({ avatar_toon: toonId })
    .eq("username", username);
  return {
    error: authError || profileError,
    success: !authError && !profileError,
  };
}

// Load includes HTML
// ============================================================
// Messages API
// ============================================================

export async function getMessages(recipientUsername, userId) {
  // Get messages between current user and recipient
  const { data, error } = await db
    .from("messages")
    .select("*")
    .or(
      `and(sender_id.eq.${userId},recipient_username.eq.${recipientUsername}),and(sender_username.eq.${recipientUsername},recipient_id.eq.${userId})`,
    )
    .order("created_at", { ascending: true })
    .limit(100);

  return data || [];
}

export async function postMessage(recipientUsername, text) {
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return { error: "Not authenticated", success: false };

  const username = user.user_metadata?.username || user.email;

  // Get recipient user ID
  const recipientData = await rpc("get_user_by_username", {
    p_username: recipientUsername,
  });
  const recipientId =
    recipientData && recipientData.length > 0 ? recipientData[0].id : "admin";

  const { data, error } = await db.from("messages").insert({
    sender_id: user.id,
    sender_username: username,
    recipient_id: recipientId,
    recipient_username: recipientUsername,
    text: text,
  });

  return { data, error, success: !error };
}
