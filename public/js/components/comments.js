// Comments Component - Handles toon comments
import { getToonComments, postComment, escapeHTML } from "/js/api.js";
import { colorUsernames } from "/js/color-username.js";
import { db } from "/js/config.js";

export async function loadComments(toonId, isLegacy = false) {
  const comments = await getToonComments(toonId, isLegacy);
  const list = document.getElementById("comments_list");

  if (comments.length === 0) {
    list.innerHTML = '<p style="color:#888888;font-size:10pt;padding:10px;">No comments yet.</p>';
    return;
  }

  list.innerHTML = comments
    .map((c) => {
      const username = escapeHTML(c.author_username || "anonymous");
      const ud = c.userData || { avatar: "/img/avatar100.gif" };
      const date = new Date(c.created_at);
      const dateStr =
        date.toLocaleDateString("en-US") + " " +
        date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
      const commentText = escapeHTML(c.text);

      return `<div class="comment">
        <div class="avatar">
          <a href="/user/${encodeURIComponent(username)}"><img class="avatar" src="${escapeHTML(ud.avatar)}" onerror="this.onerror=null;this.src='/img/avatar100.gif'"/></a>
        </div>
        <div class="head">
          <a href="/user/${encodeURIComponent(username)}" class="username">${username}</a>
          <span class="date"><b>${dateStr}</b></span>
        </div>
        <div class="text">${commentText}</div>
      </div>`;
    })
    .join("");

  await colorUsernames();
}

export async function showCommentForm() {
  const { data: { user } } = await db.auth.getUser();
  if (!user) {
    if (window.showAuth) showAuth("login");
    return;
  }
  document.getElementById("comments_form").style.display = "block";
  document.getElementById("comment_text").focus();
}

export async function postCommentHandler(toonId, isLegacy = false) {
  const text = document.getElementById("comment_text").value.trim();
  if (!text) return;

  const { error } = await postComment(toonId, text, isLegacy);
  if (!error) {
    document.getElementById("comment_text").value = "";
    document.getElementById("comments_form").style.display = "none";
    await loadComments(toonId, isLegacy);
  } else {
    alert("Error posting comment: " + error.message);
  }
}