'use client';

// src/app/goodplace/GoodPlaceClient.jsx

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/hooks/auth';
import { buyGoodPlace, getGoodPlaceCurrent, getGoodPlaceHistory } from '@/lib/api';
import ToonCard from '@/components/ToonCard';
import UsernameLink from '@/components/UsernameLink';
import { UrlPaginator } from '@/components/paginator';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pad(n) {
  return String(n).padStart(2, '0');
}

function parseToonInput(raw) {
  const s = raw.trim();

  const urlMatch = s.match(/\/toon\/([A-Za-z0-9_-]+)/);
  if (urlMatch) {
    const id = urlMatch[1];
    return { toonId: id, isLegacy: id.length <= 12 };
  }

  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)) {
    return { toonId: s, isLegacy: false };
  }

  if (/^[A-Za-z0-9]{11,12}$/.test(s)) {
    return { toonId: s, isLegacy: true };
  }

  return null;
}

function formatExpiry(isoString) {
  if (!isoString) return '—';
  const d = new Date(isoString);
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function ToonMedals({ count }) {
  if (!count) return null;
  const offsets = [7, 12, 17, 22, 27];
  return (
    <>
      {offsets.slice(0, Math.min(count, 5)).map((left) => (
        <img
          key={left}
          className="toonmedal"
          style={{ left }}
          src="/img/medal.gif"
          alt="medal"
        />
      ))}
    </>
  );
}

// ─── Current toon card ───────────────────────────────────────────────────────

function CurrentToonCard({ toon, username }) {
  const t = useTranslations('goodPlace');

  if (!toon) return null;
  const framesBold = toon.frames > 99;

  return (
    <div className="toon_preview large" style={{ float: 'left', marginRight: '10px' }}>
      {toon.medal_count > 0 && <ToonMedals count={toon.medal_count} />}
      <div className="toon_image">
        <Link href={`/toon/${toon.id}`} title={toon.title}>
          <img src={toon.preview_url} alt={toon.title} title={toon.title} />
        </Link>
      </div>
      <div className="toon_name">
        <Link className="link" href={`/toon/${toon.id}`}>{toon.title}</Link>
      </div>
      <div className="toon_tagline">
        {username
          ? <UsernameLink username={username} />
          : <a className="username anonymous">%ANONYMOUS%</a>
        }
        {', '}
        {framesBold ? <b>{toon.frames}</b> : toon.frames}
        {' '}
        {t('frames', { count: toon.frames })}
      </div>
      <div className="toon_tagline">
        {toon.comment_count > 0
          ? t('comments', { count: toon.comment_count })
          : <span className="grayb">{t('noComments')}</span>
        }
      </div>
    </div>
  );
}

// ─── Acquire form ─────────────────────────────────────────────────────────────

function AcquireForm({ minBid, onSuccess }) {
  const t = useTranslations('goodPlace');
  const { user, spiders } = useAuth();
  const [toonUrl, setToonUrl]   = useState('');
  const [bidAmount, setBidAmount] = useState(minBid);
  const [formInfo, setFormInfo] = useState(null);
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    setBidAmount((prev) => Math.max(prev, minBid));
  }, [minBid]);

  if (!user) {
    return <span>{t('onlyRegistered')}</span>;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormInfo({ ok: true, msg: '...' });

    const parsed = parseToonInput(toonUrl);
    if (!parsed) {
      setFormInfo({ ok: false, msg: t('errorWrongUrl') });
      return;
    }
    const { toonId, isLegacy } = parsed;

    if (isNaN(bidAmount) || bidAmount < minBid) {
      setFormInfo({ ok: false, msg: t('errorWrongSpiders') });
      return;
    }

    setLoading(true);
    const result = await buyGoodPlace(toonId, isLegacy, bidAmount);
    setLoading(false);

    if (result.success) {
      setFormInfo({ ok: true, msg: result.message });
      setToonUrl('');
      onSuccess(result);
    } else {
      setFormInfo({ ok: false, msg: result.message });
    }
  }

  return (
    <div>
      <div style={{ fontSize: '10px', color: '#555', marginBottom: '4px' }}>
        {t.rich('yourBalance', {
          count: spiders,
          b: (chunks) => <b>{chunks}</b>,
        })}
      </div>
      <div className="form">
        <div className="p" style={{ width: '755px' }}>
          <label>{t('toonUrlLabel')}</label>
          <input
            id="reg_toon"
            type="text"
            className="text"
            placeholder={t('toonUrlPlaceholder')}
            value={toonUrl}
            onChange={(e) => setToonUrl(e.target.value)}
            disabled={loading}
          />
        </div>
        <div className="p" style={{ width: '755px' }}>
          <label>{t('spidersLabel', { min: minBid })}</label>
          <input
            id="reg_spiders"
            type="number"
            style={{ width: '80px' }}
            min={minBid}
            value={bidAmount}
            onChange={(e) => setBidAmount(Number(e.target.value))}
            disabled={loading}
          />
        </div>
        <div className="ps" style={{ width: '755px' }}>
          <button
            id="reg_buy"
            onClick={handleSubmit}
            disabled={loading || !toonUrl}
          >
            {t('acquireButton')}
          </button>
        </div>
        {formInfo && (
          <div
            id="form_info"
            style={{ marginTop: '5px', color: formInfo.ok ? 'green' : 'red' }}
          >
            {formInfo.msg}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function GoodPlaceClient({
  initialCurrent,
  initialHistory,
  initialTotal,
  initialPage = 1,
}) {
  const t = useTranslations('goodPlace');
  const [current, setCurrent] = useState(initialCurrent);
  const [history, setHistory] = useState(initialHistory);
  const [total, setTotal]     = useState(initialTotal);

  const isFree     = !current;
  const minBid     = current ? current.min_next_bid : 1;
  const totalPages = Math.ceil(total / 16);

  async function handleBidSuccess() {
    const fresh = await getGoodPlaceCurrent();
    setCurrent(fresh);
    const { entries, total: newTotal } = await getGoodPlaceHistory(1, 16);
    setHistory(entries);
    setTotal(newTotal);
  }

  return (
    <div id="content_wrap">
      <div id="content">

        <h2>{t('title')}</h2>
        <p>{t('description')}</p>
        <p>
          {t.rich('spoodersNeeded', {
            link: (chunks) => <Link href="/spiders/">{chunks}</Link>,
          })}
        </p>
        <p>
          {t.rich('occupiedDuration', {
            b: (chunks) => <b>{chunks}</b>,
          })}
        </p>
        <p>{t('anyToon')}</p>
        <p>{t('illegalWarning')}</p>

        {current && (
          <CurrentToonCard
            toon={current.toon}
            username={typeof current.author === 'string' ? current.author : current.author?.username || null}
          />
        )}

        <div>
          {isFree ? (
            <>
              <h2>{t('placeIsFree')}</h2>
              <p>{t('minimumBid', { count: minBid })}</p>
            </>
          ) : (
            <>
              <h2>{t('placeIsAcquired')}</h2>
              <p>
                {t('lastBid', { count: current.bid_amount })}<br />
                {t('acquiredTill', { expiry: formatExpiry(current.expires_at) })}<br />
                {t('minimumBid', { count: minBid })}<br />
              </p>
            </>
          )}
          <h2>{t('acquireTitle')}</h2>
          <AcquireForm minBid={minBid} onSuccess={handleBidSuccess} />
        </div>

        <div className="clear" />
        <br /><br />

        <h1>{t('previousCartoons')}</h1>

        <UrlPaginator
          basePath="/goodplace"
          currentPage={initialPage}
          totalPages={totalPages}
        />

        <div className="toons_container">
          <div className="toons_list">
            {history.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#888', padding: '20px' }}>
                {t('noHistory')}
              </div>
            ) : (
              history.map((entry) => (
                <ToonCard
                  key={entry.id}
                  toon={entry.toon}
                  username={entry.author?.username || 'unknown'}
                  extraTaglines={[
                    t('spooders', { count: entry.bid_amount })
                  ]}
                />
              ))
            )}
          </div>
        </div>

        <UrlPaginator
          basePath="/goodplace"
          currentPage={initialPage}
          totalPages={totalPages}
        />

        <div style={{ clear: 'both' }} />
      </div>
    </div>
  );
}