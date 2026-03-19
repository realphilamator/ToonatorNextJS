// app/popular/week/[[...page]]/page.jsx
import Link from "next/link";
import { getTranslations } from 'next-intl/server';
import ToonCard from "@/components/ToonCard";
import { UrlPaginator } from "@/components/paginator";
import { SUPABASE_URL } from "@/lib/config";
import ToonLinkPreview from "@/components/ToonLinkPreview";
import UsernameLink from "@/components/UsernameLink";
import { resolveUsernames, getFeaturedToon, getLastComments, getPopularWeek } from "@/lib/api";

export async function generateMetadata() {
  const t = await getTranslations('metadata.popularWeek');
  return { title: t('title') };
}

export default async function PopularWeekPage({ params }) {
  const t = await getTranslations('popular');
  const { page: pageSegment } = await params;
  const page = parseInt(pageSegment?.[0] || "1", 10);

  const [{ toons, total }, featuredToon, lastComments] = await Promise.all([
    getPopularWeek(page),
    getFeaturedToon(),
    getLastComments(),
  ]);

  const allToons = featuredToon ? [...toons, featuredToon] : toons;
  const userMap = await resolveUsernames(allToons);

  const totalPages = Math.ceil(total / 16);
  const featuredUsername = featuredToon
    ? userMap[featuredToon.user_id]?.username || "unknown"
    : null;

  return (
    <div id="content_wrap">
      <div id="content">
        <div className="content_left">
          <h1>
            {t('title')}{" "}
            <span style={{ fontWeight: "normal" }}>
              <Link href="/popular" className="nmenu">{t('allTime')}</Link>
              {" | "}
              <b>{t('thisWeek')}</b>
              {" | "}
              <Link href="/popular/day" className="nmenu">{t('thisDay')}</Link>
              {" | "}
              <Link href="/popular/tod" className="nmenu">{t('toonOfTheDay')}</Link>
            </span>
          </h1>

          <UrlPaginator basePath="/popular/week" currentPage={page} totalPages={totalPages} />

          <div className="toons_container">
            <div className="toons_list">
              {toons.length === 0 ? (
                <div style={{ textAlign: "center", color: "#888", padding: "20px" }}>
                  {t('noToonsThisWeek')}
                </div>
              ) : (
                toons.map((toon) => (
                  <ToonCard
                    key={toon.id}
                    toon={toon}
                    username={userMap[toon.user_id]?.username || "unknown"}
                  />
                ))
              )}
            </div>
          </div>

          <UrlPaginator basePath="/popular/week" currentPage={page} totalPages={totalPages} />
        </div>

        <PopularSidebar featuredToon={featuredToon} featuredUsername={featuredUsername} lastComments={lastComments} />

        <div className="clear" />
      </div>
      <div id="footer_placeholder" />
    </div>
  );
}

// ── Shared sidebar ────────────────────────────────────────────────────────────
// NOTE: This is a server component — useTranslations() cannot be used here.
// Pass translated strings as props, or convert to a client component if needed.
// For now, keys are kept in sync with en.json popular.* namespace.

export async function PopularSidebar({ featuredToon, featuredUsername, lastComments }) {
  const t = await getTranslations('popular');

  return (
    <div className="content_right">
      <h1>
        <Link href="/popular/tod">{t('toonOfTheDay')}</Link>
      </h1>
      {featuredToon && featuredUsername && (
        <div className="toon_preview large owned">
          <img className="toonmedal" src="/img/medal.gif" alt="medal" />
          <img className="toonmedal" style={{ left: "12px" }} src="/img/medal.gif" alt="medal" />
          <div className="toon_image">
            <Link href={`/toon/${featuredToon.id}`} title={featuredToon.title || "Untitled"}>
              <img src={featuredToon.preview_url} alt={featuredToon.title || "Untitled"} />
            </Link>
          </div>
          <div className="toon_name">
            <Link className="link" href={`/toon/${featuredToon.id}`}>
              {featuredToon.title || "Untitled"}
            </Link>
          </div>
          <div className="toon_tagline">
            <Link href={`/user/${encodeURIComponent(featuredUsername)}`} className="username">
              {featuredUsername}
            </Link>
            {", "}
            {t('frames', { count: featuredToon.frame_count ?? 0 })}
          </div>
        </div>
      )}

      <h1>{t('lastComments')}</h1>
      <div id="last-comments">
        {lastComments.map((comment, i) => {
          const uname = comment.author_username || "unknown";
          const animId = String(comment.animation_id);
          return (
            <div key={comment.id ?? i} className={`comment${i % 2 !== 0 ? " gray" : ""} last_comments`}>
              <div className="avatar">
                <Link href={`/toon/${animId}`}>
                  <img
                    src={`${SUPABASE_URL}/storage/v1/object/public/previews/${animId}_100.gif`}
                    width={80}
                    alt=""
                  />
                </Link>
              </div>
              <div className="head">
                <UsernameLink username={uname} />
                {": "}
                <ToonLinkPreview text={comment.text || ""} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}