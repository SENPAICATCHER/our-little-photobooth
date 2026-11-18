import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import LandingPage from './components/LandingPage';
import PhotoboothRoom from './components/PhotoboothRoom';
import PhotoEditor from './components/PhotoEditor';
import PhotoStripGenerator from './components/PhotoStripGenerator';
import GalleryModal from './components/GalleryModal';
import { PeerRoomSignaler } from './utils/peerManager';
import { 
  savePhotoLocally, getPhotosLocally, deletePhotoLocally, 
  toggleFavoriteLocally, updateCaptionLocally 
} from './utils/localStore';

// Helper: Parse invitation params from search, hash, or pathname
function parseInvitationParams() {
  try {
    const searchParams = new URLSearchParams(window.location.search);
    let joinCode = searchParams.get('join') || searchParams.get('room') || searchParams.get('code');
    let token = searchParams.get('token') || '';

    // Check hash parameters if query params are empty (e.g. #/join/RETRO-123 or #join=RETRO-123)
    if (!joinCode && window.location.hash) {
      const hash = window.location.hash.replace(/^#\/?/, '');
      if (hash.includes('=')) {
        const hashParams = new URLSearchParams(hash);
        joinCode = hashParams.get('join') || hashParams.get('room') || hashParams.get('code');
        token = hashParams.get('token') || token;
      } else if (hash.startsWith('join/') || hash.startsWith('room/')) {
        const parts = hash.split('/');
        joinCode = parts[1];
      }
    }

    // Check path routing if deployed with SPA rewrite (e.g. /join/RETRO-123)
    if (!joinCode && window.location.pathname) {
      const match = window.location.pathname.match(/\/(join|room)\/([^/?#]+)/i);
      if (match && match[2]) {
        joinCode = match[2];
      }
    }

    return {
      roomCode: joinCode ? joinCode.trim().toUpperCase() : '',
      token: token ? token.trim() : ''
    };
  } catch (err) {
    return { roomCode: '', token: '' };
  }
}

export default function App() {
  const initialInvitation = parseInvitationParams();
  const [currentView, setCurrentView] = useState('landing'); // 'landing' | 'room'
  const [room, setRoom] = useState(null);
  const [user, setUser] = useState(null);
  const [socket, setSocket] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [backendMode, setBackendMode] = useState('checking'); // 'node' | 'p2p' | 'checking'
  
  // Invitation Link State initialized immediately from URL params to prevent race conditions
  const [invitedRoomCode, setInvitedRoomCode] = useState(initialInvitation.roomCode);
  const [invitedToken, setInvitedToken] = useState(initialInvitation.token);
  const [invitedHostName, setInvitedHostName] = useState('');
  const [invitedError, setInvitedError] = useState('');

  // Modals & Overlays
  const [capturedData, setCapturedData] = useState(null); // { dataUrl, layout }
  const [showGallery, setShowGallery] = useState(false);
  const [showStripGenerator, setShowStripGenerator] = useState(false);

  const socketRef = useRef(null);

  // Helper: Read active session for a specific room or current room
  const getSavedSession = (targetRoomCode) => {
    try {
      const activeCode = targetRoomCode || sessionStorage.getItem('olpb_current_room');
      if (activeCode) {
        const raw = sessionStorage.getItem(`olpb_session_${activeCode}`) || sessionStorage.getItem('olpb_active_session');
        if (raw) return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Error reading saved session:', e);
    }
    return null;
  };

  // Auto-detect backend availability and handle initial URL / session restoration on mount
  useEffect(() => {
    let isCancelled = false;

    async function initApp() {
      const { roomCode: urlCode, token: urlToken } = parseInvitationParams();
      if (urlCode) {
        setInvitedRoomCode(urlCode);
        setInvitedToken(urlToken);
      }

      let detectedMode = 'p2p';
      let activeSocket = null;

      // 1. Detect if Node.js backend is accessible
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        const res = await fetch('/api/health', { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          if (data?.status === 'ok') {
            console.log('📸 Connected to Node.js backend');
            detectedMode = 'node';
            activeSocket = io(window.location.origin, {
              autoConnect: false,
              transports: ['websocket', 'polling']
            });
            socketRef.current = activeSocket;
            setSocket(activeSocket);
          }
        }
      } catch (err) {
        console.log('✨ Backend not detected, running in Netlify Cloud P2P Mode (PeerJS + IndexedDB)');
      }

      if (isCancelled) return;
      setBackendMode(detectedMode);

      // 2. Check for existing active session in sessionStorage scoped to the room
      const restoredSession = getSavedSession(urlCode);

      // If user refreshed while inside a room and the URL matches:
      if (restoredSession && (!urlCode || urlCode === restoredSession.roomCode)) {
        console.log('🔄 Restoring active session from sessionStorage for room:', restoredSession.roomCode);
        await restoreActiveSession(restoredSession, detectedMode, activeSocket);
        return;
      }

      // 3. If there is an invitation code in the URL but no active session, validate the room
      if (urlCode) {
        await validateRoom(urlCode, urlToken, detectedMode);
      }
    }

    initApp();

    return () => {
      isCancelled = true;
    };
  }, []);

  // Restore Active Session after page refresh
  const restoreActiveSession = async (session, mode, activeSocket) => {
    if (mode === 'node') {
      try {
        const res = await fetch(`/api/rooms/${session.roomCode}/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            displayName: session.displayName,
            userId: session.userId,
            token: session.inviteToken
          })
        });
        const data = await res.json();

        if (data.success) {
          const joinedRoom = { ...data.room, inviteToken: session.inviteToken };
          const joinedUser = data.user;

          setRoom(joinedRoom);
          setUser(joinedUser);

          const s = activeSocket || socketRef.current || io(window.location.origin, {
            autoConnect: false,
            transports: ['websocket', 'polling']
          });
          setSocket(s);

          s.connect();
          s.emit('join-room', {
            roomCode: joinedRoom.roomCode,
            userId: joinedUser.id,
            displayName: joinedUser.displayName,
            isOwner: joinedUser.isOwner,
            token: session.inviteToken
          }, (joinRes) => {
            if (joinRes?.success) {
              setCurrentView('room');
              fetchPhotos(joinedRoom.roomCode, 'node');
            } else {
              sessionStorage.removeItem(`olpb_session_${session.roomCode}`);
              sessionStorage.removeItem('olpb_current_room');
              setInvitedError(joinRes?.error || 'Could not rejoin room after refresh.');
              setCurrentView('landing');
            }
          });
          return;
        } else {
          sessionStorage.removeItem(`olpb_session_${session.roomCode}`);
          sessionStorage.removeItem('olpb_current_room');
          setInvitedError(data.error || 'Previous session expired.');
          setCurrentView('landing');
          return;
        }
      } catch (err) {
        console.error('Failed to restore node session:', err);
      }
    }

    // P2P restore
    const signaler = new PeerRoomSignaler({
      roomCode: session.roomCode,
      user: { id: session.userId, displayName: session.displayName, isOwner: session.isOwner },
      isHost: session.isOwner
    });

    signaler.on('new-photo-saved', () => {
      fetchPhotos(session.roomCode, 'p2p');
    });

    setSocket(signaler);
    setRoom({
      id: session.roomId,
      roomCode: session.roomCode,
      ownerId: session.isOwner ? session.userId : 'host',
      inviteToken: session.inviteToken
    });
    setUser({ id: session.userId, displayName: session.displayName, isOwner: session.isOwner });
    setCurrentView('room');
    fetchPhotos(session.roomCode, 'p2p');
  };

  // Fetch Gallery Photos for Room
  const fetchPhotos = async (roomCode, mode = backendMode) => {
    if (mode === 'node') {
      try {
        const res = await fetch(`/api/rooms/${roomCode}/photos`);
        const data = await res.json();
        if (data.success) {
          setPhotos(data.photos);
        }
      } catch (err) {
        console.error('Error fetching gallery from server:', err);
      }
    } else {
      // Local IndexedDB Mode
      try {
        const localList = await getPhotosLocally(roomCode);
        setPhotos(localList);
      } catch (err) {
        console.error('Error fetching local photos:', err);
      }
    }
  };

  // Helper: Generate retro room code for P2P mode
  const generateLocalRoomCode = () => {
    const words = ['PAUL', 'RETRO', 'LOVE', 'BOOTH', 'SMILE', 'FLASH', 'SWEET'];
    const prefix = words[Math.floor(Math.random() * words.length)];
    const num = Math.floor(100 + Math.random() * 900);
    return `${prefix}-${num}`;
  };

  // =========================================================================
  // SEPARATE, STRICTLY DEFINED ROOM OPERATIONS
  // 1. validateRoom(roomCode, token)
  // 2. createRoom(ownerName)
  // 3. joinRoom(roomCode, token, displayName)
  // 4. leaveRoom(roomCode)
  // =========================================================================

  // OPERATION 1: validateRoom(roomCode, token)
  const validateRoom = async (code, token = '', mode = backendMode) => {
    if (!code) return { valid: false, error: 'No room code provided.' };
    const normalizedCode = code.trim().toUpperCase();

    if (mode === 'node') {
      try {
        const query = token ? `?token=${encodeURIComponent(token)}` : '';
        const res = await fetch(`/api/rooms/${normalizedCode}${query}`);
        const data = await res.json();

        if (res.status === 404) {
          const err = `Photobooth room "${normalizedCode}" does not exist. Please check your invitation link.`;
          setInvitedError(err);
          return { valid: false, error: err };
        }
        if (res.status === 410) {
          const err = data.error || 'This photobooth room has expired or been closed.';
          setInvitedError(err);
          return { valid: false, error: err };
        }
        if (res.status === 403) {
          const err = 'Invalid invitation token for this room.';
          setInvitedError(err);
          return { valid: false, error: err };
        }
        if (data.success && data.room) {
          if (data.room.isFull) {
            const err = `Room "${normalizedCode}" is currently full (maximum 2 participants).`;
            setInvitedError(err);
            return { valid: false, error: err };
          }
          setInvitedHostName(data.room.ownerName || 'Host');
          setInvitedToken(data.room.inviteToken || token);
          setInvitedError('');
          return { valid: true, room: data.room };
        }
      } catch (err) {
        console.warn('Network error during room validation:', err);
      }
    }

    // P2P / Serverless mode validation
    if (/^[A-Z0-9-]+$/i.test(normalizedCode)) {
      setInvitedError('');
      return { valid: true, room: { roomCode: normalizedCode, inviteToken: token } };
    }
    const err = `Invalid room code format: "${normalizedCode}"`;
    setInvitedError(err);
    return { valid: false, error: err };
  };

  // OPERATION 2: createRoom(ownerName)
  // Only called when user explicitly creates a room. NEVER called on join!
  const createRoom = async (ownerName) => {
    const trimmedName = (ownerName || '').trim();
    if (!trimmedName) {
      alert('Please enter your name.');
      return;
    }

    if (backendMode === 'node') {
      try {
        const res = await fetch('/api/rooms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ownerName: trimmedName })
        });
        const data = await res.json();

        if (data.success) {
          const newRoom = data.room;
          const newUser = {
            id: newRoom.ownerId,
            displayName: trimmedName,
            isOwner: true
          };

          // Save scoped active session for refresh persistence
          sessionStorage.setItem(`olpb_session_${newRoom.roomCode}`, JSON.stringify({
            roomCode: newRoom.roomCode,
            roomId: newRoom.id,
            userId: newUser.id,
            displayName: newUser.displayName,
            isOwner: true,
            inviteToken: newRoom.inviteToken,
            backendMode: 'node'
          }));
          sessionStorage.setItem('olpb_current_room', newRoom.roomCode);

          // Update URL without triggering reload
          const tokenPart = newRoom.inviteToken ? `&token=${encodeURIComponent(newRoom.inviteToken)}` : '';
          window.history.replaceState({}, '', `${window.location.pathname}?join=${encodeURIComponent(newRoom.roomCode)}${tokenPart}`);

          setRoom(newRoom);
          setUser(newUser);

          const s = socketRef.current || socket;
          if (s) {
            s.connect();
            s.emit('join-room', {
              roomCode: newRoom.roomCode,
              userId: newUser.id,
              displayName: newUser.displayName,
              isOwner: true,
              token: newRoom.inviteToken
            }, (joinRes) => {
              if (joinRes?.success) {
                setCurrentView('room');
                fetchPhotos(newRoom.roomCode, 'node');
              }
            });
          }
          return;
        } else {
          alert(data.error || 'Could not create room.');
          return;
        }
      } catch (err) {
        console.error('Node create room failed, falling back to P2P:', err);
      }
    }

    // P2P Netlify Mode
    setBackendMode('p2p');
    const code = generateLocalRoomCode();
    const token = Math.random().toString(36).substring(2, 10);
    const newUser = {
      id: `user-${Date.now()}`,
      displayName: trimmedName,
      isOwner: true
    };
    const newRoom = {
      id: `room-${Date.now()}`,
      roomCode: code,
      ownerId: newUser.id,
      inviteToken: token,
      status: 'active'
    };

    sessionStorage.setItem(`olpb_session_${code}`, JSON.stringify({
      roomCode: code,
      roomId: newRoom.id,
      userId: newUser.id,
      displayName: newUser.displayName,
      isOwner: true,
      inviteToken: token,
      backendMode: 'p2p'
    }));
    sessionStorage.setItem('olpb_current_room', code);

    window.history.replaceState({}, '', `${window.location.pathname}?join=${encodeURIComponent(code)}&token=${encodeURIComponent(token)}`);

    const signaler = new PeerRoomSignaler({
      roomCode: code,
      user: newUser,
      isHost: true
    });

    signaler.on('new-photo-saved', () => {
      fetchPhotos(code, 'p2p');
    });

    setSocket(signaler);
    setRoom(newRoom);
    setUser(newUser);
    setCurrentView('room');
    fetchPhotos(code, 'p2p');
  };

  // OPERATION 3: joinRoom(roomCode, token, displayName)
  // Strictly joins existing room, NEVER creates a new room!
  const joinRoom = async (roomCode, token = invitedToken, displayName = '') => {
    const normalizedCode = (roomCode || '').trim().toUpperCase();
    const trimmedName = (displayName || '').trim();

    if (!normalizedCode) {
      alert('Please provide a valid room code.');
      return;
    }
    if (!trimmedName) {
      alert('Please enter your name.');
      return;
    }

    if (backendMode === 'node') {
      try {
        const res = await fetch(`/api/rooms/${normalizedCode}/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            displayName: trimmedName,
            token
          })
        });
        const data = await res.json();

        if (data.success) {
          const joinedRoom = { ...data.room, inviteToken: token || data.room.inviteToken };
          const joinedUser = data.user;

          // Save scoped active session for refresh persistence
          sessionStorage.setItem(`olpb_session_${joinedRoom.roomCode}`, JSON.stringify({
            roomCode: joinedRoom.roomCode,
            roomId: joinedRoom.id,
            userId: joinedUser.id,
            displayName: joinedUser.displayName,
            isOwner: joinedUser.isOwner,
            inviteToken: token,
            backendMode: 'node'
          }));
          sessionStorage.setItem('olpb_current_room', joinedRoom.roomCode);

          const tokenPart = token ? `&token=${encodeURIComponent(token)}` : '';
          window.history.replaceState({}, '', `${window.location.pathname}?join=${encodeURIComponent(joinedRoom.roomCode)}${tokenPart}`);

          setRoom(joinedRoom);
          setUser(joinedUser);

          const s = socketRef.current || socket;
          if (s) {
            s.connect();
            s.emit('join-room', {
              roomCode: joinedRoom.roomCode,
              userId: joinedUser.id,
              displayName: joinedUser.displayName,
              isOwner: joinedUser.isOwner,
              token
            }, (joinRes) => {
              if (joinRes?.success) {
                setCurrentView('room');
                fetchPhotos(joinedRoom.roomCode, 'node');
              } else {
                sessionStorage.removeItem(`olpb_session_${joinedRoom.roomCode}`);
                sessionStorage.removeItem('olpb_current_room');
                alert(joinRes?.error || 'Could not join room.');
              }
            });
          }
          return;
        } else {
          // Explicit error from server (e.g. room full, closed, expired, invalid token)
          alert(data.error || 'Could not join room.');
          return;
        }
      } catch (err) {
        console.error('Node join room failed:', err);
      }
    }

    // P2P Netlify Join Mode (Strict join to existing roomCode, NEVER creates a new room)
    setBackendMode('p2p');
    const newUser = {
      id: `user-${Date.now()}`,
      displayName: trimmedName,
      isOwner: false
    };
    const joinedRoom = {
      id: `room-${Date.now()}`,
      roomCode: normalizedCode,
      inviteToken: token,
      isOwner: false
    };

    sessionStorage.setItem(`olpb_session_${normalizedCode}`, JSON.stringify({
      roomCode: normalizedCode,
      roomId: joinedRoom.id,
      userId: newUser.id,
      displayName: newUser.displayName,
      isOwner: false,
      inviteToken: token,
      backendMode: 'p2p'
    }));
    sessionStorage.setItem('olpb_current_room', normalizedCode);

    const tokenPart = token ? `&token=${encodeURIComponent(token)}` : '';
    window.history.replaceState({}, '', `${window.location.pathname}?join=${encodeURIComponent(normalizedCode)}${tokenPart}`);

    const signaler = new PeerRoomSignaler({
      roomCode: normalizedCode,
      user: newUser,
      isHost: false
    });

    signaler.on('new-photo-saved', () => {
      fetchPhotos(normalizedCode, 'p2p');
    });

    setSocket(signaler);
    setRoom(joinedRoom);
    setUser(newUser);
    setCurrentView('room');
    fetchPhotos(normalizedCode, 'p2p');
  };

  // OPERATION 4: leaveRoom(roomCode)
  const leaveRoom = (roomCode = room?.roomCode) => {
    if (socket) {
      if (socket.disconnect) socket.disconnect();
    }
    if (roomCode) {
      sessionStorage.removeItem(`olpb_session_${roomCode}`);
    }
    sessionStorage.removeItem('olpb_current_room');
    sessionStorage.removeItem('olpb_active_session');
    window.history.replaceState({}, '', window.location.pathname);
    setRoom(null);
    setUser(null);
    setPhotos([]);
    setInvitedRoomCode('');
    setInvitedToken('');
    setInvitedHostName('');
    setInvitedError('');
    setCurrentView('landing');
  };

  // Save photo to gallery
  const handleSaveToGallery = async ({ dataUrl, filter, adjustments }) => {
    if (!room || !user) return;
    const photoType = capturedData?.layout?.includes('strip') ? 'strip' : 'composite';

    if (backendMode === 'node') {
      try {
        const res = await fetch(`/api/rooms/${room.roomCode}/photos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dataUrl,
            uploadedBy: user.displayName,
            photoType,
            layout: capturedData?.layout || 'side-by-side',
            filter: filter || 'vintage-film',
            dimensions: '1400x1050',
            adjustments
          })
        });
        const data = await res.json();
        if (data.success) {
          fetchPhotos(room.roomCode, 'node');
        }
      } catch (err) {
        console.error('Error saving photo to server:', err);
      }
    } else {
      // Local IndexedDB Save
      try {
        await savePhotoLocally({
          roomCode: room.roomCode,
          dataUrl,
          layout: capturedData?.layout || 'side-by-side',
          filter: filter || 'vintage-film',
          caption: 'Photobooth Snap ♡',
          photoType,
          dimensions: '1400x1050',
          adjustments
        });
        fetchPhotos(room.roomCode, 'p2p');
        if (socket && socket.emit) {
          socket.emit('new-photo-saved');
        }
      } catch (err) {
        console.error('Error saving photo locally:', err);
      }
    }
  };

  // Delete photo
  const handleDeletePhoto = async (photoId) => {
    if (!room) return;
    if (backendMode === 'node') {
      try {
        await fetch(`/api/rooms/${room.roomCode}/photos/${photoId}`, {
          method: 'DELETE'
        });
        setPhotos(prev => prev.filter(p => p.id !== photoId));
      } catch (err) {
        console.error('Error deleting photo from server:', err);
      }
    } else {
      await deletePhotoLocally(photoId);
      setPhotos(prev => prev.filter(p => p.id !== photoId));
    }
  };

  // Toggle Favorite
  const handleToggleFavorite = async (photoId, isFavorite) => {
    if (!room) return;
    if (backendMode === 'node') {
      try {
        await fetch(`/api/rooms/${room.roomCode}/photos/${photoId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isFavorite })
        });
        setPhotos(prev => prev.map(p => p.id === photoId ? { ...p, isFavorite } : p));
      } catch (err) {
        console.error('Error updating favorite:', err);
      }
    } else {
      await toggleFavoriteLocally(photoId, isFavorite);
      setPhotos(prev => prev.map(p => p.id === photoId ? { ...p, isFavorite } : p));
    }
  };

  // Update Caption
  const handleUpdateCaption = async (photoId, caption) => {
    if (!room) return;
    if (backendMode === 'node') {
      try {
        await fetch(`/api/rooms/${room.roomCode}/photos/${photoId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ caption })
        });
        setPhotos(prev => prev.map(p => p.id === photoId ? { ...p, caption } : p));
      } catch (err) {
        console.error('Error updating caption:', err);
      }
    } else {
      await updateCaptionLocally(photoId, caption);
      setPhotos(prev => prev.map(p => p.id === photoId ? { ...p, caption } : p));
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF6F0] text-[#1E1B24]">
      {/* LANDING PAGE VIEW */}
      {currentView === 'landing' && (
        <LandingPage
          onCreateRoom={createRoom}
          onJoinRoom={(code, name, token) => joinRoom(code, token, name)}
          invitedRoomCode={invitedRoomCode}
          invitedToken={invitedToken}
          invitedHostName={invitedHostName}
          invitedError={invitedError}
          onClearInvite={() => {
            setInvitedRoomCode('');
            setInvitedToken('');
            setInvitedHostName('');
            setInvitedError('');
            window.history.replaceState({}, '', window.location.pathname);
          }}
        />
      )}

      {/* ACTIVE PHOTOBOOTH ROOM VIEW */}
      {currentView === 'room' && room && user && (
        <PhotoboothRoom
          room={room}
          user={user}
          socket={socket}
          isP2P={backendMode === 'p2p'}
          onLeaveRoom={() => leaveRoom(room?.roomCode)}
          onCaptureCompleted={(captured) => setCapturedData(captured)}
          onOpenGallery={() => setShowGallery(true)}
          photoCount={photos.length}
        />
      )}

      {/* PHOTO EDITOR MODAL */}
      {capturedData && (
        <PhotoEditor
          capturedImage={capturedData.dataUrl}
          roomCode={room?.roomCode}
          onRetake={() => setCapturedData(null)}
          onSaveToGallery={handleSaveToGallery}
          onOpenStripGenerator={() => {
            setCapturedData(null);
            setShowStripGenerator(true);
          }}
        />
      )}

      {/* PHOTO STRIP GENERATOR MODAL */}
      {showStripGenerator && (
        <PhotoStripGenerator
          photos={photos}
          onClose={() => setShowStripGenerator(false)}
          defaultCaption="For Paulene ♡ 2026"
        />
      )}

      {/* PRIVATE GALLERY MODAL */}
      {showGallery && (
        <GalleryModal
          photos={photos}
          onClose={() => setShowGallery(false)}
          onDeletePhoto={handleDeletePhoto}
          onToggleFavorite={handleToggleFavorite}
          onUpdateCaption={handleUpdateCaption}
          onOpenStripWithPhotos={() => {
            setShowGallery(false);
            setShowStripGenerator(true);
          }}
        />
      )}
    </div>
  );
}
