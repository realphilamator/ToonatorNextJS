"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from 'next-intl';
import { useAuth } from "@/hooks/auth";

const KOFI_URL = "https://ko-fi.com/riverwagner";
const BOOSTY_URL = "https://boosty.to/multator";

function PayButton({ method }) {
  const iconSpan = (
    <span className={`spooders-pay-icon ${method.cls}`} aria-hidden="true" />
  );
  const labelSpan = (
    <span className="spooders-pay-label">{method.label}</span>
  );
  if (!method.href) {
    return (
      <span
        className="spooders-pay-item spooders-pay-item--disabled"
        title={method.label}
      >
        {iconSpan}
        {labelSpan}
      </span>
    );
  }
  if (method.external) {
    return (
      <a
        href={method.href}
        className="spooders-pay-item"
        title={method.label}
        target="_blank"
        rel="noopener noreferrer"
      >
        {iconSpan}
        {labelSpan}
      </a>
    );
  }
  return (
    <Link href={method.href} className="spooders-pay-item" title={method.label}>
      {iconSpan}
      {labelSpan}
    </Link>
  );
}

export default function SpoodersPurchasePage() {
  const t = useTranslations('spidersBuy');
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/spiders/");
    }
  }, [user, loading, router]);

  const username = user?.user_metadata?.username ?? null;

  const paymentMethods = [
    { id: "ko-fi",   label: "Ko-fi",   cls: "pay-icon-kofi",    href: KOFI_URL,                  external: true  },
    { id: "patreon", label: "Patreon", cls: "pay-icon-patreon", href: "https://www.patreon.com/ToonatorRevival/join",  external: true },
    { id: "boosty",  label: "Boosty",  cls: "pay-icon-boosty",  href: BOOSTY_URL,                external: true  },
  ];

  if (loading || !user) return null;

  return (
    <div id="content_wrap">
      <div id="content">
        <h3>
          <Link href="/spiders/">{t('breadcrumb').split(' — ')[0]}</Link>
          {" \u2014 "}
          {t('breadcrumb').split(' — ')[1]}
        </h3>
        <p>{t('intro')}</p>
        <b>{t('chooseMethod')}</b>
        <div className="spooders-pay-grid">
          {paymentMethods.map((method) => (
            <PayButton key={method.id} method={method} />
          ))}
        </div>
        <p className="spooders-rate">
          {t.rich('rate', {
            red: (chunks) => <span className="red">{chunks}</span>,
          })}
        </p>
        <p className="spooders-message-hint">
          {t.rich('messageHint', {
            username,
            b: (chunks) => <b>{chunks}</b>,
          })}
        </p>
      </div>
      <div id="footer_placeholder" />
    </div>
  );
}