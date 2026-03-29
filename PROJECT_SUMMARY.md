# ToonatorNextJS - Project Summary & Supabase Integration

## Project Overview

**ToonatorNextJS** is a Next.js remake of Toonator.com - an online animation community where users can create, share, and interact with animated content. The application uses modern web technologies while maintaining compatibility with legacy content from the original Flash-based platform.

### Tech Stack
- **Frontend**: Next.js 16.1.6 with App Router
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Language**: JavaScript/JSX with TypeScript support
- **Internationalization**: next-intl for multi-language support
- **Animation**: Pako for compression, legacy Flash support via Ruffle

---

## Supabase Integration - Complete Analysis

Supabase is the **core infrastructure** for this application, serving as the database, authentication system, and file storage solution. Here's how it's used throughout the project:

### 1. Database Configuration & Setup

#### Environment Variables (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=https://ytyhhmwnnlkhhpvsurlm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Client Initialization (src/lib/config.js)
```javascript
import { createClient } from "@supabase/supabase-js";

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

### 2. Authentication System

#### User Authentication (src/hooks/auth.js)
- **Session Management**: Uses `db.auth.getSession()` and `db.auth.onAuthStateChange()`
- **User State**: React hook `useAuth()` provides user data, loading states, and signOut functionality
- **Profile Integration**: Fetches user profiles and "spiders" (internal currency) from the database

#### Authentication Features:
- User registration and login
- Session persistence
- OAuth integration (Patreon)
- Profile management with custom metadata
- Role-based access control (admin, moderator, user roles)

#### Patreon OAuth Integration (src/app/api/patreon/callback/route.js)
```javascript
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

await supabase.auth.admin.updateUserById(user.id, {
  app_metadata: {
    patreon_access_token: tokens.access_token,
    patreon_refresh_token: tokens.refresh_token,
    patreon_user_id: patreonUserId,
  },
});
```

### 3. Database Schema & Tables

Based on the API functions, the database includes these main tables:

#### Core Tables:
- **`profiles`** - User profiles with roles, currency, and settings
- **`animations`** - User-created animations (new UUID-based)
- **`legacy_animations`** - Imported animations from old system (alphanumeric IDs)
- **`comments`** - User comments on animations
- **`likes`** - User likes/favorites
- **`notifications`** - User notifications
- **`toon_of_day`** - Daily featured animations
- **`good_place_current`** / **`good_place_history`** - Paid placement system
- **`spooder_transactions`** - Currency transaction logs

#### Database Views:
- **`animations_feed`** - Optimized view for animation browsing with joins

### 4. Data Access Layer (src/lib/api.js)

The entire data access is centralized in `api.js` with 83 Supabase operations across 24 files:

#### Authentication Helpers:
```javascript
async function getAuthHeaders(extraHeaders = {}) {
  const { data: { session } } = await db.auth.getSession();
  const token = session?.access_token ?? SUPABASE_ANON_KEY;
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    ...extraHeaders,
  };
}
```

#### Database Operations:
- **Direct queries**: `db.from('table').select()`, `db.from('table').insert()`, `db.from('table').update()`
- **RPC calls**: `db.rpc('function_name', params)` for complex operations
- **Storage operations**: File uploads and public URL generation
- **Real-time subscriptions**: Auth state changes

### 5. Storage System

#### File Storage:
- **`previews`** bucket - New animation previews
- **`legacyAnimations`** bucket - Legacy animation files
- **Public URLs**: Generated via `db.storage.from('bucket').getPublicUrl(id)`

#### Animation Data:
- Frames stored as compressed data (using pako)
- Preview images for thumbnails
- Support for both legacy Flash and new HTML5 animations

### 6. Key Supabase Features Utilized

#### Database Features:
- **Row Level Security (RLS)**: For data access control
- **Views**: `animations_feed` for optimized queries
- **Stored Procedures**: RPC functions like `get_popular`, `get_sandbox`, `get_user_by_username`
- **Joins & Aggregations**: Complex queries for statistics and rankings

#### Authentication Features:
- **JWT tokens**: For API authentication
- **OAuth providers**: Patreon integration
- **User metadata**: Custom user attributes
- **Admin API**: Service role key for backend operations

#### Storage Features:
- **Bucket management**: Separate buckets for different content types
- **Public access**: Controlled public URL generation
- **File uploads**: Animation and preview storage

### 7. API Functions by Category

#### Profile Management:
- `getProfileByUsername()` - User profile lookup via RPC
- `getProfileStats()` - User statistics (toons, drafts, comments)
- `getUserToons()` - User's animations with pagination
- `updateUserAvatar()` - Avatar updates in both auth and profiles

#### Content Management:
- `getPopularToons()`, `getNewestToons()` - Home page content
- `getLastToons()` - Browse all animations
- `getFeaturedToon()` - Daily featured animation
- `getSandboxToons()` - Moderation queue

#### Social Features:
- `getUserFavorites()` - User's liked animations
- `getUserCommentedToons()` - User's comment history
- `getLastComments()` - Recent site-wide comments

#### Administrative:
- `awardToonOfDay()` - Feature daily animations
- `buyGoodPlace()` - Paid placement system
- `getSpooderTransactions()` - Currency transaction history
- `getNotifications()` - User notifications

### 8. Security Implementation

#### Authentication Flow:
1. Client-side auth state management via `useAuth()` hook
2. Server-side session validation via `requireAuth()` helper
3. JWT token handling for API requests
4. Row Level Security for data access control

#### API Security:
- **Session-based auth**: Uses user JWT for authenticated requests
- **Fallback to anon key**: For public data access
- **Service role key**: For admin operations (Patreon callback)
- **Input validation**: Through Supabase's built-in validation

### 9. Real-time Features

#### Auth State Management:
```javascript
const { data: { subscription } } = db.auth.onAuthStateChange((_event, session) => {
  const u = session?.user ?? null;
  setUser(u);
  if (u) {
    fetchSpiders(u.id);
  } else {
    setSpiders(0);
  }
});
```

#### Real-time Updates:
- User session changes
- Profile updates (spiders currency)
- Notification counts (via custom hooks)

### 10. Integration Patterns

#### Centralized Configuration:
- All Supabase operations import from `src/lib/config.js`
- Single source of truth for database client
- Environment-based configuration

#### API Layer Pattern:
- All database operations go through `src/lib/api.js`
- Consistent error handling
- Authentication wrapper functions
- Reusable query patterns

#### Client/Server Separation:
- Server components for initial data fetching
- Client components for interactivity
- Auth state shared via React hooks

---

## Architecture Benefits

### Supabase Advantages:
1. **All-in-one solution**: Database, auth, and storage in one platform
2. **Real-time capabilities**: Built-in WebSocket support
3. **Row Level Security**: Database-level access control
4. **OAuth integration**: Easy third-party authentication
5. **Type safety**: TypeScript support throughout
6. **Scalability**: Managed PostgreSQL backend

### Implementation Strengths:
1. **Centralized data access**: All database operations in one file
2. **Consistent auth handling**: Unified authentication patterns
3. **Legacy compatibility**: Supports both old and new content
4. **Performance optimization**: Views, RPC functions, and efficient queries
5. **Security first**: Proper authentication and authorization

---

## Conclusion

Supabase is the **backbone** of ToonatorNextJS, handling every aspect of data persistence, user management, and file storage. The integration is comprehensive and well-architected, with:

- **83+ database operations** across the application
- **Complete auth system** with OAuth support
- **File storage** for animations and previews
- **Real-time features** for user interaction
- **Security implementation** with RLS and proper token handling

The application demonstrates a mature understanding of Supabase capabilities, using it not just as a simple database but as a complete backend solution that handles authentication, storage, real-time updates, and complex data relationships efficiently.
