// Utility for loading shared HTML includes (header, footer, donation, auth modal)

export async function loadIncludes() {
  const [header, footer, donate, modal] = await Promise.all([
    fetch("/includes/header.html").then((r) => r.text()),
    fetch("/includes/footer.html").then((r) => r.text()),
    fetch("/includes/donate.html").then((r) => r.text()),
    fetch("/includes/auth-modal.html").then((r) => r.text()),
  ]);

  // Load header (only if placeholder exists)
  const headerEl = document.getElementById("header_placeholder");
  if (headerEl) headerEl.innerHTML = header;

  // Load footer (only if placeholder exists)
  const footerEl = document.getElementById("footer_placeholder");
  if (footerEl) footerEl.innerHTML = footer;

  // Load donate (only if placeholder exists)
  const donateEl = document.getElementById("donate_placeholder");
  if (donateEl) donateEl.innerHTML = donate;

  // Load auth modal (always, at end of body)
  if (modal) document.body.insertAdjacentHTML("beforeend", modal);

  // Trigger auth UI update if function exists globally
  if (window.updateAuthUI) {
    updateAuthUI();
  }
}
