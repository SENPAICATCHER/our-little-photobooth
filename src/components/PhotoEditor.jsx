import React, { useState, useRef, useEffect } from 'react';
import { 
  Download, Save, Sliders, Wand2, Sparkles, X, RotateCcw, 
  Trash2, Plus, Type, Heart, Check, Image as ImageIcon 
} from 'lucide-react';
import { FILTERS, DEFAULT_ADJUSTMENTS, applyFiltersToCanvas } from '../utils/filterEngine';
import { RETRO_STICKERS } from '../utils/stickers';
import { playButtonPop, playShutterSound } from '../utils/audio';

export default function PhotoEditor({ 
  capturedImage, 
  onSaveToGallery, 
  onRetake, 
  onOpenStripGenerator,
  roomCode 
}) {
  const [activeTab, setActiveTab] = useState('filters'); // 'filters', 'adjust', 'stickers', 'text'
  const [selectedFilter, setSelectedFilter] = useState('vintage-film');
  const [adjustments, setAdjustments] = useState({ ...DEFAULT_ADJUSTMENTS });
  const [stickersOnCanvas, setStickersOnCanvas] = useState([]);
  const [selectedStickerId, setSelectedStickerId] = useState(null);
  const [customText, setCustomText] = useState('');
  const [textColor, setTextColor] = useState('#1E1B24');
  const [textFont, setTextFont] = useState('Caveat');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const previewCanvasRef = useRef(null);
  const baseImageRef = useRef(null);

  // Load the captured base image
  useEffect(() => {
    if (!capturedImage) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      baseImageRef.current = img;
      renderCanvas();
    };
    img.src = capturedImage;
  }, [capturedImage]);

  // Re-render canvas whenever filter or adjustments change
  useEffect(() => {
    renderCanvas();
  }, [selectedFilter, adjustments, stickersOnCanvas]);

  const renderCanvas = () => {
    const canvas = previewCanvasRef.current;
    const baseImg = baseImageRef.current;
    if (!canvas || !baseImg) return;

    canvas.width = baseImg.naturalWidth || baseImg.width;
    canvas.height = baseImg.naturalHeight || baseImg.height;
    const ctx = canvas.getContext('2d');

    // 1. Draw base photo
    ctx.drawImage(baseImg, 0, 0, canvas.width, canvas.height);

    // 2. Apply Filters & Adjustments
    applyFiltersToCanvas(canvas, selectedFilter, adjustments);

    // 3. Draw placed Stickers & Text
    stickersOnCanvas.forEach((item) => {
      ctx.save();
      ctx.translate(item.x, item.y);
      ctx.rotate((item.rotation * Math.PI) / 180);
      ctx.scale(item.scale, item.scale);

      if (item.type === 'sticker') {
        const stickerObj = RETRO_STICKERS.find(s => s.id === item.stickerId);
        if (stickerObj && item.imgElement) {
          ctx.drawImage(item.imgElement, -item.width / 2, -item.height / 2, item.width, item.height);
        }
      } else if (item.type === 'text') {
        ctx.font = `bold ${item.fontSize}px "${item.font}", cursive`;
        ctx.fillStyle = item.color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // Retro drop shadow
        ctx.shadowColor = 'rgba(0,0,0,0.4)';
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        ctx.fillText(item.text, 0, 0);
      }

      ctx.restore();
    });
  };

  // Add a sticker
  const handleAddSticker = (sticker) => {
    playButtonPop();
    const canvas = previewCanvasRef.current;
    const cx = canvas ? canvas.width / 2 : 300;
    const cy = canvas ? canvas.height / 2 : 400;

    // Load SVG as image
    const svgBlob = new Blob([sticker.svg], { type: 'image/svg+xml;charset=utf-8' });
    const URL = window.URL || window.webkitURL || window;
    const blobURL = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const newSticker = {
        id: `placed-${Date.now()}`,
        type: 'sticker',
        stickerId: sticker.id,
        imgElement: img,
        x: cx + (Math.random() * 60 - 30),
        y: cy + (Math.random() * 60 - 30),
        width: 140,
        height: 100,
        scale: 1,
        rotation: Math.floor(Math.random() * 20 - 10)
      };
      setStickersOnCanvas(prev => [...prev, newSticker]);
      setSelectedStickerId(newSticker.id);
    };
    img.src = blobURL;
  };

  // Add custom text
  const handleAddText = (e) => {
    e.preventDefault();
    if (!customText.trim()) return;
    playButtonPop();

    const canvas = previewCanvasRef.current;
    const cx = canvas ? canvas.width / 2 : 300;
    const cy = canvas ? canvas.height / 2 : 400;

    const newTextItem = {
      id: `text-${Date.now()}`,
      type: 'text',
      text: customText.trim(),
      color: textColor,
      font: textFont,
      fontSize: 48,
      x: cx,
      y: cy,
      scale: 1,
      rotation: 0
    };
    setStickersOnCanvas(prev => [...prev, newTextItem]);
    setSelectedStickerId(newTextItem.id);
    setCustomText('');
  };

  // Sticker manipulation
  const updateSelectedSticker = (field, delta) => {
    if (!selectedStickerId) return;
    setStickersOnCanvas(prev => prev.map(item => {
      if (item.id === selectedStickerId) {
        if (field === 'rotation') return { ...item, rotation: (item.rotation + delta) % 360 };
        if (field === 'scale') return { ...item, scale: Math.max(0.3, Math.min(3, item.scale + delta)) };
        if (field === 'x') return { ...item, x: item.x + delta };
        if (field === 'y') return { ...item, y: item.y + delta };
      }
      return item;
    }));
  };

  const deleteSelectedSticker = () => {
    if (!selectedStickerId) return;
    playButtonPop();
    setStickersOnCanvas(prev => prev.filter(item => item.id !== selectedStickerId));
    setSelectedStickerId(null);
  };

  // Export & Download
  const handleDownload = () => {
    playShutterSound();
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `our-little-photobooth-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png', 0.95);
    link.click();
  };

  // Save to room gallery
  const handleSaveToGallery = async () => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    setIsSaving(true);
    playButtonPop();

    const dataUrl = canvas.toDataURL('image/png', 0.92);
    try {
      await onSaveToGallery({
        dataUrl,
        filter: selectedFilter,
        adjustments: JSON.stringify(adjustments)
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save to gallery:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#1E1B24]/90 backdrop-blur-md flex flex-col justify-between p-4 md:p-6 overflow-hidden">
      {/* Top Header */}
      <div className="max-w-6xl mx-auto w-full flex items-center justify-between bg-[#FFFDF9] border-2 border-[#1E1B24] rounded-2xl px-6 py-3 shadow-[3px_3px_0px_#1E1B24]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#E9D5FF] border border-[#1E1B24] flex items-center justify-center font-bold text-sm">
            ✨
          </div>
          <div>
            <h2 className="font-bold text-base md:text-lg text-[#1E1B24]">Retro Photo Studio</h2>
            <p className="text-xs text-gray-500">Edit, decorate with vintage stickers, or save to gallery</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRetake}
            className="retro-btn retro-btn-secondary text-xs md:text-sm py-2 px-3 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" /> Retake
          </button>
          <button
            onClick={handleDownload}
            className="retro-btn retro-btn-secondary text-xs md:text-sm py-2 px-3 cursor-pointer"
          >
            <Download className="w-4 h-4" /> Download
          </button>
          <button
            onClick={handleSaveToGallery}
            disabled={isSaving}
            className="retro-btn retro-btn-primary text-xs md:text-sm py-2 px-4 cursor-pointer font-bold"
          >
            {saveSuccess ? (
              <span className="flex items-center gap-1.5 text-green-700">
                <Check className="w-4 h-4" /> Saved!
              </span>
            ) : isSaving ? (
              'Saving...'
            ) : (
              <span className="flex items-center gap-1.5">
                <Save className="w-4 h-4" /> Save to Gallery
              </span>
            )}
          </button>
          {onOpenStripGenerator && (
            <button
              onClick={onOpenStripGenerator}
              className="retro-btn retro-btn-pink text-xs md:text-sm py-2 px-3 cursor-pointer font-bold"
            >
              Make Photo Strip 🎟️
            </button>
          )}
        </div>
      </div>

      {/* Middle: Canvas Preview Stage */}
      <div className="flex-1 flex items-center justify-center py-4 relative overflow-hidden">
        <div className="relative max-h-full max-w-full flex items-center justify-center">
          <canvas
            ref={previewCanvasRef}
            className="max-h-[60vh] md:max-h-[68vh] max-w-full object-contain rounded-xl border-4 border-[#1E1B24] shadow-[6px_6px_0px_#1E1B24] bg-black"
          />

          {/* Interactive Floating Sticker Controls when a sticker/text is selected */}
          {selectedStickerId && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-[#FFFDF9] border-2 border-[#1E1B24] rounded-full px-4 py-2 shadow-[3px_3px_0px_#1E1B24] flex items-center gap-2 text-xs font-bold z-30">
              <span>Selected Item:</span>
              <button 
                onClick={() => updateSelectedSticker('rotation', -15)} 
                className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded border border-black cursor-pointer"
              >
                ⟲ -15°
              </button>
              <button 
                onClick={() => updateSelectedSticker('rotation', 15)} 
                className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded border border-black cursor-pointer"
              >
                ⟳ +15°
              </button>
              <button 
                onClick={() => updateSelectedSticker('scale', 0.1)} 
                className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded border border-black cursor-pointer"
              >
                + Size
              </button>
              <button 
                onClick={() => updateSelectedSticker('scale', -0.1)} 
                className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded border border-black cursor-pointer"
              >
                - Size
              </button>
              <button 
                onClick={deleteSelectedSticker} 
                className="p-1 bg-red-100 hover:bg-red-200 rounded text-red-600 border border-red-400 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bottom: Retro Tool Dock (Figma UI Kit Style) */}
      <div className="max-w-5xl mx-auto w-full bg-[#FFFDF9] border-2 border-[#1E1B24] rounded-2xl p-4 shadow-[4px_4px_0px_#1E1B24]">
        {/* Tab Selection */}
        <div className="flex items-center justify-between border-b-2 border-gray-100 pb-3 mb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => { playButtonPop(); setActiveTab('filters'); }}
              className={`px-4 py-1.5 rounded-full text-xs font-bold border-2 transition-all cursor-pointer ${
                activeTab === 'filters'
                  ? 'bg-[#E9D5FF] border-[#1E1B24] shadow-[2px_2px_0px_#1E1B24]'
                  : 'bg-white border-transparent text-gray-600 hover:border-gray-300'
              }`}
            >
              <Wand2 className="w-3.5 h-3.5 inline mr-1" /> Retro Filters
            </button>

            <button
              onClick={() => { playButtonPop(); setActiveTab('adjust'); }}
              className={`px-4 py-1.5 rounded-full text-xs font-bold border-2 transition-all cursor-pointer ${
                activeTab === 'adjust'
                  ? 'bg-[#E9D5FF] border-[#1E1B24] shadow-[2px_2px_0px_#1E1B24]'
                  : 'bg-white border-transparent text-gray-600 hover:border-gray-300'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 inline mr-1" /> Adjustments
            </button>

            <button
              onClick={() => { playButtonPop(); setActiveTab('stickers'); }}
              className={`px-4 py-1.5 rounded-full text-xs font-bold border-2 transition-all cursor-pointer ${
                activeTab === 'stickers'
                  ? 'bg-[#FDF2F8] border-[#1E1B24] shadow-[2px_2px_0px_#1E1B24] text-[#BE185D]'
                  : 'bg-white border-transparent text-gray-600 hover:border-gray-300'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 inline mr-1" /> Retro Stickers
            </button>

            <button
              onClick={() => { playButtonPop(); setActiveTab('text'); }}
              className={`px-4 py-1.5 rounded-full text-xs font-bold border-2 transition-all cursor-pointer ${
                activeTab === 'text'
                  ? 'bg-[#FEF08A] border-[#1E1B24] shadow-[2px_2px_0px_#1E1B24] text-[#854D0E]'
                  : 'bg-white border-transparent text-gray-600 hover:border-gray-300'
              }`}
            >
              <Type className="w-3.5 h-3.5 inline mr-1" /> Handwritten Caption
            </button>
          </div>

          <button
            onClick={() => {
              playButtonPop();
              setSelectedFilter('vintage-film');
              setAdjustments({ ...DEFAULT_ADJUSTMENTS });
              setStickersOnCanvas([]);
            }}
            className="text-xs text-gray-500 hover:text-black flex items-center gap-1 font-semibold cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset All
          </button>
        </div>

        {/* Tab 1: Filters */}
        {activeTab === 'filters' && (
          <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-thin">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  playButtonPop();
                  setSelectedFilter(f.id);
                }}
                className={`flex-shrink-0 px-3.5 py-2 rounded-xl border-2 text-left transition-all cursor-pointer ${
                  selectedFilter === f.id
                    ? 'bg-[#E9D5FF] border-[#1E1B24] shadow-[3px_3px_0px_#1E1B24] font-bold'
                    : 'bg-gray-50 border-gray-200 hover:border-gray-400 font-medium'
                }`}
              >
                <div className="text-xs text-[#1E1B24]">{f.name}</div>
                <div className="text-[10px] text-gray-500 truncate max-w-[120px]">{f.description}</div>
              </button>
            ))}
          </div>
        )}

        {/* Tab 2: Adjustments */}
        {activeTab === 'adjust' && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-medium">
            <div>
              <div className="flex justify-between mb-1">
                <span>Brightness</span>
                <span className="font-mono text-gray-500">{adjustments.brightness}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="150"
                value={adjustments.brightness}
                onChange={(e) => setAdjustments(prev => ({ ...prev, brightness: Number(e.target.value) }))}
                className="w-full accent-[#C084FC]"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span>Contrast</span>
                <span className="font-mono text-gray-500">{adjustments.contrast}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="150"
                value={adjustments.contrast}
                onChange={(e) => setAdjustments(prev => ({ ...prev, contrast: Number(e.target.value) }))}
                className="w-full accent-[#C084FC]"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span>Warmth</span>
                <span className="font-mono text-gray-500">{adjustments.warmth}</span>
              </div>
              <input
                type="range"
                min="-40"
                max="40"
                value={adjustments.warmth}
                onChange={(e) => setAdjustments(prev => ({ ...prev, warmth: Number(e.target.value) }))}
                className="w-full accent-[#C084FC]"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span>Film Grain</span>
                <span className="font-mono text-gray-500">{adjustments.grain}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="80"
                value={adjustments.grain}
                onChange={(e) => setAdjustments(prev => ({ ...prev, grain: Number(e.target.value) }))}
                className="w-full accent-[#C084FC]"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span>Vignette</span>
                <span className="font-mono text-gray-500">{adjustments.vignette}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="80"
                value={adjustments.vignette}
                onChange={(e) => setAdjustments(prev => ({ ...prev, vignette: Number(e.target.value) }))}
                className="w-full accent-[#C084FC]"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span>Saturation</span>
                <span className="font-mono text-gray-500">{adjustments.saturation}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="200"
                value={adjustments.saturation}
                onChange={(e) => setAdjustments(prev => ({ ...prev, saturation: Number(e.target.value) }))}
                className="w-full accent-[#C084FC]"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span>Exposure</span>
                <span className="font-mono text-gray-500">{adjustments.exposure}</span>
              </div>
              <input
                type="range"
                min="-30"
                max="30"
                value={adjustments.exposure}
                onChange={(e) => setAdjustments(prev => ({ ...prev, exposure: Number(e.target.value) }))}
                className="w-full accent-[#C084FC]"
              />
            </div>
          </div>
        )}

        {/* Tab 3: Retro Stickers */}
        {activeTab === 'stickers' && (
          <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-thin">
            {RETRO_STICKERS.map((stk) => (
              <button
                key={stk.id}
                onClick={() => handleAddSticker(stk)}
                className="flex-shrink-0 flex flex-col items-center p-2 rounded-xl border-2 border-gray-200 hover:border-[#1E1B24] hover:shadow-[2px_2px_0px_#1E1B24] bg-white transition-all cursor-pointer group"
              >
                <div 
                  className="w-12 h-10 flex items-center justify-center transform group-hover:scale-110 transition-transform"
                  dangerouslySetInnerHTML={{ __html: stk.svg }}
                />
                <span className="text-[10px] font-bold text-gray-700 mt-1">{stk.name}</span>
              </button>
            ))}
          </div>
        )}

        {/* Tab 4: Handwritten Text */}
        {activeTab === 'text' && (
          <form onSubmit={handleAddText} className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              placeholder="Type a sweet handwritten note..."
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              className="retro-input flex-1 text-sm font-hand"
            />
            <select
              value={textFont}
              onChange={(e) => setTextFont(e.target.value)}
              className="retro-input text-xs font-semibold"
            >
              <option value="Caveat">Caveat (Script)</option>
              <option value="Patrick Hand">Patrick Hand (Handwritten)</option>
              <option value="VT323">VT323 (Digicam OSD)</option>
              <option value="Space Grotesk">Space Grotesk (Clean)</option>
            </select>
            <div className="flex items-center gap-1.5">
              {['#1E1B24', '#BE185D', '#DC2626', '#7E22CE', '#EA580C', '#FFFFFF'].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setTextColor(c)}
                  className={`w-6 h-6 rounded-full border-2 border-[#1E1B24] cursor-pointer ${textColor === c ? 'scale-125' : ''}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <button
              type="submit"
              className="retro-btn retro-btn-primary py-2 px-4 text-xs font-bold cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add Note
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
