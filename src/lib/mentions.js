// src/lib/mentions.js
// ─── Mention utilities ────────────────────────────────────────────────────────

/**
 * Extract all unique @username tokens from a string.
 * Usernames: 3–20 chars, letters/digits/underscores.
 */
export function extractMentions(text) {
  if (!text) return [];
  const matches = text.matchAll(/@([a-zA-Z0-9_]{3,20})/g);
  const seen = new Set();
  for (const m of matches) seen.add(m[1]);
  return [...seen];
}

/**
 * Fire mention notifications into the notifications table.
 * Uses the existing get_user_by_username RPC to resolve usernames → user IDs.
 *
 * notifications table columns used:
 *   user_id, type, amount, reason, toon_id, is_read,
 *   from_username, comment_id, message   ← added by migration
 *
 * @param {object} db            - Supabase client
 * @param {string} fromUsername  - Who triggered the mention
 * @param {string} selfUserId    - The poster's own user_id (skip self-notifications)
 * @param {string} text          - Text to scan for @mentions
 * @param {string} type          - 'mention_comment' | 'mention_toon_title' | 'mention_toon_description'
 * @param {string} toonId        - The toon's ID
 * @param {string|null} commentId - UUID of the comment row (comment mentions only)
 */
export async function fireMentionNotifications(db, {
  fromUsername,
  selfUserId = null,
  text,
  type,
  toonId = null,
  commentId = null,
}) {
  const usernames = extractMentions(text);
  if (!usernames.length) return;

  const typeLabel = {
    mention_comment:          "mentioned you in a comment",
    mention_toon_title:       "mentioned you in a toon title",
    mention_toon_description: "mentioned you in a toon description",
  }[type] ?? "mentioned you";

  const rows = [];

  await Promise.all(
    usernames.map(async (username) => {
      const { data } = await db.rpc("get_user_by_username", { p_username: username });
      const userId = data?.[0]?.id ?? null;
      if (!userId || userId === selfUserId) return;
      rows.push({
        user_id:       userId,
        from_username: fromUsername,
        type,
        amount:        0,        // not a currency notification; required column → 0
        reason:        type,     // reason mirrors type for non-currency notifications
        toon_id:       toonId,
        comment_id:    commentId,
        message:       `${fromUsername} ${typeLabel}.`,
        is_read:       false,
      });
    })
  );

  if (rows.length) {
    const { error } = await db.from("notifications").insert(rows);
    if (error) console.warn("[mentions] insert error:", error.message);
  }
}