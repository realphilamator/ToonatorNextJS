// app/last/[[...page]]/page.jsx
import Link from "next/link";
import { getTranslations } from 'next-intl/server';
import ToonCard from "@/components/ToonCard";
import UsernameLink from "@/components/UsernameLink";
import { UrlPaginator } from "@/components/paginator";
import { SUPABASE_URL } from "@/lib/config";
import {
  resolveUsernames,
  getLastToons,
  getGoodPlaceCurrent,
  getLastComments,
} from "@/lib/api";

export async function generateMetadata() {
  const t = await getTranslations('metadata.last');
  return {
    title: t('title'),
    description: t('description'),
  };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function LastCommentItem({ comment, index }) {
  const uname = comment.author_username || "unknown";
  const animId = String(comment.animation_id);
  const text = comment.text || "";
  const thumbUrl = `${SUPABASE_URL}/storage/v1/object/public/previews/${animId}_100.gif`;

  return (
    <div className={`comment${index % 2 !== 0 ? " gray" : ""} last_comments`}>
      <div className="avatar">
        <Link href={`/toon/${animId}`}>
          <img src={thumbUrl} width={80} alt="" />
        </Link>
      </div>
      <div className="head">
        <UsernameLink username={uname} />: {text}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const PER_PAGE = 12;

export default async function LastPage({ params }) {
  const t = await getTranslations('last');
  const { page: pageSegment } = await params;
  const page = parseInt(pageSegment?.[0] || "1", 10);

  const [{ toons, total }, goodPlace, lastComments] = await Promise.all([
    getLastToons(page, PER_PAGE),
    getGoodPlaceCurrent(),
    getLastComments(),
  ]);

  const userMap = await resolveUsernames(toons);
  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <div id="content_wrap">
      <div id="content">
        <div className="content_left">
          <h1>
            <a href="/last" className="nmenu selected">{t('oldschool')}</a>
            {" | "}
            <a href="/static" className="nmenu">{t('static')}</a>
            {" | "}
            <a href="/sandbox" className="nmenu">{t('sandbox')}</a>
          </h1>

          <UrlPaginator basePath="/last" currentPage={page} totalPages={totalPages} />

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
          </div>

          <UrlPaginator basePath="/last" currentPage={page} totalPages={totalPages} />
        </div>

        <div className="content_right">
          {/* ── Good Place ── */}
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
            </div>
          ) : (
            <div id="good-place-toon" />
          )}

          {/* ── Last comments ── */}
          <h1>{t('lastComments')}</h1>
          <div id="last-comments">
            {lastComments.map((comment, i) => (
              <LastCommentItem key={comment.id ?? i} comment={comment} index={i} />
            ))}
          </div>
        </div>

        <div className="clear" />
      </div>
      <div id="footer_placeholder" />
    </div>
  );
}