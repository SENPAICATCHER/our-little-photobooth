import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, CameraOff, Mic, MicOff, RefreshCw, Copy, Check, 
  Sparkles, Heart, Film, Image as ImageIcon, LogOut, Lock, 
  Sliders, Play, Bell, AlertCircle, Share2, Users 
} from 'lucide-react';
import { WebRTCManager } from '../utils/webrtc';
import { renderLayoutToCanvas, LAYOUT_CONFIGS } from '../utils/canvasEngine';
import { playShutterSound, playCountdownBeep, playButtonPop } from '../utils/audio';
import confetti from 'canvas-confetti';

export default function PhotoboothRoom({ 
  room, 
  user, 
  socket, 
  onLeaveRoom, 
  onCaptureCompleted, 
  onOpenGallery,
  photoCount = 0,
  isP2P = false
}) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [peerConnectionState, setPeerConnectionState] = useState('waiting'); // 'waiting', 'connecting', 'connected', 'disconnected'
  const [remoteParticipant, setRemoteParticipant] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [bothReady, setBothReady] = useState(false);

  // Device & Media State (Default: Camera ON, Mic OFF as strictly required)
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(false);
  const [availableCameras, setAvailableCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [cameraError, setCameraError] = useState('');

  // Photobooth Controls
  const [selectedLayout, setSelectedLayout] = useState('side-by-side');
  const [countdownDuration, setCountdownDuration] = useState(3);
  const [countdownRemaining, setCountdownRemaining] = useState(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [mirrorLocal, setMirrorLocal] = useState(true);

  // Refs for HTML5 Video & Canvas Elements
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const captureCanvasRef = useRef(null);
  const webrtcManagerRef = useRef(null);
  const isCapturingRef = useRef(false);

  // Initialize WebRTC and Local Camera
  useEffect(() => {
    let mounted = true;

    async function setupMedia() {
      // 1. Get available cameras
      const devices = await WebRTCManager.getVideoDevices();
      if (mounted) {
        setAvailableCameras(devices);
        if (devices.length > 0) setSelectedCameraId(devices[0].deviceId);
      }

      if (isP2P) {
        // P2P Netlify Mode
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
            audio: false
          });
          if (mounted) {
            setLocalStream(stream);
            if (localVideoRef.current) {
              localVideoRef.current.srcObject = stream;
              localVideoRef.current.play().catch(console.warn);
            }
          }

          if (socket && socket.updateLocalStream) {
            socket.updateLocalStream(stream);
          }

          if (socket && socket.init) {
            await socket.init(stream, (remoteMediaStream) => {
              console.log(`[WEBRTC] [Room: ${room.roomCode}] [Participant: ${user.id}] P2P onRemoteStream received`, {
                streamId: remoteMediaStream.id,
                tracks: remoteMediaStream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled, readyState: t.readyState }))
              });
              if (mounted) {
                setRemoteStream(remoteMediaStream);
                setPeerConnectionState('connected');
                if (remoteVideoRef.current) {
                  remoteVideoRef.current.srcObject = remoteMediaStream;
                  remoteVideoRef.current.play().catch(err => {
                    console.warn('[WEBRTC] remoteVideo.play() warning:', err);
                  });
                }
              }
            });
          }
        } catch (err) {
          if (mounted) setCameraError(err.name || 'Camera access denied');
        }
      } else {
        // Full-Stack Node Mode
        const rtc = new WebRTCManager({
          socket,
          roomCode: room.roomCode,
          userId: user.id,
          isPolite: !user.isOwner,
          onRemoteStream: (stream) => {
            console.log(`[WEBRTC] [Room: ${room.roomCode}] [Participant: ${user.id}] Remote stream received in UI callback`, {
              streamId: stream.id,
              tracks: stream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled, readyState: t.readyState }))
            });
            if (mounted) {
              setRemoteStream(stream);
              setPeerConnectionState('connected');
              if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = stream;
                remoteVideoRef.current.play().catch(err => {
                  console.warn('[WEBRTC] remoteVideo.play() warning:', err);
                });
              }
            }
          },
          onConnectionStateChange: (state) => {
            if (mounted) {
              setPeerConnectionState(state);
            }
          }
        });
        webrtcManagerRef.current = rtc;

        // Start local camera (Camera only, mic disabled)
        const res = await rtc.initLocalStream({ video: true, audio: false });
        if (mounted) {
          if (res.success) {
            setLocalStream(res.stream);
            if (localVideoRef.current) {
              localVideoRef.current.srcObject = res.stream;
              localVideoRef.current.play().catch(console.warn);
            }
            // Notify peer that our camera is hot and ready
            if (socket) {
              socket.emit('peer-camera-ready', { userId: user.id });
            }
          } else {
            setCameraError(res.error || 'Failed to access camera.');
          }
        }
      }
    }

    setupMedia();

    return () => {
      mounted = false;
      if (webrtcManagerRef.current) {
        webrtcManagerRef.current.close();
      }
      if (localStream) {
        localStream.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  // Ensure local video element always has localStream attached and playing
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      console.log(`[WEBRTC] [Room: ${room.roomCode}] [Participant: ${user.id}] Attaching localStream to local video element`);
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch(console.warn);
    }
  }, [localStream, room.roomCode, user.id]);

  // Ensure remote video element always has remoteStream attached and playing (fixes React conditional unmount race)
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      console.log(`[WEBRTC] [Room: ${room.roomCode}] [Participant: ${user.id}] Attaching remoteStream to remote video element`, {
        streamId: remoteStream.id,
        tracks: remoteStream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled, readyState: t.readyState }))
      });
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch(err => {
        console.warn(`[WEBRTC] [Room: ${room.roomCode}] [Participant: ${user.id}] Remote video play() error:`, err);
      });
    }
  }, [remoteStream, room.roomCode, user.id]);

  // Socket Event Listeners for Signaling and Photobooth Synchronization
  useEffect(() => {
    if (!socket) return;

    // Immediately request current room state in case remote partner joined before us
    if (socket.emit) {
      socket.emit('get-room-state');
    }

    // Room state updated
    socket.on('room-state-updated', ({ participants, layout, filter }) => {
      console.log(`[WEBRTC] [Room: ${room.roomCode}] [Participant: ${user.id}] room-state-updated`, {
        totalParticipants: participants?.length
      });
      if (participants && Array.isArray(participants)) {
        const other = participants.find(p => p.userId !== user.id);
        if (other) {
          setRemoteParticipant(other);
          // If we are owner and other participant is already waiting, initiate offer
          if (user.isOwner && webrtcManagerRef.current) {
            setTimeout(() => {
              if (webrtcManagerRef.current) {
                webrtcManagerRef.current.createOffer();
              }
            }, 300);
          }
        }
      }
      if (layout) setSelectedLayout(layout);
    });

    // Peer Joined
    socket.on('peer-joined', ({ participant }) => {
      console.log(`[WEBRTC] [Room: ${room.roomCode}] [Participant: ${user.id}] peer-joined`, { participant });
      setRemoteParticipant(participant);
      setPeerConnectionState('connecting');

      // If we are owner and have peer connection, initiate offer
      if (user.isOwner && webrtcManagerRef.current) {
        webrtcManagerRef.current.createOffer();
      }
    });

    // Peer Camera Ready (signals that peer's getUserMedia has finished)
    socket.on('peer-camera-ready', ({ userId }) => {
      console.log(`[WEBRTC] [Room: ${room.roomCode}] [Participant: ${user.id}] peer-camera-ready received from`, { userId });
      // If we are owner (or we have localStream), create offer now
      if (user.isOwner && webrtcManagerRef.current) {
        webrtcManagerRef.current.createOffer();
      }
    });

    // WebRTC Signaling relays
    socket.on('webrtc-offer', async ({ offer }) => {
      console.log(`[WEBRTC] [Room: ${room.roomCode}] [Participant: ${user.id}] webrtc-offer received`);
      if (webrtcManagerRef.current) {
        await webrtcManagerRef.current.handleOffer(offer);
      }
    });

    socket.on('webrtc-answer', async ({ answer }) => {
      console.log(`[WEBRTC] [Room: ${room.roomCode}] [Participant: ${user.id}] webrtc-answer received`);
      if (webrtcManagerRef.current) {
        await webrtcManagerRef.current.handleAnswer(answer);
      }
    });

    socket.on('webrtc-ice-candidate', async ({ candidate }) => {
      if (webrtcManagerRef.current && candidate) {
        await webrtcManagerRef.current.handleIceCandidate(candidate);
      }
    });

    // Peer Media State change
    socket.on('peer-media-state', ({ cameraOn, micOn }) => {
      setRemoteParticipant(prev => prev ? { ...prev, cameraOn, micOn } : null);
    });

    // Peer Ready toggle
    socket.on('participant-ready-changed', ({ userId, isReady, bothReady }) => {
      setBothReady(bothReady);
      if (userId !== user.id) {
        setRemoteParticipant(prev => prev ? { ...prev, isReady } : null);
      }
    });

    // Synchronized Layout change
    socket.on('layout-changed', ({ layout }) => {
      setSelectedLayout(layout);
    });

    // Synchronized Countdown
    socket.on('countdown-started', ({ totalSeconds }) => {
      setCountdownRemaining(totalSeconds);
      playCountdownBeep(false);
    });

    socket.on('countdown-tick', ({ remaining }) => {
      setCountdownRemaining(remaining);
      playCountdownBeep(false);
    });

    socket.on('trigger-synchronized-capture', async () => {
      setCountdownRemaining(0);
      playCountdownBeep(true);

      // Flash effect & shutter sound
      setIsFlashing(true);
      playShutterSound();
      setTimeout(() => setIsFlashing(false), 600);

      // Capture canvas
      await executePhotoCapture();
      setCountdownRemaining(null);
    });

    socket.on('countdown-cancelled', () => {
      setCountdownRemaining(null);
    });

    // Peer Disconnected
    socket.on('peer-disconnected', () => {
      setRemoteStream(null);
      setRemoteParticipant(null);
      setPeerConnectionState('disconnected');
      setBothReady(false);
    });

    return () => {
      socket.off('peer-joined');
      socket.off('webrtc-offer');
      socket.off('webrtc-answer');
      socket.off('webrtc-ice-candidate');
      socket.off('peer-media-state');
      socket.off('participant-ready-changed');
      socket.off('layout-changed');
      socket.off('countdown-started');
      socket.off('countdown-tick');
      socket.off('trigger-synchronized-capture');
      socket.off('countdown-cancelled');
      socket.off('peer-disconnected');
    };
  }, [socket, user.id]);

  // Execute Photo Capture via Canvas
  const executePhotoCapture = async () => {
    if (isCapturingRef.current) return;
    isCapturingRef.current = true;

    try {
      const canvas = captureCanvasRef.current;
      const localVideo = localVideoRef.current;
      const remoteVideo = remoteVideoRef.current;
      if (!canvas || !localVideo) {
        console.warn('[PHOTOBOOTH] Canvas or localVideo element not ready for capture');
        return;
      }

      const effectiveRemoteName = remoteParticipant?.displayName || (user.isOwner ? 'Guest' : 'Host');

      await renderLayoutToCanvas({
        canvas,
        layoutId: selectedLayout,
        localVideo,
        remoteVideo,
        localName: user.displayName,
        remoteName: effectiveRemoteName,
        isLocalMirrored: mirrorLocal,
        isRemoteMirrored: false
      });

      const capturedDataUrl = canvas.toDataURL('image/png', 0.95);

      // Birthday confetti burst!
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 }
      });

      // Pass captured image to editor
      onCaptureCompleted({
        dataUrl: capturedDataUrl,
        layout: selectedLayout
      });
    } catch (err) {
      console.error('[PHOTOBOOTH] Capture execution error:', err);
    } finally {
      setTimeout(() => {
        isCapturingRef.current = false;
      }, 1000);
    }
  };

  // Toggle Camera
  const toggleCamera = () => {
    playButtonPop();
    const next = !cameraOn;
    if (localStream) {
      const v = localStream.getVideoTracks()[0];
      if (v) v.enabled = next;
    }
    if (webrtcManagerRef.current) {
      webrtcManagerRef.current.toggleCamera(next);
    }
    setCameraOn(next);
    socket.emit('media-state-change', { cameraOn: next });
  };

  // Toggle Microphone
  const toggleMicrophone = () => {
    playButtonPop();
    const next = !micOn;
    if (localStream) {
      const a = localStream.getAudioTracks()[0];
      if (a) a.enabled = next;
    }
    if (webrtcManagerRef.current) {
      webrtcManagerRef.current.toggleMicrophone(next);
    }
    setMicOn(next);
    socket.emit('media-state-change', { micOn: next });
  };

  // Switch Camera Device
  const handleSwitchCamera = async (deviceId) => {
    setSelectedCameraId(deviceId);
    if (webrtcManagerRef.current) {
      const res = await webrtcManagerRef.current.initLocalStream({
        video: true,
        audio: micOn,
        deviceId
      });
      if (res.success) {
        setLocalStream(res.stream);
        if (localVideoRef.current) localVideoRef.current.srcObject = res.stream;
      }
    }
  };

  // Toggle Ready Status
  const handleToggleReady = () => {
    playButtonPop();
    const next = !isReady;
    setIsReady(next);
    socket.emit('toggle-ready', { isReady: next });
  };

  // Start Synchronized Countdown
  const handleTriggerCountdown = () => {
    playButtonPop();
    if (countdownRemaining !== null || isCapturingRef.current) return;

    if (!remoteParticipant || !remoteStream) {
      const proceed = window.confirm(
        "Your partner's camera is not connected yet!\n\nDo you want to take a solo photo now, or wait for them?"
      );
      if (!proceed) return;
    }

    socket.emit('start-countdown', { seconds: countdownDuration });
  };

  // Synchronize layout change
  const handleLayoutSelect = (layoutKey) => {
    playButtonPop();
    setSelectedLayout(layoutKey);
    socket.emit('change-layout', { layout: layoutKey });
  };

  // Copy Invite Link
  const copyInviteLink = () => {
    playButtonPop();
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    const tokenPart = room.inviteToken ? `&token=${encodeURIComponent(room.inviteToken)}` : '';
    const url = `${origin}${pathname}?join=${encodeURIComponent(room.roomCode)}${tokenPart}`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).catch(() => {
        window.prompt('Copy invitation link:', url);
      });
    } else {
      window.prompt('Copy invitation link:', url);
    }

    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="min-h-screen bg-[#FAF6F0] flex flex-col justify-between p-4 md:p-6 selection:bg-[#E9D5FF] relative overflow-hidden">
      {/* Fullscreen Camera Flash Overlay */}
      {isFlashing && (
        <div className="fixed inset-0 z-50 bg-white animate-flash pointer-events-none" />
      )}

      {/* Hidden processing canvas */}
      <canvas ref={captureCanvasRef} className="hidden" />

      {/* TOP STATUS BAR (Figma UI Kit Neo-Brutalist Style) */}
      <header className="max-w-6xl mx-auto w-full bg-[#FFFDF9] border-2 border-[#1E1B24] rounded-2xl p-4 shadow-[4px_4px_0px_#1E1B24] flex flex-wrap items-center justify-between gap-4 relative z-10">
        {/* Left: Room Badge & Code */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#E9D5FF] border-2 border-[#1E1B24] flex items-center justify-center font-bold text-lg">
            📸
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-pixel text-2xl text-[#1E1B24] tracking-wider">
                ROOM: {room.roomCode}
              </span>
              <button
                onClick={copyInviteLink}
                className="p-1 hover:bg-gray-100 rounded border border-black/20 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                title="Copy Invite Link"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="text-[10px]">{copiedLink ? 'Copied!' : 'Invite'}</span>
              </button>
            </div>
            <div className="text-[11px] text-gray-500 font-medium">
              Birthday Photobooth for Paulene 🎂
            </div>
          </div>
        </div>

        {/* Center: Connection Status Pill */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#FAF5FF] border-2 border-[#1E1B24] rounded-full text-xs font-bold shadow-[2px_2px_0px_#1E1B24]">
          <div className={`w-2.5 h-2.5 rounded-full ${
            peerConnectionState === 'connected' ? 'bg-green-500 animate-pulse' :
            peerConnectionState === 'connecting' ? 'bg-yellow-400 animate-ping' :
            'bg-gray-400'
          }`} />
          <span className="capitalize">
            {peerConnectionState === 'connected' ? 'Connected (2/2)' : 
             peerConnectionState === 'connecting' ? 'Connecting WebRTC...' : 
             'Waiting for Friend'}
          </span>
        </div>

        {/* Right: Gallery & Leave buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenGallery}
            className="retro-btn retro-btn-secondary text-xs py-2 px-3.5 cursor-pointer font-bold relative"
          >
            <ImageIcon className="w-4 h-4 text-[#9333EA]" />
            <span>Gallery</span>
            {photoCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-[#F472B6] text-white rounded-full text-[10px]">
                {photoCount}
              </span>
            )}
          </button>

          <button
            onClick={onLeaveRoom}
            className="p-2 hover:bg-red-50 text-red-600 rounded-xl border-2 border-transparent hover:border-red-300 transition-colors cursor-pointer"
            title="Leave Room"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* MAIN VIEWPORT: DUAL WEBCAM STAGE */}
      <main className="max-w-6xl mx-auto w-full my-4 flex-1 flex flex-col justify-center items-center relative z-10">
        {/* Countdown Floating Overlay */}
        {countdownRemaining !== null && (
          <div className="absolute inset-0 z-40 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center rounded-3xl animate-in fade-in duration-150">
            <div className="text-center space-y-2">
              <span className="font-pixel text-8xl md:text-9xl text-[#FDE047] drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] animate-bounce block">
                {countdownRemaining === 0 ? 'SMILE! 📸' : countdownRemaining}
              </span>
              <p className="font-hand text-2xl text-white font-bold tracking-wide">
                Get ready to pose together ♡
              </p>
              <button
                onClick={() => socket.emit('cancel-countdown')}
                className="mt-4 px-4 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-full text-xs font-semibold border border-white/40 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Dual Video Cards Container */}
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
          {/* LOCAL USER CAMERA (YOU) */}
          <div className="retro-card overflow-hidden bg-black flex flex-col relative aspect-4/3 shadow-[6px_6px_0px_#1E1B24]">
            {/* Live Video Feed */}
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${mirrorLocal ? 'scale-x-[-1]' : ''}`}
            />

            {!cameraOn && (
              <div className="absolute inset-0 bg-[#2A1B3D] flex flex-col items-center justify-center text-white p-4">
                <CameraOff className="w-12 h-12 text-[#F472B6] mb-2" />
                <span className="font-bold text-sm">Your Camera is Off</span>
              </div>
            )}

            {/* Video Footer Label */}
            <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-xs px-3 py-1 rounded-full border border-black shadow text-xs font-bold text-[#1E1B24] flex items-center gap-1.5">
              <span>{user.displayName} (You)</span>
              {isReady && <span className="text-green-600">✓ Ready</span>}
            </div>

            {/* Mirror Toggle */}
            <button
              onClick={() => setMirrorLocal(!mirrorLocal)}
              className="absolute top-3 right-3 p-1.5 bg-black/60 hover:bg-black text-white rounded-lg text-[10px] font-mono cursor-pointer"
              title="Mirror Camera"
            >
              ⇋ Mirror
            </button>
          </div>

          {/* REMOTE USER CAMERA (PARTNER) */}
          <div className="retro-card overflow-hidden bg-black flex flex-col relative aspect-4/3 shadow-[6px_6px_0px_#1E1B24]">
            {/* Always keep the video element mounted in the DOM to avoid ref/autoplay race conditions */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              muted={!micOn}
              className="w-full h-full object-cover"
              onLoadedMetadata={() => {
                if (remoteVideoRef.current) {
                  remoteVideoRef.current.play().catch(console.warn);
                  console.log(`[WEBRTC] [Room: ${room.roomCode}] [Participant: ${user.id}] Remote video dimensions:`, {
                    width: remoteVideoRef.current.videoWidth,
                    height: remoteVideoRef.current.videoHeight
                  });
                }
              }}
            />

            {!remoteStream && (
              /* Waiting for remote peer invitation card */
              <div className="absolute inset-0 z-10 bg-[#1E1B24] flex flex-col items-center justify-center text-center p-6 text-white scanlines">
                <div className="w-16 h-16 rounded-2xl bg-[#E9D5FF] text-[#1E1B24] flex items-center justify-center text-3xl mb-4 border-2 border-white">
                  💌
                </div>
                <h3 className="font-bold text-lg mb-1">
                  {remoteParticipant 
                    ? `Connecting to ${remoteParticipant.displayName}...` 
                    : (user.isOwner ? 'Waiting for Guest to Connect' : 'Waiting for Host to Connect')}
                </h3>
                <p className="text-xs text-gray-300 max-w-xs mb-4">
                  {remoteParticipant 
                    ? 'Negotiating WebRTC camera stream...' 
                    : 'Share the room code or invite link so both of you can connect webcams!'}
                </p>
                {!remoteParticipant && (
                  <button
                    onClick={copyInviteLink}
                    className="retro-btn retro-btn-primary text-xs py-2 px-4 cursor-pointer font-bold"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>{copiedLink ? 'Link Copied!' : 'Copy Invitation Link'}</span>
                  </button>
                )}
              </div>
            )}

            {/* Remote Video Footer Label */}
            {remoteStream && (
              <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-xs px-3 py-1 rounded-full border border-black shadow text-xs font-bold text-[#1E1B24] flex items-center gap-1.5 z-20">
                <span>{remoteParticipant?.displayName || (user.isOwner ? 'Guest' : 'Host')}</span>
                {remoteParticipant?.isReady && <span className="text-green-600">✓ Ready</span>}
              </div>
            )}
          </div>
        </div>

        {/* Camera Permission / Error Warning */}
        {cameraError && (
          <div className="mt-3 p-3 bg-red-100 border-2 border-red-400 rounded-xl text-xs text-red-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span>Camera Error: {cameraError}. Please ensure camera permissions are allowed in your browser.</span>
          </div>
        )}
      </main>

      {/* BOTTOM CONTROLLER DOCK (Camera Controls + Shutter + Layouts) */}
      <footer className="max-w-6xl mx-auto w-full bg-[#FFFDF9] border-2 border-[#1E1B24] rounded-2xl p-4 shadow-[4px_4px_0px_#1E1B24] space-y-4 relative z-10">
        {/* Layout Selector Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          <span className="text-[11px] font-bold text-gray-500 uppercase flex-shrink-0 mr-1">
            Layout:
          </span>
          {Object.entries(LAYOUT_CONFIGS).map(([key, config]) => (
            <button
              key={key}
              onClick={() => handleLayoutSelect(key)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-xl border-2 text-xs font-bold transition-all cursor-pointer ${
                selectedLayout === key
                  ? 'bg-[#E9D5FF] border-[#1E1B24] shadow-[2px_2px_0px_#1E1B24]'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'
              }`}
            >
              {config.name}
            </button>
          ))}
        </div>

        {/* Action Controls Row */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-gray-100">
          {/* Device Controls (Camera On/Off, Switch Camera, Mic) */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleCamera}
              className={`p-2.5 rounded-xl border-2 border-[#1E1B24] shadow-[2px_2px_0px_#1E1B24] cursor-pointer ${
                cameraOn ? 'bg-white text-gray-800' : 'bg-red-100 text-red-600'
              }`}
              title={cameraOn ? 'Turn Camera Off' : 'Turn Camera On'}
            >
              {cameraOn ? <Camera className="w-5 h-5" /> : <CameraOff className="w-5 h-5" />}
            </button>

            <button
              onClick={toggleMicrophone}
              className={`p-2.5 rounded-xl border-2 border-[#1E1B24] shadow-[2px_2px_0px_#1E1B24] cursor-pointer ${
                micOn ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
              }`}
              title={micOn ? 'Mute Microphone' : 'Unmute Microphone (Disabled by default)'}
            >
              {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </button>

            {availableCameras.length > 1 && (
              <select
                value={selectedCameraId}
                onChange={(e) => handleSwitchCamera(e.target.value)}
                className="retro-input text-xs py-2 max-w-[140px] truncate"
              >
                {availableCameras.map(c => (
                  <option key={c.deviceId} value={c.deviceId}>
                    {c.label || `Camera ${c.deviceId.slice(0, 4)}`}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Center: BIG RETRO SHUTTER BUTTON */}
          <div className="flex items-center gap-3">
            {/* Timer duration toggle: 3s, 5s, 10s */}
            <div className="flex items-center bg-gray-100 p-1 rounded-full border border-black/20 text-xs font-bold">
              {[3, 5, 10].map(s => (
                <button
                  key={s}
                  onClick={() => { playButtonPop(); setCountdownDuration(s); }}
                  className={`px-2.5 py-1 rounded-full cursor-pointer ${
                    countdownDuration === s ? 'bg-[#E9D5FF] text-[#1E1B24]' : 'text-gray-500'
                  }`}
                >
                  {s}s
                </button>
              ))}
            </div>

            {/* Shutter Button */}
            <button
              onClick={handleTriggerCountdown}
              disabled={countdownRemaining !== null}
              className="retro-btn retro-btn-coral py-3 px-8 text-base md:text-lg font-extrabold flex items-center gap-2 cursor-pointer shadow-[4px_4px_0px_#1E1B24] hover:scale-105 active:scale-95 transition-transform"
            >
              <Camera className="w-6 h-6" />
              <span>SNAP PHOTO 📸</span>
            </button>
          </div>

          {/* Right: Ready Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleReady}
              className={`retro-btn text-xs py-2 px-4 font-bold cursor-pointer transition-all ${
                isReady
                  ? 'bg-green-300 text-green-950 border-green-800'
                  : 'bg-white text-gray-700'
              }`}
            >
              {isReady ? '✓ You are Ready!' : 'Mark Ready ✌️'}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
