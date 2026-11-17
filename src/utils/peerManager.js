// PeerJS Cloud WebRTC Adapter for Serverless / Netlify Static Deployments
import { Peer } from 'peerjs';

// Comprehensive STUN and free TURN relays for guaranteed NAT/firewall traversal across phones and Wi-Fi
const PEER_ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
  { urls: 'stun:openrelay.metered.ca:80' },
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  },
  {
    urls: 'turn:openrelay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  },
  {
    urls: 'turn:openrelay.metered.ca:443?transport=tcp',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  }
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
    this.countdownTimer = null;
    this.isReady = false;
    this.peerIsReady = false;
  }

  log(action, details = {}) {
    console.log(`[WEBRTC P2P] [Room: ${this.roomCode}] [Participant: ${this.user.id}] ${action}`, details);
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

  emitLocal(event, data = {}) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(cb => {
        try {
          cb(data);
        } catch (e) {
          console.warn(`[WEBRTC P2P] Listener error on ${event}:`, e);
        }
      });
    }
  }

  sendRemote(event, data = {}) {
    if (this.connection && this.connection.open) {
      try {
        this.connection.send({ event, data, fromUserId: this.user.id });
      } catch (err) {
        this.log('Error sending data over connection', { error: err.message });
      }
    }
  }

  // Handle outgoing events from UI
  emit(event, data = {}) {
    this.log(`Outgoing emit: ${event}`, data);

    // 1. Synchronized countdown logic
    if (event === 'start-countdown') {
      const seconds = data.seconds || 3;
      let count = seconds;

      // Notify both local UI and remote peer
      this.emitLocal('countdown-started', { totalSeconds: seconds });
      this.sendRemote('countdown-started', { totalSeconds: seconds });

      if (this.countdownTimer) clearInterval(this.countdownTimer);
      this.countdownTimer = setInterval(() => {
        count -= 1;
        if (count > 0) {
          this.emitLocal('countdown-tick', { remaining: count });
          this.sendRemote('countdown-tick', { remaining: count });
        } else {
          clearInterval(this.countdownTimer);
          this.countdownTimer = null;
          const timestamp = Date.now();
          this.emitLocal('trigger-synchronized-capture', { timestamp });
          this.sendRemote('trigger-synchronized-capture', { timestamp });
        }
      }, 1000);
      return;
    }

    // 2. Synchronized layout change
    if (event === 'change-layout') {
      this.sendRemote('layout-changed', { layout: data.layout });
      return;
    }

    // 3. Ready toggle
    if (event === 'toggle-ready') {
      this.isReady = Boolean(data.isReady);
      const bothReady = this.isReady && this.peerIsReady;
      this.emitLocal('participant-ready-changed', {
        userId: this.user.id,
        isReady: this.isReady,
        bothReady
      });
      this.sendRemote('participant-ready-changed', {
        userId: this.user.id,
        isReady: this.isReady,
        bothReady
      });
      return;
    }

    // 4. Media state change
    if (event === 'media-state-change') {
      this.sendRemote('peer-media-state', data);
      return;
    }

    // Standard emit
    this.emitLocal(event, data);
    this.sendRemote(event, data);
  }

  // Initialize P2P connection
  async init(localStream, onRemoteStream) {
    this.localStream = localStream;
    this.onRemoteStreamCallback = onRemoteStream;
    const targetPeerId = `olpb-${this.roomCode.toLowerCase()}`;

    return new Promise((resolve, reject) => {
      try {
        if (this.isHost) {
          this.log('Creating Host Peer on PeerJS cloud', { targetPeerId });
          this.peer = new Peer(targetPeerId, {
            debug: 1,
            config: { iceServers: PEER_ICE_SERVERS }
          });

          this.peer.on('open', (id) => {
            this.log('Host Peer registered & open on cloud', { id });
            resolve(true);
          });

          // Handle incoming data connection from guest
          this.peer.on('connection', (conn) => {
            this.log('Guest connected data channel', { peer: conn.peer });
            this.setupDataConnection(conn);
          });

          // Handle incoming media call
          this.peer.on('call', (call) => {
            this.log('Incoming call received on host, answering with local stream');
            call.answer(this.localStream);
            this.setupMediaCall(call);
          });

          this.peer.on('error', (err) => {
            this.log('Host Peer error', { type: err.type, error: err.message });
            if (err.type === 'unavailable-id') {
              // ID collision or reloaded: retry with clean session
              this.log('Peer ID already in use, cleaning up');
              resolve(true);
            } else {
              reject(err);
            }
          });

        } else {
          // Guest mode: connect to host's targetPeerId
          this.log('Creating Guest Peer on PeerJS cloud');
          this.peer = new Peer({
            debug: 1,
            config: { iceServers: PEER_ICE_SERVERS }
          });

          this.peer.on('call', (call) => {
            this.log('Incoming call received on guest, answering with local stream');
            call.answer(this.localStream);
            this.setupMediaCall(call);
          });

          this.peer.on('open', (myId) => {
            this.log('Guest Peer registered on cloud', { hostPeerId: targetPeerId, myId });
            const conn = this.peer.connect(targetPeerId, {
              reliable: true
            });
            this.setupDataConnection(conn);

            // Call host once data connection is opened or immediately if stream available
            if (this.localStream) {
              this.log('Calling host with local media stream', { targetPeerId });
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
    if (!call) return;
    this.mediaCall = call;

    call.on('stream', (stream) => {
      this.log('Remote stream received from peer', {
        streamId: stream.id,
        videoTracks: stream.getVideoTracks().length,
        audioTracks: stream.getAudioTracks().length
      });
      this.remoteStream = stream;
      this.onRemoteStreamCallback?.(stream);
    });

    call.on('close', () => {
      this.log('Media call closed');
      this.emitLocal('peer-disconnected');
    });

    call.on('error', (err) => {
      this.log('Media call error', { error: err.message });
    });
  }

  setupDataConnection(conn) {
    this.connection = conn;

    conn.on('open', () => {
      this.log('Data connection open and confirmed active');
      // Announce our presence to peer
      conn.send({
        event: 'peer-joined',
        data: {
          participant: {
            userId: this.user.id,
            displayName: this.user.displayName,
            isReady: this.isReady,
            cameraOn: true,
            micOn: false
          }
        }
      });

      // If we are guest and haven't called host yet, initiate media call now
      if (!this.isHost && this.localStream && !this.mediaCall) {
        this.log('Initiating media call to host now that data channel is active');
        const call = this.peer.call(conn.peer, this.localStream);
        this.setupMediaCall(call);
      }
    });

    conn.on('data', (packet) => {
      if (!packet || !packet.event) return;
      const { event, data } = packet;
      this.log(`Data channel received: ${event}`, data);

      if (event === 'peer-joined') {
        this.emitLocal('peer-joined', data);
        return;
      }

      if (event === 'countdown-started') {
        this.emitLocal('countdown-started', data);
        return;
      }

      if (event === 'countdown-tick') {
        this.emitLocal('countdown-tick', data);
        return;
      }

      if (event === 'trigger-synchronized-capture') {
        this.emitLocal('trigger-synchronized-capture', data);
        return;
      }

      if (event === 'layout-changed') {
        this.emitLocal('layout-changed', data);
        return;
      }

      if (event === 'participant-ready-changed') {
        this.peerIsReady = Boolean(data.isReady);
        const bothReady = this.isReady && this.peerIsReady;
        this.emitLocal('participant-ready-changed', {
          ...data,
          bothReady
        });
        return;
      }

      if (event === 'peer-media-state') {
        this.emitLocal('peer-media-state', data);
        return;
      }

      // Default pass-through
      this.emitLocal(event, data);
    });

    conn.on('close', () => {
      this.log('Data connection closed');
      this.emitLocal('peer-disconnected');
    });

    conn.on('error', (err) => {
      this.log('Data connection error', { error: err.message });
    });
  }

  disconnect() {
    this.log('Disconnecting PeerRoomSignaler session');
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
    if (this.connection) this.connection.close();
    if (this.mediaCall) this.mediaCall.close();
    if (this.peer) this.peer.destroy();
    this.listeners.clear();
  }
}
