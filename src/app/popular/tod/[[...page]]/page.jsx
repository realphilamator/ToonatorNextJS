// app/popular/tod/[[...page]]/page.jsx
import Link from "next/link";
import { getTranslations } from 'next-intl/server';
import { UrlPaginator } from "@/components/paginator";
import { getToonOfDayHistory } from "@/lib/api";

export async function generateMetadata() {
  const t = await getTranslations('metadata.popularTod');
  return { title: t('title') };
}

function formatAwardDate(dateStr) {
  if (!dateStr) return "";
  const [yyyy, mm, dd] = dateStr.split("-");
  return `${dd}.${mm}.${yyyy}`;
}

export default async function ToonOfTheDayPage({ params }) {
  const t = await getTranslations('popular');
  const tTod = await getTranslations('popularTod');
  const { page: pageSegment } = await params;
  const page = parseInt(pageSegment?.[0] || "1", 10);

  const { entries, total } = await getToonOfDayHistory(page);
  const totalPages = Math.ceil(total / 16);

  return (
    <div id="content_wrap">
      <div id="content">
        <h1 style={{ textAlign: "center" }}>
          {t('title')}{" "}
          <span style={{ fontWeight: "normal" }}>
            <Link href="/popular" className="nmenu">{t('allTime')}</Link>
            {" | "}
            <Link href="/popular/week" className="nmenu">{t('thisWeek')}</Link>
            {" | "}
            <Link href="/popular/day" className="nmenu">{t('thisDay')}</Link>
            {" | "}
            <b>{t('toonOfTheDay')}</b>
          </span>
        </h1>

        <UrlPaginator basePath="/popular/tod" currentPage={page} totalPages={totalPages} />

        <div className="toons_container">
          <div className="toons_list">
            {entries.length === 0 ? (
              <div style={{ textAlign: "center", color: "#888", padding: "20px" }}>
                {tTod('noToons')}
              </div>
            ) : (
              entries.map(({ awarded_at, toon_id, toon, username }) => {
                if (!toon) return null;
                const title = toon.title || t('untitled', { defaultValue: 'Untitled' });
                const frameCount = toon.frame_count ?? 0;
                return (
                  <div key={toon_id} className="toon_preview">
                    <div className="toon_image">
                      <Link href={`/toon/${toon_id}`} title={title}>
                        <img
                          src={toon.preview_url}
                          width={200}
                          height={100}
                          alt={title}
                          onError={(e) => { e.currentTarget.src = "/img/avatar100.gif"; }}
                        />
                      </Link>
                    </div>
                    <div className="toon_name">
                      <Link className="link" href={`/toon/${toon_id}`}>{title}</Link>
                    </div>
                    <div className="toon_tagline">
                      <Link href={`/user/${encodeURIComponent(username)}`} className="username">
                        {username}
                      </Link>
                      {", "}
                      {tTod('frames', { count: frameCount })}
                    </div>
                    <div className="toon_tagline" style={{ color: "#888" }}>
                      {formatAwardDate(awarded_at)}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <UrlPaginator basePath="/popular/tod" currentPage={page} totalPages={totalPages} />
        <div className="clear" />
      </div>
      <div id="footer_placeholder" />
    </div>
  );
}