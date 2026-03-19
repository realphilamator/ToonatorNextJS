"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import { ungzip } from "pako";
import { useTranslations } from 'next-intl';
import UsernameLink from "@/components/UsernameLink";
import UserAvatar from "@/components/UserAvatar";
import ToonLinkPreview from "@/components/ToonLinkPreview";
import { extractMentions } from "@/lib/mentions";

// ─── Toonator Banner (shown in sidebar when logged out) ───────────────────────
function ToonBanner() {
  return (
    <a href="/draw/" style={{ display: "block", marginBottom: 8 }}>
      <iframe
        src="/banner/banneren.html"
        width="350"
        height="350"
        scrolling="no"
        style={{ border: "none", display: "block", pointerEvents: "none" }}
      />
    </a>
  );
}

const SUPABASE_URL = "https://ytyhhmwnnlkhhpvsurlm.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0eWhobXdubmxraGhwdnN1cmxtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NzcwNTAsImV4cCI6MjA4ODU1MzA1MH0.XZVH3j6xftSRULfhdttdq6JGIUSgHHJt9i-vXnALjH0";

const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function isLegacyId(id) {
  return /^[a-zA-Z0-9]{3,16}$/.test(id);
}

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US") + " " +
    d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function escapeHTML(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

// ─── Decompress frames from base64-gzip (new format) or fall back to raw ─────
function resolveFrames(toon) {
  if (toon.frames_compressed) {
    try {
      const binary = atob(toon.frames_compressed);
      const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
      const json = ungzip(bytes, { to: "string" });
      return JSON.parse(json);
    } catch (err) {
      console.error("[ToonClient] Failed to decompress frames_compressed:", err);
      return [];
    }
  }
  if (toon.frames) {
    return Array.isArray(toon.frames) ? toon.frames : Object.values(toon.frames);
  }
  return [];
}

// ─── Toon Player (modern HTML5 — delegates to /js/toon-player.js) ────────────
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

      const playerSettings = {
        ...(settings || {}),
        canFullscreen: true,
        onFullscreen: (goFullscreen) => {
          const el = document.getElementById(id);
          if (!el) return;
          if (goFullscreen) {
            (el.requestFullscreen?.() ||
             el.webkitRequestFullscreen?.() ||
             el.mozRequestFullScreen?.());
          } else {
            (document.exitFullscreen?.() ||
             document.webkitExitFullscreen?.() ||
             document.mozCancelFullScreen?.());
          }
        },
      };

      playerRef.current?.destroy?.();
      playerRef.current = window.initToonPlayer(id, frames, playerSettings);
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

// ─── Legacy Ruffle Player ────────────────────────────────────────────────────
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
        autoplay: 'on',
        unmuteOverlay: 'hidden',
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

// ─── Player Loading Placeholder ───────────────────────────────────────────────
function PlayerLoading() {
  return (
    <div style={{
      width: 610, height: 350, background: "#fff", position: "relative",
      display: "flex", alignItems: "center", justifyContent: "center",
      border: "2px solid #000", boxSizing: "border-box",
    }}>
      <style>{`
        @keyframes toon-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      <div style={{ textAlign: "center" }}>
        <div style={{
          width: 36, height: 36, margin: "0 auto 10px",
          border: "3px solid #eee", borderTop: "3px solid #000",
          borderRadius: "50%", animation: "toon-spin 0.8s linear infinite",
        }} />
        <div style={{ fontFamily: "Arial", fontSize: "11pt", color: "#888" }}>
          Loading toon…
        </div>
      </div>
    </div>
  );
}

// ─── Render @mention tokens as UsernameLink components ───────────────────────
// Splits text on @username patterns and returns an inline React fragment.
// Non-mention parts are plain inline <span>s to avoid block-level line breaks
// that would occur if ToonLinkPreview wraps content in a div/p element.
// ToonLinkPreview is still used as a fallback when there are no mentions,
// preserving toon-link detection for plain comments.
function CommentText({ text }) {
  if (!text) return null;
  const parts = text.split(/(@[a-zA-Z0-9_]{3,20})/g);
  // If there are no mentions, fall back to ToonLinkPreview normally
  const hasMention = parts.some(p => /^@[a-zA-Z0-9_]{3,20}$/.test(p));
  if (!hasMention) return <ToonLinkPreview text={text} />;
  return (
    <>
      {parts.map((part, i) => {
        const mention = part.match(/^@([a-zA-Z0-9_]{3,20})$/);
        if (mention) {
          // Bold inline UsernameLink — no block wrapper
          return <strong key={i}><UsernameLink username={mention[1]} /></strong>;
        }
        // Plain text segment — must stay inline, no block wrappers
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

// ─── Comment ─────────────────────────────────────────────────────────────────
function Comment({ comment, onReply }) {
  const username = comment.author_username || "anonymous";
  const dateStr = formatDate(comment.created_at);
  return (
    <div className="comment">
      <div className="avatar">
        <a href={`/user/${encodeURIComponent(username)}`}>
          <UserAvatar username={username} size={100} className="avatar" />
        </a>
      </div>
      <div className="head">
        <UsernameLink username={username} />
        {/* ── @ reply button ── */}
        <button
          onClick={() => onReply(username)}
          title={`Reply to ${username}`}
          style={{
            background: "none",
            border: "none",
            padding: "0 3px",
            margin: "0 2px",
            cursor: "pointer",
            color: "#aaa",
            fontSize: "11pt",
            fontFamily: "Arial",
            lineHeight: 1,
            verticalAlign: "middle",
          }}
          aria-label={`Mention ${username}`}
        >
          @
        </button>
        <span className="date"><b>{dateStr}</b></span>
      </div>
      <div className="text">
        <CommentText text={comment.text} />
      </div>
    </div>
  );
}

// ─── Resolve @mentions → user_ids and fire notifications (client-side) ───────
async function fireMentionNotifications({ fromUsername, selfUserId, text, type, toonId, commentId }) {
  const usernames = extractMentions(text);
  if (!usernames.length) return;

  const typeLabel = {
    mention_comment:          "mentioned you in a comment",
    mention_toon_title:       "mentioned you in a toon title",
    mention_toon_description: "mentioned you in a toon description",
  }[type] ?? "mentioned you";

  // Resolve each username → user_id via profiles table
  const rows = [];
  await Promise.all(
    usernames.map(async (username) => {
      // Try get_user_by_username RPC first, fall back to profiles table
      let userId = null;
      try {
        const { data } = await db.rpc("get_user_by_username", { p_username: username });
        if (data && data.length > 0) userId = data[0].id;
      } catch (_) {}
      if (!userId) {
        const { data: profile } = await db
          .from("profiles")
          .select("id")
          .eq("username", username)
          .maybeSingle();
        userId = profile?.id ?? null;
      }
      if (userId && userId !== selfUserId) {
        rows.push({
          user_id:       userId,
          from_username: fromUsername,
          type,
          amount:        0,
          reason:        type,
          toon_id:       toonId ?? null,
          comment_id:    commentId ?? null,
          message:       `${fromUsername} ${typeLabel}.`,
          is_read:       false,
        });
      }
    })
  );

  if (rows.length) {
    await db.from("notifications").insert(rows);
  }
}

// ─── Main Client Component ────────────────────────────────────────────────────
export default function ToonClient({ toonId, toon, author, continuedFrom, initialComments, initialLikeCount, isLegacy }) {
  const tp = useTranslations('toonPage');
  const tg = useTranslations('toon');
  const [comments, setComments] = useState(initialComments);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [liked, setLiked] = useState(false);
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentError, setCommentError] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [frames, setFrames] = useState([]);
  const [playerReady, setPlayerReady] = useState(isLegacy);

  const commentTextareaRef = useRef(null);

  // Fetch frames from Supabase AND preload toon-player.js in parallel.
  useEffect(() => {
    if (isLegacy) return;
    let cancelled = false;

    const scriptReady = new Promise((resolve) => {
      if (window.initToonPlayer) { resolve(); return; }
      const existing = document.querySelector('script[src="/js/toon-player.js"]');
      if (existing) {
        existing.addEventListener("load", resolve, { once: true });
        if (window.initToonPlayer) resolve();
      } else {
        const script = document.createElement("script");
        script.src = "/js/toon-player.js";
        script.onload = resolve;
        document.head.appendChild(script);
      }
    });

    const framesReady = db.from("animations")
      .select("frames,frames_compressed")
      .eq("id", toonId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled || !data) return [];
        return resolveFrames(data);
      })
      .catch((err) => {
        console.error("[ToonClient] Failed to fetch frames:", err);
        return [];
      });

    Promise.all([scriptReady, framesReady]).then(([, resolvedFrames]) => {
      if (cancelled) return;
      setFrames(resolvedFrames);
      setPlayerReady(true);
    });

    return () => { cancelled = true; };
  }, [toonId, isLegacy]);

  const toonSettings = toon.settings || {};

  const previewUrl = isLegacy
    ? `${SUPABASE_URL}/storage/v1/object/public/legacyAnimations/${toonId}_100.gif`
    : `${SUPABASE_URL}/storage/v1/object/public/previews/${toonId}_100.gif`;

  const continueUrl = isLegacy ? `/draw/classic/?cont=${toonId}` : `/draw/?continue=${toonId}`;

  useEffect(() => {
    db.auth.getUser().then(({ data: { user } }) => {
      setCurrentUser(user);
      setAuthLoading(false);
      if (user) {
        const col = isLegacy ? "legacy_animation_id" : "animation_id";
        db.from("likes").select("id").eq(col, toonId).eq("user_id", user.id).maybeSingle()
          .then(({ data }) => { if (data) setLiked(true); });
      }
    });
  }, [toonId, isLegacy]);

  async function handleLike(e) {
    e.preventDefault();
    if (authLoading) return;
    if (!currentUser) { window.showAuth?.("login"); return; }

    const col = isLegacy ? "legacy_animation_id" : "animation_id";
    const table = isLegacy ? "legacy_animations" : "animations";

    if (liked) {
      await db.from("likes").delete().eq(col, toonId).eq("user_id", currentUser.id);
      const { data: t } = await db.from(table).select("likes").eq("id", toonId).single();
      await db.from(table).update({ likes: Math.max(0, (t?.likes || 0) - 1) }).eq("id", toonId);
      setLiked(false);
      setLikeCount(c => Math.max(0, c - 1));
    } else {
      const { error } = await db.from("likes").insert(
        { [col]: toonId, user_id: currentUser.id }
      );
      if (error && error.code !== '23505') {
        console.error("Like error:", error);
        return;
      }
      const { data: t } = await db.from(table).select("likes").eq("id", toonId).single();
      await db.from(table).update({ likes: (t?.likes || 0) + 1 }).eq("id", toonId);
      setLiked(true);
      setLikeCount(c => c + 1);
    }
  }

  async function handleAddComment(e) {
    e.preventDefault();
    if (authLoading) return;
    if (!currentUser) { window.showAuth?.("login"); return; }
    setShowCommentForm(true);
    // Focus textarea after it appears
    setTimeout(() => commentTextareaRef.current?.focus(), 50);
  }

  // ── Called when user clicks @ next to someone's username ──
  function handleReply(username) {
    if (!currentUser) { window.showAuth?.("login"); return; }
    const prefix = `@${username}, `;
    setCommentText(prev => {
      // If already starts with this mention, don't duplicate
      if (prev.startsWith(prefix)) return prev;
      return prefix + prev;
    });
    setShowCommentForm(true);
    setTimeout(() => {
      const ta = commentTextareaRef.current;
      if (ta) {
        ta.focus();
        // Move cursor to end
        ta.setSelectionRange(ta.value.length, ta.value.length);
      }
    }, 50);
  }

  async function postComment(e) {
    e.preventDefault();
    const text = commentText.trim();
    if (!text) return;
    if (text.length > 250) {
      setCommentError(tp('commentTooLong'));
      return;
    }

    setPostingComment(true);
    setCommentError("");

    const username = currentUser.user_metadata?.username || currentUser.email;
    const col = isLegacy ? "legacy_animation_id" : "animation_id";

    const { data, error } = await db.from("comments").insert({
      [col]: toonId,
      user_id: currentUser.id,
      author_username: username,
      text,
    }).select().single();

    if (error) {
      setCommentError(tp('commentError', { error: error.message }));
      setPostingComment(false);
      return;
    }

    // ── Fire mention notifications (non-blocking) ──
    fireMentionNotifications({
      fromUsername: username,
      selfUserId:   currentUser.id,
      text,
      type:         "mention_comment",
      toonId,
      commentId:    data.id,
    }).catch(err => console.warn("[mentions] notification error:", err));

    setComments(prev => [{ ...data }, ...prev]);
    setCommentText("");
    setShowCommentForm(false);
    setPostingComment(false);
  }

  const title = toon.title || tg('untitled');
  const description = toon.description || "";
  const keywords = toon.keywords || "";
  const tags = keywords.split(",").map(k => k.trim()).filter(Boolean);

  return (
    <div id="content_wrap">
      <div id="content">
        <div id="toon_page">

          {/* LEFT PANEL */}
          <div className="left_panel">
            <h2>{title}</h2>
            <div className="player" id="player_container">
              {isLegacy
                ? <LegacyPlayer toonId={toonId} />
                : !playerReady
                  ? <PlayerLoading />
                  : <ToonPlayer frames={frames} settings={toonSettings} />
              }
            </div>

            {/* Comments */}
            <div className="toon_comments" id="comments">
              <span className="header">
                <span style={{ float: "left" }}>{tp('comments')}</span>
                <a
                  href="#"
                  className="new"
                  onClick={handleAddComment}
                  style={authLoading ? { opacity: 0.5, cursor: "default" } : undefined}
                >
                  {tp('addComment')}
                </a>
                <div style={{ clear: "both" }} />
              </span>

              {showCommentForm && (
                <div id="comments_form" style={{ display: "block", visibility: "visible", zIndex: 9999 }}>
                  <div className="form2">
                    <textarea
                      ref={commentTextareaRef}
                      id="comment_text"
                      rows={3}
                      placeholder={tp('writeComment')}
                      maxLength={250}
                      value={commentText}
                      onChange={e => {
                        setCommentText(e.target.value);
                        setCommentError("");
                      }}
                      style={{ border: "1px solid #cccccc", margin: "10px", width: "580px", fontFamily: "Arial", fontSize: "10pt" }}
                    />
                    <div style={{ fontSize: "9pt", color: commentText.length > 240 ? "#c00" : "#888", marginLeft: "10px" }}>
                      {commentText.length}/250
                    </div>
                  </div>
                  {commentError && (
                    <div style={{ color: "red", fontSize: "9pt", margin: "0 10px 6px" }}>{commentError}</div>
                  )}
                  <div className="form2" style={{ textAlign: "right", marginRight: "10px", marginBottom: "10px" }}>
                    <button onClick={postComment} disabled={postingComment}>
                      {postingComment ? tp('posting') : tp('post')}
                    </button>
                    <button onClick={() => { setShowCommentForm(false); setCommentText(""); setCommentError(""); }}>
                      {tp('cancel')}
                    </button>
                  </div>
                </div>
              )}

              <div id="comments_list">
                {comments.length === 0
                  ? <p style={{ color: "#888888", fontSize: "10pt", padding: "10px" }}>{tp('noComments')}</p>
                  : comments.map(c => (
                      <Comment
                        key={c.id}
                        comment={c}
                        onReply={handleReply}
                      />
                    ))
                }
              </div>
            </div>
          </div>
          {/* END LEFT PANEL */}

          {/* RIGHT PANEL */}
          <div className="info">
            {!authLoading && !currentUser && <ToonBanner />}
            <div className="author">
              <UserAvatar
                username={author.username}
                size={100}
                className="avatar"
              />
              <div className="author_name">
                <UsernameLink username={author.username} />
              </div>
              <div className="date" id="toon_date">{formatDate(toon.created_at)}</div>
            </div>

            <div className="prizes" />
            <div className="buttons">
              {currentUser && author.username !== (currentUser.user_metadata?.username || currentUser.email) && (
                <div className="toonmedals">
                  <a href="#" className="hover" onClick={e => { e.preventDefault(); alert('Coming Soon'); }}>
                    <img src="/img/1.gif" className="img_toonmedal" /><span>{tp('medals')}</span>
                  </a>
                </div>
              )}
              <div className="like hover">
                <a href="#" onClick={handleLike} className={`hover${liked ? " active" : ""}`} id="like_link">
                  <img src="/img/1.gif" className="img_like" />
                  <span className="black" id="like_value">{likeCount}</span>{" "}
                  <span>{tp('like')}</span>
                </a>
              </div>
              <div className="favorites">
                <a href="#" className="hover" id="favlink" onClick={e => { e.preventDefault(); alert(tp('favoritesSoon')); }}>
                  <img src="/img/1.gif" className="img_favorites" /><span>{tp('favorites')}</span>
                </a>
              </div>
              <div className="draw">
                <a href={continueUrl} className="hover">
                  <img src="/img/1.gif" className="img_pencil" /><span>{tp('continue')}</span>
                </a>
              </div>

              {currentUser && author.username === (currentUser.user_metadata?.username || currentUser.email) && (
                <div className="sound">
                  <a href="#" className="hover" onClick={e => { e.preventDefault(); alert('Coming Soon'); }}>
                    <img src="/img/1.gif" className="img_microphone" /><span>{tp('sound')}</span>
                  </a>
                </div>
              )}

              {currentUser && author.username === (currentUser.user_metadata?.username || currentUser.email) && (
                <div className="more">
                  <a href="#" className="hover" onClick={e => { e.preventDefault(); alert('More options coming soon!'); }}>
                    <img src="/img/1.gif" className="img_more" /><span>{tp('more')}</span>
                  </a>
                </div>
              )}
            </div>

            <div className="line_7"><img src="/img/1.gif" /></div>

            {description && (
              <div className="description" id="description_div">
                {/* Render @mentions in description as clickable links */}
                <span id="description_text">
                  <CommentText text={description} />
                </span>
              </div>
            )}

            {tags.length > 0 && (
              <div className="tags" id="tags_container" style={{ margin: "5px 0" }}>
                {tags.map(tag => (
                  <a key={tag} href="#" className="tag">{tag}</a>
                ))}
              </div>
            )}

            <div className="share">
              <ul className="share">
                <li>Share:</li>
                <li>
                  <a rel="nofollow" title="Twitter"
                    href={`https://twitter.com/intent/tweet?url=https://toonator.site/toon/${toonId}&text=${encodeURIComponent(title)}`}
                    target="_blank">
                    <div className="shr_tw" />
                  </a>
                </li>
                <li>
                  <a rel="nofollow" title="Reddit"
                    href={`https://reddit.com/submit?url=https://toonator.site/toon/${toonId}&title=${encodeURIComponent(title)}`}
                    target="_blank">
                    <div className="shr_reddit" />
                  </a>
                </li>
              </ul>
            </div>

            {continuedFrom && (
              <div className="tcontinues" id="continued_from">
                <h4>Original</h4>
                <div className="line_1"><img src="/img/1.gif" /></div>
                <ul className="continues_list">
                  <li>
                    <a href={`/toon/${continuedFrom.id}`}>
                      <img className="p100"
                        src={continuedFrom.legacy
                          ? `${SUPABASE_URL}/storage/v1/object/public/legacyAnimations/${continuedFrom.id}_100.gif`
                          : `${SUPABASE_URL}/storage/v1/object/public/previews/${continuedFrom.id}_100.gif`
                        }
                        onError={e => { e.target.src = "/img/avatar100.gif"; }}
                      />
                      <div className="name">{continuedFrom.title}</div>
                    </a>
                    <div className="cauthor">
                      <UsernameLink username={continuedFrom.author} />
                    </div>
                  </li>
                </ul>
              </div>
            )}
          </div>
          {/* END RIGHT PANEL */}

          <div style={{ clear: "both" }} />
        </div>
      </div>
      <div id="footer_placeholder" />
    </div>
  );
}