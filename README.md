# 📸 Our Little Photobooth
### A Private Real-Time Multiplayer Retro Photobooth — Made with Love for Paulene ♡

**Our Little Photobooth** is a full-stack, real-time multiplayer photobooth web application designed to connect two people living in different locations through their webcams to take, customize, and cherish retro photographs together in a shared virtual booth.

---

## 🎨 Visual Identity & Inspiration

Designed based directly on the provided retro references:
1. **Neo-Brutalist / Y2K Soft UI System** (`UI Website Kit_ Retro Figma UI Kit.jpg`):
   - Muted purple, soft lavender (`#FAF5FF`, `#E9D5FF`, `#C084FC`), dusty pink (`#FDF2F8`, `#F472B6`), warm cream (`#FAF6F0`), and dark charcoal (`#1E1B24`).
   - 2px dark borders, pill buttons, retro drop shadows (`4px 4px 0px #1E1B24`), and vintage typography (`Space Grotesk`, `VT323`, `Caveat`, `Silkscreen`).
2. **Romantic Ribbon & Gingham Dual Frame** (`download (7).jpg`):
   - Romantic birthday theme for Paulene featuring deep burgundy background, red gingham ribbon, vintage safety pin, red satin bow, lipstick kiss mark, and pressed lily flower.
3. **Early 2000s Canon Digicam Viewfinder** (`Retro camera Frame template.jpg`):
   - Vintage silver digital camera interface with LCD viewfinder, OSD REC indicator, battery gauge, and `'99 11 12` date stamp.
4. **90s Scrapbook Collage** (`retro style aesthetic photo frame.jpg`):
   - Deckled torn paper cutout, Kodak Gold 200 label, 35mm film strip, good times ticket, audio cassette tape ("good days ♡ C-60"), and pressed roses.
5. **Dual Vintage CRT Television Collage** (`Vintage TV Photo Frame Aesthetic.jpg`):
   - Dual olive-green CRT TV sets with antenna, rotary knobs, halftone texture, and golden hour tape.

---

## 🚀 Key Features

### 1. Interactive Retro Landing Page
- Animated vintage photobooth machine with flashing marquee glow, virtual curtains, and coin slot ("INSERT LOVE 25¢").
- Birthday dedication banner: *"Birthday Gift for Paulene 🎂"*.
- One-click **Create a Room** and **Join Room with Code**.
- Responsive layout across desktop, tablet, and mobile.

### 2. Secure Private Rooms & WebRTC Multiplayer
- Unique retro room codes (e.g. `RETRO-99`, `CHERI-42`, `BOOTH-502`).
- 2-participant maximum per room enforced server-side.
- Real-time peer-to-peer WebRTC video stream powered by Socket.io signaling.
- **Camera-first security**: Video enabled by default, microphone muted unless explicitly turned on.
- Live participant status, camera toggling, front/back webcam switching, and ready checks.

### 3. Virtual Photobooth Engine (Canvas-based)
- **7 Composition Layouts**:
  1. *Side-by-Side Classic* (2 side-by-side frames with date and caption)
  2. *Vertical Split* (Top/bottom duo with decorative tape)
  3. *Classic 4-Frame Strip* (Tall photobooth strip with printed borders)
  4. *Vintage 90s Scrapbook Collage* (Scrapbook paper with Kodak Gold & cassette)
  5. *Dual Vintage CRT TV* (Dual TV screens for both participants)
  6. *Romantic Ribbon & Gingham* (Paulene birthday special frame)
  7. *Canon Digicam Viewfinder* (Silver digicam LCD screen)
- **Synchronized Countdown**: 3s, 5s, 10s synchronized via WebSockets so both participants smile at the exact millisecond!
- Animated camera flash overlay + mechanical shutter audio synthesis (built using procedural Web Audio API — zero external audio dependencies).
- Aspect ratio handling (`object-fit: cover` centering), device rotation, and high-DPI scaling.
- Disconnected recovery placeholder so incomplete frames are never silently generated.

### 4. Retro Filters & Non-Destructive Photo Studio
- **9 Nostalgic Filters**:
  - *Vintage Film*
  - *Polaroid*
  - *90s Disposable Camera*
  - *VHS Tape (CRT Scanlines & chromatic glow)*
  - *Soft Lavender*
  - *Dusty Pink*
  - *Warm Nostalgia*
  - *B&W Grainy*
  - *Grainy Film*
- **Fine Adjustments**: Brightness, Contrast, Warmth, Saturation, Film Grain, Vignette, Exposure.
- **Interactive Sticker Studio**:
  - Move, scale, rotate, and delete stickers directly on the canvas!
  - Retro stickers: Lipstick kiss 💋, Chrome star ✨, Red satin bow 🎀, Safety pin 🧷, C-60 Cassette 📼, Kodak Gold 200 🏷️, Ticket stub 🎟️, Wax seal, Pressed rose 🌹, and Digicam LED date stamp.
- **Handwritten Notes**: Custom handwritten captions using script fonts (`Caveat`, `Patrick Hand`).

### 5. Dedicated Photo Strip Generator
- Select 2, 3, or 4 photos from your session.
- Choose vertical or horizontal orientation.
- Select frame borders: Classic Photobooth White, Romantic Burgundy, Vintage Scrapbook, Y2K Lavender.
- Custom footer text & date stamps.
- Instant high-resolution export for printing or digital keepsakes.

### 6. Private Gallery
- Real-time room gallery showing all captured memories.
- Filter by All, Favorites, Composites, and Strips.
- Lightbox viewer with high-res zoom, metadata view (dimensions, filter used, capture time).
- Add/edit captions and toggle favorites.
- Secure signed token streaming: Photos are served via short-lived HMAC-signed tokens (`/api/photos/stream/:token`), preventing public URL scraping or ID enumeration.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide React, Canvas-Confetti
- **Audio Engine**: Procedural Web Audio API (real-time camera shutter, flash whine, countdown beeps)
- **Backend**: Node.js, Express, Socket.io
- **Database**: SQLite (via `sqlite3` with Promise queries)
- **Signaling**: WebSocket WebRTC signaling with STUN support (`stun.l.google.com:19302`)
- **Storage**: Server-side disk storage with HMAC token verification

---

## 📦 How to Run

### Development Mode (Concurrent Server + Frontend):
```bash
npm run dev
```
- Frontend runs on `http://localhost:5173`
- Backend API runs on `http://localhost:3001` (proxied by Vite)

### Production Mode:
```bash
npm run build
npm run server
```
- Opens on `http://localhost:3001` serving both backend and built frontend.

---

*“Collect beautiful moments. Do what makes your soul happy ♡”*
