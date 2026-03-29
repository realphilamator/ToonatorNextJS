"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import UsernameLink from "./UsernameLink";
import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/config";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LEGACY_BASE = "https://storage.m2inc.dev/retoon/legacyAnimations";
const PREVIEW_BASE = "https://storage.m2inc.dev/retoon/previews";

export default function ToonCard({
  toon,
  username,
  isOwnProfile = false,
  currentUserId = null,
  inAlbum = true,
  onAlbumToggle,
  commentCount: commentCountProp,
}) {
  const t = useTranslations("toonCard");
  const [commentCountFetched, setCommentCountFetched] = useState(null);
  const [continuedFromInfo, setContinuedFromInfo] = useState(null);
  const [albumToggling, setAlbumToggling] = useState(false);

  const commentCount = commentCountProp ?? commentCountFetched;

  const isLegacy = !UUID_RE.test(toon.id);
  const toonHref = toon.is_draft ? `/draft/${toon.id}` : `/toon/${toon.id}`;

  // ── Preview URL ──────────────────────────────────────────────────────────────
  const previewSrc =
    toon.preview_url ||
    (isLegacy
      ? `${LEGACY_BASE}/${toon.id}_100.gif`
      : `${PREVIEW_BASE}/${toon.id}_100.gif`);

  // ── Comment count ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (commentCountProp != null) return;
    apiFetch(`/comments/${toon.id}?limit=0`).then((data) => {
      setCommentCountFetched(Array.isArray(data) ? data.length : 0);
    });
  }, [toon.id, isLegacy, commentCountProp]);

  // ── Fetch continued_from info ────────────────────────────────────────────────
  useEffect(() => {
    if (!toon.continued_from) return;
    apiFetch(`/animations/${toon.continued_from}`).then((data) => {
      if (data) {
        setContinuedFromInfo({
          id: data.id,
          title: data.title || "Untitled",
          username: data.username || "",
        });
      } else {
        setContinuedFromInfo({ id: toon.continued_from, title: "Untitled", username: "" });
      }
    });
  }, [toon.continued_from]);

  // ── Album toggle ─────────────────────────────────────────────────────────────
  async function handleAlbumToggle(e) {
    e.preventDefault();
    if (albumToggling || !onAlbumToggle) return;
    setAlbumToggling(true);
    await onAlbumToggle(toon.id, isLegacy, !inAlbum);
    setAlbumToggling(false);
  }

  const frameCount = toon.frame_count ?? toon.frames ?? 0;
  const title = toon.title || t("untitled");

  // ── ◎ continuation link ──────────────────────────────────────────────────────
  const continuedSymbol = toon.continued_from ? (
    continuedFromInfo ? (
      <Link
        href={`/toon/${continuedFromInfo.id}`}
        title={continuedFromInfo.username
          ? t("framesTooltipWithAuthor", { title: continuedFromInfo.title, author: continuedFromInfo.username })
          : t("framesTooltip", { title: continuedFromInfo.title })}
        style={{ color: "inherit", textDecoration: "none" }}
      >
        ◎
      </Link>
    ) : (
      <span title={t("continuedTooltip")}>◎</span>
    )
  ) : null;

  // ── ♫ sound indicator ────────────────────────────────────────────────────────
  const soundSymbol = toon.has_sound
    ? <span style={{ color: "red" }}>♫</span>
    : null;

  const extras = (continuedSymbol || soundSymbol)
    ? <> {continuedSymbol}{soundSymbol}</>
    : null;

  const frameUnit = frameCount === 1
    ? t("frames", { count: 1 }).replace("1", "").trim()
    : t("frames", { count: 2 }).replace("2", "").trim();
  const frameLabel = frameCount >= 50
    ? <><b>{frameCount}</b>{" "}{frameUnit}{extras}</>
    : <>{t("frames", { count: frameCount })}{extras}</>;

  const commentLabel =
    commentCount === null ? (
      <span className="grayb">...</span>
    ) : commentCount === 0 ? (
      <span className="grayb">{t("noComments")}</span>
    ) : (
      t.rich("comments", { count: commentCount, b: (chunks) => <b>{chunks}</b> })
    );

  return (
    <div
      className={`toon_preview${currentUserId && currentUserId === toon.user_id ? " owned" : ""}${toon.is_draft ? " draft" : ""}`}
    >
      <div className="toon_image">
        <Link href={toonHref} title={title}>
          <img
            src={previewSrc}
            width={200}
            height={100}
            alt={title}
            onError={(e) => { e.currentTarget.src = "/img/avatar100.gif"; }}
          />
        </Link>
      </div>

      <div className="toon_name">
        <Link className="link" href={toonHref}>{title}</Link>
      </div>

      {username ? (
        <div className="toon_tagline">
          <UsernameLink username={username} />, {frameLabel}
        </div>
      ) : (
        <div className="toon_tagline">{frameLabel}</div>
      )}

      <div className="toon_tagline">{commentLabel}</div>

      {/* ── In album toggle — own profile only ────────────────────────────── */}
      {isOwnProfile && (
        <div className="toon_tagline">
          <a
            href="#"
            onClick={handleAlbumToggle}
            style={{
              textDecoration: "underline",
              ...(toon.is_draft ? { color: "#ffffff" } : {}),
            }}
          >
            {inAlbum ? t("inAlbum") : t("notInAlbum")}
          </a>
        </div>
      )}
    </div>
  );
}