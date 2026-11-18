import React, { useState } from 'react';
import { Camera, Sparkles, Heart, Users, ArrowRight, X, Play, RefreshCw, Film, Volume2, ShieldCheck } from 'lucide-react';
import { playButtonPop } from '../utils/audio';

export default function LandingPage({ 
  onCreateRoom, 
  onJoinRoom, 
  invitedRoomCode = '', 
  invitedToken = '', 
  invitedHostName = '', 
  invitedError = '',
  onClearInvite
}) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(Boolean(invitedRoomCode && !invitedError));
  const [displayName, setDisplayName] = useState('');
  const [roomCode, setRoomCode] = useState(invitedRoomCode || '');
  const [errorMsg, setErrorMsg] = useState(invitedError || '');
  const [isLoading, setIsLoading] = useState(false);

  // Sync props if changed
  React.useEffect(() => {
    if (invitedRoomCode) {
      setRoomCode(invitedRoomCode);
      if (!invitedError) setShowJoinModal(true);
    }
    if (invitedError) {
      setErrorMsg(invitedError);
    }
  }, [invitedRoomCode, invitedError]);

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    playButtonPop();
    if (!displayName.trim()) {
      setErrorMsg('Please enter your name');
      return;
    }
    setIsLoading(true);
    onCreateRoom(displayName.trim());
  };

  const handleJoinSubmit = (e) => {
    e.preventDefault();
    playButtonPop();
    if (!roomCode.trim()) {
      setErrorMsg('Please enter a room code');
      return;
    }
    if (!displayName.trim()) {
      setErrorMsg('Please enter your name');
      return;
    }
    setIsLoading(true);
    onJoinRoom(roomCode.trim(), displayName.trim(), invitedToken);
  };

  return (
    <div className="min-h-screen bg-[#FAF6F0] relative overflow-hidden flex flex-col justify-between selection:bg-[#E9D5FF]">
      {/* Retro decorative background grid & floating doodles */}
      <div className="absolute inset-0 bg-[radial-gradient(#C084FC_1px,transparent_1px)] [background-size:24px_24px] opacity-25 pointer-events-none" />

      {/* Floating retro stickers */}
      <div className="absolute top-12 left-8 md:left-24 animate-bounce duration-1000 select-none pointer-events-none">
        <span className="text-3xl">✨</span>
      </div>
      <div className="absolute top-28 right-8 md:right-32 select-none pointer-events-none rotate-12">
        <span className="text-4xl">💋</span>
      </div>
      <div className="absolute bottom-32 left-12 select-none pointer-events-none -rotate-12">
        <span className="text-3xl">📼</span>
      </div>
      <div className="absolute bottom-24 right-16 select-none pointer-events-none rotate-6">
        <span className="text-4xl">🌹</span>
      </div>

      {/* Navigation Header */}
      <header className="max-w-6xl mx-auto w-full px-6 py-6 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#E9D5FF] border-2 border-[#1E1B24] shadow-[2px_2px_0px_#1E1B24] flex items-center justify-center">
            <Camera className="w-5 h-5 text-[#1E1B24]" />
          </div>
          <span className="font-bold text-xl md:text-2xl tracking-tight text-[#1E1B24]">
            Our Little Photobooth
          </span>
        </div>

        {/* Special Dedication Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#FDF2F8] border-2 border-[#1E1B24] rounded-full shadow-[2px_2px_0px_#1E1B24] text-xs md:text-sm font-semibold text-[#BE185D]">
          <Heart className="w-3.5 h-3.5 fill-[#BE185D]" />
          <span>Birthday Gift for Paulene 🎂</span>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto w-full px-6 py-8 flex flex-col lg:flex-row items-center gap-12 relative z-10">
        {/* Left Column: Title & Room Action Buttons */}
        <div className="flex-1 text-center lg:text-left space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#FEF08A] border-2 border-[#1E1B24] rounded-lg shadow-[2px_2px_0px_#1E1B24] text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-[#B45309]" />
            <span>Private Real-Time WebRTC Photobooth</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#1E1B24] leading-[1.1] tracking-tight">
            Take Timeless Photos Together,{' '}
            <span className="text-[#9333EA] underline decoration-wavy decoration-[#F472B6]">
              Miles Apart.
            </span>
          </h1>

          <p className="text-lg md:text-xl text-[#4B5563] max-w-xl mx-auto lg:mx-0 font-medium">
            Connect your webcams with someone you love in a private retro 90s photobooth.
            Pose together, trigger synchronized countdowns, and customize nostalgic photo strips with vintage stickers.
          </p>

          {/* Action Buttons */}
          {invitedRoomCode && !invitedError ? (
            <div className="space-y-3 pt-2">
              <div className="p-4 bg-[#FAF5FF] border-2 border-[#1E1B24] rounded-2xl shadow-[4px_4px_0px_#1E1B24] max-w-md">
                <div className="flex items-center gap-2 font-bold text-sm text-[#7E22CE] mb-1">
                  <span>💌</span>
                  <span>{invitedHostName ? `${invitedHostName} invited you to Photobooth!` : 'Photobooth Invitation'}</span>
                </div>
                <p className="text-xs text-gray-600 mb-3">
                  Room: <strong className="font-mono text-purple-700">{invitedRoomCode}</strong>
                </p>
                <button
                  onClick={() => {
                    playButtonPop();
                    setErrorMsg('');
                    setShowJoinModal(true);
                  }}
                  className="retro-btn retro-btn-pink w-full py-3 text-base font-bold flex items-center justify-center gap-2 cursor-pointer shadow-[3px_3px_0px_#1E1B24]"
                >
                  <Users className="w-5 h-5" />
                  <span>Join {invitedHostName ? `${invitedHostName}'s` : ''} Photobooth</span>
                </button>
              </div>
              <div className="text-xs text-gray-500 text-center lg:text-left">
                Want to host instead?{' '}
                <button
                  type="button"
                  onClick={() => {
                    playButtonPop();
                    onClearInvite?.();
                    setShowCreateModal(true);
                  }}
                  className="underline text-purple-700 font-semibold cursor-pointer"
                >
                  Create a new room
                </button>
              </div>
            </div>
          ) : invitedError ? (
            <div className="p-4 bg-red-50 border-2 border-red-500 rounded-2xl shadow-[4px_4px_0px_#EF4444] max-w-md space-y-3">
              <div className="flex items-center gap-2 font-bold text-sm text-red-700">
                <span>⚠️</span>
                <span>Invitation Issue</span>
              </div>
              <p className="text-xs text-red-600">{invitedError}</p>
              <button
                onClick={() => {
                  playButtonPop();
                  onClearInvite?.();
                  setShowCreateModal(true);
                }}
                className="retro-btn retro-btn-primary w-full py-2.5 text-sm font-bold flex items-center justify-center gap-2 cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>Start Your Own Photobooth</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
              <button
                onClick={() => {
                  playButtonPop();
                  setErrorMsg('');
                  setShowCreateModal(true);
                }}
                className="retro-btn retro-btn-primary w-full sm:w-auto text-base md:text-lg px-8 py-3.5 flex items-center justify-center gap-2 font-bold cursor-pointer"
              >
                <Camera className="w-5 h-5" />
                <span>Create a Room</span>
              </button>

              <button
                onClick={() => {
                  playButtonPop();
                  setErrorMsg('');
                  setShowJoinModal(true);
                }}
                className="retro-btn retro-btn-secondary w-full sm:w-auto text-base md:text-lg px-8 py-3.5 flex items-center justify-center gap-2 font-bold cursor-pointer"
              >
                <Users className="w-5 h-5 text-[#9333EA]" />
                <span>Join with Code</span>
              </button>
            </div>
          )}

          {/* Privacy & Feature Highlights */}
          <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-4 text-xs md:text-sm text-[#6B7280]">
            <span className="flex items-center gap-1.5 font-medium">
              <ShieldCheck className="w-4 h-4 text-green-600" /> End-to-End Private WebRTC
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <Film className="w-4 h-4 text-purple-600" /> 7 Retro Frame Layouts
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <Volume2 className="w-4 h-4 text-pink-600" /> Camera-First (Mic Muted by Default)
            </span>
          </div>
        </div>

        {/* Right Column: Animated Retro Photobooth Machine */}
        <div className="flex-1 flex justify-center items-center relative">
          <div className="relative w-[320px] sm:w-[380px] bg-[#2A1B3D] border-4 border-[#1E1B24] rounded-3xl p-5 shadow-[8px_8px_0px_#1E1B24] text-white">
            {/* Top Marquee Sign */}
            <div className="bg-[#44318D] border-2 border-[#1E1B24] rounded-xl p-3 text-center mb-4 marquee-glow">
              <div className="font-silkscreen text-xs text-[#F472B6] tracking-widest uppercase mb-1">
                ★ LIVE MULTIPLAYER ★
              </div>
              <div className="font-pixel text-4xl text-[#FDE047] tracking-wider uppercase font-bold">
                PHOTO BOOTH
              </div>
            </div>

            {/* Virtual Curtains & Screen Window */}
            <div className="relative h-[250px] bg-[#1A102F] border-2 border-[#1E1B24] rounded-2xl overflow-hidden flex items-center justify-center scanlines">
              {/* Animated Booth Light Flash */}
              <div className="absolute inset-0 bg-white opacity-0 animate-pulse pointer-events-none" />

              {/* Sample Photo Strip inside the Booth */}
              <div className="w-[180px] bg-white text-black p-2 rounded-lg shadow-xl border-2 border-black rotate-[-3deg] transform hover:rotate-0 transition-transform duration-300">
                <div className="grid grid-cols-2 gap-1 mb-2">
                  <div className="h-16 bg-[#FDF2F8] border border-black rounded flex flex-col items-center justify-center text-[10px] font-bold text-[#BE185D]">
                    <span>YOU 📸</span>
                  </div>
                  <div className="h-16 bg-[#FAF5FF] border border-black rounded flex flex-col items-center justify-center text-[10px] font-bold text-[#7E22CE]">
                    <span>PAULENE ♡</span>
                  </div>
                </div>
                <div className="bg-black text-[#F97316] font-pixel text-xs text-center py-0.5 rounded">
                  '99 11 12 REC ●
                </div>
                <div className="text-[9px] font-hand font-bold text-center mt-1 text-[#4C0519]">
                  forever and always ♡
                </div>
              </div>

              {/* Animated Floating Sparks */}
              <div className="absolute top-3 right-4 text-xl animate-spin duration-3000">✨</div>
              <div className="absolute bottom-3 left-4 text-xl">💋</div>
            </div>

            {/* Coin Slot & Instructions */}
            <div className="mt-4 pt-3 border-t-2 border-[#44318D] flex items-center justify-between text-xs text-[#D8B4FE]">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-400 animate-ping" />
                <span className="font-mono">READY TO POSE</span>
              </div>
              <div className="flex items-center gap-1 font-pixel text-sm text-[#FDE047]">
                <span>INSERT LOVE 25¢</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Example Layouts Preview Bar */}
      <section className="max-w-6xl mx-auto w-full px-6 py-6 border-t-2 border-[#1E1B24]/10 relative z-10">
        <div className="text-center mb-4">
          <span className="font-bold text-xs uppercase tracking-wider text-[#6B7280]">
            Included Retro Frames & Scrapbook Themes
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="retro-card p-3 text-center">
            <span className="text-2xl block mb-1">🎀</span>
            <span className="font-bold text-xs">Romantic Ribbon</span>
            <p className="text-[10px] text-gray-500">Gingham & Rose</p>
          </div>
          <div className="retro-card p-3 text-center">
            <span className="text-2xl block mb-1">📼</span>
            <span className="font-bold text-xs">90s Scrapbook</span>
            <p className="text-[10px] text-gray-500">Kodak Gold & Cassette</p>
          </div>
          <div className="retro-card p-3 text-center">
            <span className="text-2xl block mb-1">📺</span>
            <span className="font-bold text-xs">Dual Vintage TV</span>
            <p className="text-[10px] text-gray-500">Retro CRT Screens</p>
          </div>
          <div className="retro-card p-3 text-center">
            <span className="text-2xl block mb-1">📷</span>
            <span className="font-bold text-xs">Canon Digicam</span>
            <p className="text-[10px] text-gray-500">2000s LCD Viewfinder</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center py-4 text-xs text-[#9CA3AF] border-t border-black/5 relative z-10">
        <p>Built with love for Paulene's Birthday ♡ Our Little Photobooth</p>
      </footer>

      {/* CREATE ROOM MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="retro-card max-w-md w-full p-6 bg-[#FFFDF9] relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100 border border-black/20 cursor-pointer"
            >
              <X className="w-5 h-5 text-gray-700" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#E9D5FF] border-2 border-[#1E1B24] flex items-center justify-center">
                <Camera className="w-5 h-5 text-[#1E1B24]" />
              </div>
              <div>
                <h3 className="font-bold text-xl text-[#1E1B24]">Start Photobooth</h3>
                <p className="text-xs text-gray-500">Create a private 2-person session</p>
              </div>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#374151] mb-1.5">
                  Your Name / Nickname
                </label>
                <input
                  type="text"
                  placeholder="e.g. Paulene or Mawkin"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="retro-input w-full"
                  autoFocus
                  required
                />
              </div>

              {errorMsg && (
                <div className="p-2.5 bg-red-100 border border-red-400 rounded-lg text-xs font-semibold text-red-700">
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="retro-btn retro-btn-primary w-full py-3 font-bold text-base cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" /> Creating Room...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Enter Photobooth <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* JOIN ROOM MODAL */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="retro-card max-w-md w-full p-6 bg-[#FFFDF9] relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setShowJoinModal(false)}
              className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100 border border-black/20 cursor-pointer"
            >
              <X className="w-5 h-5 text-gray-700" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#FDF2F8] border-2 border-[#1E1B24] flex items-center justify-center">
                <Users className="w-5 h-5 text-[#BE185D]" />
              </div>
              <div>
                <h3 className="font-bold text-xl text-[#1E1B24]">
                  {invitedRoomCode ? 'Join Invited Photobooth' : 'Join Room'}
                </h3>
                <p className="text-xs text-gray-500">
                  {invitedRoomCode 
                    ? (invitedHostName ? `Invited by ${invitedHostName}` : 'Private photobooth invitation') 
                    : 'Enter your invitation code to connect'}
                </p>
              </div>
            </div>

            {invitedRoomCode && (
              <div className="p-3 bg-[#FAF5FF] border-2 border-[#1E1B24] rounded-xl mb-4 text-xs">
                <div className="font-bold text-[#6B21A8] flex items-center gap-1.5 mb-1">
                  <span>💌</span>
                  <span>{invitedHostName ? `${invitedHostName} is waiting for you!` : 'Private Photobooth Invitation'}</span>
                </div>
                <div className="text-gray-600">
                  Step inside to connect webcams and take retro photobooth photos together.
                </div>
              </div>
            )}

            <form onSubmit={handleJoinSubmit} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#374151]">
                    Room Code
                  </label>
                  {invitedRoomCode && (
                    <span className="text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full border border-green-300">
                      ✓ Linked from Invitation
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="e.g. RETRO-99"
                  value={roomCode}
                  onChange={(e) => !invitedRoomCode && setRoomCode(e.target.value.toUpperCase())}
                  readOnly={Boolean(invitedRoomCode)}
                  className={`retro-input w-full uppercase font-mono tracking-wider ${
                    invitedRoomCode ? 'bg-gray-100 border-gray-400 cursor-not-allowed text-gray-700' : ''
                  }`}
                  autoFocus={!invitedRoomCode}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#374151] mb-1.5">
                  Your Name / Nickname
                </label>
                <input
                  type="text"
                  placeholder="e.g. Paulene or Mawkin"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="retro-input w-full"
                  autoFocus={Boolean(invitedRoomCode)}
                  required
                />
              </div>

              {errorMsg && (
                <div className="p-2.5 bg-red-100 border border-red-400 rounded-lg text-xs font-semibold text-red-700">
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="retro-btn retro-btn-pink w-full py-3 font-bold text-base cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" /> Connecting...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Join Session <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
