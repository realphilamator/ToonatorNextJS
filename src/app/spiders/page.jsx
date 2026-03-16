'use client';
import { use, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import Includes from "@/components/Includes";
import { useAuth } from '@/hooks/auth';
import { formatDate, getSpooderTransactions, describeSpooderTransaction } from '@/lib/api';
import { UrlPaginator } from '@/components/paginator';
import { SUPABASE_URL, db } from '@/lib/config';

const PER_PAGE = 20;

function isLegacyId(id) {
  return id && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

function getThumbnailUrl(toonId) {
  if (!toonId) return null;
  const bucket = isLegacyId(toonId) ? 'legacyAnimations' : 'previews';
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${toonId}_100.gif`;
}

async function markAllSpoodersRead(userId) {
  await db
    .from('spooder_transactions')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);
  const spidersA = document.querySelector('#spiders > a');
  const spidersCounter = document.querySelector('#spiders .counter');
  if (spidersA) spidersA.classList.remove('active');
  if (spidersCounter) spidersCounter.textContent = '';
}

function LoggedOutPage() {
  const t = useTranslations('spiders');

  return (
    <>
      <Includes />
      <div id="donate_placeholder" />
      <div id="header_placeholder" />
      <div id="content_wrap">
        <div id="content">
          <h2>{t('titleLoggedOut')}</h2>
          <p>{t('whatAre')}</p>
          <h2>{t('howToEarnTitle')}</h2>
          <p>{t('howToEarn')}</p>
          <h2>{t('howToBuyTitle')}</h2>
          <p>
            {t.rich('howToBuyIntro', {
              link: (chunks) => <a href="/register/">{chunks}</a>,
            })}
          </p>
          <p></p>
          <ul style={{ marginLeft: '20px' }}>
            <li>Ko-fi</li>
            <li>Boosty</li>
            <li>Patreon</li>
          </ul>
          <p></p>
          <p>{t('accruedNote')}</p>
          <p></p>
          <p>
            {t('contactNote')} <br />
            E-Mail: <a href="mailto: ToonatorRevival@gmail.com">ToonatorRevival@gmail.com</a> <br />
            Modmail via our <a href="https://discord.gg/xPC4KxhA3p" target="_blank">Discord server</a>
          </p>
        </div>
        <div id="footer_placeholder" />
      </div>
    </>
  );
}

function LoggedInPage({ searchParams }) {
  const t = useTranslations('spiders');
  const resolvedParams = use(searchParams);
  const page = parseInt(resolvedParams?.page ?? '1');

  const { user, spiders } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [total, setTotal] = useState(0);

  const loadTransactions = useCallback(() => {
    if (!user) return;
    getSpooderTransactions(user.id, page, PER_PAGE).then(({ transactions, total }) => {
      setTransactions(transactions);
      setTotal(total);
    });
  }, [user, page]);

  useEffect(() => {
    if (!user) return;
    loadTransactions();
    markAllSpoodersRead(user.id);
  }, [user, page, loadTransactions]);

  useEffect(() => {
    if (!user) return;
    const channel = db
      .channel('spooders-page-' + user.id)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'spooder_transactions', filter: `user_id=eq.${user.id}` },
        () => {
          loadTransactions();
          markAllSpoodersRead(user.id);
        }
      )
      .subscribe();
    return () => db.removeChannel(channel);
  }, [user, loadTransactions]);

  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <div id="content_wrap">
      <div id="content">
        <div className="content_left" style={{ width: "640px" }}>
          <div className="info_spiders">
            {t('balance', { count: spiders })}{' '}
            <Link href="/spiders/buy">{t('buyLink')}</Link>
          </div>

          <UrlPaginator basePath="/spiders" currentPage={page} totalPages={totalPages} />

          <div id="notif_list">
            {transactions.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#888', padding: '20px' }}>
                {t('noActivity')}
              </div>
            ) : (
              transactions.map((tx, i) => {
                const isDebit = tx.amount < 0;
                const label = describeSpooderTransaction(tx);
                const thumbUrl = getThumbnailUrl(tx.toon_id);
                return (
                  <div key={tx.id} className={`notif_row${i % 2 === 0 ? ' gray' : ''}`}>
                    {thumbUrl && tx.toon_id && (
                      <div className="notif_thumb">
                        <a href={`/toon/${tx.toon_id}`}>
                          <img src={thumbUrl} alt="" width={40} height={20} />
                        </a>
                      </div>
                    )}
                    <div className="notif_text">
                      <span className="notif_date">{formatDate(tx.created_at)}:</span>{' '}
                      <span style={{ color: isDebit ? 'red' : 'inherit' }}>
                        {isDebit
                          ? t('debit', { count: Math.abs(tx.amount) })
                          : t('credit', { count: tx.amount })}
                      </span>{' '}
                      <span>{label}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <UrlPaginator basePath="/spiders" currentPage={page} totalPages={totalPages} />
          <div className="clear" />
        </div>

        <div className="content_right" style={{ float: 'right' }}>
          <h1>{t('earnTitle')}</h1>
          <p>{t('earnIntro')}</p>
          <ul style={{ marginLeft: '20px', marginBottom: '10px' }}>
            <li>{t('earnItem1')}</li>
            <li>{t('earnItem2')}</li>
            <li>{t('earnItem3')}</li>
          </ul>

          <h1>{t('buyTitle')}</h1>
          <p>
            {t.rich('buyBody', {
              b: (chunks) => <b>{chunks}</b>,
              link: (chunks) => <Link href="/spiders/buy"><i>{chunks}</i></Link>,
            })}
          </p>
          <p>
            {t.rich('perksNote', {
              i: (chunks) => <i style={{ color: 'purple' }}>{chunks}</i>,
            })}{' '}
            <img src="/img/medal.gif" alt="Medal" />
          </p>

          <h1>{t('spendTitle')}</h1>
          <p>
            {t.rich('spendBody', {
              goodplaceLink: (chunks) => <Link href="/goodplace/"><i>{chunks}</i></Link>,
            })}
          </p>
        </div>

        <div className="clear" />
      </div>
      <div id="footer_placeholder" />
    </div>
  );
}

export default function Page({ searchParams }) {
  const { user } = useAuth();

  if (!user) return <LoggedOutPage />;
  return <LoggedInPage searchParams={searchParams} />;
}