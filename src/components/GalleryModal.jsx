import React, { useState } from 'react';
import { 
  X, Download, Trash2, Heart, Calendar, Filter, 
  ZoomIn, ExternalLink, Sparkles, Image as ImageIcon 
} from 'lucide-react';
import { playButtonPop, playShutterSound } from '../utils/audio';

export default function GalleryModal({ 
  photos = [], 
  onClose, 
  onDeletePhoto, 
  onToggleFavorite, 
  onUpdateCaption,
  onOpenStripWithPhotos
}) {
  const [filterType, setFilterType] = useState('all'); // 'all', 'favorites', 'composite', 'strip'
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [editingCaption, setEditingCaption] = useState(false);
  const [captionText, setCaptionText] = useState('');

  const filteredPhotos = photos.filter((p) => {
    if (filterType === 'favorites') return p.isFavorite;
    if (filterType === 'composite') return p.photoType === 'composite';
    if (filterType === 'strip') return p.photoType === 'strip';
    return true;
  });

  const openLightbox = (photo) => {
    playButtonPop();
    setSelectedPhoto(photo);
    setCaptionText(photo.caption || '');
    setEditingCaption(false);
  };

  const handleSaveCaption = () => {
    if (selectedPhoto) {
      onUpdateCaption(selectedPhoto.id, captionText);
      setSelectedPhoto(prev => ({ ...prev, caption: captionText }));
      setEditingCaption(false);
    }
  };

  const downloadPhoto = (photo) => {
    playShutterSound();
    const link = document.createElement('a');
    link.href = photo.url;
    link.download = `photobooth-${photo.id}.png`;
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#1E1B24]/90 backdrop-blur-md flex flex-col justify-between p-4 md:p-6 overflow-hidden">
      {/* Top Header */}
      <div className="max-w-6xl mx-auto w-full flex items-center justify-between bg-[#FFFDF9] border-2 border-[#1E1B24] rounded-2xl px-6 py-3 shadow-[3px_3px_0px_#1E1B24]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#FAF5FF] border border-[#1E1B24] flex items-center justify-center font-bold text-sm text-[#9333EA]">
            🎞️
          </div>
          <div>
            <h2 className="font-bold text-base md:text-lg text-[#1E1B24]">Private Room Gallery</h2>
            <p className="text-xs text-gray-500">{photos.length} captured memories in this session</p>
          </div>
        </div>

        {/* Filter Pills & Actions */}
        <div className="flex items-center gap-2">
          {photos.length >= 2 && onOpenStripWithPhotos && (
            <button
              onClick={() => onOpenStripWithPhotos(photos)}
              className="retro-btn retro-btn-pink text-xs py-2 px-3 cursor-pointer font-bold hidden sm:inline-flex"
            >
              Make Photo Strip 🎟️
            </button>
          )}

          <div className="flex bg-gray-100 p-1 rounded-xl border border-black/20 text-xs">
            <button
              onClick={() => { playButtonPop(); setFilterType('all'); }}
              className={`px-3 py-1 rounded-lg font-bold cursor-pointer ${
                filterType === 'all' ? 'bg-[#E9D5FF] text-[#1E1B24]' : 'text-gray-600'
              }`}
            >
              All
            </button>
            <button
              onClick={() => { playButtonPop(); setFilterType('favorites'); }}
              className={`px-3 py-1 rounded-lg font-bold cursor-pointer ${
                filterType === 'favorites' ? 'bg-[#FDF2F8] text-[#BE185D]' : 'text-gray-600'
              }`}
            >
              ♥ Favorites
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full border border-black/20 cursor-pointer"
          >
            <X className="w-5 h-5 text-gray-700" />
          </button>
        </div>
      </div>

      {/* Photos Grid */}
      <div className="flex-1 max-w-6xl mx-auto w-full py-4 overflow-y-auto scrollbar-thin">
        {filteredPhotos.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-[#FFFDF9] border-2 border-dashed border-gray-300 rounded-2xl">
            <span className="text-4xl mb-3">📸</span>
            <h3 className="font-bold text-lg text-gray-800">No photos yet</h3>
            <p className="text-xs text-gray-500 max-w-sm mt-1">
              Start posing together in the photobooth and hit the shutter button to fill this gallery with sweet retro memories!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {filteredPhotos.map((photo) => (
              <div
                key={photo.id}
                className="retro-card overflow-hidden group relative flex flex-col bg-white transition-transform hover:-translate-y-1"
              >
                {/* Photo Image */}
                <div 
                  onClick={() => openLightbox(photo)}
                  className="relative aspect-4/3 sm:aspect-square bg-black overflow-hidden cursor-pointer"
                >
                  <img
                    src={photo.url}
                    alt={photo.caption || 'Captured photo'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* Favorite Indicator */}
                  {photo.isFavorite && (
                    <div className="absolute top-2 right-2 bg-white/90 p-1 rounded-full shadow">
                      <Heart className="w-3.5 h-3.5 fill-[#BE185D] text-[#BE185D]" />
                    </div>
                  )}

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <span className="px-3 py-1 bg-white font-bold text-xs rounded-full border border-black shadow flex items-center gap-1">
                      <ZoomIn className="w-3.5 h-3.5" /> View
                    </span>
                  </div>
                </div>

                {/* Card Info */}
                <div className="p-3 flex items-center justify-between text-xs">
                  <div className="truncate pr-2">
                    <span className="font-bold block truncate text-gray-800">
                      {photo.caption || 'Photobooth Snap'}
                    </span>
                    <span className="text-[10px] text-gray-500 font-mono">
                      {new Date(photo.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onToggleFavorite(photo.id, !photo.isFavorite)}
                      className="p-1 text-gray-400 hover:text-red-500 cursor-pointer"
                      title="Favorite"
                    >
                      <Heart className={`w-4 h-4 ${photo.isFavorite ? 'fill-[#BE185D] text-[#BE185D]' : ''}`} />
                    </button>
                    <button
                      onClick={() => downloadPhoto(photo)}
                      className="p-1 text-gray-500 hover:text-black cursor-pointer"
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* LIGHTBOX MODAL */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="retro-card max-w-4xl w-full max-h-[92vh] flex flex-col md:flex-row bg-[#FFFDF9] overflow-hidden relative">
            {/* Close Button */}
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-3 right-3 z-20 p-1.5 rounded-full bg-white/80 hover:bg-white border border-black cursor-pointer"
            >
              <X className="w-5 h-5 text-black" />
            </button>

            {/* Photo View */}
            <div className="flex-1 bg-black flex items-center justify-center p-2 min-h-[300px]">
              <img
                src={selectedPhoto.url}
                alt="Selected"
                className="max-h-[70vh] max-w-full object-contain rounded"
              />
            </div>

            {/* Sidebar Details */}
            <div className="w-full md:w-80 p-5 flex flex-col justify-between border-t md:border-t-0 md:border-l-2 border-[#1E1B24] bg-[#FFFDF9]">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 bg-[#E9D5FF] border border-black rounded text-[10px] font-bold uppercase">
                    {selectedPhoto.layout || 'side-by-side'}
                  </span>
                  <span className="text-[10px] text-gray-500 font-mono">
                    {new Date(selectedPhoto.createdAt).toLocaleDateString()}
                  </span>
                </div>

                {/* Caption Editing */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Photo Caption
                  </label>
                  {editingCaption ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={captionText}
                        onChange={(e) => setCaptionText(e.target.value)}
                        className="retro-input w-full text-xs font-hand"
                        autoFocus
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditingCaption(false)}
                          className="px-2 py-1 text-xs border border-gray-300 rounded cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveCaption}
                          className="px-3 py-1 text-xs bg-[#E9D5FF] font-bold border border-black rounded cursor-pointer"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div 
                      onClick={() => setEditingCaption(true)}
                      className="p-2.5 bg-gray-50 border border-dashed border-gray-300 rounded-lg text-sm font-hand cursor-pointer hover:border-black"
                    >
                      {selectedPhoto.caption || <span className="text-gray-400 italic">Click to add handwritten caption...</span>}
                    </div>
                  )}
                </div>

                {/* Metadata Details */}
                <div className="bg-[#FAF5FF] p-3 rounded-xl border border-purple-200 text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Filter Applied:</span>
                    <span className="font-semibold text-purple-900">{selectedPhoto.filter || 'Vintage Film'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Dimensions:</span>
                    <span className="font-mono text-purple-900">{selectedPhoto.dimensions || '1400x1050'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Photo Type:</span>
                    <span className="capitalize text-purple-900">{selectedPhoto.photoType}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 space-y-2 border-t border-gray-200">
                <button
                  onClick={() => downloadPhoto(selectedPhoto)}
                  className="retro-btn retro-btn-primary w-full py-2.5 text-xs font-bold cursor-pointer"
                >
                  <Download className="w-4 h-4" /> Download High-Res
                </button>
                <button
                  onClick={() => {
                    if (confirm('Delete this photo from room gallery?')) {
                      onDeletePhoto(selectedPhoto.id);
                      setSelectedPhoto(null);
                    }
                  }}
                  className="w-full py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete Photo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
