/* =====================================================
   SAVE DIALOG - v3 (migrated from Supabase to REST API)
===================================================== */

function openSaveDialog() {
  document.getElementById('saveDialog').style.display = 'flex';
  document.getElementById('saveDialogName').focus();
}

function closeSaveDialog() {
  document.getElementById('saveDialog').style.display = 'none';
  document.getElementById('saveStatus').textContent = '';
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('saveDialogName').maxLength = 30;
  document.getElementById('saveDialogKeywords').maxLength = 200;
  document.getElementById('saveDialogDesc').maxLength = 1000;

  const nameInput = document.getElementById('saveDialogName');
  const nameCount = document.getElementById('saveDialogNameCount');
  nameInput.addEventListener('input', () => {
    const len = nameInput.value.length;
    nameCount.textContent = `${len} / 30`;
    nameCount.style.color = len >= 28 ? '#ff9966' : 'rgba(255,255,255,0.4)';
  });

  document.getElementById('btnSave').addEventListener('click', openSaveDialog);
  document.getElementById('saveCancel').addEventListener('click', closeSaveDialog);
  document.getElementById('saveFinal').addEventListener('click', saveAnimation);
  document.getElementById('saveLocalBtn').addEventListener('click', saveLocal);
  document.getElementById('loadLocalBtn').addEventListener('click', loadLocal);
});

/* =====================================================
   COMPRESSION HELPERS
===================================================== */

function compressFrames(framesArray) {
  const json = JSON.stringify(framesArray);
  const compressed = pako.gzip(json);
  return btoa(String.fromCharCode(...compressed));
}

function decompressFrames(base64str) {
  const binary = atob(base64str);
  const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
  const json = pako.ungzip(bytes, { to: 'string' });
  return JSON.parse(json);
}

/* =====================================================
   LOCAL SAVE  —  exports as .toon (gzip-compressed JSON)
===================================================== */

function saveLocal() {
  const title = (document.getElementById('saveDialogName').value.trim() || 'animation');

  const payload = {
    version: 2,
    settings: {
      playFPS:           settings.playFPS,
      smoothing:         settings.smoothing,
      simplifyTolerance: settings.simplifyTolerance,
    },
    frames: frames,
  };

  const json = JSON.stringify(payload);
  const compressed = pako.gzip(json);
  const blob = new Blob([compressed], { type: 'application/octet-stream' });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = title.replace(/[^a-z0-9_\-]/gi, '_') + '.toon';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* =====================================================
   LOCAL LOAD  —  handles .toon (compressed) and legacy .json
===================================================== */

function loadLocal() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.toon,.json,application/json,application/octet-stream';

  input.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      let loaded;

      if (file.name.endsWith('.toon')) {
        const arrayBuffer = await file.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        const json = pako.ungzip(bytes, { to: 'string' });
        const data = JSON.parse(json);
        loaded = Array.isArray(data) ? data : data.frames;
      } else {
        const text = await file.text();
        const data = JSON.parse(text);
        loaded = Array.isArray(data)
          ? data
          : (data && Array.isArray(data.frames) ? data.frames : null);
      }

      if (!loaded || loaded.length === 0) throw new Error('No frames found in file.');
      if (typeof loaded[0] !== 'object' || !Array.isArray(loaded[0].strokes)) {
        throw new Error('File does not look like a Toonator animation.');
      }

      frames.length = 0;
      loaded.forEach(f => frames.push(f));

      frameThumbs.length = 0;
      frames.forEach((_, i) => updateThumbnail(i));

      currentFrame = 0;
      previousFrame = -1;
      lastViewedFrame = -1;
      onionHistory = [];

      updateSliderMax();
      render();
      drawFramesTimeline();
      closeSaveDialog();

    } catch (err) {
      document.getElementById('saveStatus').textContent = 'Load failed: ' + err.message;
    }
  });

  input.click();
}

/* =====================================================
   RENDER FRAME TO CANVAS AT SIZE
===================================================== */

function renderFrameToCanvas(frame, width, height) {
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  const cx = c.getContext('2d');
  cx.fillStyle = '#ffffff';
  cx.fillRect(0, 0, width, height);
  const scaleX = width / 600;

  frame.strokes.forEach(stroke => {
    if (!stroke.points || stroke.points.length === 0) return;

    if (stroke.eraser) {
      cx.globalCompositeOperation = 'destination-out';
    } else {
      cx.globalCompositeOperation = 'source-over';
    }

    if (stroke.oldschool && stroke.polygon && stroke.polygon.length > 0) {
      cx.beginPath();
      stroke.polygon.forEach((p, i) => {
        const x = p.x * scaleX, y = p.y * scaleX;
        i === 0 ? cx.moveTo(x, y) : cx.lineTo(x, y);
      });
      cx.closePath();
      cx.fillStyle = stroke.eraser ? 'rgba(0,0,0,1)' : stroke.color;
      cx.fill();
      cx.globalCompositeOperation = 'source-over';
      return;
    }

    if (stroke.points.length < 2) {
      cx.globalCompositeOperation = 'source-over';
      return;
    }

    cx.beginPath();
    cx.strokeStyle = stroke.eraser ? 'rgba(0,0,0,1)' : stroke.color;
    const minStrokeWidth = (width <= 40) ? 0.3 : 1;
    cx.lineWidth = Math.max(minStrokeWidth, stroke.size * scaleX);
    cx.lineCap = 'round';
    cx.lineJoin = 'round';

    if (settings.smoothing && stroke.points.length > 2) {
      drawMulticurveRaw(cx, stroke.points, scaleX, false);
    } else {
      stroke.points.forEach((p, i) => {
        const x = p.x * scaleX;
        const y = p.y * scaleX;
        if (i === 0) cx.moveTo(x, y);
        else cx.lineTo(x, y);
      });
    }
    cx.stroke();
    cx.globalCompositeOperation = 'source-over';
  });

  const flat = document.createElement('canvas');
  flat.width = width;
  flat.height = height;
  const flatCtx = flat.getContext('2d');
  flatCtx.fillStyle = '#ffffff';
  flatCtx.fillRect(0, 0, width, height);
  flatCtx.drawImage(c, 0, 0);

  return flat;
}

/* =====================================================
   GIF GENERATION
===================================================== */

function generateGif(width, height) {
  return new Promise((resolve, reject) => {
    const frameDelay = Math.round(1000 / (settings.playFPS || 10));

    const gif = new GIF({
      workers: 2,
      quality: 20,
      width: width,
      height: height,
      workerScript: '/js/gif.worker.js',
      dither: false,
      background: '#ffffff',
      transparent: null
    });

    frames.forEach(frame => {
      const c = renderFrameToCanvas(frame, width, height);
      gif.addFrame(c, { delay: frameDelay });
    });

    gif.on('finished', blob => resolve(blob));
    gif.on('error', err => reject(err));
    gif.render();
  });
}

/* =====================================================
   CANVAS TO BLOB HELPER
===================================================== */

function canvasToBlob(canvas, type = 'image/gif') {
  return new Promise((resolve) => canvas.toBlob(resolve, type));
}

/* =====================================================
   SAVE ANIMATION
===================================================== */

async function saveAnimation() {
  const title       = (document.getElementById('saveDialogName').value.trim() || 'Untitled').slice(0, 30);
  const keywords    = document.getElementById('saveDialogKeywords').value.trim().slice(0, 200);
  const description = document.getElementById('saveDialogDesc').value.trim().slice(0, 1000);
  const isDraft     = document.getElementById('saveDialogDraft').checked;

  const status = document.getElementById('saveStatus');
  const btn    = document.getElementById('saveFinal');

  btn.disabled = true;
  status.textContent = 'Saving...';

  try {
    // Check auth
    const token = getToken();
    if (!token) throw new Error('You must be logged in to save.');

    const payload = parseToken(token);
    if (!payload || (payload.exp && payload.exp * 1000 < Date.now())) {
      throw new Error('Your session has expired. Please log in again.');
    }

    const savedSettings = {
      playFPS:           settings.playFPS,
      smoothing:         settings.smoothing,
      simplifyTolerance: settings.simplifyTolerance,
    };

    const framesCompressed = compressFrames(frames);

    const insertData = {
      title,
      keywords,
      description,
      is_draft:          isDraft,
      frames_compressed: framesCompressed,
      settings:          savedSettings,
      frame_count:       frames.length,
    };

    if (window.CONTINUE_ID && /^[a-zA-Z0-9_-]{1,100}$/.test(window.CONTINUE_ID)) {
      insertData.continued_from = window.CONTINUE_ID;
    }

    // Save animation to backend
    const saveRes = await fetch(`${API_URL}/animations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(insertData),
    });

    if (!saveRes.ok) {
      const err = await saveRes.json();
      throw new Error(err.error || 'Failed to save animation');
    }

    const anim = await saveRes.json();

    status.textContent = 'Generating previews...';

    const [blob200, blob40] = await Promise.all([
      generateGif(200, 100),
      generateGif(40,  20),
    ]);

    status.textContent = 'Uploading previews...';

    const formData = new FormData();
    formData.append('file200', blob200, `${anim.id}_100.gif`);
    formData.append('file40',  blob40,  `${anim.id}_40.gif`);

    const previewRes = await fetch(`${API_URL}/uploads/preview?toonId=${anim.id}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData,
    });

    if (!previewRes.ok) {
      // Animation saved but preview failed — not fatal, just warn
      console.warn('[save] Preview upload failed, animation still saved');
    }

    status.textContent = 'Saved!';
    setTimeout(() => {
      closeSaveDialog();
      window.top.location.href = `/toon/${anim.id}`;
    }, 800);

  } catch (err) {
    console.error('[save] ERROR:', err);
    status.textContent = 'Error: ' + (err.message || 'Something went wrong.');
    btn.disabled = false;
  }
}