"use client";
import { useState, useEffect } from "react";
import { getUserIconData } from "@/lib/api";

// Exposed on window so settings page can bust it without a dynamic import
if (typeof window !== "undefined" && !window.__nickIconCache) {
  window.__nickIconCache = {};
}

function getCache() {
  if (typeof window !== "undefined") return window.__nickIconCache;
  return {};
}

/**
 * Returns { iconUrl: string | null } for a given username.
 * Only non-null when the user is an active Patreon member with an uploaded icon.
 */
export function useUsernameIcon(username) {
  const cache = getCache();
  const [iconUrl, setIconUrl] = useState(
    // Initialise from cache synchronously to avoid a flicker on re-mount
    username && cache[username] !== undefined ? cache[username] : null
  );

  useEffect(() => {
    if (!username) return;

    const cache = getCache();
    if (cache[username] !== undefined) {
      setIconUrl(cache[username]);
      return;
    }

    let cancelled = false;

    getUserIconData(username)
      .then((data) => {
        const url = resolveIcon(data);
        getCache()[username] = url;
        if (!cancelled) setIconUrl(url);
      })
      .catch(() => {
        getCache()[username] = null;
        if (!cancelled) setIconUrl(null);
      });

    return () => { cancelled = true; };
  }, [username]);

  return { iconUrl };
}

function resolveIcon({ patreon_status, nick_icon }) {
  if (patreon_status !== "active") return null;
  return nick_icon ?? null;
}