/* =====================================================
   TOON PLAYER — HTML5 Canvas, ported from ActionScript

   Wobble/randomness is baked in at draw time — nothing
   animates on a timer. Exact AS3 repaint triggers:

   repaintBack()  — once on load, once on stage resize
   repaintBar()   — once on createBar(), once on LAYOUT_CHANGED
   repaintSlider()— on createSlider(), on position change,
                    and on hover (isOver)
   paintBorder()  — once on load only
   Button.repaint()— on mode change, on hover (isOver)
   SizeButton.repaint()— on mode change, on hover/out
===================================================== */

(function () {
  'use strict';

  const rand = n => Math.random() * n;

  /* =====================================================
     COMPACT STROKE DESERIALIZATION  (unchanged)
  ===================================================== */
  function deserializeStrokes(rawStrokes) {
    if (!rawStrokes || rawStrokes.length === 0) return [];
    return rawStrokes.map(s => {
      if (s && typeof s === 'object' && !Array.isArray(s)) return s;
      if (Array.isArray(s)) {
        const [header, rawPoints, rawPolygon] = s;
        const parts     = (header || '').split('|');
        const color     = parts[0] || '#000';
        const size      = parseFloat(parts[1]) || 2;
        const eraser    = parts[2] === '1';
        const oldschool = parts[3] === '1';
        const points    = (rawPoints || []).map(p => Array.isArray(p) ? { x: p[0], y: p[1] } : p);
        const polygon   = rawPolygon
          ? rawPolygon.map(p => Array.isArray(p) ? { x: p[0], y: p[1] } : p)
          : null;
        return { color, size, eraser, oldschool, points, polygon };
      }
      return null;
    }).filter(Boolean);
  }

  /* =====================================================
     MULTICURVE  (unchanged)
  ===================================================== */
  function drawMulticurve(ctx, points, scale, closed) {
    if (!points || points.length === 0) return;
    const s  = scale || 1;
    const sc = points.map(p => ({ x: p.x * s, y: p.y * s }));
    const n  = sc.length;
    if (n === 1) { ctx.arc(sc[0].x, sc[0].y, Math.max(ctx.lineWidth / 2, 1), 0, Math.PI * 2); return; }
    if (n === 2) { ctx.moveTo(sc[0].x, sc[0].y); ctx.lineTo(sc[1].x, sc[1].y); return; }
    const mx = [], my = [];
    for (let i = 1; i < n - 2; i++) {
      mx[i] = 0.5 * (sc[i+1].x + sc[i].x);
      my[i] = 0.5 * (sc[i+1].y + sc[i].y);
    }
    if (closed) {
      mx[0]   = 0.5*(sc[1].x+sc[0].x);     my[0]   = 0.5*(sc[1].y+sc[0].y);
      mx[n-1] = 0.5*(sc[n-1].x+sc[n-2].x); my[n-1] = 0.5*(sc[n-1].y+sc[n-2].y);
    } else {
      mx[0]   = sc[0].x;   my[0]   = sc[0].y;
      mx[n-2] = sc[n-1].x; my[n-2] = sc[n-1].y;
    }
    ctx.moveTo(mx[0], my[0]);
    for (let i = 1; i < n-1; i++) ctx.quadraticCurveTo(sc[i].x, sc[i].y, mx[i], my[i]);
    if (closed) { ctx.quadraticCurveTo(sc[n-1].x, sc[n-1].y, mx[0], my[0]); ctx.closePath(); }
  }

  /* =====================================================
     STROKE RENDERER  (unchanged)
  ===================================================== */
  function drawStroke(ctx, stroke, scale) {
    const s = scale || 1;
    if (!stroke.points || stroke.points.length === 0) return;
    ctx.globalCompositeOperation = stroke.eraser ? 'destination-out' : 'source-over';
    if (stroke.oldschool && stroke.polygon && stroke.polygon.length > 0) {
      ctx.beginPath();
      stroke.polygon.forEach((p, i) => i === 0 ? ctx.moveTo(p.x*s, p.y*s) : ctx.lineTo(p.x*s, p.y*s));
      ctx.closePath();
      ctx.fillStyle = stroke.eraser ? 'rgba(0,0,0,1)' : (stroke.color || '#000');
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      return;
    }
    const color = stroke.color || '#000';
    const size  = (stroke.size || 2) * s;
    if (stroke.points.length === 1) {
      ctx.beginPath();
      ctx.arc(stroke.points[0].x*s, stroke.points[0].y*s, size/2, 0, Math.PI*2);
      ctx.fillStyle = stroke.eraser ? 'rgba(0,0,0,1)' : color;
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      return;
    }
    ctx.beginPath();
    ctx.strokeStyle = stroke.eraser ? 'rgba(0,0,0,1)' : color;
    ctx.lineWidth   = size;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
    drawMulticurve(ctx, stroke.points, s, false);
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
  }

  function renderFrameStrokes(ctx, frame, scale, strokeLimit) {
    if (!frame || !frame.strokes) return;
    const strokes = deserializeStrokes(frame.strokes);
    const limit = (strokeLimit === undefined || strokeLimit < 0)
      ? strokes.length : Math.min(strokeLimit + 1, strokes.length);
    for (let i = 0; i < limit; i++) drawStroke(ctx, strokes[i], scale);
  }

  /* =====================================================
     BORDER PAINTER — exact port of Player.repaintBack()
     Called ONCE on init. Static after that.
  ===================================================== */
  function paintBorder(ctx, W, H) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.fillStyle = '#000';
    ctx.beginPath();
    let t = 0;
    ctx.moveTo(0, rand(3));
    t = 0.05;
    while (t <= 1) { ctx.lineTo(t*(W+10), rand(3)); t += 0.05; }
    t = 0;
    while (t <= 1) { ctx.lineTo(W+8+rand(3), t*(H+8)); t += 0.1; }
    t = 1;
    while (t >= 0) { ctx.lineTo(t*(W+8), H+8+rand(3)); t -= 0.05; }
    t = 1;
    while (t >= 0) { ctx.lineTo(rand(3), t*(H+8)); t -= 0.1; }
    ctx.closePath();
    ctx.fill();
    // Punch content window transparent so toon canvas shows through
    ctx.clearRect(5, 5, W, H);
  }

  /* =====================================================
     Draw.drawLine — exact port from Draw.as

     Does NOT stroke. Draws a filled wobbly polygon by
     walking forward along one perpendicular side of the
     line, then back along the other side.

     param2 = p1 (x1,y1), param3 = p2 (x2,y2)
     param4 = thickness (half-width base)
     param5 = step size (segment length along line)
     param6 = fill color (-1 means no fill call, but we
              always have a color here)

     The angle (_loc17_) is atan(slope) + quadrant offset.
     _loc21_/_loc23_ = cos/sin of angle+PI/2  (left perp)
     _loc22_/_loc24_ = cos/sin of angle-PI/2  (right perp)
     Step distance = lineLength / param5
  ===================================================== */
  function drawLine(ctx, x1, y1, x2, y2, thickness, stepSize, color) {
    const dx  = x1 - x2;
    const dy  = y1 - y2;
    const len = Math.sqrt(dx*dx + dy*dy);
    if (len === 0) return;

    // Compute slope and quadrant offset — exact AS3 logic
    let slope = 0, quadOffset = 0;
    if (x2 === x1) {
      slope = 0;
      quadOffset = y2 > y1 ? Math.PI / 2 : Math.PI / 2 * 3;
    } else if (y2 === y1) {
      slope = 0;
      quadOffset = x2 > x1 ? 0 : Math.PI;
    } else if (x2 > x1 && y2 > y1) {
      slope      = (y2 - y1) / (x2 - x1);
      quadOffset = 0;
    } else if (x2 < x1 && y2 > y1) {
      slope      = (y2 - y1) / (x1 - x2);
      quadOffset = Math.PI / 2;
    } else if (x2 < x1 && y2 < y1) {
      slope      = (y1 - y2) / (x1 - x2);
      quadOffset = Math.PI;
    } else if (x2 > x1 && y2 < y1) {
      slope      = (y2 - y1) / (x1 - x2);
      quadOffset = Math.PI / 2 * 3;
    }

    const angle = Math.atan(slope) + quadOffset;
    const cosA  = Math.cos(angle);
    const sinA  = Math.sin(angle);
    const cosL  = Math.cos(angle + Math.PI / 2); // left perp
    const cosR  = Math.cos(angle - Math.PI / 2); // right perp
    const sinL  = Math.sin(angle + Math.PI / 2);
    const sinR  = Math.sin(angle - Math.PI / 2);
    const step  = len / stepSize;

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x1, y1);

    // Forward along left side
    let d = 2;
    while (d < len) {
      const w = thickness / 2 + rand(2) - 1;
      ctx.lineTo(x1 + d * cosA + w * cosL,
                 y1 + d * sinA + w * sinL);
      d += step;
    }
    ctx.lineTo(x2, y2);

    // Back along right side
    d = len - 2;
    while (d > 2) {
      const w = thickness / 2 + rand(2) - 1;
      ctx.lineTo(x1 + d * cosA + w * cosR,
                 y1 + d * sinA + w * sinR);
      d -= step;
    }

    ctx.closePath();
    ctx.fill();
  }

  /* =====================================================
     TOOLBAR ELEMENT PAINTERS
     Each called only when that element needs to redraw.
  ===================================================== */

  // ToolbarToon.repaintBar() — called once, or on layout change
  function paintBar(ctx, barX, barWidth) {
    const y = 20, nSeg = Math.floor(barWidth / 30);
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.moveTo(barX, y);
    for (let i = 1; i < nSeg - 1; i++)
      ctx.lineTo(barX + i*30 + rand(10) - 5, y - rand(2));
    ctx.lineTo(barX + barWidth, y);
    for (let i = nSeg - 1; i >= 1; i--)
      ctx.lineTo(barX + i*30 + rand(10) - 5, y + 1 + rand(2));
    ctx.closePath();
    ctx.fill();
  }

  // ToolbarToon.repaintSlider() — called on position change and hover
  function paintSlider(ctx, cx, cy) {
    ctx.fillStyle = '#000';
    ctx.beginPath();
    for (let a = 0; a < Math.PI*2; a += Math.PI/8) {
      const px = cx + Math.cos(a)*(8+rand(1));
      const py = cy + Math.sin(a)*(8+rand(1));
      a === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    for (let a = 0; a < Math.PI*2; a += Math.PI/6) {
      const px = cx + Math.cos(a)*(6+rand(1));
      const py = cy + Math.sin(a)*(6+rand(1));
      a === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fill();
  }

  // Button mode 0 — PLAYING, show PAUSE icon (two bars)
  function paintPauseIcon(ctx, x, y) {
    for (let i = 0; i < 2; i++) {
      ctx.beginPath();
      ctx.fillStyle = '#000';
      ctx.moveTo(x + 5 + i*10 + rand(2)-1, y + 5);
      for (let j = 1; j < 3; j++)
        ctx.lineTo(x + (4 - rand(2)) + i*10, y + 5 + j*6.6);
      ctx.lineTo(x + 6 + i*10 + rand(2)-1, y + 25);
      for (let j = 2; j > 0; j--)
        ctx.lineTo(x + 6 + rand(2) + i*10, y + 5 + j*6.6);
      ctx.closePath(); ctx.fill();
    }
  }

  // Button mode 1 — PAUSED, show PLAY icon (triangle)
  function paintPlayIcon(ctx, x, y) {
    ctx.beginPath();
    ctx.fillStyle = '#000';
    ctx.moveTo(x + 5 + rand(1), y + 5 + rand(1));
    for (let i = 1; i < 4; i++)
      ctx.lineTo(x + 5 + i*5 + rand(1), y + 5 + i*2.5 + rand(1));
    for (let i = 2; i >= 0; i--)
      ctx.lineTo(x + 5 + i*5 + rand(2), y + 5 + (6-i)*3 + rand(1));
    ctx.closePath(); ctx.fill();
  }

  // SizeButton.repaint() — on hover/out/mode change
  function paintSizeButton(ctx, ox, oy, type, isOver) {
    const col = isOver ? '#000' : '#888888';
    ctx.save();
    ctx.translate(ox, oy);
    if (type === 'fullscreen') {
      drawLine(ctx, 0,0,  20,20, 3, 10, col);
      drawLine(ctx, 20,0, 0,20,  3, 10, col);
      drawLine(ctx, 0,0,  8,0,   2,  4, col);
      drawLine(ctx, 0,0,  0,8,   2,  4, col);
      drawLine(ctx, 12,0, 20,0,  2,  4, col);
      drawLine(ctx, 20,0, 20,8,  2,  4, col);
      drawLine(ctx, 0,20, 8,20,  2,  4, col);
      drawLine(ctx, 0,12, 0,20,  2,  4, col);
      drawLine(ctx, 12,20,20,20, 2,  4, col);
      drawLine(ctx, 20,12,20,20, 2,  4, col);
    } else if (type === 'expand') {
      drawLine(ctx, 4,4, 20,4, 3, 10, col);
      drawLine(ctx, 4,4, 4,20, 3, 10, col);
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(15+rand(2)-1,-1+rand(2)-1); ctx.lineTo(20+rand(2)-1, 4+rand(2)-1);
      ctx.lineTo(16+rand(2)-1, 4+rand(2)-1); ctx.lineTo(13+rand(2)-1,-1+rand(2)-1);
      ctx.moveTo(15+rand(2)-1, 9+rand(2)-1); ctx.lineTo(20+rand(2)-1, 4+rand(2)-1);
      ctx.lineTo(16+rand(2)-1, 4+rand(2)-1); ctx.lineTo(13+rand(2)-1, 9+rand(2)-1);
      ctx.moveTo(-1+rand(2)-1,15+rand(2)-1); ctx.lineTo( 4+rand(2)-1,20+rand(2)-1);
      ctx.lineTo( 4+rand(2)-1,16+rand(2)-1); ctx.lineTo(-1+rand(2)-1,13+rand(2)-1);
      ctx.moveTo( 9+rand(2)-1,15+rand(2)-1); ctx.lineTo( 4+rand(2)-1,20+rand(2)-1);
      ctx.lineTo( 4+rand(2)-1,16+rand(2)-1); ctx.lineTo( 9+rand(2)-1,13+rand(2)-1);
      ctx.fill();
    } else if (type === 'reduce') {
      drawLine(ctx, 16,0,  16,16, 3, 10, col);
      drawLine(ctx, 0,16,  16,16, 3, 10, col);
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(10+rand(2)-1, 5+rand(2)-1); ctx.lineTo(16+rand(2)-1, 0+rand(2)-1);
      ctx.lineTo(16+rand(2)-1, 4+rand(2)-1); ctx.lineTo(10+rand(2)-1, 7+rand(2)-1);
      ctx.moveTo(20+rand(2)-1, 5+rand(2)-1); ctx.lineTo(16+rand(2)-1, 0+rand(2)-1);
      ctx.lineTo(16+rand(2)-1, 4+rand(2)-1); ctx.lineTo(20+rand(2)-1, 7+rand(2)-1);
      ctx.moveTo( 5+rand(2)-1,10+rand(2)-1); ctx.lineTo( 0+rand(2)-1,16+rand(2)-1);
      ctx.lineTo( 4+rand(2)-1,16+rand(2)-1); ctx.lineTo( 7+rand(2)-1,10+rand(2)-1);
      ctx.moveTo( 5+rand(2)-1,20+rand(2)-1); ctx.lineTo( 0+rand(2)-1,16+rand(2)-1);
      ctx.lineTo( 4+rand(2)-1,16+rand(2)-1); ctx.lineTo( 7+rand(2)-1,20+rand(2)-1);
      ctx.fill();
    } else if (type === 'exitfullscreen') {
      drawLine(ctx,  2, 6, 18, 6, 3, 10, col);
      drawLine(ctx,  2,14, 18,14, 3, 10, col);
      drawLine(ctx,  2, 6,  2,14, 3, 10, col);
      drawLine(ctx, 18, 6, 18,14, 3, 10, col);
    }
    ctx.restore();
  }

  /* =====================================================
     PLAYER FACTORY
  ===================================================== */
  function initToonPlayer(rootId, frames, savedSettings) {
    const root = document.getElementById(rootId);
    if (!root) { console.error('toon-player: root not found:', rootId); return; }

    const cfg           = savedSettings || {};
    const fps           = cfg.playFPS || 10;
    const frameDelay    = Math.round(1000 / fps);
    const canFullscreen = false;
    const canExpand     = !!cfg.canExpand;

    const CONTENT_W = 600, CONTENT_H = 300;
    const BORDER_W  = 610, BORDER_H  = 310;
    const TB_W = 610, TB_H = 40;

    const frameCount = frames.length || 1;
    const oneFrame   = frameCount === 1;
    const totalSteps = oneFrame
      ? deserializeStrokes(frames[0].strokes || []).length
      : frameCount;

    // Bar visibility — exact port of ToolbarToon set total()
    const barAlwaysVisible = totalSteps >= 10 || totalSteps === 1;
    let barVisible = barAlwaysVisible;

    /* ---- Toolbar layout — Toolbar.realign() port ----
       Layout push order: logo, [fullscreen?], [expand?], button
       All RIGHT items consume placeRect.right in that order.

       Logo: 155×22 at scale 0.8 → 124×18, margin 5
       SizeButtons: 20×20, margin 10 each
       Button: 30×30, margin 5, placed LEFT
    -------------------------------------------------- */
    const LOGO_W = Math.round(155 * 0.8); // 124
    const LOGO_H = Math.round(22  * 0.8); // 18
    const SZ_W   = 20, SZ_H = 20;

    let placeRight = TB_W;

    const LOGO_X = placeRight - LOGO_W - 5; placeRight = LOGO_X;
    const LOGO_Y = Math.round((TB_H - LOGO_H) / 2);

    let FS_X = 0, FS_Y = Math.round((TB_H - SZ_H) / 2);
    if (canFullscreen) { FS_X = placeRight - SZ_W - 10; placeRight = FS_X; }

    let EX_X = 0, EX_Y = FS_Y;
    if (canExpand)     { EX_X = placeRight - SZ_W - 10; placeRight = EX_X; }

    const BTN_W = 30, BTN_H = 30;
    const BTN_X = 5;
    const BTN_Y = Math.round((TB_H - BTN_H) / 2);
    const placeLeft = BTN_X + BTN_W; // 35

    const BAR_X = placeLeft + 10;
    const BAR_W = (placeRight - 20) - BAR_X;  // extra 10px right gap before size buttons
    const BAR_Y = 20;

    /* ---- DOM ---- */
    root.innerHTML = '';
    root.style.cssText = 'display:inline-block;line-height:0;font-size:0;';

    // Inject fullscreen styles once
    if (!document.getElementById('toon-player-fs-styles')) {
      const style = document.createElement('style');
      style.id = 'toon-player-fs-styles';
      style.textContent = `
        .toon-player-root:fullscreen,
        .toon-player-root:-webkit-full-screen,
        .toon-player-root:-moz-full-screen {
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: center !important;
          width: 100vw !important;
          height: 100vh !important;
          background: #fff !important;
          box-sizing: border-box !important;
        }
        .toon-player-root:fullscreen .toon-player-wrap,
        .toon-player-root:-webkit-full-screen .toon-player-wrap,
        .toon-player-root:-moz-full-screen .toon-player-wrap {
          width: 100% !important;
          max-width: none !important;
          height: auto !important;
          flex: 1 1 auto !important;
          min-height: 0 !important;
        }
        .toon-player-root:fullscreen .toon-player-wrap canvas,
        .toon-player-root:-webkit-full-screen .toon-player-wrap canvas,
        .toon-player-root:-moz-full-screen .toon-player-wrap canvas {
          max-width: none !important;
          width: 100% !important;
          height: 100% !important;
          object-fit: contain !important;
        }
        .toon-player-root:fullscreen .toon-player-tb,
        .toon-player-root:-webkit-full-screen .toon-player-tb,
        .toon-player-root:-moz-full-screen .toon-player-tb {
          width: 100% !important;
          max-width: none !important;
          flex: 0 0 auto !important;
        }
      `;
      document.head.appendChild(style);
    }
    root.classList.add('toon-player-root');

    // Toon canvas — strokes rendered here, white bg
    const toonCanvas = document.createElement('canvas');
    toonCanvas.width  = BORDER_W;
    toonCanvas.height = BORDER_H;
    toonCanvas.id = "toon";
    toonCanvas.style.cssText = [
      'display:block','position:absolute','top:0','left:0',
      'width:100%','max-width:'+BORDER_W+'px','background:#fff',
    ].join(';');

    // Border canvas — static wobbly border, composited on top
    const borderCanvas = document.createElement('canvas');
    borderCanvas.width  = BORDER_W;
    borderCanvas.height = BORDER_H;
    borderCanvas.style.cssText = [
      'display:block','position:absolute','top:0','left:0',
      'width:100%','max-width:'+BORDER_W+'px',
      'cursor:pointer','pointer-events:none',
    ].join(';');

    const toonWrap = document.createElement('div');
    toonWrap.className = 'toon-player-wrap';
    toonWrap.style.cssText = [
      'position:relative','display:block',
      'width:100%','max-width:'+BORDER_W+'px','height:'+BORDER_H+'px',
    ].join(';');
    toonWrap.appendChild(toonCanvas);
    toonWrap.appendChild(borderCanvas);

    // Toolbar canvas — static except for slider position and button icon
    const tbCanvas = document.createElement('canvas');
    tbCanvas.className = 'toon-player-tb';
    tbCanvas.width  = TB_W;
    tbCanvas.height = TB_H;
    tbCanvas.style.cssText = [
      'display:block','width:100%',
      'max-width:'+TB_W+'px','cursor:default','background:#fff',
    ].join(';');

    root.appendChild(toonWrap);
    root.appendChild(tbCanvas);

    const tCtx  = toonCanvas.getContext('2d');
    const bCtx  = borderCanvas.getContext('2d');
    const tbCtx = tbCanvas.getContext('2d');

    /* ---- State ---- */
    let curFrame        = 0;
    let lastShownStroke = -1;
    let playing         = false;
    let animTimer       = null;
    let sliderDragging  = false;
    let sliderRatio     = 0;
    let isFullscreen    = false;
    let isExpanded      = false;
    let currentScale    = 1; // updated when entering/exiting fullscreen

    // Expose curFrame to console for debugging
    window.toonDebug = {
      get curFrame() { return curFrame; },
      set curFrame(n) {
      if (n >= frameCount) {
        console.error(`toon-player: frame ${n} out of range (0-${frameCount - 1})`);
        return;
      }
      stopPlay();
      const step = Math.max(0, Math.min(n, frameCount - 1));
      curFrame = step;
      renderToon();
      syncSlider();
      },
      get fps() { return fps; },
      get frameCount() { return frameCount; }
    };



    let btnIsOver = false;
    let fsIsOver  = false;
    let exIsOver  = false;

    /* =====================================================
       TOOLBAR LAYER SYSTEM — offscreen canvases sized to
       TB_W * currentScale. Resized on scale change.
    ===================================================== */
    const mkOffscreen = (w, h) => {
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      return c;
    };

    const tbBgCanvas  = mkOffscreen(TB_W, TB_H);
    const tbBtnCanvas = mkOffscreen(BTN_W, TB_H);
    const tbSlCanvas  = mkOffscreen(TB_W, TB_H);
    const tbSzCanvas  = mkOffscreen(TB_W, TB_H);

    const tbBgCtx  = tbBgCanvas.getContext('2d');
    const tbBtnCtx = tbBtnCanvas.getContext('2d');
    const tbSlCtx  = tbSlCanvas.getContext('2d');
    const tbSzCtx  = tbSzCanvas.getContext('2d');

    // Resize all offscreen toolbar canvases to match scale
    function resizeToolbarOffscreens(scale) {
      const w = Math.round(TB_W * scale);
      const h = Math.round(TB_H * scale);
      const bw = Math.round(BTN_W * scale);
      tbBgCanvas.width  = w;  tbBgCanvas.height  = h;
      tbBtnCanvas.width = bw; tbBtnCanvas.height = h;
      tbSlCanvas.width  = w;  tbSlCanvas.height  = h;
      tbSzCanvas.width  = w;  tbSzCanvas.height  = h;
    }

    // Draw bar — uses current scale for all coordinates
    function redrawBar() {
      const s = currentScale;
      const w = Math.round(TB_W * s), h = Math.round(TB_H * s);
      tbBgCtx.clearRect(0, 0, w, h);
      if (barVisible) {
        tbBgCtx.save(); tbBgCtx.scale(s, s);
        paintBar(tbBgCtx, BAR_X, BAR_W);
        tbBgCtx.restore();
      }
    }

    // Draw slider
    function redrawSlider() {
      const s = currentScale;
      const w = Math.round(TB_W * s), h = Math.round(TB_H * s);
      tbSlCtx.clearRect(0, 0, w, h);
      if (barVisible) {
        tbSlCtx.save(); tbSlCtx.scale(s, s);
        paintSlider(tbSlCtx, BAR_X + sliderRatio * BAR_W, BAR_Y);
        tbSlCtx.restore();
      }
    }

    // Draw button
    function redrawButton() {
      const s = currentScale;
      const bw = Math.round(BTN_W * s), h = Math.round(TB_H * s);
      tbBtnCtx.clearRect(0, 0, bw, h);
      tbBtnCtx.save(); tbBtnCtx.scale(s, s);
      if (playing) paintPauseIcon(tbBtnCtx, 0, BTN_Y);
      else         paintPlayIcon(tbBtnCtx,  0, BTN_Y);
      tbBtnCtx.restore();
    }

    // Draw size buttons
    function redrawSizeButtons() {
      const s = currentScale;
      const w = Math.round(TB_W * s), h = Math.round(TB_H * s);
      tbSzCtx.clearRect(0, 0, w, h);
      tbSzCtx.save(); tbSzCtx.scale(s, s);
      if (canFullscreen)
        paintSizeButton(tbSzCtx, FS_X, FS_Y,
          isFullscreen ? 'exitfullscreen' : 'fullscreen', fsIsOver);
      if (canExpand)
        paintSizeButton(tbSzCtx, EX_X, EX_Y,
          isExpanded ? 'reduce' : 'expand', exIsOver);
      tbSzCtx.restore();
    }

    // Logo image
    const logoImg = new Image();
    logoImg.src = '/img/toonator.svg';

    // Composite all layers onto the visible tbCanvas
    function compositeToolbar() {
      tbCtx.clearRect(0, 0, TB_W, TB_H);
      tbCtx.fillStyle = '#fff';
      tbCtx.fillRect(0, 0, TB_W, TB_H);
      tbCtx.drawImage(tbBgCanvas,  0, 0);
      tbCtx.drawImage(tbBtnCanvas, Math.round(BTN_X * currentScale), 0);
      tbCtx.drawImage(tbSlCanvas,  0, 0);
      if (canFullscreen || canExpand)
        tbCtx.drawImage(tbSzCanvas, 0, 0);
      if (logoImg.complete && logoImg.naturalWidth > 0) {
        const s = currentScale;
        tbCtx.drawImage(logoImg,
          Math.round(LOGO_X * s), Math.round(LOGO_Y * s),
          Math.round(LOGO_W * s), Math.round(LOGO_H * s));
      }
    }

    logoImg.onload = () => compositeToolbar();

    /* ---- Render toon ---- */
    function renderToon() {
      if (isFullscreen) {
        // In fullscreen: toon canvas is exactly fitW×fitH, no inset
        const w = toonCanvas.width, h = toonCanvas.height;
        tCtx.clearRect(0, 0, w, h);
        tCtx.fillStyle = '#fff';
        tCtx.fillRect(0, 0, w, h);
        tCtx.save();
        tCtx.beginPath();
        tCtx.rect(0, 0, w, h);
        tCtx.clip();
        if (oneFrame) renderFrameStrokes(tCtx, frames[0], currentScale, lastShownStroke);
        else          renderFrameStrokes(tCtx, frames[curFrame], currentScale, -1);
        tCtx.restore();
      } else {
        // Normal: content inset by 5px inside the border canvas
        tCtx.clearRect(0, 0, BORDER_W, BORDER_H);
        tCtx.fillStyle = '#fff';
        tCtx.fillRect(5, 5, CONTENT_W, CONTENT_H);
        tCtx.save();
        tCtx.beginPath();
        tCtx.rect(5, 5, CONTENT_W, CONTENT_H);
        tCtx.clip();
        tCtx.translate(5, 5);
        if (oneFrame) renderFrameStrokes(tCtx, frames[0], 1, lastShownStroke);
        else          renderFrameStrokes(tCtx, frames[curFrame], 1, -1);
        tCtx.restore();
      }
    }

    /* ---- Slider sync ---- */
    function syncSlider() {
      const step = oneFrame ? Math.max(0, lastShownStroke) : curFrame;
      sliderRatio = totalSteps <= 1 ? 0 : step / (totalSteps - 1);
      redrawSlider();
      compositeToolbar();
    }

    /* ---- Playback — logic unchanged from original ---- */
    function tickMulti() {
      renderToon(); syncSlider();
      curFrame = (curFrame + 1) % frameCount;
    }

    function tickOneFrame() {
      const deserialized = deserializeStrokes(frames[0].strokes || []);
      const next  = lastShownStroke + 1;
      const total = deserialized.length;
      if (next >= total) {
        stopPlay(); lastShownStroke = -1; return;
      }
      lastShownStroke = next; renderToon(); syncSlider();
    }

    function startPlay() {
      if (playing) return;
      if (oneFrame) {
        const deserialized = deserializeStrokes(frames[0].strokes || []);
        if (lastShownStroke >= deserialized.length - 1) lastShownStroke = -1;
      }
      playing = true;
      // retranslateEvent PLAY: if total < 10, hide bar
      if (!barAlwaysVisible) { barVisible = false; redrawBar(); redrawSlider(); }
      redrawButton();
      compositeToolbar();
      animTimer = setInterval(oneFrame ? tickOneFrame : tickMulti, frameDelay);
    }

    function stopPlay() {
      playing = false;
      // retranslateEvent PAUSE: if total < 10, show bar
      if (!barAlwaysVisible) { barVisible = true; redrawBar(); redrawSlider(); }
      redrawButton();
      compositeToolbar();
      clearInterval(animTimer); animTimer = null;
    }

    /* ---- Seek ---- */
    function seekToRatio(ratio) {
      const clamped = Math.max(0, Math.min(1, ratio));
      sliderRatio   = clamped;
      const step    = Math.round(clamped * (totalSteps - 1));
      if (oneFrame) lastShownStroke = step; else curFrame = step;
      renderToon();
      redrawSlider();
      compositeToolbar();
    }

    function tbMouseX(e) {
      const rect = tbCanvas.getBoundingClientRect();
      return (e.clientX - rect.left) * (TB_W / rect.width);
    }
    function mouseRatioOnBar(e) {
      return (tbMouseX(e) - BAR_X) / BAR_W;
    }

    /* ---- Events ---- */
    tbCanvas.addEventListener('click', (e) => {
      const mx = tbMouseX(e);
      if (mx >= BTN_X && mx < BTN_X + BTN_W + 10) {
        if (playing) stopPlay(); else startPlay();
      } else if (barVisible && mx >= BAR_X && mx <= BAR_X + BAR_W) {
        stopPlay(); seekToRatio(mouseRatioOnBar(e));
      } else if (canFullscreen && mx >= FS_X && mx < FS_X + SZ_W) {
        // Delegate to callback — browser fullscreenchange will update button
        if (cfg.onFullscreen) cfg.onFullscreen(!isFullscreen);
      } else if (canExpand && mx >= EX_X && mx < EX_X + SZ_W) {
        isExpanded = !isExpanded;
        redrawSizeButtons(); compositeToolbar();
        if (cfg.onExpand) cfg.onExpand(isExpanded);
      }
    });

    tbCanvas.addEventListener('mousedown', (e) => {
      const mx = tbMouseX(e);
      if (!barVisible || mx < BAR_X || mx > BAR_X + BAR_W) return;
      sliderDragging = true; stopPlay(); seekToRatio(mouseRatioOnBar(e));
    });

    document.addEventListener('mousemove', (e) => {
      if (sliderDragging) seekToRatio(mouseRatioOnBar(e));
    });
    document.addEventListener('mouseup', () => { sliderDragging = false; });

    // Hover tracking — only repaints each element when its own hover state
    // changes, matching AS3 onEnterFrame → if(isOver) repaint() pattern.
    // Slider does NOT redraw on general mousemove — only on position change.
    tbCanvas.addEventListener('mousemove', (e) => {
      const mx = tbMouseX(e);
      const overBtn = mx >= BTN_X && mx < BTN_X + BTN_W;
      const overFs  = canFullscreen && mx >= FS_X && mx < FS_X + SZ_W;
      const overEx  = canExpand     && mx >= EX_X && mx < EX_X + SZ_W;

      let changed = false;
      if (overBtn !== btnIsOver) {
        btnIsOver = overBtn; redrawButton(); changed = true;
      }
      if (overFs !== fsIsOver) {
        fsIsOver = overFs; redrawSizeButtons(); changed = true;
      }
      if (overEx !== exIsOver) {
        exIsOver = overEx; redrawSizeButtons(); changed = true;
      }
      if (changed) compositeToolbar();
    });

    tbCanvas.addEventListener('mouseleave', () => {
      let changed = false;
      if (btnIsOver) { btnIsOver = false; redrawButton(); changed = true; }
      if (fsIsOver)  { fsIsOver  = false; redrawSizeButtons(); changed = true; }
      if (exIsOver)  { exIsOver  = false; redrawSizeButtons(); changed = true; }
      if (changed) compositeToolbar();
    });

    toonCanvas.addEventListener('click', () => { if (playing) stopPlay(); else startPlay(); });

    /* ---- Init — draw everything once ---- */
    if (oneFrame) {
      const deserialized = deserializeStrokes(frames[0].strokes || []);
      lastShownStroke = deserialized.length - 1;
    } else {
      curFrame = 0;
    }
    syncSlider();
    renderToon();

    // Border — drawn once, static
    paintBorder(bCtx, CONTENT_W, CONTENT_H);

    // Toolbar layers — drawn once
    redrawBar();
    redrawSlider();
    redrawButton();
    if (canFullscreen || canExpand) redrawSizeButtons();
    compositeToolbar();

    if (frameCount > 1) startPlay();

    // Handle fullscreen entering/exiting — apply inline styles directly
    // since browser fullscreen overrides make CSS selectors unreliable.
    function applyFullscreenStyles(entering) {
      if (entering) {
        // AS3 onStageResize fullscreen:
        //   _width  = stageWidth  (no -10)
        //   _height = stageHeight - 40  (toolbar at bottom)
        //   fit movieWidth/movieHeight into _width/_height
        //   playerSprite.x = 0
        //   playerSprite.y = (stageHeight-40)/2 - _height/2  (centred)
        //   repaintBack() → returns immediately, NO border drawn

        const sw = window.screen.width;
        const sh = window.screen.height;
        const availH = sh - TB_H;

        let scale = sw / CONTENT_W;
        if (Math.round(CONTENT_H * scale) > availH) scale = availH / CONTENT_H;

        const fitW = Math.round(CONTENT_W * scale);
        const fitH = Math.round(CONTENT_H * scale);
        const toonY = Math.round((availH - fitH) / 2);
        const toonX = Math.round((sw - fitW) / 2);

        currentScale = scale;

        // Toon canvas: exact pixel size for re-render, positioned centred
        toonCanvas.width  = fitW;
        toonCanvas.height = fitH;
        toonCanvas.style.cssText = [
          'display:block','position:absolute',
          'top:'+toonY+'px','left:'+toonX+'px',
          'width:'+fitW+'px','height:'+fitH+'px',
          'background:#fff','cursor:pointer',
        ].join(';');

        // Border canvas: same size as toonWrap area, but just cleared — no border in FS
        borderCanvas.width  = sw;
        borderCanvas.height = availH;
        bCtx.clearRect(0, 0, sw, availH);
        borderCanvas.style.cssText = [
          'display:block','position:absolute','top:0','left:0',
          'width:'+sw+'px','height:'+availH+'px',
          'pointer-events:none',
        ].join(';');

        // toonWrap: full width, availH tall
        toonWrap.style.cssText = [
          'position:relative','display:block',
          'width:'+sw+'px','height:'+availH+'px',
          'background:#fff',
        ].join(';');

        // Toolbar: full screen width
        tbCanvas.width  = sw;
        tbCanvas.height = TB_H;
        tbCanvas.style.cssText = [
          'display:block','width:'+sw+'px','height:'+TB_H+'px',
          'cursor:default','background:#fff',
        ].join(';');

        root.style.cssText = [
          'display:block','line-height:0','font-size:0','background:#fff',
        ].join(';');

        // Re-render toon at new resolution
        tCtx.clearRect(0, 0, fitW, fitH);
        tCtx.fillStyle = '#fff';
        tCtx.fillRect(0, 0, fitW, fitH);
        tCtx.save();
        tCtx.beginPath(); tCtx.rect(0, 0, fitW, fitH); tCtx.clip();
        if (oneFrame) renderFrameStrokes(tCtx, frames[0], scale, lastShownStroke);
        else          renderFrameStrokes(tCtx, frames[curFrame], scale, -1);
        tCtx.restore();

        // Toolbar: redraw offscreens at scale=1, composite onto full-width canvas
        resizeToolbarOffscreens(1);
        redrawBar(); redrawSlider(); redrawButton();
        if (canFullscreen || canExpand) redrawSizeButtons();
        tbCtx.clearRect(0, 0, sw, TB_H);
        tbCtx.fillStyle = '#fff';
        tbCtx.fillRect(0, 0, sw, TB_H);
        tbCtx.save();
        tbCtx.translate(toonX, 0); // align toolbar under toon
        tbCtx.drawImage(tbBgCanvas,  0, 0);
        tbCtx.drawImage(tbBtnCanvas, BTN_X, 0);
        tbCtx.drawImage(tbSlCanvas,  0, 0);
        if (canFullscreen || canExpand) tbCtx.drawImage(tbSzCanvas, 0, 0);
        if (logoImg.complete && logoImg.naturalWidth > 0)
          tbCtx.drawImage(logoImg, LOGO_X, LOGO_Y, LOGO_W, LOGO_H);
        tbCtx.restore();

      } else {
        currentScale = 1;

        toonCanvas.width  = BORDER_W;
        toonCanvas.height = BORDER_H;
        borderCanvas.width  = BORDER_W;
        borderCanvas.height = BORDER_H;
        tbCanvas.width  = TB_W;
        tbCanvas.height = TB_H;

        root.style.cssText = 'display:inline-block;line-height:0;font-size:0;';
        toonWrap.style.cssText = [
          'position:relative','display:block',
          'width:100%','max-width:'+BORDER_W+'px','height:'+BORDER_H+'px',
        ].join(';');
        toonCanvas.style.cssText = [
          'display:block','position:absolute','top:0','left:0',
          'width:100%','max-width:'+BORDER_W+'px','background:#fff',
        ].join(';');
        borderCanvas.style.cssText = [
          'display:block','position:absolute','top:0','left:0',
          'width:100%','max-width:'+BORDER_W+'px',
          'cursor:pointer','pointer-events:none',
        ].join(';');
        tbCanvas.style.cssText = [
          'display:block','width:100%',
          'max-width:'+TB_W+'px','cursor:default','background:#fff',
        ].join(';');

        resizeToolbarOffscreens(1);
        paintBorder(bCtx, CONTENT_W, CONTENT_H);
        renderToon();
        redrawBar(); redrawSlider(); redrawButton();
        if (canFullscreen || canExpand) redrawSizeButtons();
        compositeToolbar();
      }
    }

    function onFullscreenChange() {
      const nowFullscreen = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement
      );
      if (nowFullscreen !== isFullscreen) {
        isFullscreen = nowFullscreen;
        applyFullscreenStyles(isFullscreen);
        redrawSizeButtons();
        compositeToolbar();
      }
    }
    if (canFullscreen) {
      document.addEventListener('fullscreenchange',       onFullscreenChange);
      document.addEventListener('webkitfullscreenchange', onFullscreenChange);
      document.addEventListener('mozfullscreenchange',    onFullscreenChange);
    }

    /* ---- Public API ---- */
    return {
      play:    startPlay,
      pause:   stopPlay,
      goTo:    (n) => {
        stopPlay();
        const step = Math.max(0, Math.min(n, totalSteps - 1));
        if (oneFrame) lastShownStroke = step; else curFrame = step;
        redrawSlider(); compositeToolbar();
        renderToon();
      },
      destroy: () => {
        stopPlay();
        if (canFullscreen) {
          document.removeEventListener('fullscreenchange',       onFullscreenChange);
          document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
          document.removeEventListener('mozfullscreenchange',    onFullscreenChange);
        }
      }
    };
  }

  window.initToonPlayer = initToonPlayer;

})();