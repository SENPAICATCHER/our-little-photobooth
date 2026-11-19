// Virtual Photobooth Image Composition Engine for HTML5 Canvas

// In-memory image cache for fast frame rendering
const frameImageCache = new Map();

export async function loadFrameImage(src) {
  if (!src) return null;
  if (frameImageCache.has(src)) {
    return frameImageCache.get(src);
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      frameImageCache.set(src, img);
      resolve(img);
    };
    img.onerror = () => {
      resolve(null);
    };
    img.src = src;
  });
}

// Helper: Check if video element is ready with frame dimensions to draw on canvas
export function isVideoReadyToDraw(video) {
  if (!video) return false;
  return (video.readyState >= 1 || video.videoWidth > 0) && (video.videoWidth > 0);
}

// Helper: Center crop & draw image/video with aspect ratio preservation (object-fit: cover)
export function drawCover(ctx, source, dx, dy, dWidth, dHeight, mirror = false) {
  if (!source) return;

  const sWidth = source.videoWidth || source.naturalWidth || source.width;
  const sHeight = source.videoHeight || source.naturalHeight || source.height;
  if (!sWidth || !sHeight) return;

  const sAspect = sWidth / sHeight;
  const dAspect = dWidth / dHeight;

  let sx = 0, sy = 0, sw = sWidth, sh = sHeight;

  if (sAspect > dAspect) {
    // Source is wider than destination -> crop sides
    sw = sHeight * dAspect;
    sx = (sWidth - sw) / 2;
  } else {
    // Source is taller than destination -> crop top/bottom
    sh = sWidth / dAspect;
    sy = (sHeight - sh) / 2;
  }

  ctx.save();
  if (mirror) {
    ctx.translate(dx + dWidth, dy);
    ctx.scale(-1, 1);
    ctx.drawImage(source, sx, sy, sw, sh, 0, 0, dWidth, dHeight);
  } else {
    ctx.drawImage(source, sx, sy, sw, sh, dx, dy, dWidth, dHeight);
  }
  ctx.restore();
}

// Draw placeholder when remote peer is disconnected
export function drawDisconnectedPlaceholder(ctx, dx, dy, dWidth, dHeight, name = 'Remote Friend') {
  ctx.save();
  ctx.fillStyle = '#2A2438';
  ctx.fillRect(dx, dy, dWidth, dHeight);

  // Retro dashed border
  ctx.strokeStyle = '#F472B6';
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 8]);
  ctx.strokeRect(dx + 10, dy + 10, dWidth - 20, dHeight - 20);

  // Text
  ctx.fillStyle = '#FAF5FF';
  ctx.font = 'bold 20px "Space Grotesk", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Waiting for ' + name, dx + dWidth / 2, dy + dHeight / 2 - 10);

  ctx.font = '16px "VT323", monospace';
  ctx.fillStyle = '#F472B6';
  ctx.fillText('SIGNAL CONNECTING...', dx + dWidth / 2, dy + dHeight / 2 + 20);
  ctx.restore();
}

// Layout Dimensions Preset (High-Resolution Output for printing & crisp sharing: 1200x1600 or 1200x1200)
export const LAYOUT_CONFIGS = {
  'lace-bows': {
    name: '🎀 Cozy Lace & Bows',
    badge: '🎀✨',
    category: 'Scrapbook',
    width: 735,
    height: 1105,
    aspect: '2:3',
    frameAsset: '/assets/frames/frame-lace-bows.jpg',
    description: 'Knit sweater, lace ribbons, black organza bows & baby\'s breath'
  },
  'whispers-wild': {
    name: '🍂 Whispers of the Wild',
    badge: '🍂📜',
    category: 'Parchment',
    width: 736,
    height: 980,
    aspect: '3:4',
    frameAsset: '/assets/frames/frame-whispers-wild.jpg',
    description: 'Coffee-stained parchment, torn washi tape & botanical notes'
  },
  'grid-notebook': {
    name: '📎 Safety Pin Grid Notes',
    badge: '📎📓',
    category: 'Notebook',
    width: 675,
    height: 1200,
    aspect: '9:16',
    frameAsset: '/assets/frames/frame-grid-notebook.jpg',
    description: 'Crumpled grid paper, safety pin, vintage camera & burgundy paper'
  },
  'noir-zine': {
    name: '📰 Indie Noir Zine',
    badge: '📰🎙️',
    category: 'Indie Zine',
    width: 675,
    height: 1200,
    aspect: '9:16',
    frameAsset: '/assets/frames/frame-noir-zine.jpg',
    description: 'Crinkled black paper, torn burgundy background & 35mm camera'
  },
  'burgundy-stars': {
    name: '✨ Starry Burgundy Night',
    badge: '✨🍷',
    category: 'Vintage',
    width: 675,
    height: 1200,
    aspect: '9:16',
    frameAsset: '/assets/frames/frame-burgundy-stars.jpg',
    description: 'Deep burgundy wine, doodle stars, Polaroid snapshots & 35mm camera'
  },
  'romantic-ribbon': {
    name: '🌹 Romantic Ribbon',
    badge: '🎀',
    category: 'Birthday Gift',
    width: 1080,
    height: 1440,
    aspect: '3:4',
    frameAsset: '/assets/frames/frame-romantic-ribbon.jpg',
    description: 'Red gingham ribbon, satin bow, lily and golden love note'
  },
  'digicam-viewfinder': {
    name: '📷 Canon Digicam 2000s',
    badge: '📷',
    category: 'Y2K Digicam',
    width: 1080,
    height: 1920,
    aspect: '9:16',
    frameAsset: '/assets/frames/frame-digicam.jpg',
    description: 'Silver LCD viewfinder, REC indicator & metallic chrome stars'
  },
  'vintage-tv': {
    name: '📺 Dual Vintage TV',
    badge: '📺',
    category: 'Retro CRT',
    width: 1200,
    height: 1700,
    aspect: '9:13',
    frameAsset: '/assets/frames/frame-tv.jpg',
    description: 'Dual olive-green CRT screens with knobs and antenna'
  },
  'scrapbook': {
    name: '📼 Vintage Scrapbook',
    badge: '📼',
    category: 'Scrapbook',
    width: 1200,
    height: 1600,
    aspect: '3:4',
    frameAsset: '/assets/frames/frame-scrapbook.jpg',
    description: 'Deckled torn paper, Kodak gold and cassette tape'
  },
  'side-by-side': {
    name: '♡ Side-by-Side Classic',
    badge: '♡',
    category: 'Classic Duo',
    width: 1400,
    height: 1050,
    aspect: '4:3',
    description: 'Warm retro cream textured duo cards'
  },
  'vertical-split': {
    name: '📼 Vertical Split',
    badge: '📼',
    category: 'Classic Duo',
    width: 1000,
    height: 1400,
    aspect: '5:7',
    description: 'Stacked duo frames with cute washi tape divider'
  },
  'classic-strip': {
    name: '🎞️ 4-Frame Classic Strip',
    badge: '🎞️',
    category: 'Photobooth Strip',
    width: 600,
    height: 1800,
    aspect: '1:3',
    description: 'Classic vertical 4-shot photobooth strip'
  }
};

// Render layout onto Canvas
export async function renderLayoutToCanvas({
  canvas,
  layoutId = 'side-by-side',
  localVideo,
  remoteVideo,
  localName = 'You',
  remoteName = 'Partner',
  customCaption = '',
  dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
  isLocalMirrored = true,
  isRemoteMirrored = false
}) {
  const config = LAYOUT_CONFIGS[layoutId] || LAYOUT_CONFIGS['side-by-side'];
  canvas.width = config.width;
  canvas.height = config.height;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  // Clear canvas
  ctx.clearRect(0, 0, w, h);

  if (layoutId === 'side-by-side') {
    // Vintage textured cream background
    ctx.fillStyle = '#FAF6F0';
    ctx.fillRect(0, 0, w, h);

    // Margins
    const pad = 40;
    const bottomBar = 110;
    const cardW = (w - pad * 3) / 2;
    const cardH = h - pad * 2 - bottomBar;

    // Draw Left Frame (Local)
    ctx.fillStyle = '#000000';
    ctx.fillRect(pad - 4, pad - 4, cardW + 8, cardH + 8);
    drawCover(ctx, localVideo, pad, pad, cardW, cardH, isLocalMirrored);

    // Draw Right Frame (Remote)
    ctx.fillRect(pad * 2 + cardW - 4, pad - 4, cardW + 8, cardH + 8);
    if (isVideoReadyToDraw(remoteVideo)) {
      drawCover(ctx, remoteVideo, pad * 2 + cardW, pad, cardW, cardH, isRemoteMirrored);
    } else {
      drawDisconnectedPlaceholder(ctx, pad * 2 + cardW, pad, cardW, cardH, remoteName);
    }

    // Name labels on corners
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = 'bold 20px "Space Grotesk", sans-serif';
    ctx.fillStyle = '#1E1B24';
    ctx.fillText('♡ ' + localName, pad + 15, pad + cardH - 15);
    ctx.fillText('♡ ' + remoteName, pad * 2 + cardW + 15, pad + cardH - 15);

    // Bottom Bar (Date & Custom Caption)
    ctx.font = '26px "VT323", monospace';
    ctx.fillStyle = '#F97316';
    ctx.fillText(`'${dateStr.slice(-2)} PHOTOBOOTH SESSION`, pad, h - 45);

    ctx.font = 'bold 32px "Caveat", cursive';
    ctx.fillStyle = '#4C0519';
    ctx.textAlign = 'right';
    ctx.fillText(customCaption || 'Our Little Photobooth ♡', w - pad, h - 45);

  } else if (layoutId === 'vertical-split') {
    // Vertical Split
    ctx.fillStyle = '#FAF5FF';
    ctx.fillRect(0, 0, w, h);

    const pad = 45;
    const bottomBar = 100;
    const frameW = w - pad * 2;
    const frameH = (h - pad * 3 - bottomBar) / 2;

    // Top Frame (Local)
    ctx.fillStyle = '#1E1B24';
    ctx.fillRect(pad - 4, pad - 4, frameW + 8, frameH + 8);
    drawCover(ctx, localVideo, pad, pad, frameW, frameH, isLocalMirrored);

    // Bottom Frame (Remote)
    const y2 = pad * 2 + frameH;
    ctx.fillRect(pad - 4, y2 - 4, frameW + 8, frameH + 8);
    if (isVideoReadyToDraw(remoteVideo)) {
      drawCover(ctx, remoteVideo, pad, y2, frameW, frameH, isRemoteMirrored);
    } else {
      drawDisconnectedPlaceholder(ctx, pad, y2, frameW, frameH, remoteName);
    }

    // Cute tape sticker across divider
    ctx.fillStyle = 'rgba(254, 240, 138, 0.8)';
    ctx.fillRect(w / 2 - 80, pad + frameH + 8, 160, 28);

    // Caption
    ctx.font = 'bold 36px "Caveat", cursive';
    ctx.fillStyle = '#1E1B24';
    ctx.textAlign = 'center';
    ctx.fillText(customCaption || `${localName} & ${remoteName} ♡`, w / 2, h - 40);

  } else if (layoutId === 'classic-strip') {
    // Tall 4-frame Photobooth Strip
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, w, h);

    const pad = 36;
    const frameW = w - pad * 2;
    const frameH = (h - 220 - pad * 5) / 4;

    // 4 Slots: Slot 1 (Local), Slot 2 (Remote), Slot 3 (Local), Slot 4 (Remote)
    const sources = [
      { src: localVideo, mirror: isLocalMirrored, label: localName },
      { src: remoteVideo, mirror: isRemoteMirrored, label: remoteName },
      { src: localVideo, mirror: isLocalMirrored, label: localName },
      { src: remoteVideo, mirror: isRemoteMirrored, label: remoteName }
    ];

    for (let i = 0; i < 4; i++) {
      const fy = pad + i * (frameH + pad);
      ctx.fillStyle = '#111827';
      ctx.fillRect(pad - 2, fy - 2, frameW + 4, frameH + 4);

      const item = sources[i];
      if (item.src && (item.src === localVideo || isVideoReadyToDraw(item.src))) {
        drawCover(ctx, item.src, pad, fy, frameW, frameH, item.mirror);
      } else {
        drawDisconnectedPlaceholder(ctx, pad, fy, frameW, frameH, item.label);
      }
    }

    // Classic Photobooth Footer
    ctx.font = '28px "VT323", monospace';
    ctx.fillStyle = '#6B7280';
    ctx.textAlign = 'center';
    ctx.fillText(dateStr.toUpperCase(), w / 2, h - 130);

    ctx.font = 'bold 42px "Caveat", cursive';
    ctx.fillStyle = '#BE185D';
    ctx.fillText(customCaption || 'Our Little Photobooth ♡', w / 2, h - 75);

    ctx.font = '16px "Space Grotesk", sans-serif';
    ctx.fillStyle = '#9CA3AF';
    ctx.fillText('★ FOR PAULENE ★', w / 2, h - 35);

  } else if (layoutId === 'romantic-ribbon') {
    // Romantic Gingham & Red Ribbon (Reference download (7).jpg)
    ctx.fillStyle = '#3F0713'; // deep burgundy
    ctx.fillRect(0, 0, w, h);

    // Gingham ribbon bar on top left
    ctx.fillStyle = '#991B1B';
    ctx.fillRect(50, 0, 100, 300);

    // Two stacked photo cards on kraft/parchment background
    const cardW = w * 0.72;
    const cardH = (h * 0.8) / 2;
    const cardX = (w - cardW) / 2;
    const cardY1 = 90;
    const cardY2 = cardY1 + cardH + 50;

    // Card 1 (Local)
    ctx.fillStyle = '#FAF5EF';
    ctx.fillRect(cardX - 16, cardY1 - 16, cardW + 32, cardH + 32);
    ctx.fillStyle = '#000000';
    ctx.fillRect(cardX, cardY1, cardW, cardH);
    drawCover(ctx, localVideo, cardX, cardY1, cardW, cardH, isLocalMirrored);

    // Card 2 (Remote)
    ctx.fillStyle = '#FAF5EF';
    ctx.fillRect(cardX - 16, cardY2 - 16, cardW + 32, cardH + 32);
    ctx.fillStyle = '#000000';
    ctx.fillRect(cardX, cardY2, cardW, cardH);
    if (isVideoReadyToDraw(remoteVideo)) {
      drawCover(ctx, remoteVideo, cardX, cardY2, cardW, cardH, isRemoteMirrored);
    } else {
      drawDisconnectedPlaceholder(ctx, cardX, cardY2, cardW, cardH, remoteName);
    }

    // Romantic love note ribbon on bottom
    ctx.fillStyle = '#D97706';
    ctx.fillRect(w / 2 - 190, h - 90, 380, 48);
    ctx.font = 'bold 28px "Caveat", cursive';
    ctx.fillStyle = '#1E1B24';
    ctx.textAlign = 'center';
    ctx.fillText('I love you, forever and always ♡', w / 2, h - 56);

  } else if (layoutId === 'vintage-tv') {
    // Dual CRT Vintage TV (Reference Vintage TV Photo Frame Aesthetic)
    ctx.fillStyle = '#F4EFE6';
    ctx.fillRect(0, 0, w, h);

    // Top TV screen (Local)
    const tv1X = 70;
    const tv1Y = 70;
    const tv1W = w * 0.62;
    const tv1H = h * 0.35;

    ctx.fillStyle = '#365314'; // Olive green TV frame
    ctx.fillRect(tv1X - 25, tv1Y - 25, tv1W + 180, tv1H + 50);
    ctx.fillStyle = '#000000';
    ctx.fillRect(tv1X, tv1Y, tv1W, tv1H);
    drawCover(ctx, localVideo, tv1X, tv1Y, tv1W, tv1H, isLocalMirrored);

    // TV Knobs
    ctx.fillStyle = '#E5E7EB';
    ctx.beginPath();
    ctx.arc(tv1X + tv1W + 80, tv1Y + 70, 25, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(tv1X + tv1W + 80, tv1Y + 140, 25, 0, Math.PI * 2);
    ctx.fill();

    // Bottom TV screen (Remote)
    const tv2X = w - tv1W - 70;
    const tv2Y = h * 0.5;
    const tv2W = tv1W;
    const tv2H = tv1H;

    ctx.fillStyle = '#365314';
    ctx.fillRect(tv2X - 180, tv2Y - 25, tv2W + 180, tv2H + 50);
    ctx.fillStyle = '#000000';
    ctx.fillRect(tv2X, tv2Y, tv2W, tv2H);
    if (isVideoReadyToDraw(remoteVideo)) {
      drawCover(ctx, remoteVideo, tv2X, tv2Y, tv2W, tv2H, isRemoteMirrored);
    } else {
      drawDisconnectedPlaceholder(ctx, tv2X, tv2Y, tv2W, tv2H, remoteName);
    }

    // TV Knobs
    ctx.fillStyle = '#E5E7EB';
    ctx.beginPath();
    ctx.arc(tv2X - 90, tv2Y + 70, 25, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(tv2X - 90, tv2Y + 140, 25, 0, Math.PI * 2);
    ctx.fill();

    // Golden Hour Label
    ctx.fillStyle = 'rgba(234, 88, 12, 0.85)';
    ctx.fillRect(w / 2 - 120, h * 0.44, 240, 42);
    ctx.font = 'bold 28px "Space Grotesk", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.fillText('GOLDEN HOUR 📺', w / 2, h * 0.44 + 30);

  } else if (layoutId === 'scrapbook') {
    // Vintage 90s Scrapbook Collage (Reference retro style aesthetic photo frame)
    ctx.fillStyle = '#EADDCA'; // aged kraft paper
    ctx.fillRect(0, 0, w, h);

    // Inner deckled cutout
    const pad = 80;
    const frameW = w - pad * 2;
    const frameH = h - pad * 2 - 80;

    ctx.fillStyle = '#FFFDF9';
    ctx.fillRect(pad, pad, frameW, frameH);

    // Split inner frame into two side-by-side or collage
    const subW = (frameW - 30) / 2;
    drawCover(ctx, localVideo, pad + 10, pad + 10, subW, frameH - 20, isLocalMirrored);
    if (isVideoReadyToDraw(remoteVideo)) {
      drawCover(ctx, remoteVideo, pad + subW + 20, pad + 10, subW, frameH - 20, isRemoteMirrored);
    } else {
      drawDisconnectedPlaceholder(ctx, pad + subW + 20, pad + 10, subW, frameH - 20, remoteName);
    }

    // Scrapbook note on bottom
    ctx.fillStyle = '#FEF3C7';
    ctx.fillRect(w / 2 - 200, h - 140, 400, 50);
    ctx.font = 'bold 30px "Caveat", cursive';
    ctx.fillStyle = '#1E1B24';
    ctx.textAlign = 'center';
    ctx.fillText('Collect beautiful moments ♡', w / 2, h - 105);

  } else if (layoutId === 'digicam-viewfinder') {
    // Early 2000s Canon Digicam Viewfinder (Reference Retro camera Frame template)
    ctx.fillStyle = '#E5E0D8'; // linen background
    ctx.fillRect(0, 0, w, h);

    // Silver camera body
    const camW = w * 0.88;
    const camH = h * 0.52;
    const camX = (w - camW) / 2;
    const camY = (h - camH) / 2;

    ctx.fillStyle = '#D1D5DB';
    ctx.fillRect(camX, camY, camW, camH);
    ctx.strokeStyle = '#9CA3AF';
    ctx.lineWidth = 4;
    ctx.strokeRect(camX, camY, camW, camH);

    // Digicam LCD Screen
    const screenW = camW * 0.58;
    const screenH = camH * 0.72;
    const screenX = camX + 40;
    const screenY = camY + (camH - screenH) / 2;

    ctx.fillStyle = '#000000';
    ctx.fillRect(screenX, screenY, screenW, screenH);

    // Split LCD between both participants!
    const halfH = screenH / 2;
    drawCover(ctx, localVideo, screenX, screenY, screenW, halfH - 2, isLocalMirrored);
    if (isVideoReadyToDraw(remoteVideo)) {
      drawCover(ctx, remoteVideo, screenX, screenY + halfH + 2, screenW, halfH - 2, isRemoteMirrored);
    } else {
      drawDisconnectedPlaceholder(ctx, screenX, screenY + halfH + 2, screenW, halfH - 2, remoteName);
    }

    // On-screen OSD camera overlays (REC, Battery, Date)
    ctx.font = 'bold 20px "VT323", monospace';
    ctx.fillStyle = '#EF4444';
    ctx.fillText('● REC', screenX + 15, screenY + 25);
    ctx.fillStyle = '#10B981';
    ctx.fillText('[||||] 100%', screenX + screenW - 85, screenY + 25);
    ctx.fillStyle = '#F97316';
    ctx.fillText("'99 11 12", screenX + 15, screenY + screenH - 15);

  } else if (layoutId === 'lace-bows') {
    // 🎀 Cozy Lace & Bows (Reference 🎀✨.jpg)
    const frameImg = await loadFrameImage(config.frameAsset);
    if (frameImg) {
      ctx.drawImage(frameImg, 0, 0, w, h);
    } else {
      ctx.fillStyle = '#3E2723';
      ctx.fillRect(0, 0, w, h);
    }

    // Photo Area inside the central scalloped card:
    const slotW = 395;
    const slotH = 225;
    const slotX = (w - slotW) / 2;
    const slotY1 = 280;
    const slotY2 = 530;

    // Top Photo Card (Local User)
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 3;
    ctx.fillStyle = '#FAF5EF';
    ctx.fillRect(slotX - 4, slotY1 - 4, slotW + 8, slotH + 8);
    ctx.restore();

    ctx.fillStyle = '#000000';
    ctx.fillRect(slotX, slotY1, slotW, slotH);
    drawCover(ctx, localVideo, slotX, slotY1, slotW, slotH, isLocalMirrored);

    // Label tag
    ctx.fillStyle = 'rgba(30, 27, 36, 0.8)';
    ctx.fillRect(slotX + 10, slotY1 + slotH - 32, 130, 24);
    ctx.fillStyle = '#FAF5EF';
    ctx.font = 'bold 16px "Space Grotesk", sans-serif';
    ctx.fillText('♡ ' + localName, slotX + 18, slotY1 + slotH - 15);

    // Bottom Photo Card (Remote Partner)
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 3;
    ctx.fillStyle = '#FAF5EF';
    ctx.fillRect(slotX - 4, slotY2 - 4, slotW + 8, slotH + 8);
    ctx.restore();

    ctx.fillStyle = '#000000';
    ctx.fillRect(slotX, slotY2, slotW, slotH);
    if (isVideoReadyToDraw(remoteVideo)) {
      drawCover(ctx, remoteVideo, slotX, slotY2, slotW, slotH, isRemoteMirrored);
    } else {
      drawDisconnectedPlaceholder(ctx, slotX, slotY2, slotW, slotH, remoteName);
    }

    // Label tag
    ctx.fillStyle = 'rgba(30, 27, 36, 0.8)';
    ctx.fillRect(slotX + 10, slotY2 + slotH - 32, 130, 24);
    ctx.fillStyle = '#FAF5EF';
    ctx.font = 'bold 16px "Space Grotesk", sans-serif';
    ctx.fillText('♡ ' + remoteName, slotX + 18, slotY2 + slotH - 15);

    // Lace ribbon separator
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillRect(slotX + 30, slotY1 + slotH + 8, slotW - 60, 4);

  } else if (layoutId === 'whispers-wild') {
    // 🍂 Whispers of the Wild (Reference Whispers of the Wild.jpg)
    const frameImg = await loadFrameImage(config.frameAsset);
    if (frameImg) {
      ctx.drawImage(frameImg, 0, 0, w, h);
    } else {
      ctx.fillStyle = '#8D6E63';
      ctx.fillRect(0, 0, w, h);
    }

    // Two stacked Polaroid cards on parchment
    const cardW = 420;
    const cardH = 295;
    const cardX = (w - cardW) / 2;
    const cardY1 = 185;
    const cardY2 = 505;

    // Card 1 (Local)
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = '#FFFDF9';
    ctx.fillRect(cardX, cardY1, cardW, cardH);
    ctx.restore();

    const photoPad = 12;
    const photoH = cardH - 52;
    ctx.fillStyle = '#1A181B';
    ctx.fillRect(cardX + photoPad, cardY1 + photoPad, cardW - photoPad * 2, photoH);
    drawCover(ctx, localVideo, cardX + photoPad, cardY1 + photoPad, cardW - photoPad * 2, photoH, isLocalMirrored);

    // Handwritten chin note
    ctx.font = 'bold 24px "Caveat", cursive';
    ctx.fillStyle = '#2A2018';
    ctx.textAlign = 'center';
    ctx.fillText(localName + ' ♡ ' + dateStr, cardX + cardW / 2, cardY1 + cardH - 14);

    // Tape top-left
    ctx.fillStyle = 'rgba(214, 180, 140, 0.65)';
    ctx.fillRect(cardX - 10, cardY1 - 8, 70, 22);

    // Card 2 (Remote)
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = '#FFFDF9';
    ctx.fillRect(cardX, cardY2, cardW, cardH);
    ctx.restore();

    ctx.fillStyle = '#1A181B';
    ctx.fillRect(cardX + photoPad, cardY2 + photoPad, cardW - photoPad * 2, photoH);
    if (isVideoReadyToDraw(remoteVideo)) {
      drawCover(ctx, remoteVideo, cardX + photoPad, cardY2 + photoPad, cardW - photoPad * 2, photoH, isRemoteMirrored);
    } else {
      drawDisconnectedPlaceholder(ctx, cardX + photoPad, cardY2 + photoPad, cardW - photoPad * 2, photoH, remoteName);
    }

    ctx.font = 'bold 24px "Caveat", cursive';
    ctx.fillStyle = '#2A2018';
    ctx.textAlign = 'center';
    ctx.fillText(remoteName + ' ♡ forever and always', cardX + cardW / 2, cardY2 + cardH - 14);

    // Tape top-right
    ctx.fillStyle = 'rgba(214, 180, 140, 0.65)';
    ctx.fillRect(cardX + cardW - 60, cardY2 - 8, 70, 22);

  } else if (layoutId === 'grid-notebook') {
    // 📎 Safety Pin Grid Notes (Reference download (8).jpg)
    const frameImg = await loadFrameImage(config.frameAsset);
    if (frameImg) {
      ctx.drawImage(frameImg, 0, 0, w, h);
    } else {
      ctx.fillStyle = '#4A0E17';
      ctx.fillRect(0, 0, w, h);
    }

    // Position two photo cards on the crumpled grid paper
    const cardW = 435;
    const cardH = 310;
    const cardX = 110;
    const cardY1 = 175;
    const cardY2 = 520;

    // Card 1 (Local)
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(cardX - 6, cardY1 - 6, cardW + 12, cardH + 12);
    ctx.restore();

    ctx.fillStyle = '#000000';
    ctx.fillRect(cardX, cardY1, cardW, cardH);
    drawCover(ctx, localVideo, cardX, cardY1, cardW, cardH, isLocalMirrored);

    // Yellow translucent tape
    ctx.fillStyle = 'rgba(254, 240, 138, 0.75)';
    ctx.fillRect(cardX - 16, cardY1 - 10, 65, 20);

    // Typewriter label
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(cardX + 12, cardY1 + cardH - 32, 140, 24);
    ctx.font = 'bold 16px "Space Grotesk", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('📸 ' + localName, cardX + 20, cardY1 + cardH - 15);

    // Card 2 (Remote)
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(cardX - 6, cardY2 - 6, cardW + 12, cardH + 12);
    ctx.restore();

    ctx.fillStyle = '#000000';
    ctx.fillRect(cardX, cardY2, cardW, cardH);
    if (isVideoReadyToDraw(remoteVideo)) {
      drawCover(ctx, remoteVideo, cardX, cardY2, cardW, cardH, isRemoteMirrored);
    } else {
      drawDisconnectedPlaceholder(ctx, cardX, cardY2, cardW, cardH, remoteName);
    }

    // Yellow translucent tape
    ctx.fillStyle = 'rgba(254, 240, 138, 0.75)';
    ctx.fillRect(cardX + cardW - 50, cardY2 - 10, 65, 20);

    // Typewriter label
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(cardX + 12, cardY2 + cardH - 32, 140, 24);
    ctx.font = 'bold 16px "Space Grotesk", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('📸 ' + remoteName, cardX + 20, cardY2 + cardH - 15);

    // Bottom grid stamp
    ctx.font = 'bold 22px "VT323", monospace';
    ctx.fillStyle = '#DC2626';
    ctx.fillText(`'${dateStr.slice(-2)} PHOTO ARCHIVE ● REC`, cardX + 20, cardY2 + cardH + 42);

  } else if (layoutId === 'noir-zine') {
    // 📰 Indie Noir Zine (Reference download (10).jpg)
    const frameImg = await loadFrameImage(config.frameAsset);
    if (frameImg) {
      ctx.drawImage(frameImg, 0, 0, w, h);
    } else {
      ctx.fillStyle = '#1A181B';
      ctx.fillRect(0, 0, w, h);
    }

    const cardW = 440;
    const cardH = 265;
    const cardX = 95;
    const cardY1 = 245;
    const cardY2 = 535;

    // Slot 1 (Local)
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(cardX - 4, cardY1 - 4, cardW + 8, cardH + 8);
    ctx.restore();

    ctx.fillStyle = '#000000';
    ctx.fillRect(cardX, cardY1, cardW, cardH);
    drawCover(ctx, localVideo, cardX, cardY1, cardW, cardH, isLocalMirrored);

    ctx.fillStyle = '#111827';
    ctx.fillRect(cardX + 12, cardY1 + 12, 130, 22);
    ctx.font = 'bold 14px "Space Grotesk", sans-serif';
    ctx.fillStyle = '#FDE047';
    ctx.fillText('SIDE A // ' + localName, cardX + 18, cardY1 + 28);

    // Slot 2 (Remote)
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(cardX - 4, cardY2 - 4, cardW + 8, cardH + 8);
    ctx.restore();

    ctx.fillStyle = '#000000';
    ctx.fillRect(cardX, cardY2, cardW, cardH);
    if (isVideoReadyToDraw(remoteVideo)) {
      drawCover(ctx, remoteVideo, cardX, cardY2, cardW, cardH, isRemoteMirrored);
    } else {
      drawDisconnectedPlaceholder(ctx, cardX, cardY2, cardW, cardH, remoteName);
    }

    ctx.fillStyle = '#111827';
    ctx.fillRect(cardX + 12, cardY2 + 12, 130, 22);
    ctx.font = 'bold 14px "Space Grotesk", sans-serif';
    ctx.fillStyle = '#FDE047';
    ctx.fillText('SIDE B // ' + remoteName, cardX + 18, cardY2 + 28);

    // Zine headline
    ctx.font = '22px "VT323", monospace';
    ctx.fillStyle = '#F3F4F6';
    ctx.textAlign = 'center';
    ctx.fillText('★ RETRO PHOTO ARCHIVE ★ ' + dateStr, w / 2, cardY2 + cardH + 42);

  } else if (layoutId === 'burgundy-stars') {
    // ✨ Starry Burgundy Night (Reference download (9).jpg)
    const frameImg = await loadFrameImage(config.frameAsset);
    if (frameImg) {
      ctx.drawImage(frameImg, 0, 0, w, h);
    } else {
      ctx.fillStyle = '#4A0E17';
      ctx.fillRect(0, 0, w, h);
    }

    const cardW = 460;
    const cardH = 295;
    const cardX = (w - cardW) / 2;
    const cardY1 = 145;
    const cardY2 = 465;

    // Polaroid 1 (Local)
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = '#FFFDF9';
    ctx.fillRect(cardX, cardY1, cardW, cardH);
    ctx.restore();

    const photoPad = 12;
    const photoH = cardH - 52;
    ctx.fillStyle = '#000000';
    ctx.fillRect(cardX + photoPad, cardY1 + photoPad, cardW - photoPad * 2, photoH);
    drawCover(ctx, localVideo, cardX + photoPad, cardY1 + photoPad, cardW - photoPad * 2, photoH, isLocalMirrored);

    ctx.font = 'bold 26px "Caveat", cursive';
    ctx.fillStyle = '#1F161A';
    ctx.textAlign = 'center';
    ctx.fillText(localName + ' ✨ ' + dateStr, cardX + cardW / 2, cardY1 + cardH - 16);

    // Polaroid 2 (Remote)
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = '#FFFDF9';
    ctx.fillRect(cardX, cardY2, cardW, cardH);
    ctx.restore();

    ctx.fillStyle = '#000000';
    ctx.fillRect(cardX + photoPad, cardY2 + photoPad, cardW - photoPad * 2, photoH);
    if (isVideoReadyToDraw(remoteVideo)) {
      drawCover(ctx, remoteVideo, cardX + photoPad, cardY2 + photoPad, cardW - photoPad * 2, photoH, isRemoteMirrored);
    } else {
      drawDisconnectedPlaceholder(ctx, cardX + photoPad, cardY2 + photoPad, cardW - photoPad * 2, photoH, remoteName);
    }

    ctx.font = 'bold 26px "Caveat", cursive';
    ctx.fillStyle = '#1F161A';
    ctx.textAlign = 'center';
    ctx.fillText(remoteName + ' 💋 forever', cardX + cardW / 2, cardY2 + cardH - 16);

    // Starry footer caption
    ctx.font = 'bold 24px "Caveat", cursive';
    ctx.fillStyle = '#FDE047';
    ctx.textAlign = 'center';
    ctx.fillText('under the same stars ♡', w / 2, cardY2 + cardH + 45);
  }
}
