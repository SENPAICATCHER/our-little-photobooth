// Retro Filter & Image Processing Engine for Canvas

export const FILTERS = [
  { id: 'normal', name: 'Original', description: 'Clean webcam capture' },
  { id: 'vintage-film', name: 'Vintage Film', description: 'Warm highlights & muted nostalgic shadows' },
  { id: 'polaroid', name: 'Polaroid', description: 'Lifted blacks, soft creamy tones' },
  { id: 'disposable-90s', name: '90s Disposable', description: 'Punchy flash pop & golden tint' },
  { id: 'vhs', name: 'VHS Tape', description: 'CRT scanlines & slight color dispersion' },
  { id: 'soft-lavender', name: 'Soft Lavender', description: 'Dreamy Y2K lavender haze' },
  { id: 'dusty-pink', name: 'Dusty Pink', description: 'Romantic blush & tender glow' },
  { id: 'warm-nostalgia', name: 'Warm Nostalgia', description: 'Golden hour sepia warmth' },
  { id: 'bw-film', name: 'B&W Grainy', description: 'Classic high-contrast 35mm monochrome' },
  { id: 'grainy-film', name: 'Grainy Film', description: 'Atmospheric analog film grain' }
];

export const DEFAULT_ADJUSTMENTS = {
  brightness: 100, // 0 - 200
  contrast: 100,   // 0 - 200
  saturation: 100, // 0 - 200
  warmth: 0,       // -50 to 50
  grain: 0,        // 0 to 100
  vignette: 0,     // 0 to 100
  exposure: 0,     // -50 to 50
  blur: 0          // 0 to 10
};

// Apply procedural film grain to a canvas context
export function applyFilmGrain(ctx, width, height, intensity = 20) {
  if (intensity <= 0) return;
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  const factor = (intensity / 100) * 45;

  for (let i = 0; i < data.length; i += 4) {
    const grain = (Math.random() - 0.5) * factor;
    data[i] = Math.min(255, Math.max(0, data[i] + grain));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + grain));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + grain));
  }
  ctx.putImageData(imgData, 0, 0);
}

// Apply Vignette overlay
export function applyVignette(ctx, width, height, strength = 30) {
  if (strength <= 0) return;
  const radius = Math.max(width, height) * 0.75;
  const gradient = ctx.createRadialGradient(
    width / 2, height / 2, radius * 0.4,
    width / 2, height / 2, radius
  );
  const opacity = (strength / 100) * 0.75;
  gradient.addColorStop(0, 'rgba(0,0,0,0)');
  gradient.addColorStop(1, `rgba(18,12,10,${opacity})`);

  ctx.save();
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

// Apply VHS CRT Scanlines
export function applyVhsScanlines(ctx, width, height) {
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
  for (let y = 0; y < height; y += 4) {
    ctx.fillRect(0, y, width, 1.5);
  }
  // Subtle chromatic aberration border glow
  ctx.fillStyle = 'rgba(255, 0, 50, 0.04)';
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

// Apply Color Tint overlays
export function applyTint(ctx, width, height, r, g, b, alpha) {
  ctx.save();
  ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

// Master Canvas Filter Processor
export function applyFiltersToCanvas(canvas, filterId = 'vintage-film', adjustments = DEFAULT_ADJUSTMENTS) {
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;

  // Base adjustments calculation
  let b = adjustments.brightness + adjustments.exposure;
  let c = adjustments.contrast;
  let s = adjustments.saturation;
  let extraGrain = adjustments.grain;
  let extraVignette = adjustments.vignette;
  let warmth = adjustments.warmth;

  // Filter-specific modifications
  switch (filterId) {
    case 'vintage-film':
      b += 5;
      c += 10;
      s -= 15;
      warmth += 15;
      extraGrain = Math.max(extraGrain, 22);
      extraVignette = Math.max(extraVignette, 25);
      break;
    case 'polaroid':
      b += 8;
      c += 15;
      s -= 10;
      warmth += 8;
      extraGrain = Math.max(extraGrain, 15);
      extraVignette = Math.max(extraVignette, 20);
      break;
    case 'disposable-90s':
      b += 12;
      c += 25;
      s += 15;
      warmth += 20;
      extraGrain = Math.max(extraGrain, 20);
      extraVignette = Math.max(extraVignette, 35);
      break;
    case 'vhs':
      c += 15;
      s += 10;
      extraGrain = Math.max(extraGrain, 25);
      break;
    case 'soft-lavender':
      b += 8;
      c -= 5;
      s -= 10;
      break;
    case 'dusty-pink':
      b += 6;
      c += 5;
      s -= 5;
      break;
    case 'warm-nostalgia':
      b += 4;
      c += 10;
      s -= 20;
      warmth += 35;
      extraVignette = Math.max(extraVignette, 30);
      break;
    case 'bw-film':
      s = 0;
      c += 35;
      extraGrain = Math.max(extraGrain, 35);
      extraVignette = Math.max(extraVignette, 25);
      break;
    case 'grainy-film':
      c += 10;
      s -= 10;
      extraGrain = Math.max(extraGrain, 45);
      break;
    case 'normal':
    default:
      break;
  }

  // Pixel-level processing for contrast, brightness, saturation, and warmth
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  const contrastFactor = (259 * (c + 255)) / (255 * (259 - c));
  const brightnessOffset = (b - 100) * 1.5;
  const satFactor = s / 100;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let bCol = data[i + 2];

    // Brightness
    r += brightnessOffset;
    g += brightnessOffset;
    bCol += brightnessOffset;

    // Contrast
    r = contrastFactor * (r - 128) + 128;
    g = contrastFactor * (g - 128) + 128;
    bCol = contrastFactor * (bCol - 128) + 128;

    // Warmth adjustment
    if (warmth !== 0) {
      r += warmth * 0.8;
      bCol -= warmth * 0.8;
    }

    // Saturation
    if (satFactor !== 1) {
      const gray = 0.2989 * r + 0.5870 * g + 0.1140 * bCol;
      r = gray + (r - gray) * satFactor;
      g = gray + (g - gray) * satFactor;
      bCol = gray + (bCol - gray) * satFactor;
    }

    data[i] = Math.min(255, Math.max(0, r));
    data[i + 1] = Math.min(255, Math.max(0, g));
    data[i + 2] = Math.min(255, Math.max(0, bCol));
  }
  ctx.putImageData(imgData, 0, 0);

  // Apply tint washes
  if (filterId === 'soft-lavender') {
    applyTint(ctx, width, height, 192, 132, 252, 0.14);
  } else if (filterId === 'dusty-pink') {
    applyTint(ctx, width, height, 244, 114, 182, 0.12);
  } else if (filterId === 'warm-nostalgia') {
    applyTint(ctx, width, height, 217, 119, 6, 0.1);
  } else if (filterId === 'polaroid') {
    applyTint(ctx, width, height, 255, 237, 213, 0.08);
  }

  // VHS Scanlines
  if (filterId === 'vhs') {
    applyVhsScanlines(ctx, width, height);
  }

  // Grain & Vignette
  if (extraGrain > 0) {
    applyFilmGrain(ctx, width, height, extraGrain);
  }
  if (extraVignette > 0) {
    applyVignette(ctx, width, height, extraVignette);
  }
}
