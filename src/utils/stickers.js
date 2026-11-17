// Retro Stickers & Decorative Elements based directly on user provided references

export const RETRO_STICKERS = [
  {
    id: 'kiss-mark',
    name: 'Lipstick Kiss',
    category: 'romantic',
    svg: `<svg viewBox="0 0 100 70" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 38C15 22 35 15 50 25C65 15 85 22 90 38C80 48 65 42 50 48C35 42 20 48 10 38Z" fill="#991B1B" opacity="0.95"/>
      <path d="M18 45C30 40 45 46 50 46C55 46 70 40 82 45C72 65 58 68 50 68C42 68 28 65 18 45Z" fill="#B91C1C" opacity="0.92"/>
      <path d="M25 35C35 30 45 32 50 34C55 32 65 30 75 35" stroke="#7F1D1D" stroke-width="2" stroke-linecap="round"/>
      <path d="M30 52C40 56 60 56 70 52" stroke="#7F1D1D" stroke-width="2" stroke-linecap="round"/>
    </svg>`
  },
  {
    id: 'chrome-star',
    name: 'Y2K Chrome Star',
    category: 'y2k',
    svg: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="chromeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#FFFFFF" />
          <stop offset="35%" stop-color="#D1D5DB" />
          <stop offset="60%" stop-color="#9CA3AF" />
          <stop offset="85%" stop-color="#4B5563" />
          <stop offset="100%" stop-color="#F3F4F6" />
        </linearGradient>
        <filter id="chromeGlow">
          <feDropShadow dx="2" dy="2" stdDeviation="2" flood-color="#000000" flood-opacity="0.4"/>
        </filter>
      </defs>
      <path d="M50 0 C50 35 65 50 100 50 C65 50 50 65 50 100 C50 65 35 50 0 50 C35 50 50 35 50 0 Z" fill="url(#chromeGrad)" stroke="#1F2937" stroke-width="2" filter="url(#chromeGlow)"/>
      <circle cx="50" cy="50" r="6" fill="#FFFFFF" />
    </svg>`
  },
  {
    id: 'red-ribbon-bow',
    name: 'Red Satin Bow',
    category: 'romantic',
    svg: `<svg viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bowGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#DC2626"/>
          <stop offset="50%" stop-color="#991B1B"/>
          <stop offset="100%" stop-color="#7F1D1D"/>
        </linearGradient>
      </defs>
      <!-- Left loop -->
      <path d="M60 40 C35 15 10 20 15 45 C20 70 50 50 60 45 Z" fill="url(#bowGrad)" stroke="#450A0A" stroke-width="2"/>
      <!-- Right loop -->
      <path d="M60 40 C85 15 110 20 105 45 C100 70 70 50 60 45 Z" fill="url(#bowGrad)" stroke="#450A0A" stroke-width="2"/>
      <!-- Knot -->
      <ellipse cx="60" cy="42" rx="10" ry="8" fill="#B91C1C" stroke="#450A0A" stroke-width="2"/>
      <!-- Left ribbon tail -->
      <path d="M54 48 C45 75 35 90 25 98 C35 88 45 88 56 52 Z" fill="#991B1B" stroke="#450A0A" stroke-width="1.5"/>
      <!-- Right ribbon tail -->
      <path d="M66 48 C75 75 85 90 95 98 C85 88 75 88 64 52 Z" fill="#991B1B" stroke="#450A0A" stroke-width="1.5"/>
    </svg>`
  },
  {
    id: 'safety-pin',
    name: 'Vintage Safety Pin',
    category: 'scrapbook',
    svg: `<svg viewBox="0 0 140 60" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="metalGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#E5E7EB"/>
          <stop offset="50%" stop-color="#9CA3AF"/>
          <stop offset="100%" stop-color="#4B5563"/>
        </linearGradient>
      </defs>
      <path d="M25 35 C15 35 10 25 15 18 C20 10 32 12 120 14" stroke="url(#metalGrad)" stroke-width="4" stroke-linecap="round"/>
      <path d="M25 35 C20 38 18 48 24 52 C30 55 38 48 40 42 L125 30" stroke="url(#metalGrad)" stroke-width="4" stroke-linecap="round"/>
      <!-- Clasp head -->
      <rect x="115" y="8" width="22" height="32" rx="6" fill="#9CA3AF" stroke="#374151" stroke-width="2"/>
      <circle cx="126" cy="24" r="4" fill="#374151"/>
    </svg>`
  },
  {
    id: 'cassette-tape',
    name: 'Good Days C-60 Cassette',
    category: 'scrapbook',
    svg: `<svg viewBox="0 0 160 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Tape shell -->
      <rect x="4" y="4" width="152" height="92" rx="8" fill="#262626" stroke="#171717" stroke-width="3"/>
      <!-- Screw holes -->
      <circle cx="12" cy="12" r="3" fill="#A3A3A3"/>
      <circle cx="148" cy="12" r="3" fill="#A3A3A3"/>
      <circle cx="12" cy="88" r="3" fill="#A3A3A3"/>
      <circle cx="148" cy="88" r="3" fill="#A3A3A3"/>
      <!-- Label -->
      <rect x="18" y="16" width="124" height="66" rx="4" fill="#FAF5EF" stroke="#404040" stroke-width="1.5"/>
      <!-- Color stripes -->
      <rect x="18" y="32" width="124" height="6" fill="#DC2626"/>
      <rect x="18" y="40" width="124" height="6" fill="#F97316"/>
      <!-- Tape window cutout -->
      <rect x="42" y="30" width="76" height="36" rx="6" fill="#1C1917" stroke="#44403C" stroke-width="2"/>
      <!-- Spools -->
      <circle cx="60" cy="48" r="10" fill="#E5E7EB" stroke="#78716C" stroke-width="3"/>
      <circle cx="100" cy="48" r="10" fill="#E5E7EB" stroke="#78716C" stroke-width="3"/>
      <!-- Text -->
      <text x="24" y="27" font-family="Caveat, cursive" font-size="12" font-weight="bold" fill="#1F2937">good days ♡</text>
      <text x="122" y="76" font-family="monospace" font-size="9" font-weight="bold" fill="#DC2626">C-60</text>
    </svg>`
  },
  {
    id: 'ticket-stub',
    name: 'Good Times Ticket',
    category: 'scrapbook',
    svg: `<svg viewBox="0 0 140 70" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="ticketGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#E07A5F"/>
          <stop offset="100%" stop-color="#C85A32"/>
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="136" height="66" rx="4" fill="url(#ticketGrad)" stroke="#1E1B24" stroke-width="2"/>
      <!-- Notches -->
      <circle cx="2" cy="35" r="8" fill="#FAF6F0" stroke="#1E1B24" stroke-width="2"/>
      <circle cx="138" cy="35" r="8" fill="#FAF6F0" stroke="#1E1B24" stroke-width="2"/>
      <!-- Dashed tear line -->
      <line x1="108" y1="2" x2="108" y2="68" stroke="#1E1B24" stroke-width="2" stroke-dasharray="4 4"/>
      <!-- Content -->
      <text x="20" y="32" font-family="Impact, sans-serif" font-size="16" letter-spacing="1" fill="#1E1B24">GOOD</text>
      <text x="20" y="52" font-family="Impact, sans-serif" font-size="16" letter-spacing="1" fill="#1E1B24">TIMES</text>
      <text x="114" y="42" font-family="monospace" font-size="10" font-weight="bold" fill="#1E1B24" transform="rotate(90, 114, 42)">72411</text>
      <text x="75" y="26" font-size="10" fill="#1E1B24">★ ★ ★</text>
    </svg>`
  },
  {
    id: 'kodak-gold',
    name: 'Kodak Gold 200 Label',
    category: 'scrapbook',
    svg: `<svg viewBox="0 0 120 70" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="116" height="66" rx="3" fill="#FBBF24" stroke="#1E1B24" stroke-width="2"/>
      <rect x="2" y="42" width="116" height="26" fill="#78350F"/>
      <!-- Scotch tape piece on top -->
      <rect x="35" y="-4" width="50" height="14" fill="#FEF08A" opacity="0.65" transform="rotate(-3, 60, 3)"/>
      <text x="10" y="26" font-family="Arial Black, Impact, sans-serif" font-size="18" fill="#DC2626">Kodak</text>
      <text x="12" y="38" font-family="Arial, sans-serif" font-weight="bold" font-size="10" fill="#1E1B24">GOLD</text>
      <text x="12" y="58" font-family="Arial Black, sans-serif" font-size="13" fill="#FBBF24">200</text>
      <text x="72" y="58" font-family="sans-serif" font-weight="bold" font-size="9" fill="#FDE68A">36 EXP.</text>
    </svg>`
  },
  {
    id: 'wax-seal',
    name: 'Burgundy Wax Seal',
    category: 'scrapbook',
    svg: `<svg viewBox="0 0 90 90" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="waxGrad" cx="40%" cy="40%" r="60%">
          <stop offset="0%" stop-color="#991B1B"/>
          <stop offset="70%" stop-color="#7F1D1D"/>
          <stop offset="100%" stop-color="#450A0A"/>
        </radialGradient>
      </defs>
      <path d="M45 5 C68 2 82 20 85 40 C88 65 72 82 50 85 C28 88 8 75 5 50 C2 28 22 8 45 5 Z" fill="url(#waxGrad)" stroke="#370707" stroke-width="2"/>
      <circle cx="45" cy="45" r="24" fill="#7F1D1D" stroke="#991B1B" stroke-width="2"/>
      <!-- Rose emblem in center -->
      <path d="M45 32 C40 32 36 36 38 42 C40 48 45 54 45 54 C45 54 50 48 52 42 C54 36 50 32 45 32 Z" fill="#991B1B" stroke="#450A0A" stroke-width="1.5"/>
      <circle cx="45" cy="40" r="4" fill="#B91C1C"/>
    </svg>`
  },
  {
    id: 'fingerprint-heart',
    name: 'Fingerprint Heart',
    category: 'romantic',
    svg: `<svg viewBox="0 0 100 90" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M50 25 C45 10 25 10 18 25 C10 40 28 60 50 78 C72 60 90 40 82 25 C75 10 55 10 50 25 Z" stroke="#991B1B" stroke-width="3" stroke-linecap="round" fill="none"/>
      <path d="M50 33 C46 22 32 22 26 33 C20 44 34 58 50 70 C66 58 80 44 74 33 C68 22 54 22 50 33 Z" stroke="#B91C1C" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="3 3"/>
      <path d="M50 42 C48 34 38 34 34 42 C30 50 40 58 50 64 C60 58 70 50 66 42 C62 34 52 34 50 42 Z" stroke="#DC2626" stroke-width="2" stroke-linecap="round"/>
    </svg>`
  },
  {
    id: 'pressed-flower',
    name: 'Pressed Rose Bud',
    category: 'scrapbook',
    svg: `<svg viewBox="0 0 90 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Stem -->
      <path d="M45 45 Q43 85 45 115" stroke="#4D7C0F" stroke-width="3" stroke-linecap="round"/>
      <!-- Leaves -->
      <path d="M44 75 C32 70 26 80 42 82 Z" fill="#65A30D" stroke="#365314" stroke-width="1.5"/>
      <path d="M46 65 C58 60 64 70 48 72 Z" fill="#65A30D" stroke="#365314" stroke-width="1.5"/>
      <!-- Rose Petals -->
      <path d="M45 20 C32 18 28 32 35 44 C42 48 50 48 55 44 C62 32 58 18 45 20 Z" fill="#E11D48" stroke="#881337" stroke-width="2"/>
      <path d="M40 25 C45 20 50 22 52 28 C50 35 40 38 40 25 Z" fill="#FB7185"/>
      <!-- Masking Tape strip holding stem -->
      <rect x="22" y="85" width="46" height="16" fill="#FDE68A" opacity="0.75" transform="rotate(-6, 45, 93)"/>
    </svg>`
  },
  {
    id: 'retro-date-stamp',
    name: 'Digicam LED Date',
    category: 'digicam',
    svg: `<svg viewBox="0 0 140 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="140" height="40" rx="4" fill="#000000" opacity="0.85"/>
      <text x="10" y="27" font-family="VT323, monospace" font-size="24" fill="#F97316" letter-spacing="2">'99 11 12</text>
    </svg>`
  }
];
