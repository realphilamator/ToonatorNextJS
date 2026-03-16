import { getTranslations } from 'next-intl/server';

export default async function NotFound() {
  const t = await getTranslations('notFound');
  return (
    <div id="content_wrap">
      <div id="content">
        <h1>{t('title')}</h1>
      </div>
      <div id="footer_placeholder" />
    </div>
  );
}