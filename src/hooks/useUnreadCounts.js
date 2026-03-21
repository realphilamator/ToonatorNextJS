"use client";
import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/config";

export function useUnreadCounts(userId) {
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadSpooders, setUnreadSpooders] = useState(0);

  const fetchUnreadNotifications = useCallback(async () => {
    if (!userId) return;
    const data = await apiFetch("/notifications/unread-count");
    setUnreadNotifications(data?.count ?? 0);
  }, [userId]);

  const fetchUnreadSpooders = useCallback(async () => {
    if (!userId) return;
    const data = await apiFetch("/spooders/unread-count");
    setUnreadSpooders(data?.count ?? 0);
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setUnreadNotifications(0);
      setUnreadSpooders(0);
      return;
    }

    fetchUnreadNotifications();
    fetchUnreadSpooders();

    // Poll every 30 seconds instead of real-time
    const interval = setInterval(() => {
      fetchUnreadNotifications();
      fetchUnreadSpooders();
    }, 30000);

    return () => clearInterval(interval);
  }, [userId, fetchUnreadNotifications, fetchUnreadSpooders]);

  return { unreadNotifications, unreadSpooders };
}