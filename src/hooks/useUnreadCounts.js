"use client";
import { useState, useEffect, useCallback } from "react";
import { db } from "@/lib/config";

export function useUnreadCounts(userId) {
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadSpooders, setUnreadSpooders] = useState(0);

  const fetchUnreadNotifications = useCallback(async () => {
    if (!userId) return;
    const { count } = await db
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_read", false);
    setUnreadNotifications(count ?? 0);
  }, [userId]);

  const fetchUnreadSpooders = useCallback(async () => {
    if (!userId) return;
    const { count } = await db
      .from("spooder_transactions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_read", false);
    setUnreadSpooders(count ?? 0);
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setUnreadNotifications(0);
      setUnreadSpooders(0);
      return;
    }

    fetchUnreadNotifications();
    fetchUnreadSpooders();

    // Realtime: notifications
    const notifChannel = db
      .channel("unread-notifications-" + userId)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        fetchUnreadNotifications
      )
      .subscribe();

    // Realtime: spooder transactions
    const spooderChannel = db
      .channel("unread-spooders-" + userId)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "spooder_transactions", filter: `user_id=eq.${userId}` },
        fetchUnreadSpooders
      )
      .subscribe();

    return () => {
      db.removeChannel(notifChannel);
      db.removeChannel(spooderChannel);
    };
  }, [userId, fetchUnreadNotifications, fetchUnreadSpooders]);

  return { unreadNotifications, unreadSpooders };
}