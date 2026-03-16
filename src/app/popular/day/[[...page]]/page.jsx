// app/popular/day/[[...page]]/page.jsx
import Link from "next/link";
import { getTranslations } from 'next-intl/server';
import ToonCard from "@/components/ToonCard";
import { UrlPaginator } from "@/components/paginator";
import { resolveUsernames, getFeaturedToon, getLastComments, getPopularDay } from "@/lib/api";
import { PopularSidebar } from "@/app/popular/week/[[...page]]/page";

export async function generateMetadata() {
  const t = await getTranslations('metadata.popularDay');
  return { title: t('title') };
}

export default async function PopularDayPage({ params }) {
  const t = await getTranslations('popular');
  const { page: pageSegment } = await params;
  const page = parseInt(pageSegment?.[0] || "1", 10);

  const [{ toons, total }, featuredToon, lastComments] = await Promise.all([
    getPopularDay(page),
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
              <Link href="/popular/week" className="nmenu">{t('thisWeek')}</Link>
              {" | "}
              <b>{t('thisDay')}</b>
              {" | "}
              <Link href="/popular/tod" className="nmenu">{t('toonOfTheDay')}</Link>
            </span>
          </h1>

          <UrlPaginator basePath="/popular/day" currentPage={page} totalPages={totalPages} />

          <div className="toons_container">
            <div className="toons_list">
              {toons.length === 0 ? (
                <div style={{ textAlign: "center", color: "#888", padding: "20px" }}>
                  {t('noToonsToday')}
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

          <UrlPaginator basePath="/popular/day" currentPage={page} totalPages={totalPages} />
        </div>

        <PopularSidebar featuredToon={featuredToon} featuredUsername={featuredUsername} lastComments={lastComments} />

        <div className="clear" />
      </div>
      <div id="footer_placeholder" />
    </div>
  );
}