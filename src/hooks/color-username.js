"use client";
import { useState, useEffect } from "react";
import { getUserColorData } from "@/lib/api";

const colorCache = {};

export function useUsernameColor(username) {
  const [result, setResult] = useState({ colorClass: "", nickColor: null });

  useEffect(() => {
    if (!username) return;

    if (colorCache[username] !== undefined) {
      setResult(resolve(colorCache[username]));
      return;
    }

    let cancelled = false;

    getUserColorData(username)
      .then((data) => {
        colorCache[username] = data;
        if (!cancelled) setResult(resolve(data));
      })
      .catch(() => {
        const fallback = { role: "user", russian: false, nick_color: null, status: "ordinary" };
        colorCache[username] = fallback;
        if (!cancelled) setResult(resolve(fallback));
      });

    return () => { cancelled = true; };
  }, [username]);

  return result;
}

function resolve({ russian, nick_color, status }) {
  let colorClass;
  if (russian) colorClass = "russian";
  else colorClass = "foreign";

  const isCowboyPlus = status === "cowboy" || status === "monarch";
  const nickColor = isCowboyPlus ? (nick_color || null) : null;

  return { colorClass, nickColor };
}