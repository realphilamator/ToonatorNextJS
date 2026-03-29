"use client";
import { useState, useEffect } from "react";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOON_LINK_RE = /https?:\/\/(?:www\.)?toonator\.site\/toon\/([a-zA-Z0-9-]+)/g;

function getToonPreviewUrl(toonId, size = 40) {
  return `https://storage.m2inc.dev/retoon/previews/${toonId}_${size}.gif`;
}

function extractToonIdFromUrl(url) {
  const match = url.match(/https?:\/\/(?:www\.)?toonator\.site\/toon\/([a-zA-Z0-9-]+)/);
  return match ? match[1] : null;
}

/**
 * ToonLinkPreview — Replaces toonator.site links in comments with small previews
 * 
 * Usage:
 *   <ToonLinkPreview text="Check this out: https://www.toonator.site/toon/6fc0e5d6-b718-44ac-b49a-906e3695a3d2" />
 * 
 * Props:
 *   text - The comment text that may contain toon links
 *   className - Extra CSS classes for the container
 */
export default function ToonLinkPreview({ text, className = "" }) {
  const [processedContent, setProcessedContent] = useState([]);
  const [loadingToons, setLoadingToons] = useState(new Set());

  useEffect(() => {
    if (!text) {
      setProcessedContent([]);
      return;
    }

    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = TOON_LINK_RE.exec(text)) !== null) {
      // Add text before the link
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: text.slice(lastIndex, match.index)
        });
      }

      // Add the toon link
      const toonId = extractToonIdFromUrl(match[0]);
      parts.push({
        type: 'toon',
        content: match[0],
        toonId: toonId
      });

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push({
        type: 'text',
        content: text.slice(lastIndex)
      });
    }

    setProcessedContent(parts);
  }, [text]);

  const handleToonLoad = (toonId) => {
    setLoadingToons(prev => {
      const next = new Set(prev);
      next.delete(toonId);
      return next;
    });
  };

  const handleToonError = (toonId, e) => {
    e.currentTarget.style.display = 'none';
    setLoadingToons(prev => {
      const next = new Set(prev);
      next.delete(toonId);
      return next;
    });
  };

  if (!text) return null;

  return (
    <div className={`toon-link-preview ${className}`}>
      {processedContent.map((part, index) => {
        if (part.type === 'text') {
          return <span key={index}>{part.content}</span>;
        }

        if (part.type === 'toon' && part.toonId) {
          const previewUrl = getToonPreviewUrl(part.toonId, 40);
          const isLoading = loadingToons.has(part.toonId);

          return (
            <div key={index} className="inline-toon-preview" style={{ display: 'inline-block', margin: '0 4px' }}>
              <a href={part.content} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                <img
                  src={previewUrl}
                  alt={`Toon preview: ${part.toonId}`}
                  width={40}
                  height={20}
                  style={{
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    verticalAlign: 'middle',
                    opacity: isLoading ? 0.5 : 1,
                    transition: 'opacity 0.2s'
                  }}
                  onLoad={() => handleToonLoad(part.toonId)}
                  onError={(e) => handleToonError(part.toonId, e)}
                  onLoadStart={() => setLoadingToons(prev => new Set(prev).add(part.toonId))}
                />
              </a>
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}
