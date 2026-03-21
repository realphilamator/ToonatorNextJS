import { notFound } from "next/navigation";
import { getTranslations } from 'next-intl/server';
import ToonClient from "./ToonClient";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const STORAGE_URL = 'https://storage.m2inc.dev/ReToon';

function isLegacyId(id) {
  return /^[a-zA-Z0-9]{3,16}$/.test(id) && !/^[0-9a-f]{8}-/.test(id);
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const t = await getTranslations('metadata.toon');
  const legacy = isLegacyId(id);

  const res = await fetch(`${API_URL}/${legacy ? 'legacy-animations' : 'animations'}/${id}`);
  if (!res.ok) return { title: t('fallbackTitle') };
  const data = await res.json();

  const displayTitle = data.title || t('untitled', { defaultValue: 'Untitled' });
  return {
    title: `${displayTitle} ${t('titleSuffix')}`,
    description: data.description || data.title || t('fallbackDescription'),
    openGraph: {
      title: `${displayTitle} ${t('titleSuffix')}`,
      description: data.description || "",
      images: [legacy
        ? `${STORAGE_URL}/legacyAnimations/${id}_100.gif`
        : `${STORAGE_URL}/previews/${id}_100.gif`
      ],
    },
  };
}

export default async function ToonPage({ params }) {
  const { id } = await params;
  const legacy = isLegacyId(id);

  const [toonRes, commentsRes, likeRes] = await Promise.all([
    fetch(`${API_URL}/${legacy ? 'legacy-animations' : 'animations'}/${id}`),
    fetch(`${API_URL}/comments/${id}?limit=50`),
    fetch(`${API_URL}/likes/${id}/count`),
  ]);

  if (!toonRes.ok) notFound();

  const toon = await toonRes.json();
  const comments = commentsRes.ok ? await commentsRes.json() : [];
  const likeData = likeRes.ok ? await likeRes.json() : { count: 0 };

  const authorRes = await fetch(`${API_URL}/profiles/by-id/${toon.user_id}`);
  const author = authorRes.ok ? await authorRes.json() : { username: 'unknown' };

  let continuedFrom = null;
  if (toon.continued_from) {
    const contLegacy = isLegacyId(toon.continued_from);
    const contRes = await fetch(`${API_URL}/${contLegacy ? 'legacy-animations' : 'animations'}/${toon.continued_from}`);
    if (contRes.ok) {
      const contData = await contRes.json();
      const contAuthorRes = await fetch(`${API_URL}/profiles/by-id/${contData.user_id}`);
      const contAuthor = contAuthorRes.ok ? await contAuthorRes.json() : { username: 'unknown' };
      continuedFrom = { id: contData.id, title: contData.title || 'Untitled', author: contAuthor.username, legacy: contLegacy };
    }
  }

  return (
    <ToonClient
      toonId={id}
      toon={toon}
      author={author}
      continuedFrom={continuedFrom}
      initialComments={comments}
      initialLikeCount={likeData.count ?? toon.likes ?? 0}
      isLegacy={legacy}
    />
  );
}