// src/app/toon/[id]/page.jsx
import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import { getTranslations } from 'next-intl/server';
import ToonClient from "./ToonClient";

const SUPABASE_URL = "https://ytyhhmwnnlkhhpvsurlm.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0eWhobXdubmxraGhwdnN1cmxtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NzcwNTAsImV4cCI6MjA4ODU1MzA1MH0.XZVH3j6xftSRULfhdttdq6JGIUSgHHJt9i-vXnALjH0";

const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function isLegacyId(id) {
  return /^[a-zA-Z0-9]{3,16}$/.test(id);
}

async function getAuthorData(userId) {
  if (!userId) return { username: "unknown" };
  const { data } = await db.rpc("get_user_by_id", { p_user_id: userId });
  if (!data || data.length === 0) return { username: "unknown" };
  return { username: data[0].username || "unknown" };
}

async function getContinuedFrom(id, isLegacy) {
  if (!id) return null;
  if (isLegacy || isLegacyId(id)) {
    const { data } = await db.from("legacy_animations").select("id,title,user_id").eq("id", id).maybeSingle();
    if (!data) return null;
    const author = await getAuthorData(data.user_id);
    return { id: data.id, title: data.title || "Untitled", author: author.username, legacy: true };
  } else {
    const { data } = await db.from("animations").select("id,title,user_id").eq("id", id).maybeSingle();
    if (!data) return null;
    const author = await getAuthorData(data.user_id);
    return { id: data.id, title: data.title || "Untitled", author: author.username, legacy: false };
  }
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const t = await getTranslations('metadata.toon');
  const legacy = isLegacyId(id);
  const table = legacy ? "legacy_animations" : "animations";
  const { data } = await db.from(table).select("title,description").eq("id", id).maybeSingle();
  if (!data) return { title: t('fallbackTitle') };
  const displayTitle = data.title || t('untitled', { defaultValue: 'Untitled' });
  return {
    title: `${displayTitle} ${t('titleSuffix')}`,
    description: data.description || data.title || t('fallbackDescription'),
    openGraph: {
      title: `${displayTitle} ${t('titleSuffix')}`,
      description: data.description || "",
      images: [legacy
        ? `${SUPABASE_URL}/storage/v1/object/public/legacyAnimations/${id}_100.gif`
        : `${SUPABASE_URL}/storage/v1/object/public/previews/${id}_100.gif`
      ],
    },
  };
}

export default async function ToonPage({ params }) {
  const { id } = await params;
  const legacy = isLegacyId(id);
  const table = legacy ? "legacy_animations" : "animations";

  const { data: toon } = await db.from(table).select("*").eq("id", id).maybeSingle();
  if (!toon) notFound();

  const [author, continuedFrom, comments, likeCount] = await Promise.all([
    getAuthorData(toon.user_id),
    getContinuedFrom(toon.continued_from, legacy),
    db.from("comments")
      .select("id,text,created_at,author_username,user_id")
      .eq(legacy ? "legacy_animation_id" : "animation_id", id)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(r => r.data || []),
    db.from("likes")
      .select("*", { count: "exact", head: true })
      .eq(legacy ? "legacy_animation_id" : "animation_id", id)
      .then(r => r.count || 0),
  ]);

  return (
    <ToonClient
      toonId={id}
      toon={toon}
      author={author}
      continuedFrom={continuedFrom}
      initialComments={comments}
      initialLikeCount={likeCount}
      isLegacy={legacy}
    />
  );
}