"use client";
import { useEffect } from "react";

function initDonate() {
  const COOKIE_NAME = "donate_dismissed";

  function setCookie(name, value) {
    document.cookie = name + "=" + value + "; path=/; SameSite=Lax";
  }

  function getCookie(name) {
    const match = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
    return match ? match[1] : null;
  }

  const wrap      = document.getElementById("donate_wrap");
  const closeBtn  = document.getElementById("donate_close");
  const reopen    = document.getElementById("donate_reopen");
  const reopenBtn = document.getElementById("donate_reopen_btn");

  if (!wrap || !closeBtn) return;

  if (getCookie(COOKIE_NAME) === "1") {
    wrap.style.transition = "none";
    wrap.classList.add("collapsed");
    if (reopen) reopen.style.display = "block";
  }

  closeBtn.addEventListener("click", function (e) {
    e.preventDefault();
    setCookie(COOKIE_NAME, "1");
    wrap.style.transition = "";
    wrap.classList.add("collapsed");
    setTimeout(function () {
      if (reopen) reopen.style.display = "block";
    }, 350);
  });

  reopenBtn?.addEventListener("click", function () {
    setCookie(COOKIE_NAME, "0");
    if (reopen) reopen.style.display = "none";
    wrap.classList.remove("collapsed");
  });
}

function swapHeaderLogo(locale) {
  const headerEl = document.getElementById("header_placeholder");
  if (!headerEl) return;
  const logoImg = headerEl.querySelector('img[src*="toonator40"], img[src*="multator40"]');
  if (!logoImg) return;
  logoImg.src = locale === 'ru' ? '/img/multator40.gif' : '/img/toonator40.png';
}

export default function Includes({ locale }) {
  // Initial load — fetch and inject all HTML includes
  useEffect(() => {
    async function load() {
      const [header, footer, donate, modal] = await Promise.all([
        fetch("/includes/header.html").then((r) => r.text()),
        fetch("/includes/footer.html").then((r) => r.text()),
        fetch("/includes/donate.html").then((r) => r.text()),
        fetch("/includes/auth-modal.html").then((r) => r.text()),
      ]);

      const headerEl = document.getElementById("header_placeholder");
      if (headerEl) {
        headerEl.innerHTML = header;
        swapHeaderLogo(locale);
      }

      const footerEl = document.getElementById("footer_placeholder");
      if (footerEl) footerEl.innerHTML = footer;

      const donateEl = document.getElementById("donate_placeholder");
      if (donateEl) {
        donateEl.innerHTML = donate;
        initDonate();
      }

      if (modal) document.body.insertAdjacentHTML("beforeend", modal);

      if (typeof window.updateAuthUI === "function") {
        window.updateAuthUI();
      } else {
        const interval = setInterval(() => {
          if (typeof window.updateAuthUI === "function") {
            window.updateAuthUI();
            clearInterval(interval);
          }
        }, 50);
      }
    }
    load();
  }, []);

  // Swap logo whenever locale changes (router.refresh re-renders layout,
  // passing a new locale prop, which triggers this effect)
  useEffect(() => {
    swapHeaderLogo(locale);
  }, [locale]);

  return null;
}