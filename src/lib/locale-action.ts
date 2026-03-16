'use server';

import { cookies } from 'next/headers';
import { locales, defaultLocale, type Locale } from 'i18n/request';

export async function setLocaleCookie(locale: string) {
  const validated: Locale = (locales as readonly string[]).includes(locale)
    ? (locale as Locale)
    : defaultLocale;

  const cookieStore = await cookies();
  cookieStore.set('locale', validated, {
    path: '/',
    sameSite: 'lax',
    // 1 year
    maxAge: 60 * 60 * 24 * 365,
  });
}