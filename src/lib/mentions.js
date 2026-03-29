export function extractMentions(text) {
  if (!text) return [];
  const matches = text.matchAll(/@([a-zA-Z0-9_]{3,20})/g);
  const seen = new Set();
  for (const m of matches) seen.add(m[1]);
  return [...seen];
}

export async function fireMentionNotifications(db, {
  fromUsername,
  selfUserId = null,
  text,
  type,
  toonId = null,
  commentId = null,
}) {
  // TODO: migrate to new backend notification endpoint
  console.log("[mentions] stubbed out — implement backend endpoint");
}