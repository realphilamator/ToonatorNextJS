"use client";
import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/config";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getAvatarUrl(avatarToonId, size) {
  if (!avatarToonId) return "/img/avatar100.gif";
  return `https://storage.m2inc.dev/retoon/previews/${avatarToonId}_${size}.gif`;
}

/**
 * UserAvatar — drop-in avatar image component.
 *
 * Usage:
 *   // Fetch avatar by username (toon page, comment list, etc.)
 *   <UserAvatar username="Engine" size={40} />
 *
 *   // Pass a known avatarToonId directly (profile page, where you already have it)
 *   <UserAvatar avatarToonId="55abb2ac-..." size={100} />
 *
 * Props:
 *   username     — fetch avatar_toon from profiles by username
 *   avatarToonId — use directly, skips fetch
 *   size         — 40 (small, sidebar/comments) or 100 (large, profile page). Default: 40
 *   className    — extra CSS classes
 *   alt          — img alt text. Defaults to username or "avatar"
 */
export default function UserAvatar({ username, avatarToonId, size = 40, className = "", alt }) {
  const [src, setSrc] = useState(() =>
    avatarToonId ? getAvatarUrl(avatarToonId, size) : "/img/avatar100.gif"
  );

  apiFetch(`/profiles/${username}`).then((data) => {
    if (data?.avatar_toon) setSrc(getAvatarUrl(data.avatar_toon, size));
  });

  console.log(`UserAvatar`);

  return (
    <img
      src={src}
      width={size}
      height={size}
      alt={alt ?? username ?? "avatar"}
      className={className}
      onError={(e) => { e.currentTarget.src = "/img/avatar100.gif"; }}
    />
  );
}