import { notFound } from "next/navigation";
import { getTranslations } from 'next-intl/server';
import { apiFetch } from "@/lib/config";
import DraftClient from "./DraftClient";

const STORAGE_URL = 'https://storage.m2inc.dev/retoon';

function isLegacyId(id) {
  return /^[a-zA-Z0-9]{3,16}$/.test(id) && !/^[0-9a-f]{8}-/.test(id);
}

async function getContinuedFrom(continuedFromId) {
  if (!continuedFromId) return null;
  const legacy = isLegacyId(continuedFromId);
  const endpoint = legacy
    ? `/legacy-animations/${continuedFromId}`
    : `/animations/${continuedFromId}`;
  const data = await apiFetch(endpoint);
  if (!data) return null;
  return {
    id: data.id,
    title: data.title || "Untitled",
    author: data.username || "unknown",
    legacy,
  };
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const t = await getTranslations('metadata.draft');
  const legacy = isLegacyId(id);
  const endpoint = legacy ? `/legacy-animations/${id}` : `/animations/${id}`;
  const data = await apiFetch(endpoint);
  if (!data) return { title: t('fallbackTitle') };
  const displayTitle = data.title || t('untitled');
  const previewUrl = legacy
    ? `${STORAGE_URL}/legacyAnimations/${id}_100.gif`
    : `${STORAGE_URL}/previews/${id}_100.gif`;
  return {
    title: `${displayTitle} ${t('titleSuffix')}`,
    description: data.description || data.title || t('fallbackDescription'),
    openGraph: {
      title: `${displayTitle} ${t('titleSuffix')}`,
      description: data.description || "",
      images: [previewUrl],
    },
  };
}

export default async function DraftPage({ params }) {
  const { id } = await params;
  const legacy = isLegacyId(id);
  const endpoint = legacy ? `/legacy-animations/${id}` : `/animations/${id}`;
  const toon = await apiFetch(endpoint);
  if (!toon) notFound();

  const author = { username: toon.username || "unknown" };
  const continuedFrom = await getContinuedFrom(toon.continued_from);

  return (
    <DraftClient
      toonId={id}
      toon={toon}
      author={author}
      continuedFrom={continuedFrom}
      isLegacy={legacy}
    />
  );
}