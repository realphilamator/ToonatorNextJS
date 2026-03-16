"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import { ungzip } from "pako";
import { useTranslations } from 'next-intl';
import UsernameLink from "@/components/UsernameLink";
import UserAvatar from "@/components/UserAvatar";

const SUPABASE_URL = "https://ytyhhmwnnlkhhpvsurlm.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0eWhobXdubmxraGhwdnN1cmxtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NzcwNTAsImV4cCI6MjA4ODU1MzA1MH0.XZVH3j6xftSRULfhdttdq6JGIUSgHHJt9i-vXnALjH0";

const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return (
    d.toLocaleDateString("en-US") +
    " " +
    d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
  );
}

// ─── Decompress frames ────────────────────────────────────────────────────────
function resolveFrames(toon) {
  if (toon.frames_compressed) {
    try {
      const binary = atob(toon.frames_compressed);
      const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
      const json = ungzip(bytes, { to: "string" });
      return JSON.parse(json);
    } catch (err) {
      console.error("[DraftClient] Failed to decompress frames_compressed:", err);
      return [];
    }
  }
  if (toon.frames) {
    return Array.isArray(toon.frames) ? toon.frames : Object.values(toon.frames);
  }
  return [];
}

// ─── Toon Player ──────────────────────────────────────────────────────────────
function ToonPlayer({ frames, settings }) {
  const containerRef = useRef(null);
  const playerRef = useRef(null);

  useEffect(() => {
    if (!frames || frames.length === 0) return;

    function mountPlayer() {
      if (!window.initToonPlayer) { setTimeout(mountPlayer, 50); return; }
      if (!containerRef.current) return;

      const id = "toon-player-" + Math.random().toString(36).slice(2);
      containerRef.current.id = id;

      playerRef.current?.destroy?.();
      playerRef.current = window.initToonPlayer(id, frames, settings || {});
    }

    if (window.initToonPlayer) {
      mountPlayer();
    } else {
      if (!document.querySelector('script[src="/js/toon-player.js"]')) {
        const script = document.createElement("script");
        script.src = "/js/toon-player.js";
        script.onload = mountPlayer;
        document.head.appendChild(script);
      } else {
        mountPlayer();
      }
    }

    return () => {
      playerRef.current?.destroy?.();
      playerRef.current = null;
    };
  }, [frames, settings]);

  return <div ref={containerRef} style={{ lineHeight: 0 }} />;
}

// ─── Legacy Ruffle Player ─────────────────────────────────────────────────────
function LegacyPlayer({ toonId }) {
  const containerRef = useRef(null);

  useEffect(() => {
    function initRuffle() {
      if (!window.RufflePlayer) { setTimeout(initRuffle, 100); return; }
      const ruffle = window.RufflePlayer.newest();
      const player = ruffle.createPlayer();
      player.style.width = "610px";
      player.style.height = "350px";
      containerRef.current.innerHTML = "";
      containerRef.current.appendChild(player);
      player.load({
        url: "/swf/player28en.swf",
        parameters: { toonId },
        allowScriptAccess: false,
        backgroundColor: "#FFFFFF",
        autoplay: "on",
        unmuteOverlay: "hidden",
        volume: 1,
      });
    }

    const script = document.createElement("script");
    script.src = "/js/ruffle/ruffle.js";
    script.onload = initRuffle;
    document.head.appendChild(script);

    return () => {
      script.remove();
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
  }, [toonId]);

  return <div ref={containerRef} style={{ width: "610px", height: "350px" }} />;
}

// ─── Main Draft Client Component ──────────────────────────────────────────────
export default function DraftClient({ toonId, toon, author, continuedFrom, isLegacy }) {
  const t = useTranslations('draft');
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const frames = resolveFrames(toon);
  const toonSettings = toon.settings || {};
  const continueUrl = isLegacy
    ? `/draw/classic/?cont=${toonId}`
    : `/draw/?continue=${toonId}`;

  useEffect(() => {
    db.auth.getUser().then(({ data: { user } }) => {
      setCurrentUser(user);
      setAuthLoading(false);
    });
  }, []);

  const isOwner =
    !authLoading &&
    currentUser &&
    (currentUser.id === toon.user_id ||
      currentUser.user_metadata?.username === author.username);

  const title = toon.title || t('untitled');
  const description = toon.description || "";
  const keywords = toon.keywords || "";
  const tags = keywords.split(",").map((k) => k.trim()).filter(Boolean);

  return (
    <div id="content_wrap">
      <div id="content">
        <div id="toon_page">

          {/* LEFT PANEL — player + title */}
          <div className="left_panel">
            <h2>{title}</h2>
            <div className="player" id="player_container">
              {isLegacy
                ? <LegacyPlayer toonId={toonId} />
                : <ToonPlayer frames={frames} settings={toonSettings} />}
            </div>
          </div>

          {/* RIGHT PANEL — author info + draft badge + owner actions */}
          <div className="info">
            <div className="author">
              <UserAvatar
                username={author.username}
                size={100}
                className="avatar"
              />
              <div className="author_name">
                <UsernameLink username={author.username} />
              </div>
              <div className="date" id="toon_date">
                {formatDate(toon.created_at)}
              </div>
            </div>

            {/* Draft badge */}
            <div className="prizes">
              <div className="prize draft">{t('badge')}</div>
            </div>

            {/* Continued from */}
            {continuedFrom && (
              <div className="continued_from" style={{ margin: "5px 0", fontSize: 13 }}>
                {t('continuedFrom')}{" "}
                <a href={`/toon/${continuedFrom.id}`}>
                  {continuedFrom.title}
                </a>{" "}
                by <UsernameLink username={continuedFrom.author} />
              </div>
            )}

            {/* Owner-only actions */}
            {isOwner && (
              <div className="buttons">
                <div className="draw">
                  <a href={continueUrl} className="hover">
                    <img src="/img/1.gif" className="img_pencil" />
                    <span>{t('continueButton')}</span>
                  </a>
                </div>
                <div className="remove">
                  <a
                    href="#"
                    className="hover"
                    onClick={(e) => {
                      e.preventDefault();
                      if (confirm(t('confirmRemove'))) {
                        const table = isLegacy
                          ? "legacy_animations"
                          : "animations";
                        db.from(table)
                          .delete()
                          .eq("id", toonId)
                          .then(() => { window.location.href = "/"; });
                      }
                    }}
                  >
                    <span>{t('removeDraft')}</span>
                  </a>
                </div>
              </div>
            )}

            <div className="line_7">
              <img src="/img/1.gif" />
            </div>

            {description && (
              <div className="description" id="description_div">
                <span id="description_text">{description}</span>
              </div>
            )}

            {tags.length > 0 && (
              <div
                className="tags"
                id="tags_container"
                style={{ margin: "5px 0" }}
              >
                {tags.map((tag) => (
                  <a key={tag} href="#" className="tag">
                    {tag}
                  </a>
                ))}
              </div>
            )}
          </div>

          <div style={{ clear: "both" }} />
        </div>
      </div>
      <div id="footer_placeholder" />
    </div>
  );
}