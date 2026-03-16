import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';

export const locales = ['en', 'ru'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';

export default getRequestConfig(async () => {
  // Read locale from cookie, fall back to default
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get('locale')?.value;
  const locale: Locale =
    cookieLocale && (locales as readonly string[]).includes(cookieLocale)
      ? (cookieLocale as Locale)
      : defaultLocale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});