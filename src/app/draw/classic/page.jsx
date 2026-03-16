// src/app/draw/classic/page.jsx
'use client';

import { useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

export default function DrawClassicPage() {
  const t = useTranslations('draw');
  const searchParams = useSearchParams();
  const containerRef = useRef(null);
  const drawContainerRef = useRef(null);
  const inFullScreen = useRef(false);

  const contId = searchParams.get('cont') || '';
  const draftId = searchParams.get('draft') || '';
  const title = draftId ? t('editDraft') : contId ? t('continueAnimation') : t('newAnimation');

  useEffect(() => {
    const script = document.createElement('script');
    script.src = '/js/ruffle/ruffle.js';
    script.onload = initRuffle;
    document.head.appendChild(script);

    function initRuffle() {
      if (!window.RufflePlayer) {
        setTimeout(initRuffle, 100);
        return;
      }

      const ruffle = window.RufflePlayer.newest();
      const player = ruffle.createPlayer();
      player.id = 'rufflePlayer';
      player.style.width = '600px';
      player.style.height = '390px';
      player.style.display = 'block';
      containerRef.current?.appendChild(player);

      (async () => {
        let sessionToken = 'anonymous';
        try {
          const { data } = await window.db.auth.getSession();
          if (data?.session?.access_token) sessionToken = data.session.access_token;
        } catch (e) {
          console.warn('Could not get session for SWF:', e);
        }

        player.load({
          url: '/swf/draw31en.swf',
          quality: 'high',
          allowScriptAccess: 'always',
          backgroundColor: '#ffffff',
          autoplay: 'on',
          unmuteOverlay: 'hidden',
          volume: 1,
          parameters: { s: sessionToken, cont: contId, draft: draftId },
        });

        window.enablePalette = function () {
          try { player.ruffle().callExposed('enablePalette'); }
          catch (e) { setTimeout(window.enablePalette, 200); }
        };
      })();
    }

    const handleFullscreenChange = () => {
      const fullscreen = document.fullscreenElement || document.webkitFullscreenElement;
      const dc = drawContainerRef.current;
      const player = document.getElementById('rufflePlayer');
      if (!dc) return;
      if (fullscreen) {
        inFullScreen.current = true;
        Object.assign(dc.style, { position: 'absolute', left: '0', top: '0', right: '0', bottom: '0', width: '', height: '' });
        if (player) { player.style.width = '100%'; player.style.height = '100%'; }
      } else {
        inFullScreen.current = false;
        Object.assign(dc.style, { position: 'static', width: '600px', height: '390px' });
        if (player) { player.style.width = '600px'; player.style.height = '390px'; }
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    // NOTE: t() cannot be called inside this callback (outside React render).
    // The beforeunload message is browser-controlled and typically ignored anyway.
    const handleBeforeUnload = (e) => { e.returnValue = 'You have unsaved changes.'; return e.returnValue; };
    window.m = window.m || {};
    window.m.lockExit = (key, lock) => {
      if (lock === false) window.removeEventListener('beforeunload', handleBeforeUnload);
      else window.addEventListener('beforeunload', handleBeforeUnload);
    };

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.getElementById('rufflePlayer')?.remove();
      script.remove();
    };
  }, [contId, draftId]);

  function hideRightPanel() {
    const dc = drawContainerRef.current;
    const container = containerRef.current;
    const player = document.getElementById('rufflePlayer');
    if (!dc || !container) return;
    document.querySelector('.rightpanel').style.display = 'none';
    const newW = 1000, newH = Math.round(newW / 2) + 90;
    dc.style.width = newW + 'px'; dc.style.height = newH + 'px';
    container.style.width = newW + 'px'; container.style.height = newH + 'px';
    if (player) { player.style.width = newW + 'px'; player.style.height = newH + 'px'; }
  }

  return (
    <div id="content_wrap">
      <div id="content">
        <h2>{title}</h2>
        <span style={{ display: 'inline-block', background: '#cccccc', padding: '10px', verticalAlign: 'top', fontSize: 0, lineHeight: 0 }}>
          <div ref={drawContainerRef} id="draw_container" style={{ width: '600px', height: '390px' }}>
            <div ref={containerRef} id="ruffleContainer" style={{ width: '600px', height: '390px' }} />
          </div>
        </span>
        <span className="rightpanel" style={{ display: 'inline-block', width: '370px', verticalAlign: 'top' }}>
          <a href="#" style={{ font: '8pt Tahoma', float: 'right', color: '#000' }}
            onClick={(e) => { e.preventDefault(); hideRightPanel(); }}>
            {t('hide')}
          </a>
          <span id="palettePrompt">
            {t.rich('enablePalettePrompt', {
              link: (chunks) => (
                <a href="#" onClick={(e) => { e.preventDefault(); window.enablePalette?.(); }}>{chunks}</a>
              ),
            })}
          </span>
          <br /><br />
          <a href="/wiki/Editor">{t('help')}</a>
        </span>
        <div style={{ clear: 'both' }} />
      </div>
      <div id="footer_placeholder" />
    </div>
  );
}