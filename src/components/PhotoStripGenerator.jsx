import React, { useState, useRef, useEffect } from 'react';
import { Download, X, Sparkles, Check, Heart, Film, ArrowRight } from 'lucide-react';
import { playButtonPop, playShutterSound } from '../utils/audio';

export default function PhotoStripGenerator({ 
  photos = [], 
  onClose,
  defaultCaption = "Our Little Photobooth ♡" 
}) {
  const [selectedPhotoIds, setSelectedPhotoIds] = useState(
    photos.slice(0, 4).map(p => p.id)
  );
  const [orientation, setOrientation] = useState('vertical'); // 'vertical' | 'horizontal'
  const [frameStyle, setFrameStyle] = useState('classic-white'); // 'classic-white', 'romantic-burgundy', 'vintage-scrapbook', 'cyber-lavender'
  const [caption, setCaption] = useState(defaultCaption);
  const [showDate, setShowDate] = useState(true);
  const [dateText, setDateText] = useState(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }));
  
  const stripCanvasRef = useRef(null);

  // Toggle photo selection
  const togglePhoto = (id) => {
    playButtonPop();
    if (selectedPhotoIds.includes(id)) {
      if (selectedPhotoIds.length > 2) {
        setSelectedPhotoIds(prev => prev.filter(x => x !== id));
      }
    } else {
      if (selectedPhotoIds.length < 4) {
        setSelectedPhotoIds(prev => [...prev, id]);
      }
    }
  };

  useEffect(() => {
    renderStrip();
  }, [selectedPhotoIds, orientation, frameStyle, caption, showDate, dateText]);

  const renderStrip = async () => {
    const canvas = stripCanvasRef.current;
    if (!canvas) return;

    const count = selectedPhotoIds.length || 3;
    const isVertical = orientation === 'vertical';

    // Canvas size
    const singleW = 600;
    const singleH = 450;
    const margin = 35;
    const footerH = 140;

    if (isVertical) {
      canvas.width = singleW + margin * 2;
      canvas.height = count * (singleH + margin) + margin + footerH;
    } else {
      canvas.width = count * (singleW + margin) + margin;
      canvas.height = singleH + margin * 2 + footerH;
    }

    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    // Background Frame Styles
    if (frameStyle === 'romantic-burgundy') {
      ctx.fillStyle = '#450A0A';
      ctx.fillRect(0, 0, w, h);
      // Gingham accent line
      ctx.fillStyle = '#991B1B';
      ctx.fillRect(0, 0, w, 16);
    } else if (frameStyle === 'vintage-scrapbook') {
      ctx.fillStyle = '#EFE8DE';
      ctx.fillRect(0, 0, w, h);
    } else if (frameStyle === 'cyber-lavender') {
      ctx.fillStyle = '#FAF5FF';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#1E1B24';
      ctx.lineWidth = 4;
      ctx.strokeRect(4, 4, w - 8, h - 8);
    } else {
      // Classic White
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, w, h);
    }

    // Load each selected photo
    const selectedPhotos = photos.filter(p => selectedPhotoIds.includes(p.id));

    for (let i = 0; i < selectedPhotos.length; i++) {
      const p = selectedPhotos[i];
      let dx, dy;
      if (isVertical) {
        dx = margin;
        dy = margin + i * (singleH + margin);
      } else {
        dx = margin + i * (singleW + margin);
        dy = margin;
      }

      // Draw photo container border
      ctx.fillStyle = '#1E1B24';
      ctx.fillRect(dx - 3, dy - 3, singleW + 6, singleH + 6);

      // Load & draw image
      await new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          ctx.drawImage(img, dx, dy, singleW, singleH);
          resolve();
        };
        img.onerror = () => resolve();
        img.src = p.url;
      });
    }

    // Draw Footer Caption & Date
    ctx.save();
    if (isVertical) {
      const footerY = h - footerH + 30;

      // Date stamp
      if (showDate) {
        ctx.font = '24px "VT323", monospace';
        ctx.fillStyle = frameStyle === 'romantic-burgundy' ? '#F97316' : '#6B7280';
        ctx.textAlign = 'center';
        ctx.fillText(dateText.toUpperCase(), w / 2, footerY);
      }

      // Handwritten Caption
      ctx.font = 'bold 38px "Caveat", cursive';
      ctx.fillStyle = frameStyle === 'romantic-burgundy' ? '#FFFFFF' : '#1E1B24';
      ctx.textAlign = 'center';
      ctx.fillText(caption, w / 2, footerY + 45);

      // Cute subtitle
      ctx.font = '14px "Space Grotesk", sans-serif';
      ctx.fillStyle = frameStyle === 'romantic-burgundy' ? '#FCA5A5' : '#9CA3AF';
      ctx.fillText('★ FOR PAULENE ★ OUR LITTLE PHOTOBOOTH ★', w / 2, footerY + 80);
    } else {
      const footerY = h - 60;
      ctx.font = 'bold 36px "Caveat", cursive';
      ctx.fillStyle = frameStyle === 'romantic-burgundy' ? '#FFFFFF' : '#1E1B24';
      ctx.textAlign = 'center';
      ctx.fillText(caption + (showDate ? `  •  ${dateText}` : ''), w / 2, footerY);
    }
    ctx.restore();
  };

  const handleDownload = () => {
    playShutterSound();
    const canvas = stripCanvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `photobooth-strip-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png', 0.95);
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#1E1B24]/90 backdrop-blur-md flex flex-col justify-between p-4 md:p-6 overflow-hidden">
      {/* Top Bar */}
      <div className="max-w-6xl mx-auto w-full flex items-center justify-between bg-[#FFFDF9] border-2 border-[#1E1B24] rounded-2xl px-6 py-3 shadow-[3px_3px_0px_#1E1B24]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#FDF2F8] border border-[#1E1B24] flex items-center justify-center font-bold text-sm text-[#BE185D]">
            🎟️
          </div>
          <div>
            <h2 className="font-bold text-base md:text-lg text-[#1E1B24]">Photobooth Strip Generator</h2>
            <p className="text-xs text-gray-500">Pick 2 to 4 photos to create a nostalgic printed keepsake</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownload}
            className="retro-btn retro-btn-primary text-xs md:text-sm py-2 px-4 cursor-pointer font-bold"
          >
            <Download className="w-4 h-4" /> Export Strip
          </button>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full border border-black/20 cursor-pointer"
          >
            <X className="w-5 h-5 text-gray-700" />
          </button>
        </div>
      </div>

      {/* Center Preview Area */}
      <div className="flex-1 flex items-center justify-center py-4 relative overflow-hidden">
        <canvas
          ref={stripCanvasRef}
          className="max-h-[62vh] max-w-full object-contain rounded-xl border-4 border-[#1E1B24] shadow-[6px_6px_0px_#1E1B24] bg-white"
        />
      </div>

      {/* Bottom Controls */}
      <div className="max-w-5xl mx-auto w-full bg-[#FFFDF9] border-2 border-[#1E1B24] rounded-2xl p-4 shadow-[4px_4px_0px_#1E1B24] space-y-4">
        {/* Photo Selector */}
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-2 flex items-center justify-between">
            <span>Select Photos ({selectedPhotoIds.length}/4 chosen, min 2)</span>
            <span className="text-[10px] text-gray-400">Click photo to toggle</span>
          </div>
          <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-thin">
            {photos.map(p => {
              const isSelected = selectedPhotoIds.includes(p.id);
              return (
                <div
                  key={p.id}
                  onClick={() => togglePhoto(p.id)}
                  className={`relative flex-shrink-0 w-20 h-24 rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                    isSelected ? 'border-[#C084FC] ring-2 ring-[#C084FC] scale-105' : 'border-gray-300 opacity-60'
                  }`}
                >
                  <img src={p.url} alt="Snap" className="w-full h-full object-cover" />
                  {isSelected && (
                    <div className="absolute top-1 right-1 bg-[#9333EA] text-white rounded-full p-0.5">
                      <Check className="w-3 h-3" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Options Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-gray-100 text-xs">
          {/* Frame Theme */}
          <div>
            <label className="block font-bold text-gray-700 mb-1">Frame Style</label>
            <select
              value={frameStyle}
              onChange={(e) => setFrameStyle(e.target.value)}
              className="retro-input w-full text-xs font-semibold"
            >
              <option value="classic-white">Classic Photobooth White</option>
              <option value="romantic-burgundy">Romantic Burgundy Ribbon</option>
              <option value="vintage-scrapbook">Vintage Scrapbook Paper</option>
              <option value="cyber-lavender">Y2K Cyber Lavender</option>
            </select>
          </div>

          {/* Orientation */}
          <div>
            <label className="block font-bold text-gray-700 mb-1">Orientation</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setOrientation('vertical')}
                className={`flex-1 py-2 rounded-lg border-2 font-bold cursor-pointer ${
                  orientation === 'vertical'
                    ? 'bg-[#E9D5FF] border-[#1E1B24]'
                    : 'bg-white border-gray-200'
                }`}
              >
                Vertical Strip
              </button>
              <button
                type="button"
                onClick={() => setOrientation('horizontal')}
                className={`flex-1 py-2 rounded-lg border-2 font-bold cursor-pointer ${
                  orientation === 'horizontal'
                    ? 'bg-[#E9D5FF] border-[#1E1B24]'
                    : 'bg-white border-gray-200'
                }`}
              >
                Horizontal Strip
              </button>
            </div>
          </div>

          {/* Custom Caption */}
          <div>
            <label className="block font-bold text-gray-700 mb-1">Footer Caption</label>
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Custom caption"
              className="retro-input w-full text-xs font-hand"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
