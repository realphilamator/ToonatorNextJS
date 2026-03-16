"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import UsernameLink from "./UsernameLink";
import { useState, useEffect } from "react";
import { db } from "@/lib/config";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function ToonCard({
  toon,
  username,
  isOwnProfile = false,
  currentUserId = null,
  inAlbum,
  onAlbumToggle,
}) {
  const t = useTranslations("toonCard");
  const [commentCount, setCommentCount] = useState(null);
  const [continuedFromInfo, setContinuedFromInfo] = useState(null);
  const [albumToggling, setAlbumToggling] = useState(false);

  const isLegacy = !UUID_RE.test(toon.id);
  const toonHref = toon.is_draft ? `/draft/${toon.id}` : `/toon/${toon.id}`;

  // ── Comment count ────────────────────────────────────────────────────────────
  useEffect(() => {
    const column = isLegacy ? "legacy_animation_id" : "animation_id";
    db.from("comments")
      .select("*", { count: "exact", head: true })
      .eq(column, toon.id)
      .then(({ count }) => setCommentCount(count || 0));
  }, [toon.id, isLegacy]);

  // ── Fetch continued_from info ────────────────────────────────────────────────
  useEffect(() => {
    if (!toon.continued_from) return;

    const isLegacyContinuation = !UUID_RE.test(toon.continued_from);
    const table = isLegacyContinuation ? "legacy_animations" : "animations";

    db.from(table)
      .select("id, title, profiles(username)")
      .eq("id", toon.continued_from)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setContinuedFromInfo({
            id: data.id,
            title: data.title || "Untitled",
            username: data.profiles?.username || "",
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

  const frameCount = toon.frame_count ?? 0;
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

  // Extract just the unit word from the ICU plural string for the bold-number variant
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
            src={toon.preview_url}
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