'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setLocaleCookie } from '@/lib/locale-action';

const LOCALES = ['en', 'ru'] as const;

interface LocaleSwitcherProps {
  currentLocale: string;
}

export default function LocaleSwitcher({ currentLocale }: LocaleSwitcherProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleChange(newLocale: string) {
    if (newLocale === currentLocale || isPending) return;
    startTransition(async () => {
      await setLocaleCookie(newLocale);
      router.refresh();
    });
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '12px',
      right: '12px',
      display: 'flex',
      gap: '6px',
      zIndex: 9999,
    }}>
      {LOCALES.map((locale) => {
        const isActive = locale === currentLocale;
        return (
          <button
            key={locale}
            onClick={() => handleChange(locale)}
            disabled={isPending}
            title={locale.toUpperCase()}
            style={{
              padding: 0,
              border: isActive ? '2px solid #555' : '2px solid transparent',
              borderRadius: '3px',
              background: 'none',
              cursor: isActive ? 'default' : 'pointer',
              opacity: isPending ? 0.5 : 1,
              lineHeight: 0,
            }}
          >
            <img
              src={`/img/flag/${locale === 'en' ? 'us' : locale}.png`}
              alt={locale.toUpperCase()}
              width={16}
              height={11}
              style={{ display: 'block' }}
            />
          </button>
        );
      })}
    </div>
  );
}