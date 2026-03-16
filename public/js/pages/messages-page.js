// Messages Page Controller
import { getMessages, postMessage, getProfileByUsername } from "/js/api.js";
import { loadIncludes } from "/js/utils/includes.js";
import { db } from "/js/config.js";
import { colorUsernames } from "/js/color-username.js";

let currentRecipient = null;
let currentUser = null;

export async function initMessages(recipientUsername) {
  await loadIncludes();

  const { data: { user } } = await db.auth.getUser();
  currentUser = user;

  if (!user) {
    document.getElementById("message_form").style.display = "none";
    document.getElementById("recipient_info").innerHTML =
      '<p style="color:#888888;">You must be <a href="#" onclick="showAuth(\'login\'); return false;">logged in</a> to send messages.</p>';
    return;
  }

  if (recipientUsername) {
    currentRecipient = recipientUsername;
    const { profile } = await getProfileByUsername(recipientUsername);

    if (!profile) {
      document.getElementById("page_title").textContent = "User not found";
      document.getElementById("recipient_info").innerHTML =
        '<p style="color:#888888;">This user does not exist.</p>';
      return;
    }

    document.getElementById("page_title").textContent = "Messages with " + recipientUsername;
    document.getElementById("recipient_info").innerHTML =
      `<p>Conversation with <a href="/user/${encodeURIComponent(recipientUsername)}" class="username">${recipientUsername}</a></p>`;
    document.getElementById("message_form").style.display = "block";

    await colorUsernames();
    await loadMessages();
  } else {
    document.getElementById("page_title").textContent = "Messages";
    document.getElementById("recipient_info").innerHTML =
      '<p style="color:#888888;">Please select a user to message.</p>';
    document.getElementById("message_form").style.display = "none";
    return;
  }

  window.sendMessage = async function () {
    if (!currentRecipient) return;
    const text = document.getElementById("message_text").value.trim();
    if (!text) return;

    const { success, error } = await postMessage(currentRecipient, text);
    if (success) {
      document.getElementById("message_text").value = "";
      await loadMessages();
    } else {
      alert("Error sending message: " + (error?.message || "Unknown error"));
    }
  };
}

async function loadMessages() {
  if (!currentRecipient) return;

  const messages = await getMessages(currentRecipient, currentUser?.id);
  const list = document.getElementById("messages_list");

  if (messages.length === 0) {
    list.innerHTML = '<p style="color:#888888;font-size:10pt;padding:10px;">No messages yet.</p>';
    return;
  }

  list.innerHTML = messages
    .map((msg) => {
      const isSent = msg.sender_id === currentUser?.id;
      const sender = msg.sender_username || (isSent ? "You" : currentRecipient);
      const date = new Date(msg.created_at);
      const dateStr =
        date.toLocaleDateString("en-US") + " " +
        date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

      return `
    <div class="comment" style="${isSent ? "text-align:right;" : ""}">
      <div class="head">
        <span class="username">${sender}</span>
        <span class="date"><b>${dateStr}</b></span>
      </div>
      <div class="text">${msg.text}</div>
    </div>`;
    })
    .join("");
}