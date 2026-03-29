import "@/styles/globals.css";
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import Includes from "@/components/Includes";
import LocaleSwitcher from "@/components/LocaleSwitcher";

export default async function RootLayout({ children }) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <head>
        <meta charSet="UTF-8" />
        <link rel="shortcut icon" href="/img/favicon-eyes.png" />
        <link rel="stylesheet" href="/css/style.css" />
        <link rel="stylesheet" href="/css/font.css" />
        <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5527734260417462"
          crossorigin="anonymous"></script>
        <link rel="stylesheet" href={locale === 'ru' ? '/css/images_ru.css' : '/css/images.css'} />
        <script src="/js/config.js"defer></script>
        <script src="/js/auth.js" defer></script>
      </head>
      <body>
        <div id="donate_placeholder" />
        <div id="header_placeholder" />
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Includes locale={locale} />
          <LocaleSwitcher currentLocale={locale} />
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}