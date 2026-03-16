# Toonator — Project Structure

A Next.js (App Router) remake of Toonator.com — an online animation community. Backend is Supabase (Postgres + Auth + Storage).

---

## Overview

```
next/
├── public/          Static assets (CSS, images, legacy JS, draw editor, SWF)
└── src/             Next.js application source
    ├── app/         Pages / routes
    ├── components/  Reusable React components
    ├── hooks/       Custom React hooks
    ├── lib/         Shared utilities (API, config, i18n)
    └── styles/      Global CSS
```

---

## `public/` — Static Assets

- **`css/`** — Legacy stylesheets loaded globally via `app/layout.jsx`. `style.css` is the main layout/theme, `font.css` loads the custom ToonatorFont, `images.css` handles logo swapping for EN/RU.
- **`js/`** — Mostly legacy, mostly unused. Only three files are actively used:
  - `toon-player.js` — plays animations on the toon page
  - `gif.js` + `gif.worker.js` (+ their `.map` files) — GIF export in the draw editor
  - `js/ruffle/` — Ruffle (Flash emulator) used by `/draw/classic`
- **`draw_HTML/`** — The self-contained HTML5 draw editor (`index.html`, `app.js`, `draw.css` + SVG toolbar icons). Loaded in an iframe at `/draw`.
- **`swf/`** — Legacy Flash files. `draw31en.swf` is the classic editor loaded via Ruffle. `player28en.swf` is the legacy toon player, loaded via Ruffle on the toon page for legacy (short alphanumeric ID) toons.
- **`includes/`** — HTML fragments injected at runtime by `Includes.jsx`: `header.html`, `footer.html`, `donate.html`, `auth-modal.html`.
- **`img/`** — All site images (logos, avatars, medals, icons, flags, etc.).
- **`banner/`** — Animated banner shown on the toon page sidebar when logged out.
- **`translate.json`** — i18n strings consumed by `lib/i18n.js`.

---

## `src/app/` — Pages

| File | Route | What it does |
|---|---|---|
| `layout.jsx` | (root) | Root layout. Loads legacy CSS/JS in `<head>`, renders `<Includes />` for header/footer/donate/auth-modal. |
| `not-found.jsx` | `*` | Generic 404 page. |
| `page.jsx` | `/` | Home page (server). Fetches popular + newest toons, renders two `ToonCard` grids side by side. |
| `last/page.jsx` | `/last` | Browse all toons (server). Paginated toon grid + Good Place featured toon + last comments sidebar. |
| `draw/page.jsx` | `/draw` | New HTML5 draw editor (client). Embeds `draw_HTML/index.html` in an iframe. Handles fullscreen and `?continue=<id>`. |
| `draw/classic/page.jsx` | `/draw/classic` | Legacy Flash editor (client). Injects Ruffle, loads `draw31en.swf`. Handles `?cont=` and `?draft=` params. |
| `toon/[id]/page.jsx` | `/toon/[id]` | Toon page (server). Fetches toon data, author, comments, likes, and `continued_from` info. Passes everything to `ToonClient`. Handles both legacy (short alphanumeric) and new (UUID) IDs. |
| `toon/[id]/ToonClient.jsx` | — | Client shell for the toon page. Renders the toon player, like button, comment section, and author info. Uses `toon-player.js` and decompresses gzip-encoded frames via `pako`. |
| `user/[username]/page.jsx` | `/user/[username]` | User profile page (server). Fetches profile + stats, passes to `ProfileClient`. |
| `user/[username]/ProfileClient.jsx` | — | Client shell for the profile page. Tabs for Album / Favorites / Comments. Handles avatar changing, album toggling per toon, and pagination. |
| `profile/page.jsx` | `/profile` | Settings page for the logged-in user (client). Edit username color, rank, bio, avatar palette, mod tools. Uses `settings.module.css`. |
| `profile/settings.module.css` | — | CSS Module scoped to the profile settings page. |
| `admin/mod-panel/page.jsx` | `/admin/mod-panel` | Mod/admin panel (client). Role-gated. Sections: site stats, user search, toon/comment management, role assignment, Boosty spider credit, IP bans. |
| `popular/page.jsx` | `/popular` | Most popular toons of all time (server). Paginated `ToonCard` grid sorted by likes. Exports `PopularSidebar` (shared by all popular sub-pages). |
| `popular/week/page.jsx` | `/popular/week` | Most popular toons this week (server). Same layout as `/popular`, filtered to the past 7 days. |
| `popular/day/page.jsx` | `/popular/day` | Most popular toons today (server). Same layout as `/popular`, filtered to the past 24 hours. |
| `popular/tod/page.jsx` | `/popular/tod` | Toon of the day history (server). Paginated list of past award winners with award date. Fetches via `getToonOfDayHistory`, handles both legacy and UUID toon IDs. |

### `PopularSidebar` (exported from `popular/page.jsx`)

A shared server component rendered in the `content_right` column on all four popular pages. Displays the current Toon of the Day (with medal decorations) and the last 10 comments site-wide. Imported directly by `popular/week`, `popular/day`, and `popular/tod`.

---

## `src/components/` — Reusable Components

| File | What it does |
|---|---|
| `Includes.jsx` | On mount, fetches and injects the four HTML fragments (header, footer, donate, auth-modal) into their placeholder `div`s. Also calls `window.updateAuthUI()` once auth is ready. |
| `ToonCard.jsx` | Renders a single toon preview tile. Fetches its own comment count and `continued_from` info client-side. Shows an album toggle when `isOwnProfile` is true. |
| `UserAvatar.jsx` | Avatar `<img>`. Accepts either a `username` (fetches `avatar_toon` from profiles) or a direct `avatarToonId`. Falls back to the default avatar on error. |
| `UsernameLink.jsx` | `<a>` link to `/user/[username]` that automatically applies the correct color class (`admin`, `mod`, `russian`, `foreign`) via `useUsernameColor`. |
| `AvatarChooser.jsx` | Modal popup for picking an avatar from the user's own toons. Paginated with a "load more" button. |
| `paginator.js` | Two paginator variants: `UrlPaginator` (uses `<Link>` with `?page=N`, for server pages) and `Paginator` (default export, callback-based, for client pages like the profile). |

---

## `src/hooks/` — Custom Hooks

| File | What it does |
|---|---|
| `auth.js` | `useAuth()` — exposes `user`, `loading`, `signOut`, and `spiders` (the site's currency). Subscribes to Supabase auth state changes. |
| `color-username.js` | `useUsernameColor(username)` — fetches a user's role/russian flag and returns the right CSS class. Module-level cache prevents repeat fetches. |

---

## `src/lib/` — Shared Utilities

| File | What it does |
|---|---|
| `config.js` | Exports `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and the `db` Supabase client. Single source of truth — import from here everywhere. |
| `api.js` | All Supabase data-fetching functions. See full function index below. |
| `i18n.js` | `I18nProvider` context + `useI18n()` hook. Loads `translate.json`, exposes a `t(key, page)` translation function and `setLang()`. Also exports `detectLang()` for hostname-based EN/RU detection. |

### `api.js` — Function Index

**Helpers**

| Function | What it does |
|---|---|
| `supabaseRequest(path, options)` | Raw `fetch` wrapper for the Supabase REST API. Returns parsed JSON or `null` on error. |
| `rpc(fn, params)` | POST to a Supabase RPC endpoint. Returns parsed JSON or `null` on error. |
| `escapeHTML(str)` | HTML-escapes a string (ampersands, angle brackets, quotes). |
| `formatDate(iso)` | Formats an ISO timestamp as `MM/DD/YYYY HH:MM`. |

**Profile**

| Function | What it does |
|---|---|
| `getProfileByUsername(username)` | Calls the `get_user_by_username` RPC. Returns `{ profile, error }`. |
| `getProfileStats(userId)` | Returns `{ totalToons, draftCount, commentCount }` for a user. |
| `getUserToons(userId, page, perPage)` | Paginated toons for a user with per-toon comment counts. |
| `getUserToonsPaginated(userId, page, perPage, isOwner)` | Like `getUserToons` but queries the `animations_feed` view and respects `is_draft`/`in_album` visibility rules. Owners see everything; visitors only see published, in-album toons. |
| `getUserFavorites(userId, page, perPage)` | Paginated toons liked by a user, with comment counts. |
| `getUserCommentedToons(userId, page, perPage)` | Paginated toons a user has commented on, with comment counts. |
| `updateUserAvatar(username, toonId)` | Updates `avatar_toon` in both Supabase Auth metadata and the `profiles` table. |

**Home / Last page**

| Function | What it does |
|---|---|
| `getPopularToons(limit)` | Top toons by likes from `animations_feed` (used on the home page). |
| `getNewestToons(limit)` | Most recently created toons from `animations_feed` (used on the home page). |
| `getLastToons(page, perPage)` | Paginated newest toons for `/last`. Returns `{ toons, total }`. |
| `getFeaturedToon()` | Returns the single toon with `featured=true` (the current Toon of the Day). |
| `getLastComments()` | Returns the 10 most recent comments site-wide. |
| `getAuthorData(userId)` | Returns `{ username, avatar, russian, role }` for a user. |
| `resolveUsernames(toons)` | Batch-resolves `user_id → { username, avatar, russian }` for an array of toons. Returns a lookup map keyed by `user_id`. |

**Username color**

| Function | What it does |
|---|---|
| `getUserColorData(username)` | Returns `{ role, russian }` for a user, used by `useUsernameColor`. |

**Popular pages**

| Function | What it does |
|---|---|
| `getPopularAllTime(page)` | Paginated toons sorted by likes, no date filter. Only includes authors with rank `passer` or above (excludes `unknown_animal` and `archeologist`). 16 per page. |
| `getPopularWeek(page)` | Same as above, filtered to toons created in the past 7 days. |
| `getPopularDay(page)` | Same as above, filtered to toons created in the past 24 hours. |

**Toon of the Day**

| Function | What it does |
|---|---|
| `getToonOfDayHistory(page)` | Paginated history of toon-of-day awards from the `toon_of_day` table, newest first. Joins toon data from `legacy_animations` or `animations` depending on `is_legacy`. Resolves usernames in one pass. Returns `{ entries, total }` where each entry has `{ awarded_at, toon_id, is_legacy, toon, username }`. |
| `awardToonOfDay(toonId, isLegacy, awardedAt)` | Upserts a record into `toon_of_day` for the given date (defaults to today), unsets `featured` on any previous winner, and sets `featured=true` on the new winner. Called from the mod panel. |

---

## `src/styles/`

| File | What it does |
|---|---|
| `globals.css` | Effectively empty — site styling comes from the legacy `/public/css/` files loaded in `layout.jsx`. |

---

## Key Conventions

- **Legacy vs new IDs** — Toons imported from the old site have short alphanumeric IDs (e.g. `abc123`). New toons use UUIDs. Many files check `isLegacyId()` to query the right table (`legacy_animations` vs `animations`) and storage bucket (`legacyAnimations` vs `previews`).
- **Server/client split** — Data-heavy pages use a server component for the initial fetch (`page.jsx`) and a `*Client.jsx` sibling for interactivity. See `/toon/[id]` and `/user/[username]`.
- **Includes pattern** — The header, footer, donate bar, and auth modal are raw HTML files in `public/includes/`, injected by `Includes.jsx` into placeholder `div`s. Auth UI updates via `window.updateAuthUI()` defined in the legacy `public/js/auth.js` script.
- **Spiders** — The site's internal currency. Stored on the `profiles` table, exposed via `useAuth()`.
- **Popular rank filtering** — The three time-based popular feeds (`getPopularAllTime`, `getPopularWeek`, `getPopularDay`) all join `animations_feed` to `profiles` via an inner join and exclude authors with rank `unknown_animal` or `archeologist`, ensuring only established users appear.
- **Shared sidebar pattern** — `PopularSidebar` is exported as a named export from `popular/page.jsx` and imported by the three sub-pages (`week`, `day`, `tod`) to avoid duplication.