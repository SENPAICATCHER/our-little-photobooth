// PeerJS Cloud WebRTC Adapter for Serverless / Netlify Static Deployments
import { Peer } from 'peerjs';

const PEER_ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' }
];

export class PeerRoomSignaler {
  constructor({ roomCode, user, isHost = false }) {
    this.roomCode = roomCode.trim().toUpperCase();
    this.user = user;
    this.isHost = isHost;
    this.peer = null;
    this.connection = null;
    this.mediaCall = null;
    this.listeners = new Map(); // event -> Set of callbacks
    this.remoteStream = null;
    this.localStream = null;
    this.onRemoteStreamCallback = null;
  }

  log(action, details = {}) {
    console.log(`[WEBRTC] [Room: ${this.roomCode}] [Participant: ${this.user.id}] ${action}`, details);
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return this;
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      if (callback) {
        this.listeners.get(event).delete(callback);
      } else {
        this.listeners.delete(event);
      }
    }
    return this;
  }

  emit(event, data = {}) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(cb => cb(data));
    }
    if (this.connection && this.connection.open) {
      this.connection.send({ event, data, fromUserId: this.user.id });
    }
  }

  // Connect
  async init(localStream, onRemoteStream) {
    this.localStream = localStream;
    this.onRemoteStreamCallback = onRemoteStream;
    const targetPeerId = `olpb-${this.roomCode.toLowerCase()}`;

    return new Promise((resolve, reject) => {
      try {
        if (this.isHost) {
          this.log('Peer connection created (Host PeerJS)', { targetPeerId });
          this.peer = new Peer(targetPeerId, {
            debug: 1,
            config: { iceServers: PEER_ICE_SERVERS }
          });

          this.peer.on('open', (id) => {
            this.log('Host Peer open and ready for connections', { id });
            resolve(true);
          });

          this.peer.on('connection', (conn) => {
            this.log('Incoming data connection received', { peer: conn.peer });
            this.setupDataConnection(conn);
            this.emit('peer-joined', {
              participant: {
                userId: 'guest-' + Date.now(),
                displayName: 'Paulene / Guest',
                isReady: false,
                cameraOn: true,
                micOn: false
              }
            });
          });

          this.peer.on('call', (call) => {
            this.log('Offer received (Incoming PeerJS call)', { peer: call.peer });
            call.answer(this.localStream);
            this.log('Answer created & sent with local stream');
            this.setupMediaCall(call);
          });

          this.peer.on('error', (err) => {
            this.log('Host Peer error', { type: err.type, error: err.message });
            if (err.type === 'unavailable-id') {
              reject(new Error('Room code already in use. Please create a new room.'));
            } else {
              reject(err);
            }
          });

        } else {
          // Guest mode
          this.log('Peer connection created (Guest PeerJS)');
          this.peer = new Peer({
            debug: 1,
            config: { iceServers: PEER_ICE_SERVERS }
          });

          this.peer.on('call', (call) => {
            this.log('Incoming call received on guest, answering with local stream');
            this.mediaCall = call;
            call.answer(this.localStream);
            this.setupMediaCall(call);
          });

          this.peer.on('open', (myId) => {
            this.log('Guest Peer open, connecting to host', { hostPeerId: targetPeerId, myId });
            const conn = this.peer.connect(targetPeerId, { reliable: true });
            this.setupDataConnection(conn);

            // Initiate media call
            if (this.localStream) {
              this.log('Offer created & sent (Outgoing PeerJS call)', { targetPeerId });
              const call = this.peer.call(targetPeerId, this.localStream);
              this.setupMediaCall(call);
            }

            resolve(true);
          });

          this.peer.on('error', (err) => {
            this.log('Guest Peer error', { type: err.type, error: err.message });
            reject(err);
          });
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  setupMediaCall(call) {
    this.mediaCall = call;
    call.on('stream', (stream) => {
      this.log('Remote track received via PeerJS call', {
        streamId: stream.id,
        videoTracks: stream.getVideoTracks().length,
        audioTracks: stream.getAudioTracks().length
      });
      this.remoteStream = stream;
      this.onRemoteStreamCallback?.(stream);
    });

    call.on('close', () => {
      this.log('Media call closed');
      this.emit('peer-disconnected');
    });

    call.on('error', (err) => {
      this.log('Media call error', { error: err.message });
    });
  }

  setupDataConnection(conn) {
    this.connection = conn;

    conn.on('open', () => {
      this.log('Data connection open and active');
      conn.send({
        event: 'peer-joined',
        data: {
          participant: {
            userId: this.user.id,
            displayName: this.user.displayName,
            isReady: false,
            cameraOn: true,
            micOn: false
          }
        }
      });
    });

    conn.on('data', ({ event, data }) => {
      this.log('Data channel message received', { event });
      if (event && this.listeners.has(event)) {
        this.listeners.get(event).forEach(cb => cb(data));
      }

      if (event === 'start-countdown') {
        let count = data.seconds || 3;
        this.emit('countdown-started', { totalSeconds: count });
        const timer = setInterval(() => {
          count -= 1;
          if (count > 0) {
            this.emit('countdown-tick', { remaining: count });
          } else {
            clearInterval(timer);
            this.emit('trigger-synchronized-capture', { timestamp: Date.now() });
          }
        }, 1000);
      }
    });

    conn.on('close', () => {
      this.log('Data connection closed');
      this.emit('peer-disconnected');
    });

    conn.on('error', (err) => {
      this.log('Data connection error', { error: err.message });
    });
  }

  disconnect() {
    this.log('Disconnecting PeerRoomSignaler session');
    if (this.connection) this.connection.close();
    if (this.mediaCall) this.mediaCall.close();
    if (this.peer) this.peer.destroy();
    this.listeners.clear();
  }
}
