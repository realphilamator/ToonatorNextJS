"use client";
import { useState, useEffect, useCallback } from "react";
import { useTranslations } from 'next-intl';
import ToonCard from "@/components/ToonCard";
import UsernameLink from "@/components/UsernameLink";
import Paginator, { calculateTotalPages } from "@/components/paginator";
import AvatarChooser from "@/components/AvatarChooser";
import UserAvatar from "@/components/UserAvatar";
import { useAuth } from "@/hooks/auth";
import {
  getUserToonsPaginated,
  getUserFavorites,
  getUserCommentedToons,
  updateUserAvatar,
} from "@/lib/api";

const PER_PAGE = 12;

export default function ProfileClient({ username, profile, stats }) {
  const t = useTranslations('profile');
  const { user, loading: authLoading } = useAuth();
  const [currentTab, setCurrentTab]         = useState("album");
  const [currentPage, setCurrentPage]       = useState(1);
  const [toons, setToons]                   = useState([]);
  const [commentCounts, setCommentCounts]   = useState({});
  const [totalPages, setTotalPages]         = useState(1);
  const [loading, setLoading]               = useState(true);
  const [avatarProcessing, setAvatarProcessing] = useState(false);
  const [chooserOpen, setChooserOpen]       = useState(false);
  const [avatarToonId, setAvatarToonId]     = useState(() => profile.avatar_toon || null);
  const [albumOverrides, setAlbumOverrides] = useState({});

  const isOwnProfile = user?.user_metadata?.username === username;

  const rankLabel = t(`ranks.${profile.rank}`, { defaultValue: profile.rank ?? t('ranks.unknown_animal') });
  const showRank = isOwnProfile || !profile.hide_rank;

  const TABS = [
    { key: "album",     label: t('tabAlbum') },
    { key: "favorites", label: t('tabFavorites') },
    { key: "comments",  label: t('tabComments') },
  ];

  useEffect(() => {
    const toon = isOwnProfile
      ? user?.user_metadata?.avatar_toon || profile.avatar_toon
      : profile.avatar_toon;
    setAvatarToonId(toon || null);
  }, [profile, user, isOwnProfile]);

  const loadTab = useCallback(
    async (tab, page, owner) => {
      setLoading(true);
      setAlbumOverrides({});
      try {
        let result;
        if (tab === "album") {
          result = await getUserToonsPaginated(profile.id, page, PER_PAGE, owner);
          setTotalPages(calculateTotalPages(result.total, PER_PAGE));
          setCommentCounts(result.commentCounts || {});
        } else if (tab === "favorites") {
          result = await getUserFavorites(profile.id, page, PER_PAGE);
          setTotalPages(1);
          setCommentCounts(result.commentCounts || {});
        } else {
          result = await getUserCommentedToons(profile.id, page, PER_PAGE);
          setTotalPages(1);
          setCommentCounts(result.commentCounts || {});
        }
        setToons(result.toons || []);
      } finally {
        setLoading(false);
      }
    },
    [profile.id]
  );

  useEffect(() => {
    if (authLoading) return;
    loadTab(currentTab, currentPage, isOwnProfile);
  }, [currentTab, currentPage, isOwnProfile, authLoading, loadTab]);

  function switchTab(tab) {
    setCurrentTab(tab);
    setCurrentPage(1);
  }

  async function handleAlbumToggle(toonId, isLegacy, nextValue) {
    setAlbumOverrides((prev) => ({ ...prev, [toonId]: nextValue }));
    const { apiFetch } = await import("@/lib/config");
    const result = await apiFetch(`/animations/${toonId}`, {
      method: "PATCH",
      body: JSON.stringify({ in_album: nextValue }),
    });
    if (!result) {
      setAlbumOverrides((prev) => ({ ...prev, [toonId]: !nextValue }));
    }
  }

  async function handleAvatarSelect(toonId, isLegacy = false) {
    setChooserOpen(false);
    setAvatarProcessing(true);
    setAvatarToonId(toonId);
    const { success, error } = await updateUserAvatar(username, toonId);
    if (!success) {
      alert("Error saving avatar: " + (error?.message || "Unknown error"));
      const fallback = user?.user_metadata?.avatar_toon || profile.avatar_toon || null;
      setAvatarToonId(fallback);
    }
    setAvatarProcessing(false);
  }

  function getInAlbum(toon) {
    if (toon.id in albumOverrides) return albumOverrides[toon.id];
    if (toon.is_draft) return false;
    return toon.in_album ?? true;
  }

  const emptyMessage = currentTab === "favorites"
    ? t('noFavorites')
    : currentTab === "comments"
    ? t('noCommented')
    : t('noToons');

  return (
    <div id="content_wrap">
      <div id="content">
        <div className="userprofile">

          {/* ── Sidebar ─────────────────────────────────────────────────────── */}
          <div className="content_right">
            <div className="center">
              <h3 id="profile_username_wrap">
                <UsernameLink username={username} />
              </h3>
              <div className="center">
                <UserAvatar
                  avatarToonId={avatarToonId}
                  size={100}
                  className={`p200 my-avatar${avatarProcessing ? " processing" : ""}`}
                  alt={`${username}'s avatar`}
                />
              </div>
              {isOwnProfile && (
                <div>
                  <a
                    href="#"
                    onClick={(e) => { e.preventDefault(); setChooserOpen(true); }}
                    style={{ fontSize: "9pt" }}
                  >
                    {t('changeAvatar')}
                  </a>
                </div>
              )}
            </div>

            <span>{t('totalToons')}</span>{" "}
            <span id="stat_toons">{stats.totalToons}</span>
            <br />

            {isOwnProfile && (
              <>
                <span>{t('totalDrafts')}</span>{" "}
                <span>{stats.draftCount}</span>
                <br />
              </>
            )}

            <span>{t('totalComments')}</span>{" "}
            <span>{stats.commentCount}</span>
            <br />
            <br />

            {showRank && (
              <>
                <span>{t('rank')}</span> <b>{rankLabel}</b>
                <br />
                <br />
              </>
            )}

            {user && !isOwnProfile && (
              <a
                href={`/messages?username=${encodeURIComponent(username)}`}
                style={{ fontSize: "10pt" }}
              >
                {t('privateMessages')}
              </a>
            )}
          </div>

          {/* ── Main content ─────────────────────────────────────────────────── */}
          <div className="content_left">
            <h1>
              <span style={{ fontWeight: "normal" }}>
                {TABS.map((tab, i) => (
                  <span key={tab.key}>
                    <a
                      href="#"
                      className={`nmenu${currentTab === tab.key ? " selected" : ""}`}
                      onClick={(e) => { e.preventDefault(); switchTab(tab.key); }}
                    >
                      {tab.label}
                    </a>
                    {i < TABS.length - 1 && " | "}
                  </span>
                ))}
              </span>
            </h1>

            <Paginator
              totalPages={totalPages}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
            />

            <div className="toons_container">
              <div className="toons_list">
                {loading ? (
                  <p style={{ color: "#888888", fontSize: "10pt", padding: "10px 0" }}>
                    {t('loading')}
                  </p>
                ) : toons.length === 0 ? (
                  <p style={{ color: "#888888", fontSize: "10pt", padding: "10px 0" }}>
                    {emptyMessage}
                  </p>
                ) : (
                  toons.map((toon) => (
                    <ToonCard
                      key={toon.id}
                      toon={toon}
                      commentCount={commentCounts[toon.id] || 0}
                      isOwnProfile={isOwnProfile}
                      currentUserId={user?.id || null}
                      inAlbum={getInAlbum(toon)}
                      onAlbumToggle={handleAlbumToggle}
                    />
                  ))
                )}
              </div>
            </div>

            <Paginator
              totalPages={totalPages}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
            />
          </div>
        </div>

        <div style={{ clear: "both" }} />
      </div>
      <div id="footer_placeholder" />

      {chooserOpen && (
        <AvatarChooser
          profileId={profile.id}
          onSelect={handleAvatarSelect}
          onClose={() => setChooserOpen(false)}
        />
      )}
    </div>
  );
}