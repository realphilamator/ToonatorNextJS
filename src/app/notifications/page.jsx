'use client';
import { use, useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/hooks/auth';
import { getNotifications } from '@/lib/api';
import { UrlPaginator } from '@/components/paginator';
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

export default function NotificationsPage({ searchParams }) {
  const t = useTranslations('notifications');
  const resolvedParams = use(searchParams);
  const page = parseInt(resolvedParams?.page ?? '1');

  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [total, setTotal] = useState(0);

  const loadNotifications = useCallback(() => {
    if (!user) return;
    getNotifications(user.id, page, PER_PAGE).then(({ notifications, total }) => {
      setNotifications(notifications);
      setTotal(total);
    });
  }, [user, page]);

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
    loadNotifications();
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
          loadNotifications();
          markAllRead(user.id);
        }
      )
      .subscribe();

    return () => db.removeChannel(channel);
  }, [user, loadNotifications]);

  const totalPages = Math.ceil(total / PER_PAGE);

  if (!user) return <p>{t('pleaseLogIn')}</p>;

  return (
    <div id="content_wrap">
      <div id="content">
        <h1>{t('title')}</h1>

        <UrlPaginator basePath="/notifications" currentPage={page} totalPages={totalPages} />

        <div id="notif_list">
          {notifications.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#888', padding: '20px' }}>
              {t('empty')}
            </div>
          ) : (
            notifications.map((n, i) => {
              const thumbUrl = getThumbnailUrl(n.toon_id);
              const actorMatch = n.reason.match(/^(\S+)/);
              const actor = actorMatch ? actorMatch[1] : null;
              const reasonKey = n.type === 'like' ? 'reason_like'
                : n.type === 'comment' ? 'reason_comment'
                : null;

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
                    {reasonKey && actor
                      ? t.rich(reasonKey, {
                          actor,
                          link: (chunks) => <UsernameLink username={actor}>{chunks}</UsernameLink>,
                        })
                      : actor
                        ? <><UsernameLink username={actor} />{n.reason.slice(actor.length)}</>
                        : n.reason
                    }
                  </div>
                </div>
              );
            })
          )}
        </div>

        <UrlPaginator basePath="/notifications" currentPage={page} totalPages={totalPages} />
        <div className="clear" />
      </div>
      <div id="footer_placeholder" />
    </div>
  );
}