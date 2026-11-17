// Virtual Photobooth Image Composition Engine for HTML5 Canvas

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
  'side-by-side': {
    name: 'Side-by-Side Classic',
    width: 1400,
    height: 1050,
    aspect: '4:3'
  },
  'vertical-split': {
    name: 'Vertical Split',
    width: 1000,
    height: 1400,
    aspect: '5:7'
  },
  'classic-strip': {
    name: '4-Frame Photobooth Strip',
    width: 600,
    height: 1800,
    aspect: '1:3'
  },
  'scrapbook': {
    name: 'Vintage Scrapbook Collage',
    width: 1200,
    height: 1600,
    aspect: '3:4',
    frameAsset: '/assets/frames/frame-scrapbook.jpg'
  },
  'vintage-tv': {
    name: 'Dual Vintage TV',
    width: 1200,
    height: 1700,
    aspect: '9:13',
    frameAsset: '/assets/frames/frame-tv.jpg'
  },
  'romantic-ribbon': {
    name: 'Romantic Ribbon & Gingham',
    width: 1080,
    height: 1440,
    aspect: '3:4',
    frameAsset: '/assets/frames/frame-romantic-ribbon.jpg'
  },
  'digicam-viewfinder': {
    name: 'Canon Digicam Viewfinder',
    width: 1080,
    height: 1920,
    aspect: '9:16',
    frameAsset: '/assets/frames/frame-digicam.jpg'
  }
};

// Render layout onto Canvas
export async function renderLayoutToCanvas({
  canvas,
  layoutId = 'side-by-side',
  localVideo,
  remoteVideo,
  localName = 'You',
  remoteName = 'Paulene',
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
  }
}
