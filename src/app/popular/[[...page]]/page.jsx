// app/popular/[[...page]]/page.jsx
import Link from "next/link";
import { getTranslations } from 'next-intl/server';
import ToonCard from "@/components/ToonCard";
import { UrlPaginator } from "@/components/paginator";
import { SUPABASE_URL } from "@/lib/config";
import { resolveUsernames, getFeaturedToon, getLastComments, getPopularAllTime } from "@/lib/api";

export async function generateMetadata() {
  const t = await getTranslations('metadata.popular');
  return { title: t('title') };
}

export default async function PopularAllTimePage({ params }) {
  const t = await getTranslations('popular');
  const { page: pageSegment } = await params;
  const page = parseInt(pageSegment?.[0] || "1", 10);

  const [{ toons, total }, featuredToon, lastComments] = await Promise.all([
    getPopularAllTime(page),
    getFeaturedToon(),
    getLastComments(),
  ]);

  const allToons = featuredToon ? [...toons, featuredToon] : toons;
  const userMap = await resolveUsernames(allToons);

  const totalPages = Math.ceil(total / 16);

  return (
    <div id="content_wrap">
      <div id="content">
          <h1>
            {t('title')}{" "}
            <span style={{ fontWeight: "normal" }}>
              <b>{t('allTime')}</b>
              {" | "}
              <Link href="/popular/week" className="nmenu">{t('thisWeek')}</Link>
              {" | "}
              <Link href="/popular/day" className="nmenu">{t('thisDay')}</Link>
              {" | "}
              <Link href="/popular/tod" className="nmenu">{t('toonOfTheDay')}</Link>
            </span>
          </h1>

          <UrlPaginator basePath="/popular" currentPage={page} totalPages={totalPages} />

          <div className="toons_container">
            <div className="toons_list">
              {toons.length === 0 ? (
                <div style={{ textAlign: "center", color: "#888", padding: "20px" }}>
                  {t('noToons')}
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
          <UrlPaginator basePath="/popular" currentPage={page} totalPages={totalPages} />
        </div>

        <div className="clear" />
      </div>
      <div id="footer_placeholder" />
    </div>
  );
}