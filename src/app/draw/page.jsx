// src/app/draw/page.jsx
'use client';

import { useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

export default function DrawPage() {
  const t = useTranslations('draw');
  const searchParams = useSearchParams();
  const iframeRef = useRef(null);
  const containerRef = useRef(null);
  const inFullScreen = useRef(false);

  const rawContinueId = searchParams.get('continue');
  const continueId = rawContinueId && /^[a-zA-Z0-9_-]{1,100}$/.test(rawContinueId)
    ? rawContinueId
    : null;
  const iframeSrc = continueId
    ? `/draw_HTML/index.html?continue=${encodeURIComponent(continueId)}`
    : '/draw_HTML/index.html';

  useEffect(() => {
    const handleFullscreenChange = () => {
      const fullscreen =
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement;

      const container = containerRef.current;
      const iframe = iframeRef.current;
      if (!container || !iframe) return;

      if (fullscreen) {
        inFullScreen.current = true;
        Object.assign(container.style, {
          position: 'absolute',
          left: '0', top: '0', right: '0', bottom: '0',
          width: '', height: ''
        });
      } else {
        inFullScreen.current = false;
        Object.assign(container.style, {
          position: 'static',
          width: '600px',
          height: '392px'
        });
        hideRightPanel();
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
    };
  }, []);

  function hideRightPanel() {
    const rightPanel = document.querySelector('.rightpanel');
    const container = containerRef.current;
    const iframe = iframeRef.current;
    if (!rightPanel || !container || !iframe) return;

    rightPanel.style.display = 'none';
    const newW = 1000;
    const newH = Math.round(newW / 2) + 90;
    container.style.width = newW + 'px';
    container.style.height = newH + 'px';
    iframe.width = newW;
    iframe.height = newH;
    iframe.style.height = newH + 'px';
    iframe.contentWindow?.resizeEditor?.(newW);
  }

  function enablePalette() {
    iframeRef.current?.contentWindow?.enablePalette?.();
  }

  return (
    <div id="content_wrap">
      <div id="content">
        <h2 id="drawPageTitle">
          {continueId ? t('continueAnimation') : t('newAnimation')}
        </h2>

        <span style={{ display: 'inline-block', background: '#cccccc', padding: '10px', verticalAlign: 'top', fontSize: 0, lineHeight: 0 }}>
          <div ref={containerRef} id="draw_container" style={{ width: '600px', height: '390px' }}>
            <iframe
              ref={iframeRef}
              id="drawIframe"
              src={iframeSrc}
              width="600"
              height="390"
              frameBorder="0"
              scrolling="no"
              style={{ display: 'block' }}
            />
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
                <a href="#" onClick={(e) => { e.preventDefault(); enablePalette(); }}>{chunks}</a>
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