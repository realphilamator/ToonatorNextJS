"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const SUPABASE_FUNCTIONS_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`;

function escapeHTML(str) {
  return String(str || "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function useStatus() {
  const [status, setStatus] = useState({ msg: "", ok: true });
  const show = useCallback((msg, ok = true) => {
    setStatus({ msg, ok });
    setTimeout(() => setStatus({ msg: "", ok: true }), 5000);
  }, []);
  return [status, show];
}

function StatsBar() {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    Promise.all([
      db.from("animations").select("id", { count: "exact", head: true }),
      db.from("profiles").select("id", { count: "exact", head: true }),
      db.from("comments").select("id", { count: "exact", head: true }),
      db.from("likes").select("id", { count: "exact", head: true }),
    ]).then(([anims, users, comments, likes]) => {
      setStats({ anims: anims.count, users: users.count, comments: comments.count, likes: likes.count });
    });
  }, []);
  if (!stats) return null;
  return (
    <div style={{ marginBottom: 12 }}>
      {[["🎞", stats.anims, "toons"], ["👤", stats.users, "users"], ["💬", stats.comments, "comments"], ["♥", stats.likes, "likes"]].map(([icon, count, label]) => (
        <span key={label} className="stat-pill">{icon} {count ?? "?"} {label}</span>
      ))}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="mp-section">
      <h2>{title}</h2>
      {children}
    </div>
  );
}

function SearchUser({ currentUserRole, showStatus }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [pending, setPending] = useState({});
  const [toons, setToons] = useState(null);
  const [toonsTitle, setToonsTitle] = useState("");
  const [comments, setComments] = useState(null);
  const [commentsTitle, setCommentsTitle] = useState("");

  async function search() {
    if (!query.trim()) return;
    const { data } = await db
      .from("profiles")
      .select("id,username,role,rank,status")
      .ilike("username", `%${query.trim()}%`)
      .limit(10);
    setResults(data || []);
    const init = {};
    (data || []).forEach(u => { init[u.id] = { role: u.role || "user", rank: u.rank || "archeologist", status: u.status || "ordinary" }; });
    setPending(init);
  }

  function setPendingField(userId, field, value) {
    setPending(p => ({ ...p, [userId]: { ...p[userId], [field]: value } }));
  }

  async function applyChanges(user) {
    const changes = pending[user.id];
    if (!changes) return;

    const updates = {};
    if (changes.role !== user.role) {
      if (currentUserRole !== "admin") { showStatus("Only admins can change roles.", false); return; }
      updates.role = changes.role;
    }
    if (changes.rank !== user.rank) {
      updates.rank = changes.rank;
    }
    if (changes.status !== user.status) {
      if (currentUserRole !== "admin") { showStatus("Only admins can change status.", false); return; }
      updates.status = changes.status;
    }
    if (Object.keys(updates).length === 0) { showStatus("No changes to apply."); return; }

    const { data, error } = await db
      .from("profiles")
      .update(updates)
      .eq("id", user.id)
      .select("username,role,rank,status");

    if (error || !data || data.length === 0) { showStatus("Update failed: " + (error?.message || "unknown"), false); return; }

    setResults(r => r.map(u => u.id === user.id ? { ...u, ...data[0] } : u));
    const parts = [];
    if (updates.role) parts.push(`role → ${updates.role}`);
    if (updates.rank) parts.push(`rank → ${updates.rank}`);
    if (updates.status) parts.push(`status → ${updates.status}`);
    showStatus(`${data[0].username}: ${parts.join(", ")}`);
  }

  async function loadUserToons(userId, username) {
    setToonsTitle(`${username}'s toons`);
    setToons("loading");
    const { data, error } = await db.from("animations").select("id,title,created_at,is_draft,likes").eq("user_id", userId).order("created_at", { ascending: false }).limit(50);
    if (error) { setToons([]); showStatus(error.message, false); return; }
    setToons(data || []);
  }

  async function loadUserComments(userId, username) {
    setCommentsTitle(`${username}'s comments`);
    setComments("loading");
    const { data, error } = await db.from("comments").select("id,text,created_at,animation_id").eq("user_id", userId).order("created_at", { ascending: false }).limit(50);
    if (error) { setComments([]); showStatus(error.message, false); return; }
    setComments(data || []);
  }

  async function banUser(userId, username) {
    if (currentUserRole !== "admin") { showStatus("Only admins can ban users.", false); return; }
    if (!confirm(`Ban ${username} and delete ALL their toons and comments? This cannot be undone.`)) return;
    showStatus("Banning...");
    const { data: anims } = await db.from("animations").select("id").eq("user_id", userId);
    const animIds = (anims || []).map(a => a.id);
    if (animIds.length > 0) {
      await db.from("comments").delete().in("animation_id", animIds);
      await db.from("likes").delete().in("animation_id", animIds);
      await db.from("animations").delete().eq("user_id", userId);
    }
    await db.from("comments").delete().eq("user_id", userId);
    await db.from("likes").delete().eq("user_id", userId);
    showStatus(`${username} banned and all content deleted.`);
    setResults(null);
  }

  return (
    <Section title="🔍 Search User">
      <div className="mp-row">
        <input type="text" placeholder="Username..." value={query} onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === "Enter" && search()} style={{ width: 200 }} />
        <button onClick={search}>Search</button>
      </div>

      {results !== null && (
        results.length === 0
          ? <div className="mp-empty">No users found.</div>
          : results.map(u => (
            <div key={u.id} className="mp-user-row">
              <span className={`username ${u.role}`} style={{ minWidth: 100 }}>{u.username}</span>

              {/* Role dropdown — admin only */}
              <select
                value={pending[u.id]?.role ?? u.role ?? "user"}
                onChange={e => setPendingField(u.id, "role", e.target.value)}
                disabled={currentUserRole !== "admin"}
                title="Role"
              >
                <option value="user">user</option>
                <option value="mod">mod</option>
                <option value="admin">admin</option>
              </select>

              <select
                value={pending[u.id]?.rank ?? u.rank ?? "archeologist"}
                onChange={e => setPendingField(u.id, "rank", e.target.value)}
                title="Rank"
              >
                <option value="unknown_animal">unknown_animal</option>
                <option value="archeologist">archeologist</option>
                <option value="passer">passer</option>
                <option value="animator">animator</option>
                <option value="artist">artist</option>
              </select>

              <select
                value={pending[u.id]?.status ?? u.status ?? "ordinary"}
                onChange={e => setPendingField(u.id, "status", e.target.value)}
                disabled={currentUserRole !== "admin"}
                title="Status"
              >
                <option value="ordinary">ordinary</option>
                <option value="cowboy">cowboy</option>
                <option value="monarch">monarch</option>
              </select>

              <button onClick={() => applyChanges(u)}>Apply</button>

              <span className="mp-actions">
                <button onClick={() => loadUserToons(u.id, u.username)}>Toons</button>
                <button onClick={() => loadUserComments(u.id, u.username)}>Comments</button>
                {currentUserRole === "admin" && (
                  <button className="btn-danger" onClick={() => banUser(u.id, u.username)}>Ban</button>
                )}
              </span>
            </div>
          ))
      )}

      {toons !== null && (
        <div className="mp-section" style={{ marginTop: 10 }}>
          <h2>🎞 {toonsTitle}</h2>
          <ToonList toons={toons} showStatus={showStatus} />
        </div>
      )}

      {comments !== null && (
        <div className="mp-section" style={{ marginTop: 10 }}>
          <h2>💬 {commentsTitle}</h2>
          <CommentList comments={comments} setComments={setComments} showStatus={showStatus} />
        </div>
      )}
    </Section>
  );
}

/* ── Toon List ── */
function ToonList({ toons, showStatus }) {
  const [list, setList] = useState(null);
  useEffect(() => { setList(toons === "loading" ? null : toons); }, [toons]);

  async function deleteToon(toonId) {
    if (!confirm(`Delete toon ${toonId}? This cannot be undone.`)) return;
    await db.from("comments").delete().eq("animation_id", toonId);
    await db.from("likes").delete().eq("animation_id", toonId);
    const { error } = await db.from("animations").delete().eq("id", toonId);
    if (error) { showStatus(error.message, false); return; }
    setList(l => l.filter(t => t.id !== toonId));
    showStatus("Toon deleted.");
  }

  async function resetLikes(toonId) {
    if (!confirm("Reset all likes on this toon?")) return;
    await db.from("likes").delete().eq("animation_id", toonId);
    const { error } = await db.from("animations").update({ likes: 0 }).eq("id", toonId);
    if (error) { showStatus(error.message, false); return; }
    setList(l => l.map(t => t.id === toonId ? { ...t, likes: 0 } : t));
    showStatus("Likes reset.");
  }

  async function toggleDraft(toonId, currentlyDraft) {
    const newVal = !currentlyDraft;
    const { error } = await db.from("animations").update({ is_draft: newVal }).eq("id", toonId);
    if (error) { showStatus(error.message, false); return; }
    setList(l => l.map(t => t.id === toonId ? { ...t, is_draft: newVal } : t));
    showStatus(newVal ? "Toon set to draft." : "Toon published.");
  }

  if (toons === "loading" || list === null) return <div className="mp-empty">Loading...</div>;
  if (list.length === 0) return <div className="mp-empty">No toons.</div>;

  return list.map(t => (
    <div key={t.id} className="mp-toon-row">
      <span className="mp-toon-title">
        <a href={`/toon/${t.id}`} target="_blank" rel="noreferrer">{t.title || "Untitled"}</a>
      </span>
      {t.is_draft && <span className="badge draft">draft</span>}
      <span className="grayb small">{t.likes || 0} ♥</span>
      <span className="grayb small">{t.created_at ? new Date(t.created_at).toLocaleDateString() : "—"}</span>
      <span className="mp-actions">
        <button onClick={() => resetLikes(t.id)}>Reset Likes</button>
        <button onClick={() => toggleDraft(t.id, t.is_draft)}>{t.is_draft ? "Undraft" : "Draft"}</button>
        <button className="btn-danger" onClick={() => deleteToon(t.id)}>Delete</button>
      </span>
    </div>
  ));
}

function CommentList({ comments, setComments, showStatus }) {
  async function deleteComment(commentId) {
    const { error } = await db.from("comments").delete().eq("id", commentId);
    if (error) { showStatus(error.message, false); return; }
    setComments(c => c.filter(x => x.id !== commentId));
    showStatus("Comment deleted.");
  }

  if (comments === "loading") return <div className="mp-empty">Loading...</div>;
  if (!comments || comments.length === 0) return <div className="mp-empty">No comments.</div>;
  return comments.map(c => (
    <div key={c.id} className="mp-comment-row">
      {c.author_username && <span className="username">{c.author_username}</span>}
      <span className="mp-comment-text">{c.text}</span>
      <span className="grayb small">{c.created_at ? new Date(c.created_at).toLocaleDateString() : "—"}</span>
      {c.animation_id && <a href={`/toon/${c.animation_id}`} target="_blank" rel="noreferrer" className="grayb small">view toon</a>}
      <button className="btn-danger" style={{ marginLeft: "auto" }} onClick={() => deleteComment(c.id)}>Delete</button>
    </div>
  ));
}

const RECENT_PAGE_SIZE = 20;
const UUID_RE_RT = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LEGACY_RE_RT = /^[a-zA-Z0-9]{3,40}$/;

function RecentToons({ showStatus }) {
  const [toons, setToons] = useState(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [searchId, setSearchId] = useState("");
  const [searchMode, setSearchMode] = useState(false);

  const load = useCallback(async (pageNum = 0) => {
    setToons(null);
    setSearchMode(false);
    const offset = pageNum * RECENT_PAGE_SIZE;
    const fetchCount = RECENT_PAGE_SIZE * 2;
    const [newRes, legacyRes] = await Promise.all([
      db.from("animations").select("id,title,created_at,user_id,is_draft")
        .eq("is_draft", false).order("created_at", { ascending: false })
        .range(0, offset + fetchCount - 1),
      db.from("legacy_animations").select("id,title,created_at,user_id,is_draft")
        .eq("is_draft", false).order("created_at", { ascending: false })
        .range(0, offset + fetchCount - 1),
    ]);
    const all = [
      ...(newRes.data || []).map(t => ({ ...t, legacy: false })),
      ...(legacyRes.data || []).map(t => ({ ...t, legacy: true })),
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const paginated = all.slice(offset, offset + RECENT_PAGE_SIZE);
    setHasMore(all.length > offset + RECENT_PAGE_SIZE);

    const userIds = [...new Set(paginated.map(t => t.user_id).filter(Boolean))];
    const { data: profiles } = userIds.length > 0
      ? await db.from("profiles").select("id,username").in("id", userIds)
      : { data: [] };
    const userMap = Object.fromEntries((profiles || []).map(p => [p.id, p.username]));
    setToons(paginated.map(t => ({ ...t, username: userMap[t.user_id] || "unknown" })));
  }, []);

  useEffect(() => { load(0); }, [load]);

  function goToPage(p) {
    setPage(p);
    load(p);
  }

  async function searchById() {
    const raw = searchId.trim().replace(/\/$/, "");
    // Accept full URLs too
    const urlMatch = raw.match(/\/toon\/([a-zA-Z0-9_-]{3,40})/);
    const id = urlMatch ? urlMatch[1] : raw;
    if (!id || (!UUID_RE_RT.test(id) && !LEGACY_RE_RT.test(id))) {
      showStatus("Enter a valid toon UUID or alphanumeric ID.", false);
      return;
    }
    setToons(null);
    setSearchMode(true);
    const isLegacy = !UUID_RE_RT.test(id);
    const table = isLegacy ? "legacy_animations" : "animations";
    const { data, error } = await db.from(table).select("id,title,created_at,user_id,is_draft").eq("id", id).maybeSingle();
    if (error || !data) {
      // Try the other table as fallback
      const otherTable = isLegacy ? "animations" : "legacy_animations";
      const { data: data2, error: err2 } = await db.from(otherTable).select("id,title,created_at,user_id,is_draft").eq("id", id).maybeSingle();
      if (err2 || !data2) { setToons([]); showStatus(`No toon found with ID: ${id}`, false); return; }
      const toon = { ...data2, legacy: !isLegacy };
      const { data: prof } = await db.from("profiles").select("id,username").eq("id", toon.user_id).maybeSingle();
      setToons([{ ...toon, username: prof?.username || "unknown" }]);
      return;
    }
    const toon = { ...data, legacy: isLegacy };
    const { data: prof } = await db.from("profiles").select("id,username").eq("id", toon.user_id).maybeSingle();
    setToons([{ ...toon, username: prof?.username || "unknown" }]);
  }

  function clearSearch() {
    setSearchId("");
    setSearchMode(false);
    load(page);
  }

  async function deleteAnyToon(toon) {
    if (!confirm(`Delete toon ${toon.id}? This cannot be undone.`)) return;
    if (toon.legacy) {
      await db.from("comments").delete().eq("legacy_animation_id", toon.id);
      await db.from("likes").delete().eq("legacy_animation_id", toon.id);
      await db.from("legacy_animations").delete().eq("id", toon.id);
    } else {
      await db.from("comments").delete().eq("animation_id", toon.id);
      await db.from("likes").delete().eq("animation_id", toon.id);
      await db.from("animations").delete().eq("id", toon.id);
    }
    setToons(t => t.filter(x => x.id !== toon.id));
    showStatus("Toon deleted.");
  }

  return (
    <Section title={<>🕐 Recent Toons {!searchMode && <button style={{ fontSize: 9, height: 22, padding: "1px 8px" }} onClick={() => goToPage(0)}>Refresh</button>}</>}>
      {/* ID search bar */}
      <div className="mp-row" style={{ marginBottom: 10 }}>
        <input type="text" placeholder="Search by toon ID or URL..." value={searchId}
          onChange={e => setSearchId(e.target.value)}
          onKeyDown={e => e.key === "Enter" && searchById()}
          style={{ width: 280 }} />
        <button onClick={searchById}>Search</button>
        {searchMode && <button onClick={clearSearch}>✕ Clear</button>}
      </div>

      {!toons
        ? <div className="mp-empty">Loading...</div>
        : toons.length === 0
          ? <div className="mp-empty">{searchMode ? "No toon found." : "No toons on this page."}</div>
          : toons.map(t => (
            <div key={t.id} className="mp-toon-row">
              <span className="mp-toon-title">
                <a href={`/toon/${t.id}`} target="_blank" rel="noreferrer">{t.title || "Untitled"}</a>
              </span>
              {t.legacy && <span className="badge" style={{ background: "#888" }}>legacy</span>}
              <span className="grayb small">{t.username}</span>
              <span className="grayb small">{t.created_at ? new Date(t.created_at).toLocaleDateString() : "—"}</span>
              <span className="grayb small" style={{ fontSize: 9, fontFamily: "monospace" }}>{t.id}</span>
              <span className="mp-actions">
                <button className="btn-danger" onClick={() => deleteAnyToon(t)}>Delete</button>
              </span>
            </div>
          ))
      }
      {!searchMode && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
          <button onClick={() => goToPage(0)} disabled={page === 0 || !toons}>«</button>
          <button onClick={() => goToPage(page - 1)} disabled={page === 0 || !toons}>‹ Prev</button>
          <span className="grayb small" style={{ padding: "0 4px" }}>Page {page + 1}</span>
          <button onClick={() => goToPage(page + 1)} disabled={!hasMore || !toons}>Next ›</button>
        </div>
      )}
    </Section>
  );
}

function IpBans({ showStatus }) {
  const [bans, setBans] = useState(null);
  const [ip, setIp] = useState("");
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    const { data } = await db.from("banned_ips").select("ip,reason,banned_at").order("banned_at", { ascending: false });
    setBans(data || []);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function addBan() {
    if (!ip.trim()) return;
    await db.from("banned_ips").insert({ ip: ip.trim(), reason: reason.trim() });
    setIp(""); setReason("");
    showStatus(`IP banned: ${ip.trim()}`);
    load();
  }

  async function removeBan(ipAddr) {
    await db.from("banned_ips").delete().eq("ip", ipAddr);
    showStatus(`IP ban removed: ${ipAddr}`);
    load();
  }

  return (
    <Section title="🚫 IP Bans">
      <div className="mp-row">
        <input type="text" placeholder="IP address..." value={ip} onChange={e => setIp(e.target.value)}
          onKeyDown={e => e.key === "Enter" && addBan()} style={{ width: 160 }} />
        <input type="text" placeholder="Reason (optional)" value={reason} onChange={e => setReason(e.target.value)} style={{ width: 200 }} />
        <button onClick={addBan}>Add Ban</button>
      </div>
      {!bans
        ? <div className="mp-empty">Loading...</div>
        : bans.length === 0
          ? <div className="mp-empty">No banned IPs.</div>
          : (
            <table className="mp-table">
              <thead><tr><th>IP</th><th>Reason</th><th>Date</th><th></th></tr></thead>
              <tbody>
                {bans.map(b => (
                  <tr key={b.ip}>
                    <td><code>{b.ip}</code></td>
                    <td>{b.reason || "—"}</td>
                    <td>{b.banned_at ? new Date(b.banned_at).toLocaleDateString() : "—"}</td>
                    <td><button onClick={() => removeBan(b.ip)}>Remove</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
      }
    </Section>
  );
}

function DebugSpooders({ showStatus }) {
  const [username, setUsername] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  async function adjust(sign) {
    const n = parseInt(amount);
    if (!username.trim() || !n || n <= 0) {
      showStatus("Username and a positive amount are required.", false);
      return;
    }
    setLoading(true);
    try {
      const { data: target } = await db.from("profiles").select("id, spiders").ilike("username", username.trim()).maybeSingle();
      if (!target) { showStatus(`User '${username}' not found.`, false); return; }

      const { data: { user } } = await db.auth.getUser();
      const { error } = await db.from("spooder_transactions").insert({
        user_id: target.id,
        amount: sign * n,
        source: "admin",
        note: "debug",
        credited_by: user.id,
      });
      if (error) throw error;
      showStatus(`${sign > 0 ? "+" : "-"}${n} spooders → ${username.trim()} (new balance: ~${target.spiders + sign * n})`);
      setAmount("");
    } catch (err) {
      showStatus(err.message, false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Section title="🐛 Debug Spooders">
      <div className="mp-empty" style={{ marginBottom: 8 }}>Directly add or remove spooders from any user. Logged as <code>admin</code> source.</div>
      <div className="mp-row">
        <input type="text" placeholder="Username..." value={username}
          onChange={e => setUsername(e.target.value)} style={{ width: 180 }} />
        <input type="number" placeholder="Amount..." value={amount} min="1"
          onChange={e => setAmount(e.target.value)} style={{ width: 100 }} />
        <button onClick={() => adjust(1)} disabled={loading}>+ Add</button>
        <button onClick={() => adjust(-1)} disabled={loading} className="btn-danger">− Remove</button>
      </div>
    </Section>
  );
}

function BoostyCredit({ showStatus }) {
  const [tab, setTab] = useState("boosty"); // "boosty" | "kofi"
  const [username, setUsername] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const isKofi = tab === "kofi";
  const rate = isKofi ? 100 : 10;
  const currency = isKofi ? "$" : "₽";
  const preview = Number(amount) > 0 ? `= ${Math.round(Number(amount) * rate)} spooders` : null;

  function switchTab(t) {
    setTab(t);
    setAmount("");
    setNote("");
  }

  async function credit() {
    if (!username.trim() || !amount || Number(amount) <= 0) {
      showStatus(`Username and a positive ${isKofi ? "dollar" : "ruble"} amount are required.`, false);
      return;
    }
    setLoading(true);
    try {
      const { data: { session } } = await db.auth.getSession();
      const bodyPayload = {
        username: username.trim(),
        note: note.trim() || undefined,
        ...(isKofi ? { dollars: Number(amount) } : { rubles: Number(amount) }),
      };
      const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/admin-credit-spiders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(bodyPayload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? res.statusText);
      const upgradeMsg = data.status === "cowboy" ? " 🤠 Status upgraded to cowboy!" : "";
      showStatus(`✓ Credited ${data.spiders_credited} spooders to ${username.trim()} (${currency}${amount})${upgradeMsg}`);
      setAmount(""); setNote("");
    } catch (err) {
      showStatus(err.message, false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Section title={isKofi ? "☕ Ko-fi Credit" : "🕷 Boosty Credit"}>
      {/* Tab switcher */}
      <div style={{ display: "flex", gap: 0, marginBottom: 10, borderBottom: "1px solid #ddd" }}>
        {[["boosty", "🕷 Boosty"], ["kofi", "☕ Ko-fi"]].map(([key, label]) => (
          <button key={key} onClick={() => switchTab(key)} style={{
            borderRadius: "3px 3px 0 0", border: "1px solid #ccc", borderBottom: tab === key ? "1px solid #fafafa" : "1px solid #ccc",
            background: tab === key ? "#fafafa" : "#f0f0f0", marginBottom: -1,
            fontWeight: tab === key ? "bold" : "normal", marginRight: 2,
          }}>{label}</button>
        ))}
      </div>
      <div className="mp-empty" style={{ marginBottom: 8 }}>
        {isKofi
          ? "Manually credit spooders for a verified Ko-fi donation. Rate: $1 = 100 spooders."
          : "Manually credit spooders for a verified Boosty donation. Rate: ₽1 = 10 spooders."}
      </div>
      <div className="mp-row">
        <input type="text" placeholder="Toonator username..." value={username}
          onChange={e => setUsername(e.target.value)} style={{ width: 180 }} />
        <input type="number" placeholder={isKofi ? "USD..." : "Rubles..."} value={amount} min="1" step={isKofi ? "0.01" : "1"}
          onChange={e => setAmount(e.target.value)} style={{ width: 100 }} />
        {preview && <span className="grayb small">{preview}</span>}
      </div>
      <div className="mp-row">
        <input type="text" placeholder={isKofi ? "Ko-fi transaction ID (optional)" : "Boosty transaction ID (optional)"} value={note}
          onChange={e => setNote(e.target.value)} style={{ width: 300 }} />
        <button onClick={credit} disabled={loading}>{loading ? "Crediting..." : "Credit Spooders"}</button>
      </div>
    </Section>
  );
}

export default function ModPanel() {
  const [user, setUser] = useState(undefined);
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const [status, showStatus] = useStatus();

  useEffect(() => {
    db.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setUser(null); return; }
      const { data: profile } = await db.from("profiles").select("role").eq("id", user.id).single();
      setCurrentUserRole(profile?.role || "user");
      setUser(user);
    });
  }, []);

  async function login() {
    const email = prompt("Admin email:");
    if (!email) return;
    const password = prompt("Password:");
    if (!password) return;
    const { error } = await db.auth.signInWithPassword({ email, password });
    if (error) { alert("Login failed: " + error.message); return; }
    window.location.reload();
  }

  async function logout() {
    await db.auth.signOut();
    window.location.reload();
  }

  if (user === undefined) return <div id="content_wrap"><div id="content"><div id="access-denied" style={{ display: "block" }}>Loading...</div></div></div>;

  if (!user) return (
    <div id="content_wrap"><div id="content">
      <div id="access-denied" style={{ display: "block" }}>
        Moderator login required.<br /><br />
        <button onClick={login}>Sign In</button>
      </div>
    </div></div>
  );

  if (currentUserRole !== "mod" && currentUserRole !== "admin") return (
    <div id="content_wrap"><div id="content">
      <div id="access-denied" style={{ display: "block" }}>
        You don&apos;t have permission to view this page.<br /><br />
        <button onClick={logout}>Log Out</button>
      </div>
    </div></div>
  );

  function ToonOfDay({ showStatus }) {
    const [toonUrl, setToonUrl] = useState("");
    const [dateStr, setDateStr] = useState(() => new Date().toISOString().slice(0, 10));
    const [preview, setPreview] = useState(null);
    const [loading, setLoading] = useState(false);

    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const LEGACY_RE = /^[a-zA-Z0-9]{3,16}$/;

    function parseToonId(raw) {
      const stripped = raw.trim().replace(/\/$/, "");
      const urlMatch = stripped.match(/\/toon\/([a-zA-Z0-9_-]{3,40})/);
      if (urlMatch) return urlMatch[1];
      if (UUID_RE.test(stripped) || LEGACY_RE.test(stripped)) return stripped;
      return null;
    }

    async function lookupToon() {
      const id = parseToonId(toonUrl);
      if (!id) { showStatus("Invalid toon URL or ID.", false); return; }
      const isLegacy = !UUID_RE.test(id);
      const table = isLegacy ? "legacy_animations" : "animations";
      const { data, error } = await db.from(table).select("id, title").eq("id", id).maybeSingle();
      if (error || !data) { showStatus(`Toon not found: ${id}`, false); setPreview(null); return; }
      setPreview({ id: data.id, isLegacy, title: data.title || "Untitled" });
      showStatus(`Found: "${data.title || "Untitled"}" (${isLegacy ? "legacy" : "new"})`, true);
    }

    async function award() {
      if (!preview) { showStatus("Look up a toon first.", false); return; }
      if (!dateStr) { showStatus("Pick a date.", false); return; }
      if (!confirm(`Award "${preview.title}" as Toon of the Day for ${dateStr}?`)) return;
      setLoading(true);
      showStatus("Awarding...");
      const { error: insertError } = await db.from("toon_of_day").upsert(
        { awarded_at: dateStr, toon_id: preview.id, is_legacy: preview.isLegacy },
        { onConflict: "awarded_at" }
      );
      if (insertError) { showStatus(`Failed to insert: ${insertError.message}`, false); setLoading(false); return; }
      await db.from("animations").update({ featured: false }).eq("featured", true);
      await db.from("legacy_animations").update({ featured: false }).eq("featured", true);
      const winnerTable = preview.isLegacy ? "legacy_animations" : "animations";
      const { error: featuredError } = await db.from(winnerTable).update({ featured: true }).eq("id", preview.id);
      if (featuredError) { showStatus(`Inserted but failed to set featured: ${featuredError.message}`, false); setLoading(false); return; }
      showStatus(`✓ "${preview.title}" is now Toon of the Day for ${dateStr}.`);
      setPreview(null); setToonUrl(""); setLoading(false);
    }

    return (
      <Section title="⭐ Toon of the Day">
        <div className="mp-empty" style={{ marginBottom: 8 }}>
          Award a toon as Toon of the Day. This also sets it as the current featured toon sitewide.
        </div>
        <div className="mp-row">
          <input type="text" placeholder="Toon URL or ID..." value={toonUrl}
            onChange={(e) => { setToonUrl(e.target.value); setPreview(null); }}
            onKeyDown={(e) => e.key === "Enter" && lookupToon()} style={{ width: 320 }} />
          <button onClick={lookupToon}>Look up</button>
        </div>
        {preview && (
          <div className="mp-toon-row" style={{ marginBottom: 8 }}>
            <span className="mp-toon-title">
              <a href={`/toon/${preview.id}`} target="_blank" rel="noreferrer">{preview.title}</a>
            </span>
            <span className="grayb small">({preview.isLegacy ? "legacy" : "new"} · {preview.id})</span>
          </div>
        )}
        <div className="mp-row">
          <label style={{ font: "10pt Arial", marginRight: 4 }}>Award date:</label>
          <input type="date" value={dateStr} onChange={(e) => setDateStr(e.target.value)}
            style={{ font: "10pt Arial", border: "1px solid #ccc", borderRadius: 3, padding: "3px 6px", height: 28 }} />
          <button onClick={award} disabled={!preview || loading}>
            {loading ? "Awarding..." : "Award Toon of the Day"}
          </button>
        </div>
        <div className="mp-empty" style={{ marginTop: 4 }}>
          If a toon was already awarded on the selected date, it will be replaced.
        </div>
      </Section>
    );
  }

  return (
    <div id="content_wrap">
      <div id="content">
        <div className="mp-header">
          <h1>Mod Panel</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="role-badge">{currentUserRole}</span>
            <button onClick={logout}>Log Out</button>
          </div>
        </div>

        <StatsBar />

        <div className={`mod-status ${status.msg ? (status.ok ? "ok" : "err") : ""}`}>
          {status.msg}
        </div>

        <SearchUser currentUserRole={currentUserRole} showStatus={showStatus} />
        <RecentToons showStatus={showStatus} />
        <ToonOfDay showStatus={showStatus} />
        <BoostyCredit showStatus={showStatus} />
        {currentUserRole === "admin" && <DebugSpooders showStatus={showStatus} />}
        <IpBans showStatus={showStatus} />

        <style>{`
          * { box-sizing: border-box; }
          #access-denied {
            display: none; text-align: center; padding: 60px 20px;
            font: 16pt ToonatorFont; color: #888;
          }
          .mp-section {
            margin: 12px 0; padding: 12px 14px;
            border: 1px solid #ccc; border-radius: 6px; background: #fafafa;
          }
          .mp-section h2 {
            font: 13pt ToonatorFont; font-weight: normal;
            margin: 0 0 10px 0; border-bottom: 1px solid #eee;
            padding-bottom: 6px; text-align: left;
            display: flex; align-items: center; gap: 8px;
          }
          .mod-status { font: 10pt Arial; min-height: 18px; margin: 6px 0; }
          .mod-status.ok { color: green; }
          .mod-status.err { color: red; font-weight: bold; }
          .mp-row { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; margin-bottom: 8px; }
          .mp-row input[type="text"], .mp-row input[type="number"], .mp-row select {
            font: 10pt Arial; border: 1px solid #ccc; border-radius: 3px;
            padding: 3px 6px; height: 28px;
          }
          button {
            font: 10pt Arial; border: 1px solid #ccc; border-radius: 3px;
            padding: 3px 10px; cursor: pointer; background: #fff; height: 28px;
          }
          button:hover { background: #f0f0f0; }
          button:disabled { opacity: 0.5; cursor: not-allowed; }
          button.btn-danger { color: #c00; border-color: #e88; }
          button.btn-danger:hover { background: #fff0f0; }
          .mp-user-row {
            padding: 6px 4px; border-bottom: 1px solid #eee;
            display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
            font: 11pt ToonatorFont;
          }
          .mp-user-row select {
            font: 10pt Arial; border: 1px solid #ccc; border-radius: 3px;
            padding: 2px 4px; height: 26px;
          }
          .mp-user-row:last-child { border-bottom: none; }
          .mp-actions { margin-left: auto; display: flex; gap: 4px; flex-wrap: wrap; }
          .mp-toon-row {
            padding: 5px 4px; border-bottom: 1px solid #eee;
            display: flex; align-items: center; gap: 10px; font: 10pt Arial; flex-wrap: wrap;
          }
          .mp-toon-row:last-child { border-bottom: none; }
          .mp-toon-title { font-weight: bold; color: #333; }
          .mp-toon-title a { color: #333; }
          .mp-toon-title a:hover { text-decoration: underline; }
          .mp-comment-row {
            padding: 6px 4px; border-bottom: 1px solid #eee;
            display: flex; align-items: flex-start; gap: 8px; font: 10pt Arial; flex-wrap: wrap;
          }
          .mp-comment-row:last-child { border-bottom: none; }
          .mp-comment-text { flex: 1; color: #333; word-break: break-word; }
          .badge { font: 8pt Arial; padding: 1px 6px; border-radius: 10px; color: #fff; }
          .badge.draft { background: #999; }
          .mp-table { width: 100%; border-collapse: collapse; font: 10pt Arial; margin-top: 8px; }
          .mp-table th { text-align: left; padding: 4px 8px; border-bottom: 1px solid #ccc; color: #555; font-size: 9pt; }
          .mp-table td { padding: 5px 8px; border-bottom: 1px solid #eee; vertical-align: middle; }
          .mp-table tr:last-child td { border-bottom: none; }
          .mp-table tr:hover td { background: #f5f5f5; }
          .mp-table code { font-size: 9pt; background: #f4f4f4; padding: 1px 5px; border-radius: 3px; border: 1px solid #e0e0e0; }
          .mp-empty { color: #888; font: 10pt Arial; padding: 8px 0; }
          .grayb { color: #888; }
          .small { font-size: 9pt; }
          .stat-pill { display: inline-block; background: #eee; border-radius: 12px; padding: 3px 12px; font: 10pt Arial; margin-right: 6px; margin-bottom: 4px; }
          .mp-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
          .mp-header h1 { font: 18pt ToonatorFont; font-weight: normal; margin: 0; }
          .role-badge { font: 9pt Arial; background: #333; color: #fff; border-radius: 10px; padding: 2px 10px; }
        `}</style>

      </div>
    </div>
  );
}