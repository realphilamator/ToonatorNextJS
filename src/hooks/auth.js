"use client";
import { useState, useEffect } from "react";
import { getToken, setToken, removeToken, apiFetch, API_URL } from "@/lib/config";
import { useUnreadCounts } from "@/hooks/useUnreadCounts";

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [spiders, setSpiders] = useState(0);

  const { unreadNotifications, unreadSpooders } = useUnreadCounts(user?.id ?? null);

  async function fetchSpiders(userId) {
    const data = await apiFetch(`/profiles/me`);
    setSpiders(data?.spiders ?? 0);
  }

  async function loadUser() {
    const token = getToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    const data = await apiFetch("/profiles/me");
    if (data) {
      setUser({ id: data.id, user_metadata: { username: data.username, avatar_toon: data.avatar_toon } });
      setSpiders(data.spiders ?? 0);
    } else {
      removeToken();
      setUser(null);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadUser();
  }, []);

  async function signOut() {
    removeToken();
    setUser(null);
    setSpiders(0);
    window.location.href = "/";
  }

  async function signIn(email, password) {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) return { error: data.error };
    setToken(data.token);
    await loadUser();
    return { error: null };
  }

  async function signUp(email, password, username) {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, username }),
    });
    const data = await res.json();
    if (!res.ok) return { error: data.error };
    setToken(data.token);
    await loadUser();
    return { error: null };
  }

  return { user, loading, signOut, signIn, signUp, spiders, unreadNotifications, unreadSpooders };
}