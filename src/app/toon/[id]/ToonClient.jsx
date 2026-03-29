"use client";

import { useState, useEffect, useRef } from "react";
import { ungzip } from "pako";
import { useTranslations } from 'next-intl';
import UsernameLink from "@/components/UsernameLink";
import UserAvatar from "@/components/UserAvatar";
import ToonLinkPreview from "@/components/ToonLinkPreview";
import { extractMentions } from "@/lib/mentions";
import { apiFetch, API_URL, getToken } from "@/lib/config";
import { getCurrentUser } from "@/lib/api";

const STORAGE_URL = 'https://storage.m2inc.dev/retoon';

function ToonBanner() {
  return (
    <a href="/draw/" style={{ display: "block", marginBottom: 8 }}>
      <iframe src="/banner/banneren.html" width="350" height="350" scrolling="no" style={{ border: "none", display: "block", pointerEvents: "none" }} />
    </a>
  );
}

function isLegacyId(id) {
  return /^[a-zA-Z0-9]{3,16}$/.test(id) && !/^[0-9a-f]{8}-/.test(id);
}

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US") + " " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function resolveFrames(toon) {
  console.log("Test");
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
  try {
    const parsed = typeof toon.frames === 'string' ? JSON.parse(toon.frames) : toon.frames;
    return Array.isArray(parsed) ? parsed : Object.values(parsed);
  } catch {
    return [];
  }
}}

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
            (el.requestFullscreen?.() || el.webkitRequestFullscreen?.() || el.mozRequestFullScreen?.());
          } else {
            (document.exitFullscreen?.() || document.webkitExitFullscreen?.() || document.mozCancelFullScreen?.());
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
  }, [frames]);

  return <div ref={containerRef} style={{ lineHeight: 0 }} />;
}

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

function PlayerLoading() {
  return (
    <div style={{ width: 610, height: 350, background: "#fff", position: "relative", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #000", boxSizing: "border-box" }}>
      <style>{`@keyframes toon-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 36, height: 36, margin: "0 auto 10px", border: "3px solid #eee", borderTop: "3px solid #000", borderRadius: "50%", animation: "toon-spin 0.8s linear infinite" }} />
        <div style={{ fontFamily: "Arial", fontSize: "11pt", color: "#888" }}>Loading toon…</div>
      </div>
    </div>
  );
}

function CommentText({ text }) {
  if (!text) return null;
  const parts = text.split(/(@[a-zA-Z0-9_]{3,20})/g);
  const hasMention = parts.some(p => /^@[a-zA-Z0-9_]{3,20}$/.test(p));
  if (!hasMention) return <ToonLinkPreview text={text} />;
  return (
    <>
      {parts.map((part, i) => {
        const mention = part.match(/^@([a-zA-Z0-9_]{3,20})$/);
        if (mention) return <strong key={i}><UsernameLink username={mention[1]} /></strong>;
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

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
        <button onClick={() => onReply(username)} title={`Reply to ${username}`} style={{ background: "none", border: "none", padding: "0 3px", margin: "0 2px", cursor: "pointer", color: "#aaa", fontSize: "11pt", fontFamily: "Arial", lineHeight: 1, verticalAlign: "middle" }} aria-label={`Mention ${username}`}>@</button>
        <span className="date"><b>{dateStr}</b></span>
      </div>
      <div className="text"><CommentText text={comment.text} /></div>
    </div>
  );
}

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

  useEffect(() => {
    async function loadUser() {
      const token = getToken();
      if (!token) { setAuthLoading(false); return; }
      
      const user = await getCurrentUser();
      if (user) {
        setCurrentUser({ id: user.id, user_metadata: { username: user.username, avatar_toon: user.avatar_toon } });
        apiFetch(`/likes/${toonId}/check`).then(d => { if (d?.liked) setLiked(true); });
      }
      setAuthLoading(false);
    }
    
    loadUser();
  }, [toonId]);

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

    const framesReady = fetch(`${API_URL}/animations/${toonId}`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    }).then(r => r.ok ? r.json() : null).then(data => {
      if (cancelled || !data) return [];
      return resolveFrames(data);
    }).catch(() => []);

    Promise.all([scriptReady, framesReady]).then(([, resolvedFrames]) => {
      if (cancelled) return;
      setFrames(resolvedFrames);
      setPlayerReady(true);
    });

    return () => { cancelled = true; };
  }, [toonId, isLegacy]);

  const toonSettings = toon.settings || {};
  const previewUrl = isLegacy ? `${STORAGE_URL}/legacyAnimations/${toonId}_100.gif` : `${STORAGE_URL}/previews/${toonId}_100.gif`;
  const continueUrl = isLegacy ? `/draw/classic/?cont=${toonId}` : `/draw/?continue=${toonId}`;

  async function handleLike(e) {
    e.preventDefault();
    if (authLoading) return;
    if (!currentUser) { window.showAuth?.("login"); return; }

    if (liked) {
      await apiFetch(`/likes/${toonId}`, { method: 'DELETE' });
      setLiked(false);
      setLikeCount(c => Math.max(0, c - 1));
    } else {
      await apiFetch(`/likes/${toonId}`, { method: 'POST' });
      setLiked(true);
      setLikeCount(c => c + 1);
    }
  }

  async function handleAddComment(e) {
    e.preventDefault();
    if (authLoading) return;
    if (!currentUser) { window.showAuth?.("login"); return; }
    setShowCommentForm(true);
    setTimeout(() => commentTextareaRef.current?.focus(), 50);
  }

  function handleReply(username) {
    if (!currentUser) { window.showAuth?.("login"); return; }
    const prefix = `@${username}, `;
    setCommentText(prev => prev.startsWith(prefix) ? prev : prefix + prev);
    setShowCommentForm(true);
    setTimeout(() => {
      const ta = commentTextareaRef.current;
      if (ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }
    }, 50);
  }

  async function postComment(e) {
    e.preventDefault();
    const text = commentText.trim();
    if (!text) return;
    if (text.length > 250) { setCommentError(tp('commentTooLong')); return; }

    setPostingComment(true);
    setCommentError("");

    const data = await apiFetch(`/comments/${toonId}`, {
      method: 'POST',
      body: JSON.stringify({ comment: { text }, author_uuid: author.id , author_username: author.username }),
    });

    if (!data) {
      setCommentError(tp('commentError', { error: 'Failed to post comment' }));
      setPostingComment(false);
      return;
    }

    setComments(prev => [data, ...prev]);
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
          <div className="left_panel">
            <h2>{title}</h2>
            <div className="player" id="player_container">
              {isLegacy ? <LegacyPlayer toonId={toonId} /> : !playerReady ? <PlayerLoading /> : <ToonPlayer frames={frames} settings={toonSettings} />}
            </div>

            <div className="toon_comments" id="comments">
              <span className="header">
                <span style={{ float: "left" }}>{tp('comments')}</span>
                <a href="#" className="new" onClick={handleAddComment} style={authLoading ? { opacity: 0.5, cursor: "default" } : undefined}>{tp('addComment')}</a>
                <div style={{ clear: "both" }} />
              </span>

              {showCommentForm && (
                <div id="comments_form" style={{ display: "block", visibility: "visible", zIndex: 9999 }}>
                  <div className="form2">
                    <textarea ref={commentTextareaRef} id="comment_text" rows={3} placeholder={tp('writeComment')} maxLength={250} value={commentText} onChange={e => { setCommentText(e.target.value); setCommentError(""); }} style={{ border: "1px solid #cccccc", margin: "10px", width: "580px", fontFamily: "Arial", fontSize: "10pt" }} />
                    <div style={{ fontSize: "9pt", color: commentText.length > 240 ? "#c00" : "#888", marginLeft: "10px" }}>{commentText.length}/250</div>
                  </div>
                  {commentError && <div style={{ color: "red", fontSize: "9pt", margin: "0 10px 6px" }}>{commentError}</div>}
                  <div className="form2" style={{ textAlign: "right", marginRight: "10px", marginBottom: "10px" }}>
                    <button onClick={postComment} disabled={postingComment}>{postingComment ? tp('posting') : tp('post')}</button>
                    <button onClick={() => { setShowCommentForm(false); setCommentText(""); setCommentError(""); }}>{tp('cancel')}</button>
                  </div>
                </div>
              )}

              <div id="comments_list">
                {comments.length === 0
                  ? <p style={{ color: "#888888", fontSize: "10pt", padding: "10px" }}>{tp('noComments')}</p>
                  : comments.map(c => <Comment key={c.id} comment={c} onReply={handleReply} />)
                }
              </div>
            </div>
          </div>

          <div className="info">
            {!authLoading && !currentUser && <ToonBanner />}
            <div className="author">
              <UserAvatar username={author.username} size={100} className="avatar" />
              <div className="author_name"><UsernameLink username={author.username} /></div>
              <div className="date" id="toon_date">{formatDate(toon.created_at)}</div>
            </div>

            <div className="prizes" />
            <div className="buttons">
              {/* {currentUser && author.username !== currentUser.user_metadata?.username && (
                <div className="toonmedals">
                  <a href="#" className="hover" onClick={e => { e.preventDefault(); alert('Coming Soon'); }}>
                    <img src="/img/1.gif" className="img_toonmedal" /><span>{tp('medals')}</span>
                  </a>
                </div>
              )} */}
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
              {/* {currentUser && author.username === currentUser.user_metadata?.username && (
                <div className="sound">
                  <a href="#" className="hover" onClick={e => { e.preventDefault(); alert('Coming Soon'); }}>
                    <img src="/img/1.gif" className="img_microphone" /><span>{tp('sound')}</span>
                  </a>
                </div>
              )}
              {currentUser && author.username === currentUser.user_metadata?.username && (
                <div className="more">
                  <a href="#" className="hover" onClick={e => { e.preventDefault(); alert('More options coming soon!'); }}>
                    <img src="/img/1.gif" className="img_more" /><span>{tp('more')}</span>
                  </a>
                </div>
              )} */}
            </div>

            <div className="line_7"><img src="/img/1.gif" /></div>

            {description && (
              <div className="description" id="description_div">
                <span id="description_text"><CommentText text={description} /></span>
              </div>
            )}

            {tags.length > 0 && (
              <div className="tags" id="tags_container" style={{ margin: "5px 0" }}>
                {tags.map(tag => <a key={tag} href="#" className="tag">{tag}</a>)}
              </div>
            )}

            <div className="share">
              <ul className="share">
                <li>Share:</li>
                <li>
                  <a rel="nofollow" title="Twitter" href={`https://twitter.com/intent/tweet?url=https://toonator.site/toon/${toonId}&text=${encodeURIComponent(title)}`} target="_blank">
                    <div className="shr_tw" />
                  </a>
                </li>
                <li>
                  <a rel="nofollow" title="Reddit" href={`https://reddit.com/submit?url=https://toonator.site/toon/${toonId}&title=${encodeURIComponent(title)}`} target="_blank">
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
                        src={continuedFrom.legacy ? `${STORAGE_URL}/legacyAnimations/${continuedFrom.id}_100.gif` : `${STORAGE_URL}/previews/${continuedFrom.id}_100.gif`}
                        onError={e => { e.target.src = "/img/avatar100.gif"; }}
                      />
                      <div className="name">{continuedFrom.title}</div>
                    </a>
                    <div className="cauthor"><UsernameLink username={continuedFrom.author} /></div>
                  </li>
                </ul>
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