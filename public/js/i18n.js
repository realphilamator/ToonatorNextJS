let translations = {};
const hostname = window.location.hostname;
const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
const langParam = new URLSearchParams(window.location.search).get('lang');
let currentLang = langParam || (!isLocal && hostname.includes('multator') ? 'ru' : 'en');
let currentPage = null;

/**
 * Load translate.json and apply translations to the current page.
 * @param {string} page - page key matching translate.json (e.g. 'home', 'toon')
 */
export async function initI18n(page) {
  currentPage = page;
  try {
    const res = await fetch('/translate.json');
    translations = await res.json();
  } catch (e) {
    console.warn('i18n: could not load translate.json', e);
    return;
  }
  applyTranslations();
}

/**
 * Get a translation string for the current page.
 * @param {string} key - key from translate.json pages[page][key]
 * @param {string} [page] - optional override page
 */
export function t(key, page) {
  const p = page || currentPage;
  return translations?.[currentLang]?.pages?.[p]?.[key]
      ?? translations?.['en']?.pages?.[p]?.[key]
      ?? key;
}

/** Switch language and re-apply all translations. */
export function setLang(lang) {
  currentLang = lang;
  applyTranslations();
  // Re-dispatch so page JS can react (e.g. update dynamic content)
  document.dispatchEvent(new CustomEvent('langchange', { detail: { lang } }));
}

export function getLang() {
  return currentLang;
}

/** Apply data-i18n attributes to DOM elements. */
function applyTranslations() {
  if (!currentPage) return;

  // Set page <title>
  const titleKey = translations?.[currentLang]?.pages?.[currentPage]?.title;
  if (titleKey) document.title = titleKey;

  // Apply all data-i18n="key" elements.
  // Checks current page first, then falls back to 'header' for shared elements.
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const val = t(key) !== key ? t(key) : t(key, 'header');
    if (val && val !== key) {
      // Use placeholder for inputs/textareas
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.placeholder = val;
      } else {
        el.textContent = val;
      }
    }
  });

  // Apply data-i18n-placeholder for explicit placeholder targets
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    const val = t(key);
    if (val && val !== key) el.placeholder = val;
  });

  // Update <html lang=""> attribute
  document.documentElement.lang = currentLang;

  // Swap images.css <-> images_ru.css based on language
  const imageSheet = document.querySelector('link[href*="images"]');
  if (imageSheet) {
    imageSheet.href = currentLang === 'ru' ? '/css/images_ru.css' : '/css/images.css';
  }

  // Swap the large toonator320/multator320 image (home page)
  const bigLogo = document.querySelector('img[src*="toonator320"], img[src*="multator"]');
  if (bigLogo) {
    bigLogo.src = currentLang === 'ru' ? '/img/multator.png' : '/img/toonator320.png';
  }

  // Swap header logo — header is injected via fetch so may not exist yet.
  // Try immediately, then watch for it with a MutationObserver.
  applyLogoSwap();
  if (!document.querySelector('a.logo')) {
    const observer = new MutationObserver(() => {
      if (document.querySelector('a.logo')) {
        applyLogoSwap();
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
}

function applyLogoSwap() {
  const logo = document.querySelector('a.logo img');
  if (logo) {
    logo.src = currentLang === 'ru' ? '/img/multator40.gif' : '/img/toonator40.png';
  }
  const logoLink = document.querySelector('a.logo');
  if (logoLink) {
    logoLink.title = t('logo_title', 'header');
  }
}