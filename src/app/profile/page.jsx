"use client";
import { useState, useEffect } from "react";
import { useTranslations } from 'next-intl';
import UsernameLink from "@/components/UsernameLink";
import UserAvatar from "@/components/UserAvatar";
import { useAuth } from "@/hooks/auth";
import { apiFetch, API_URL, getToken } from "@/lib/config";

const PALETTE = [
  "#000000","#0a0000","#140000","#1e0000","#280000","#320000","#3c0000","#460000",
  "#001400","#001e00","#002800","#003200","#003c00","#004600","#005000","#005a00",
  "#000014","#00001e","#000028","#000032","#00003c","#000046","#000050","#00005a",
  "#140014","#1e001e","#280028","#320032","#3c003c","#460046","#500050","#5a005a",
  "#ff0000","#ff2200","#ff4400","#ff6600","#ff8800","#ffaa00","#ffcc00","#ffee00",
  "#ddff00","#bbff00","#99ff00","#77ff00","#55ff00","#33ff00","#11ff00","#00ff00",
  "#00ff22","#00ff44","#00ff66","#00ff88","#00ffaa","#00ffcc","#00ffee","#00ffff",
  "#00eeff","#00ccff","#00aaff","#0088ff","#0066ff","#0044ff","#0022ff","#0000ff",
  "#cc0000","#cc3300","#cc6600","#cc9900","#cccc00","#99cc00","#66cc00","#33cc00",
  "#00cc00","#00cc33","#00cc66","#00cc99","#00cccc","#0099cc","#0066cc","#0033cc",
  "#0000cc","#3300cc","#6600cc","#9900cc","#cc00cc","#cc0099","#cc0066","#cc0033",
  "#993300","#996600","#999900","#669900","#339900","#009900","#009933","#009966",
  "#006666","#007777","#008888","#009999","#00aaaa","#00bbbb","#33cccc","#66dddd",
  "#99eeee","#ccffff","#eeffff","#ffffff","#ffeeff","#ffccff","#ff99ff","#ff66ff",
  "#ff33ff","#ff00ff","#cc00ff","#9900ff","#6600ff","#3300ff","#0000aa","#000088",
  "#220044","#440033","#660022","#880011","#aa0000","#cc1100","#dd2200","#ee3300",
  "#fff5e6","#ffe8cc","#ffdbb3","#ffce99","#ffc180","#ffb466","#ffa74d","#ff9a33",
  "#ff8d1a","#ff8000","#e67300","#cc6600","#b35900","#994c00","#804000","#663300",
  "#aa8866","#bb9977","#ccaa88","#ddbb99","#eeccaa","#f5ddbb","#faebd7","#fff0dc",
  "#ffffcc","#ffff99","#ffff66","#ffff33","#ffff00","#eeee00","#dddd00","#cccc00",
  "#f0f0f0","#e0e0e0","#d0d0d0","#c0c0c0","#b0b0b0","#a0a0a0","#909090","#808080",
  "#707070","#606060","#505050","#404040","#303030","#202020","#101010","#000000",
  "#cce0ff","#99c2ff","#66a3ff","#3385ff","#0066ff","#0052cc","#003d99","#002966",
  "#001433","#aabbcc","#8899aa","#667788","#445566","#223344","#112233","#001122",
];

export default function SettingsPage() {
  const t = useTranslations('settings');
  const { user, loading: authLoading } = useAuth();

  const RANKS = {
    unknown_animal: { label: t('ranks.unknown_animal.label'), desc: t('ranks.unknown_animal.desc'), alts: ['Hamster', 'Chipmunk'], canApply: true },
    archeologist:   { label: t('ranks.archeologist.label'),   desc: t('ranks.archeologist.desc'),   alts: ['Toddler', 'Treasure Hunter', 'Gravedigger'], canApply: true },
    passer:         { label: t('ranks.passer.label'),          desc: t('ranks.passer.desc'),          alts: ['Horse in a Coat', 'Baba Yaga', 'Ilya Muromets', 'Newcomer'], canApply: false },
    animator:       { label: t('ranks.animator.label'),        desc: t('ranks.animator.desc'),        alts: ['Turuck Makto', 'Zmey Gorynych', 'Artist'], canApply: false },
  };

  const STATUS_LABELS = {
    ordinary: t('statuses.ordinary'),
    cowboy:   t('statuses.cowboy'),
    monarch:  t('statuses.monarch'),
  };

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [birthDate, setBirthDate] = useState('');
  const [showBirthdate, setShowBirthdate] = useState('show');
  const [hideRank, setHideRank] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#005500');
  const [kofiUsername, setKofiUsername] = useState('');
  const [altRank, setAltRank] = useState('');
  const [promotionText, setPromotionText] = useState('');
  const [settingsMsg, setSettingsMsg] = useState(null);
  const [promotionMsg, setPromotionMsg] = useState(null);
  const [saving, setSaving] = useState(false);
  const [submittingPromo, setSubmittingPromo] = useState(false);
  const [username, setUsername] = useState('');
  const [nickIconUrl, setNickIconUrl] = useState(null);
  const [nickIconUploading, setNickIconUploading] = useState(false);
  const [nickIconMsg, setNickIconMsg] = useState(null);
  const [promoUsed, setPromoUsed] = useState(0);
  const [lastPromoDate, setLastPromoDate] = useState(null);
  const [hasPending, setHasPending] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { window.location.href = '/'; return; }

    async function load() {
      const data = await apiFetch('/profiles/me');
      if (!data) { window.location.href = '/'; return; }
      setProfile(data);
      setUsername(data.username);
      setBirthDate(data.birth_date || '');
      setShowBirthdate(data.show_birthdate || 'show');
      setHideRank(data.hide_rank || false);
      setSelectedColor(data.nick_color || '#005500');
      setKofiUsername(data.kofi_username || '');
      setAltRank(data.alt_rank || '');
      setNickIconUrl(data.nick_icon ?? null);

      const stats = await apiFetch('/promotions/stats');
      if (stats) {
        setPromoUsed(stats.used);
        setLastPromoDate(stats.lastDate);
        setHasPending(stats.hasPending);
      }

      setLoading(false);
    }
    load();
  }, [authLoading, user]);

  async function handleSubmit() {
    setSaving(true);
    setSettingsMsg(null);
    try {
      const updateData = {
        birth_date: birthDate,
        show_birthdate: showBirthdate,
        hide_rank: hideRank,
        kofi_username: kofiUsername || null,
        nick_icon: nickIconUrl,
      };
      if (canPickColor) updateData.nick_color = selectedColor;

      const result = await apiFetch('/profiles/me/settings', {
        method: 'PATCH',
        body: JSON.stringify(updateData),
      });

      if (!result) {
        setSettingsMsg({ type: 'err', text: t('errorSaving', { error: 'Failed to save' }) });
      } else {
        setSettingsMsg({ type: 'ok', text: t('savedOk') });
        setTimeout(() => setSettingsMsg(null), 3000);
      }
    } catch (err) {
      setSettingsMsg({ type: 'err', text: t('errorUnexpected', { error: err.message }) });
    }
    setSaving(false);
  }

  async function handlePromotion() {
    if (!promotionText.trim()) {
      setPromotionMsg({ type: 'err', text: t('promotion.errorEmpty') });
      return;
    }
    if (promotionText.trim().length < 20) {
      setPromotionMsg({ type: 'err', text: t('promotion.errorTooShort') });
      return;
    }
    if (promoUsed >= 2) {
      setPromotionMsg({ type: 'err', text: t('promotion.errorLimit') });
      return;
    }
    if (hasPending) {
      setPromotionMsg({ type: 'err', text: t('promotion.errorPending') });
      return;
    }

    setSubmittingPromo(true);
    setPromotionMsg(null);
    try {
      const result = await apiFetch('/promotions', {
        method: 'POST',
        body: JSON.stringify({ message: promotionText.trim() }),
      });
      if (!result) throw new Error('Failed to submit');
      setPromotionMsg({ type: 'ok', text: t('promotion.successMsg') });
      setPromotionText('');
      const stats = await apiFetch('/promotions/stats');
      if (stats) {
        setPromoUsed(stats.used);
        setLastPromoDate(stats.lastDate);
        setHasPending(stats.hasPending);
      }
    } catch (err) {
      setPromotionMsg({ type: 'err', text: t('promotion.errorSubmit', { error: err.message }) });
    }
    setSubmittingPromo(false);
  }

  async function handleIconUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setNickIconUploading(true);
    setNickIconMsg(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${API_URL}/uploads/nick-icon`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: form,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Upload failed');
      setNickIconUrl(json.url);
      setNickIconMsg({ type: 'ok', text: t('usernameIcon.iconSaved') });
      setTimeout(() => setNickIconMsg(null), 3000);
    } catch (err) {
      setNickIconMsg({ type: 'err', text: err.message });
    } finally {
      setNickIconUploading(false);
      e.target.value = '';
    }
  }

  async function handleIconRemove() {
    setNickIconUploading(true);
    setNickIconMsg(null);
    try {
      const result = await apiFetch('/uploads/nick-icon', { method: 'DELETE' });
      if (!result) throw new Error('Remove failed');
      setNickIconUrl(null);
      setNickIconMsg({ type: 'ok', text: t('usernameIcon.iconRemoved') });
      setTimeout(() => setNickIconMsg(null), 3000);
    } catch (err) {
      setNickIconMsg({ type: 'err', text: err.message });
    } finally {
      setNickIconUploading(false);
    }
  }

  const rank = profile?.rank || 'archeologist';
  const rankDef = RANKS[rank] || RANKS['archeologist'];
  const statusRaw = (profile?.status || 'ordinary').toLowerCase();
  const statusLabel = STATUS_LABELS[statusRaw] ?? statusRaw;
  const canPickColor = statusRaw === 'cowboy' || statusRaw === 'monarch';
  const isBoyar = statusRaw === 'monarch';
  const isPatreon = profile?.patreon_status === 'active';
  const submitDisabled = submittingPromo || promoUsed >= 2 || hasPending;

  if (loading || authLoading) return <div className="loading">{t('loading')}</div>;

  return (
    <div id="content_wrap">
      <div id="content">
        <div className="userprofile wrap">
          <div className="content_right sidebar">
            <div className="center">
              <h3 id="profile_username_wrap">
                <UsernameLink username={username} />
              </h3>
            </div>
            <div className="center">
              <UserAvatar username={username} size={100} className="p200" />
            </div>
            <nav className="settingsNav">
              <ul className="leftmenu">
                <li><a href={`/user/${username}`}>{t('nav.myPage')}</a></li>
                <li><a href="/profile" className="selected">{t('nav.settings')}</a></li>
                <li><a href="/profile/change-password">{t('nav.changePassword')}</a></li>
                <li><a href="/profile/blacklist">{t('nav.blacklist')}</a></li>
              </ul>
            </nav>
          </div>

          <div className="content_left panel">
            <h1 className="pageTitle">{t('pageTitle')}</h1>
            {settingsMsg && <div className={`msg ${settingsMsg.type}`}>{settingsMsg.text}</div>}

            <section className="section">
              <h2 className="sectionTitle">{t('aboutMe.title')}</h2>
              <hr className="divider" />
              <div className="field">
                <span className="label">{t('aboutMe.birthDate')}</span>
                <input type="text" className="birthInput" placeholder="DD.MM.YYYY" value={birthDate} onChange={e => setBirthDate(e.target.value)} />
                <select value={showBirthdate} onChange={e => setShowBirthdate(e.target.value)}>
                  <option value="show">{t('aboutMe.showBirthdate')}</option>
                  <option value="hide">{t('aboutMe.hideBirthdate')}</option>
                  <option value="age_only">{t('aboutMe.ageOnly')}</option>
                </select>
              </div>
            </section>

            <section className="section">
              <h2 className="sectionTitle">{t('rankStatus.title')}</h2>
              <hr className="divider" />
              <div className="rankField">
                <span>{t('rankStatus.rankLabel')}</span>
                <select disabled value={rank}>
                  {Object.entries(RANKS).map(([key, r]) => (
                    <option key={key} value={key}>{r.label}</option>
                  ))}
                </select>
                <a href="/wiki/ranks" target="_blank">{t('rankStatus.moreAboutRanks')}</a>
              </div>
              {isBoyar && (
                <div className="rankField">
                  <span>{t('rankStatus.displayAs')}</span>
                  <select value={altRank} onChange={e => setAltRank(e.target.value)}>
                    <option value="">{rankDef.label} {t('rankStatus.default')}</option>
                    {rankDef.alts.map(alt => <option key={alt} value={alt}>{alt}</option>)}
                  </select>
                </div>
              )}
              <div className="checkbox">
                <input type="checkbox" id="hide_rank" checked={hideRank} onChange={e => setHideRank(e.target.checked)} />
                <label htmlFor="hide_rank">{t('rankStatus.hideRank')}</label>
              </div>
              <div className="statusLine">
                {t('rankStatus.statusLabel')}{' '}<span className="statusName">{statusLabel}</span>.{' '}
                <a href="/wiki/statuses" target="_blank">{t('rankStatus.moreAboutStatus')}</a>
              </div>
            </section>

            {rankDef.canApply && (
              <section className="section">
                <h2 className="sectionTitle">{t('promotion.title')}</h2>
                <hr className="divider" />
                <div className="promotionInfo">
                  {t.rich('promotion.info', { rank: rankDef.label, desc: rankDef.desc, b: (c) => <strong>{c}</strong> })}
                </div>
                <div className="promotionCooldown">
                  {hasPending ? (
                    <span style={{ color: '#e6a817' }}>{t('promotion.pending')}</span>
                  ) : lastPromoDate ? (
                    t('promotion.lastRequest', { date: lastPromoDate, used: promoUsed })
                  ) : (
                    t('promotion.noRequests')
                  )}
                </div>
                <textarea className="promotionTextarea" placeholder={t('promotion.placeholder')} value={promotionText} onChange={e => setPromotionText(e.target.value)} disabled={submitDisabled} />
                <button className="promotionBtn" onClick={handlePromotion} disabled={submitDisabled}>
                  {submittingPromo ? t('promotion.sending') : t('promotion.sendButton')}
                </button>
                {promotionMsg && <div className={`msg ${promotionMsg.type} promoMsg`}>{promotionMsg.text}</div>}
              </section>
            )}

            <section className="section">
              <h2 className="sectionTitle">{t('nickColor.title')}</h2>
              <hr className="divider" />
              {canPickColor ? (
                <>
                  <div className="nickNote">{t('nickColor.cooldownNote')}</div>
                  <div className="nickPreview"><span style={{ color: selectedColor }}>{username}</span></div>
                  <div className="palette">
                    <div className="paletteGrid">
                      {PALETTE.map((color, i) => (
                        <button key={`${color}-${i}`} className={`swatch ${selectedColor === color ? 'selected' : ''}`} style={{ backgroundColor: color }} title={color} onClick={() => setSelectedColor(color)} />
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="nickNote">{t('nickColor.notAllowed')}</div>
              )}
            </section>

            <section className="section">
              <h2 className="sectionTitle">{t('usernameIcon.title')}</h2>
              <hr className="divider" />
              {isPatreon ? (
                <>
                  <div className="nickNote">{t('usernameIcon.patreonNote')}</div>
                  {nickIconUrl ? (
                    <div className="nickPreview">
                      <span className="username withicon" style={{ background: `url(${nickIconUrl}) no-repeat`, backgroundSize: '16px' }}>{username}</span>
                    </div>
                  ) : (
                    <div className="nickNote">{t('usernameIcon.noIcon')}</div>
                  )}
                  <div className="field">
                    <input id="nick_icon_upload" type="file" accept="image/png,image/jpeg,image/gif,image/webp" style={{ display: 'none' }} onChange={handleIconUpload} disabled={nickIconUploading} />
                    <button disabled={nickIconUploading} onClick={() => document.getElementById('nick_icon_upload').click()}>
                      {nickIconUploading ? t('usernameIcon.uploading') : nickIconUrl ? t('usernameIcon.changeIcon') : t('usernameIcon.uploadIcon')}
                    </button>
                    {nickIconUrl && (
                      <button style={{ marginLeft: 10 }} disabled={nickIconUploading} onClick={handleIconRemove}>
                        {t('usernameIcon.removeIcon')}
                      </button>
                    )}
                  </div>
                  {nickIconMsg && <div className={`msg ${nickIconMsg.type}`}>{nickIconMsg.text}</div>}
                </>
              ) : (
                <div className="nickNote">
                  {t('usernameIcon.notPatreon')}{' '}
                  {profile?.patreon_user_id ? (
                    <a href="https://www.patreon.com/ToonatorRevival/join" target="_blank" rel="noopener noreferrer">{t('usernameIcon.upgradeLink')}</a>
                  ) : (
                    <button onClick={() => { window.location.href = `/api/patreon/connect`; }}>
                      {t('usernameIcon.connectPatreon')}
                    </button>
                  )}
                </div>
              )}
            </section>

            <section className="section">
              <h2 className="sectionTitle">{t('spoodersPatreon.title')}</h2>
              <hr className="divider" />
              <div className="nickNote">
                {t.rich('spoodersPatreon.note', { count: profile?.spiders ?? 0, b: (c) => <strong>{c}</strong> })}
              </div>
              <div className="field">
                {profile?.patreon_user_id ? (
                  <>
                    <span style={{ color: 'green' }}>{t('spoodersPatreon.connected')}</span>
                    <button style={{ marginLeft: 12 }} onClick={async () => {
                      await apiFetch('/profiles/me/settings', {
                        method: 'PATCH',
                        body: JSON.stringify({ patreon_user_id: null, patreon_status: 'inactive', patreon_tier: null }),
                      });
                      setProfile(p => ({ ...p, patreon_user_id: null, patreon_status: 'inactive', patreon_tier: null }));
                    }}>
                      {t('spoodersPatreon.disconnect')}
                    </button>
                  </>
                ) : (
                  <button className="complete" onClick={() => { window.location.href = `/api/patreon/connect`; }}>
                    {t('spoodersPatreon.connect')}
                  </button>
                )}
              </div>
            </section>

            <div className="submitRow">
              <button onClick={handleSubmit} disabled={saving}>
                {saving ? t('saving') : t('submit')}
              </button>
            </div>
          </div>
        </div>
        <div style={{ clear: 'both' }} />
      </div>
    </div>
  );
}