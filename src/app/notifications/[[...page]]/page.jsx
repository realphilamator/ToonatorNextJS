'use client';
import { use, useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/hooks/auth';
import { getNotifications } from '@/lib/api';
import Paginator from '@/components/paginator';
import { formatDate } from '@/lib/api';
import { SUPABASE_URL, db } from '@/lib/config';
import UsernameLink from '@/components/UsernameLink';

const PER_PAGE = 20;

function isLegacyId(id) {
  return id && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

function getThumbnailUrl(toonId) {
  if (!toonId) return null;
  const bucket = isLegacyId(toonId) ? 'legacyAnimations' : 'previews';
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${toonId}_100.gif`;
}

function parseReason(reason) {
  const suffixes = [' liked your toon', ' commented on your toon'];
  for (const suffix of suffixes) {
    if (reason.endsWith(suffix)) {
      const actorsPart = reason.slice(0, reason.length - suffix.length);
      const actors = actorsPart.split(', ').map(s => s.trim()).filter(Boolean);
      return { actors, suffix };
    }
  }
  const match = reason.match(/^(\S+)/);
  return { actors: match ? [match[1]] : [], suffix: reason.slice(match?.[1]?.length ?? 0) };
}

function MentionText({ notification }) {
  const { from_username, message } = notification;
  if (!from_username || !message) return <span>{message || 'mentioned you'}</span>;
  const idx = message.indexOf(from_username);
  if (idx === -1) return <span>{message}</span>;
  const before = message.slice(0, idx);
  const after  = message.slice(idx + from_username.length);
  return (
    <span>
      {before}<UsernameLink username={from_username} />{after}
    </span>
  );
}

export default function NotificationsPage({ searchParams }) {
  const t = useTranslations('notifications');
  const resolvedParams = use(searchParams);

  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(parseInt(resolvedParams?.page ?? '1'));

  const loadNotifications = useCallback((p) => {
    if (!user) return;
    getNotifications(user.id, p, PER_PAGE).then(({ notifications, total }) => {
      setNotifications(notifications);
      setTotal(total);
    });
  }, [user]);

  async function markAllRead(userId) {
    await db
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    const notifyA = document.querySelector('#notify > a');
    const notifyCounter = document.querySelector('#notify .counter');
    if (notifyA) notifyA.classList.remove('active');
    if (notifyCounter) notifyCounter.textContent = '';
  }

  useEffect(() => {
    if (!user) return;
    loadNotifications(page);
    markAllRead(user.id);
  }, [user, page, loadNotifications]);

  useEffect(() => {
    if (!user) return;
    const channel = db
      .channel('notifications-page-' + user.id)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadNotifications(page);
          markAllRead(user.id);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadNotifications(page);
        }
      )
      .subscribe();

    return () => db.removeChannel(channel);
  }, [user, page, loadNotifications]);

  const totalPages = Math.ceil(total / PER_PAGE);

  if (!user) return <p>{t('pleaseLogIn')}</p>;

  return (
    <div id="content_wrap">
      <div id="content">
        <h1>{t('title')}</h1>

        <Paginator currentPage={page} totalPages={totalPages} onPageChange={setPage} />

        <div id="notif_list">
          {notifications.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#888', padding: '20px' }}>
              {t('empty')}
            </div>
          ) : (
            notifications.map((n, i) => {
              const thumbUrl = getThumbnailUrl(n.toon_id);
              const isMention = n.type?.startsWith('mention_');

              if (isMention) {
                const href = n.toon_id ? `/toon/${n.toon_id}` : null;
                return (
                  <div key={n.id} className={`notif_row${i % 2 === 0 ? ' gray' : ''}`}>
                    <div className="notif_thumb">
                      {thumbUrl && href && (
                        <a href={href}>
                          <img src={thumbUrl} alt="" width={40} height={20} />
                        </a>
                      )}
                    </div>
                    <div className="notif_text">
                      <span className="notif_date">{formatDate(n.created_at)}:</span>{' '}
                      <MentionText notification={n} />
                      {href && (
                        <> <a href={href} style={{ color: '#888', fontSize: '9pt' }}>→</a></>
                      )}
                    </div>
                  </div>
                );
              }

              const { actors, suffix } = parseReason(n.reason);
              const actorNodes = actors.map((name, idx) => (
                <span key={name}>
                  {idx > 0 && (idx === actors.length - 1 ? ' and ' : ', ')}
                  <UsernameLink username={name} />
                </span>
              ));

              return (
                <div key={n.id} className={`notif_row${i % 2 === 0 ? ' gray' : ''}`}>
                  <div className="notif_thumb">
                    {thumbUrl && n.toon_id && (
                      <a href={`/toon/${n.toon_id}`}>
                        <img src={thumbUrl} alt="" width={40} height={20} />
                      </a>
                    )}
                  </div>
                  <div className="notif_text">
                    <span className="notif_date">{formatDate(n.created_at)}:</span>{' '}
                    {actorNodes}
                    {suffix}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <Paginator currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        <div className="clear" />
      </div>
      <div id="footer_placeholder" />
    </div>
  );
}