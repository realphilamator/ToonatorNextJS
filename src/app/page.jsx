import Link from "next/link";
import { getTranslations, getLocale } from 'next-intl/server';
import { getPopularToons, getNewestToons, resolveUsernames, getGoodPlaceCurrent } from "@/lib/api";
import ToonCard from "@/components/ToonCard";
import UsernameLink from "@/components/UsernameLink";
import { SUPABASE_URL } from "@/lib/config";

export async function generateMetadata() {
  const t = await getTranslations('metadata.home');
  return {
    title: t('title'),
    description: t('description'),
    openGraph: {
      title: t('ogTitle'),
      description: t('ogDescription'),
      url: "https://toonator.pages.dev",
      images: ["/img/toonator320.png"],
    },
    twitter: {
      card: "summary_large_image",
      title: t('ogTitle'),
      description: t('ogDescription'),
      images: ["/img/toonator40.png"],
    },
  };
}

export default async function HomePage() {
  const t = await getTranslations('home');
  const locale = await getLocale();
  const [popularToons, newestToons, goodPlace] = await Promise.all([
    getPopularToons(6),
    getNewestToons(6),
    getGoodPlaceCurrent(),
  ]);

  const allToons = [...(popularToons || []), ...(newestToons || [])];
  const userMap = await resolveUsernames(allToons);

  return (
    <div id="content_wrap">
      <div id="content">
        <div className="content_left">
          <b>{t('mostPopular')}</b>
          <div className="toons_container">
            <div className="toons_list">
              {!popularToons?.length ? (
                <div style={{ textAlign: "center", color: "#888", padding: "20px" }}>
                  {t('noToons')}
                </div>
              ) : (
                popularToons.map((toon) => (
                  <ToonCard
                    key={toon.id}
                    toon={toon}
                    username={userMap[toon.user_id]?.username || "unknown"}
                  />
                ))
              )}
            </div>
          </div>

          <b>{t('newest')}</b>
          <div className="toons_container">
            <div className="toons_list">
              {!newestToons?.length ? (
                <div style={{ textAlign: "center", color: "#888", padding: "20px" }}>
                  {t('noToons')}
                </div>
              ) : (
                newestToons.map((toon) => (
                  <ToonCard
                    key={toon.id}
                    toon={toon}
                    username={userMap[toon.user_id]?.username || "unknown"}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        <div className="content_right">
          <br />
          <img src={locale === 'ru' ? '/img/multator.png' : '/img/toonator320.png'} alt="Toonator" />
          <div>
            <span>{t('tagline1')}</span>
            <br />
            <span>{t('tagline2')}</span>
          </div>

          <h1>
            <Link href="/goodplace/">
              {t('goodPlace')}{goodPlace ? ` (${goodPlace.bid_amount})` : ""}
            </Link>
          </h1>

          {goodPlace ? (
            <div className="toon_preview large owned">
              <div className="toon_image">
                <Link href={`/toon/${goodPlace.toon.id}`} title={goodPlace.toon.title}>
                  <img
                    src={goodPlace.toon.preview_url}
                    alt={goodPlace.toon.title}
                    title={goodPlace.toon.title}
                  />
                </Link>
              </div>
              <div className="toon_name">
                <Link className="link" href={`/toon/${goodPlace.toon.id}`}>
                  {goodPlace.toon.title}
                </Link>
              </div>
              <div className="toon_tagline">
                <UsernameLink username={goodPlace.author?.username || "unknown"} />,{" "}
                {t('frames', { count: goodPlace.toon.frames })}
              </div>
              {goodPlace.toon.comment_count > 0 && (
                <div className="toon_tagline">
                  {t('comments', { count: goodPlace.toon.comment_count })}
                </div>
              )}
            </div>
          ) : (
            <div id="good-place-toon" />
          )}
        </div>

        <div className="clear" />
      </div>
      <div id="footer_placeholder" />
    </div>
  );
}