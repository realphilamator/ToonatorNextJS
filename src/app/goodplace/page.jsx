// src/app/goodplace/page.jsx
import { getTranslations } from 'next-intl/server';
import { getGoodPlaceCurrent, getGoodPlaceHistory } from '@/lib/api';
import GoodPlaceClient from './GoodPlaceClient';

export async function generateMetadata() {
  const t = await getTranslations('metadata.goodPlace');
  return {
    title: t('title'),
    description: t('description'),
  };
}

export const revalidate = 60;

export default async function GoodPlacePage({ searchParams }) {
  const resolvedParams = await searchParams;
  const page = Math.max(1, parseInt(resolvedParams?.page || '1', 10));
  const [current, { entries: history, total }] = await Promise.all([
    getGoodPlaceCurrent(),
    getGoodPlaceHistory(page, 16),
  ]);
  return (
    <GoodPlaceClient
      initialCurrent={current}
      initialHistory={history}
      initialTotal={total}
      initialPage={page}
    />
  );
}