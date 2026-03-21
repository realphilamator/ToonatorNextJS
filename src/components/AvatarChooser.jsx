"use client";
import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { getUserToonsPaginated } from "@/lib/api";

const PER_PAGE = 12;

export default function AvatarChooser({ profileId, onSelect, onClose }) {
  const t = useTranslations("avatarChooser");
  const [toons, setToons]             = useState([]);
  const [page, setPage]               = useState(1);
  const [hasMore, setHasMore]         = useState(false);
  const [loading, setLoading]         = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Initial load
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getUserToonsPaginated(profileId, 1, PER_PAGE, true).then((result) => {
      if (cancelled) return;
      const fetched = result.toons || [];
      setToons(fetched);
      setHasMore(fetched.length === PER_PAGE);
      setPage(1);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [profileId]);

  const loadMore = useCallback(async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    const result = await getUserToonsPaginated(profileId, nextPage, PER_PAGE, true);
    const fetched = result.toons || [];
    setToons((prev) => [...prev, ...fetched]);
    setHasMore(fetched.length === PER_PAGE);
    setPage(nextPage);
    setLoadingMore(false);
  }, [profileId, page, loadingMore]);

  // Close on overlay click
  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <>
      {/* Matches: .sn .popup .overlay */}
      <div className="popup-overlay" onClick={handleOverlayClick}>
        {/* Matches: .sn .popup .wrapper + .sn .toon-chooser-popup .wrapper */}
        <div className="popup-wrapper">

          {/* Matches: .sn .popup .header */}
          <div className="popup-header">
            <h2>{t("title")}</h2>
            <a
              href="#"
              className="popup-close"
              onClick={(e) => { e.preventDefault(); onClose(); }}
            >
              ×
            </a>
          </div>

          {/* Matches: .sn .popup .content */}
          <div className="popup-content">

            {/* Matches: .sn .toon-chooser-popup .loading */}
            {loading && (
              <p className="chooser-loading">{t("loading")}</p>
            )}

            {!loading && toons.length === 0 && (
              <p className="chooser-loading">{t("noToons")}</p>
            )}

            {!loading && toons.length > 0 && (
              <>
                {/* Matches: .sn .toon-chooser-popup .toons-container > .toons-list */}
                <div className="toons-container">
                  <div className="toons-list">
                    {toons.map((toon) => {
                      const title      = toon.title || t("untitled");
                      const frameCount = toon.frame_count ?? 0;
                      const previewSrc = toon.preview_url || "/img/avatar100.gif";

                      return (
                        <div
                          key={toon.id}
                          className="toon_preview"
                          onClick={() => onSelect(toon.id, toon.is_legacy)}
                          title={title}
                          style={{ cursor: "pointer" }}
                        >
                          <div className="toon_image">
                            <img
                              src={previewSrc}
                              width={200}
                              height={100}
                              alt={title}
                              onError={(e) => { e.currentTarget.src = "/img/avatar100.gif"; }}
                            />
                          </div>
                          <div className="toon_name">
                            <a className="link">{title}</a>
                          </div>
                          <div className="toon_tagline">{t("frames", { count: frameCount })}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Matches: .sn .toon-chooser-popup .load-more */}
                {hasMore && (
                  <div className="load-more">
                    <button onClick={loadMore} disabled={loadingMore}>
                      {loadingMore ? t("loading") : t("loadMore")}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <style>{`
        /* Overlay — matches .sn .popup .overlay */
        .popup-overlay {
          overflow: auto;
          position: fixed;
          z-index: 999;
          width: 100%;
          height: 100%;
          top: 0;
          left: 0;
          background: rgba(127, 127, 127, 0.5);
        }

        /* Wrapper — matches .sn .popup .wrapper + .sn .toon-chooser-popup .wrapper */
        .popup-wrapper {
          position: relative;
          left: 50%;
          top: 50%;
          border: 1px solid #cccccc;
          -webkit-transform: translate(-50%, -50%);
          transform: translate(-50%, -50%);
          background: #ffffff;
          border-radius: 10px;
          width: 700px;
          max-width: 80%;
          height: 800px;
          max-height: 70%;
        }

        /* Header — matches .sn .popup .header */
        .popup-header {
          position: absolute;
          left: 10px;
          right: 10px;
          line-height: 50px;
          height: 60px;
          top: 10px;
        }

        /* h2 inside header — matches .sn h2 and .sn .popup .header h2 */
        .popup-header h2 {
          font: 24pt ToonatorFont;
          text-align: center;
          margin: 5px 0;
          border-bottom: 1px solid #eeeeee;
        }

        /* Close button — matches .sn .popup .header .close */
        .popup-close {
          position: absolute;
          right: 0;
          top: 0;
          height: 50px;
          vertical-align: middle;
          display: block;
          text-decoration: none;
          color: #cccccc;
          font: 18pt Arial;
        }
        .popup-close:hover {
          color: black;
        }

        /* Content — matches .sn .popup .content */
        .popup-content {
          position: absolute;
          overflow: auto;
          top: 50px;
          left: 0;
          right: 0;
          padding: 10px;
          bottom: 10px;
        }

        /* Loading text — matches .sn .toon-chooser-popup .loading */
        .chooser-loading {
          display: block;
          margin: 10px 0;
          text-align: center;
          color: #888888;
          font: 14pt ToonatorFont;
        }

        /* Toons container — matches .sn .toon-chooser-popup .toons-container */
        .toons-container {
          text-align: center;
        }

        /* Toons list — matches .sn .toon-chooser-popup .toons-list */
        .toons-container .toons-list {
          width: 655px;
          text-align: left;
          margin: auto;
        }

        /* Load more — matches .sn .toon-chooser-popup .load-more */
        .load-more {
          text-align: center;
        }
        .load-more button {
          margin: 10px 0;
          text-align: center;
          border: none;
          color: #555555;
          background: inherit;
          font: 14pt ToonatorFont;
          cursor: pointer;
        }
        .load-more button:hover:not(:disabled) {
          color: black;
        }
        .load-more button:disabled {
          color: #aaaaaa;
          cursor: default;
        }
      `}</style>
    </>
  );
}