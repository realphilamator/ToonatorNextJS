// Likes Component - Handles toon liking functionality
import {
  getToonLikes,
  getToonUserLikeStatus,
  toggleToonLike,
} from "/js/api.js";
import { db } from "/js/config.js";

export async function initializeLikes(toonId, isLegacy = false) {
  const likes = await getToonLikes(toonId, isLegacy);
  document.getElementById("like_value").textContent = likes;

  const { data: { user } } = await db.auth.getUser();
  if (user) {
    const isLiked = await getToonUserLikeStatus(toonId, user.id, isLegacy);
    if (isLiked) {
      document.getElementById("like_link").classList.add("active");
    }
  }
}

export async function handleLike(toonId, isLegacy = false) {
  const { data: { user } } = await db.auth.getUser();
  if (!user) {
    if (window.showAuth) showAuth("login");
    return;
  }

  const { success, liked, error } = await toggleToonLike(toonId, isLegacy);
  if (success) {
    const link = document.getElementById("like_link");
    const valueEl = document.getElementById("like_value");
    const currentValue = parseInt(valueEl.textContent);

    if (liked) {
      link.classList.add("active");
      valueEl.textContent = currentValue + 1;
    } else {
      link.classList.remove("active");
      valueEl.textContent = Math.max(0, currentValue - 1);
    }
  }
}

export function handleFavorite() {
  db.auth.getUser().then(({ data: { user } }) => {
    if (!user) {
      if (window.showAuth) showAuth("login");
      return;
    }
    alert("Favorites feature coming soon!");
  });
}