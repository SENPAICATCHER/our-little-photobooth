import { dbRun, dbGet, dbAll } from './db.js';

export function setupSocket(io) {
  // Track active rooms in memory for low-latency WebRTC and timer coordination
  // roomCode -> { participants: Map<socketId, { userId, displayName, isReady, isOwner, cameraOn, micOn }>, countdownTimer: null }
  const activeRooms = new Map();

  io.on('connection', (socket) => {
    let currentRoomCode = null;
    let currentUserId = null;

    // Join room
    socket.on('join-room', async ({ roomCode, userId, displayName, isOwner }, callback) => {
      try {
        const normalizedCode = roomCode.trim().toUpperCase();
        
        // Verify room in DB
        const room = await dbGet('SELECT * FROM rooms WHERE room_code = ?', [normalizedCode]);
        if (!room) {
          return callback?.({ success: false, error: 'Room not found.' });
        }
        if (room.room_status === 'closed') {
          return callback?.({ success: false, error: 'This room has been closed.' });
        }
        if (room.expires_at < Date.now()) {
          return callback?.({ success: false, error: 'This room has expired.' });
        }

        let roomData = activeRooms.get(normalizedCode);
        if (!roomData) {
          roomData = {
            participants: new Map(),
            layout: 'side-by-side',
            filter: 'vintage-film',
            countdownTimer: null
          };
          activeRooms.set(normalizedCode, roomData);
        }

        // Limit to 2 participants
        if (roomData.participants.size >= 2 && !roomData.participants.has(socket.id)) {
          // Check if this is a reconnect of the same user
          let isReconnect = false;
          for (const [sId, p] of roomData.participants.entries()) {
            if (p.userId === userId) {
              roomData.participants.delete(sId);
              isReconnect = true;
              break;
            }
          }
          if (!isReconnect) {
            return callback?.({ success: false, error: 'Room is already full (maximum 2 participants).' });
          }
        }

        currentRoomCode = normalizedCode;
        currentUserId = userId;
        socket.join(normalizedCode);

        // Store participant info
        const participantInfo = {
          socketId: socket.id,
          userId,
          displayName: displayName || (isOwner ? 'Host' : 'Guest'),
          isReady: false,
          isOwner: isOwner || room.owner_id === userId,
          cameraOn: true,
          micOn: false
        };
        roomData.participants.set(socket.id, participantInfo);

        // Update DB participant
        const existingParticipant = await dbGet(
          'SELECT * FROM room_participants WHERE room_id = ? AND user_id = ?',
          [room.id, userId]
        );
        if (existingParticipant) {
          await dbRun(
            'UPDATE room_participants SET connection_status = ?, is_ready = 0 WHERE id = ?',
            ['connected', existingParticipant.id]
          );
        } else {
          await dbRun(
            `INSERT INTO room_participants (id, room_id, user_id, display_name, is_ready, joined_at, connection_status)
             VALUES (?, ?, ?, ?, 0, ?, 'connected')`,
            [`part-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, room.id, userId, participantInfo.displayName, Date.now()]
          );
        }

        // List participants to send
        const participantsList = Array.from(roomData.participants.values()).map(p => ({
          socketId: p.socketId,
          userId: p.userId,
          displayName: p.displayName,
          isReady: p.isReady,
          isOwner: p.isOwner,
          cameraOn: p.cameraOn,
          micOn: p.micOn
        }));

        // Inform other participant that someone joined
        socket.to(normalizedCode).emit('peer-joined', {
          participant: participantInfo,
          totalParticipants: participantsList.length
        });

        callback?.({
          success: true,
          room: {
            id: room.id,
            roomCode: room.room_code,
            ownerId: room.owner_id,
            status: room.room_status,
            layout: roomData.layout,
            filter: roomData.filter
          },
          participants: participantsList,
          isInitiator: roomData.participants.size === 2 // second participant can trigger offer or wait
        });

        // Broadcast updated room state
        io.to(normalizedCode).emit('room-state-updated', {
          participants: participantsList,
          layout: roomData.layout,
          filter: roomData.filter
        });

      } catch (err) {
        console.error('Error joining room:', err);
        callback?.({ success: false, error: 'Server error joining room.' });
      }
    });

    // WebRTC Signaling
    socket.on('peer-camera-ready', (data) => {
      if (currentRoomCode) {
        console.log(`[WEBRTC] Relaying peer-camera-ready in room ${currentRoomCode} from ${socket.id}`);
        socket.to(currentRoomCode).emit('peer-camera-ready', {
          senderSocketId: socket.id,
          userId: data?.userId || currentUserId
        });
      }
    });

    socket.on('webrtc-offer', ({ targetSocketId, offer }) => {
      console.log(`[WEBRTC] Relaying Offer in room ${currentRoomCode} from ${socket.id}`);
      if (targetSocketId) {
        io.to(targetSocketId).emit('webrtc-offer', {
          senderSocketId: socket.id,
          offer
        });
      } else if (currentRoomCode) {
        socket.to(currentRoomCode).emit('webrtc-offer', {
          senderSocketId: socket.id,
          offer
        });
      }
    });

    socket.on('webrtc-answer', ({ targetSocketId, answer }) => {
      console.log(`[WEBRTC] Relaying Answer in room ${currentRoomCode} from ${socket.id}`);
      if (targetSocketId) {
        io.to(targetSocketId).emit('webrtc-answer', {
          senderSocketId: socket.id,
          answer
        });
      } else if (currentRoomCode) {
        socket.to(currentRoomCode).emit('webrtc-answer', {
          senderSocketId: socket.id,
          answer
        });
      }
    });

    socket.on('webrtc-ice-candidate', ({ targetSocketId, candidate }) => {
      if (targetSocketId) {
        io.to(targetSocketId).emit('webrtc-ice-candidate', {
          senderSocketId: socket.id,
          candidate
        });
      } else if (currentRoomCode) {
        socket.to(currentRoomCode).emit('webrtc-ice-candidate', {
          senderSocketId: socket.id,
          candidate
        });
      }
    });

    // Camera and Mic State Toggles
    socket.on('media-state-change', ({ cameraOn, micOn }) => {
      if (!currentRoomCode) return;
      const roomData = activeRooms.get(currentRoomCode);
      if (roomData && roomData.participants.has(socket.id)) {
        const p = roomData.participants.get(socket.id);
        if (cameraOn !== undefined) p.cameraOn = cameraOn;
        if (micOn !== undefined) p.micOn = micOn;

        socket.to(currentRoomCode).emit('peer-media-state', {
          socketId: socket.id,
          cameraOn: p.cameraOn,
          micOn: p.micOn
        });
      }
    });

    // Ready Status Toggle
    socket.on('toggle-ready', ({ isReady }) => {
      if (!currentRoomCode) return;
      const roomData = activeRooms.get(currentRoomCode);
      if (roomData && roomData.participants.has(socket.id)) {
        const p = roomData.participants.get(socket.id);
        p.isReady = isReady;

        const allReady = roomData.participants.size === 2 &&
          Array.from(roomData.participants.values()).every(part => part.isReady);

        io.to(currentRoomCode).emit('participant-ready-changed', {
          socketId: socket.id,
          userId: p.userId,
          isReady,
          bothReady: allReady
        });
      }
    });

    // Synchronized Layout Change
    socket.on('change-layout', ({ layout }) => {
      if (!currentRoomCode) return;
      const roomData = activeRooms.get(currentRoomCode);
      if (roomData) {
        roomData.layout = layout;
        io.to(currentRoomCode).emit('layout-changed', { layout });
      }
    });

    // Synchronized Filter Change
    socket.on('change-filter', ({ filter }) => {
      if (!currentRoomCode) return;
      const roomData = activeRooms.get(currentRoomCode);
      if (roomData) {
        roomData.filter = filter;
        io.to(currentRoomCode).emit('filter-changed', { filter });
      }
    });

    // Synchronized Countdown
    socket.on('start-countdown', ({ seconds = 3 }) => {
      if (!currentRoomCode) return;
      const roomData = activeRooms.get(currentRoomCode);
      if (!roomData) return;

      if (roomData.countdownTimer) {
        clearInterval(roomData.countdownTimer);
        roomData.countdownTimer = null;
      }

      let remaining = seconds;
      io.to(currentRoomCode).emit('countdown-started', { totalSeconds: seconds });

      roomData.countdownTimer = setInterval(() => {
        remaining -= 1;
        if (remaining > 0) {
          io.to(currentRoomCode).emit('countdown-tick', { remaining });
        } else {
          clearInterval(roomData.countdownTimer);
          roomData.countdownTimer = null;
          // Emit capture trigger to both peers simultaneously
          io.to(currentRoomCode).emit('trigger-synchronized-capture', {
            captureTimestamp: Date.now()
          });
        }
      }, 1000);
    });

    socket.on('cancel-countdown', () => {
      if (!currentRoomCode) return;
      const roomData = activeRooms.get(currentRoomCode);
      if (roomData && roomData.countdownTimer) {
        clearInterval(roomData.countdownTimer);
        roomData.countdownTimer = null;
      }
      io.to(currentRoomCode).emit('countdown-cancelled');
    });

    // Broadcast newly captured preview so both see what was shot
    socket.on('share-captured-preview', ({ previewDataUrl, layout }) => {
      if (currentRoomCode) {
        socket.to(currentRoomCode).emit('peer-shared-preview', {
          previewDataUrl,
          layout,
          fromUserId: currentUserId
        });
      }
    });

    // Close room (owner action)
    socket.on('close-room', async (callback) => {
      if (!currentRoomCode) return;
      try {
        await dbRun('UPDATE rooms SET room_status = ? WHERE room_code = ?', ['closed', currentRoomCode]);
        io.to(currentRoomCode).emit('room-closed', { reason: 'The room owner has closed the photobooth session.' });
        activeRooms.delete(currentRoomCode);
        callback?.({ success: true });
      } catch (err) {
        console.error('Error closing room:', err);
        callback?.({ success: false, error: 'Failed to close room' });
      }
    });

    // Handle Disconnect
    socket.on('disconnect', async () => {
      if (currentRoomCode && activeRooms.has(currentRoomCode)) {
        const roomData = activeRooms.get(currentRoomCode);
        const p = roomData.participants.get(socket.id);
        roomData.participants.delete(socket.id);

        if (p) {
          // Update DB status
          await dbRun(
            `UPDATE room_participants SET connection_status = 'disconnected' 
             WHERE user_id = ? AND room_id = (SELECT id FROM rooms WHERE room_code = ?)`,
            [p.userId, currentRoomCode]
          );

          socket.to(currentRoomCode).emit('peer-disconnected', {
            socketId: socket.id,
            userId: p.userId,
            displayName: p.displayName
          });

          // Reset countdown if active
          if (roomData.countdownTimer) {
            clearInterval(roomData.countdownTimer);
            roomData.countdownTimer = null;
            io.to(currentRoomCode).emit('countdown-cancelled');
          }
        }

        if (roomData.participants.size === 0) {
          activeRooms.delete(currentRoomCode);
        }
      }
    });
  });
}
