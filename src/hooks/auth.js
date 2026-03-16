"use client";
import { useState, useEffect } from "react";
import { db } from "@/lib/config";
import { useUnreadCounts } from "@/hooks/useUnreadCounts";

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [spiders, setSpiders] = useState(0);

  const { unreadNotifications, unreadSpooders } = useUnreadCounts(user?.id ?? null);

  async function fetchSpiders(userId) {
    const { data } = await db.from("profiles").select("spiders").eq("id", userId).single();
    setSpiders(data?.spiders ?? 0);
  }

  useEffect(() => {
    db.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      setLoading(false);
      if (u) fetchSpiders(u.id);
    });

    const { data: { subscription } } = db.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        fetchSpiders(u.id);
      } else {
        setSpiders(0);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signOut() {
    await db.auth.signOut();
  }

  return { user, loading, signOut, spiders, unreadNotifications, unreadSpooders };
}