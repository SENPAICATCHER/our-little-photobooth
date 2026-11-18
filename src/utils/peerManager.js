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
    this.pendingIncomingCall = null;
    this.listeners = new Map(); // event -> Set of callbacks
    this.remoteStream = null;
    this.localStream = null;
    this.onRemoteStreamCallback = null;
    this.countdownTimer = null;
    this.isReady = false;
    this.peerIsReady = false;
    this.peerParticipant = null;
    this.isDestroyed = false;

    // Release Peer ID promptly when tab or browser closes
    this.unloadHandler = () => this.disconnect();
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', this.unloadHandler);
    }
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

    // Query room state
    if (event === 'get-room-state') {
      if (this.peerParticipant) {
        this.emitLocal('room-state-updated', {
          participants: [
            {
              userId: this.user.id,
              displayName: this.user.displayName,
              isReady: this.isReady,
              isOwner: this.isHost,
              cameraOn: true,
              micOn: false
            },
            this.peerParticipant
          ]
        });
      }
      return;
    }

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

  // Update local stream (if camera changes or is enabled)
  updateLocalStream(stream) {
    this.localStream = stream;
    if (this.pendingIncomingCall) {
      this.log('Answering pending incoming call with newly acquired local stream');
      this.pendingIncomingCall.answer(stream);
      this.setupMediaCall(this.pendingIncomingCall);
      this.pendingIncomingCall = null;
    }
    if (this.mediaCall && this.mediaCall.peerConnection) {
      try {
        const videoTrack = stream.getVideoTracks()[0];
        const senders = this.mediaCall.peerConnection.getSenders();
        const vSender = senders.find(s => s.track && s.track.kind === 'video');
        if (vSender && videoTrack) {
          vSender.replaceTrack(videoTrack).catch(err => {
            this.log('Error replacing video track on call', { error: err.message });
          });
        }
      } catch (err) {
        this.log('Warning updating stream track on call', { error: err.message });
      }
    }
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
            this.log('Incoming call received on host');
            if (this.localStream) {
              call.answer(this.localStream);
              this.setupMediaCall(call);
            } else {
              this.log('Local stream not ready yet, staging call to answer upon stream acquisition');
              this.pendingIncomingCall = call;
            }
          });

          this.peer.on('error', (err) => {
            this.log('Host Peer error', { type: err.type, error: err.message });
            if (err.type === 'unavailable-id') {
              this.log('Host Peer ID already in use on cloud broker. Reusing session.');
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

          let connectionAttemptTimer = null;
          let retryCount = 0;
          const maxRetries = 15; // Retry for up to 30 seconds if host is still loading

          const connectToHost = () => {
            if (this.isDestroyed || !this.peer || this.peer.destroyed) return;
            this.log(`Connecting to host: ${targetPeerId} (Attempt ${retryCount + 1}/${maxRetries})`);
            const conn = this.peer.connect(targetPeerId, {
              reliable: true
            });
            this.setupDataConnection(conn);

            if (this.localStream) {
              this.log('Calling host with local media stream', { targetPeerId });
              const call = this.peer.call(targetPeerId, this.localStream);
              this.setupMediaCall(call);
            }
          };

          this.peer.on('call', (call) => {
            this.log('Incoming call received on guest, answering with local stream');
            if (this.localStream) {
              call.answer(this.localStream);
              this.setupMediaCall(call);
            } else {
              this.pendingIncomingCall = call;
            }
          });

          this.peer.on('open', (myId) => {
            this.log('Guest Peer registered on cloud', { hostPeerId: targetPeerId, myId });
            connectToHost();
            resolve(true);
          });

          this.peer.on('error', (err) => {
            this.log('Guest Peer error', { type: err.type, error: err.message });
            if (err.type === 'peer-unavailable' && retryCount < maxRetries) {
              retryCount += 1;
              this.log(`Host peer not available yet. Retrying in 2 seconds... (${retryCount}/${maxRetries})`);
              if (connectionAttemptTimer) clearTimeout(connectionAttemptTimer);
              connectionAttemptTimer = setTimeout(connectToHost, 2000);
            } else {
              reject(err);
            }
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
      // Announce our presence to peer with our actual entered display name!
      conn.send({
        event: 'peer-joined',
        data: {
          isInitial: true,
          participant: {
            userId: this.user.id,
            displayName: this.user.displayName,
            isReady: this.isReady,
            isOwner: this.isHost,
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
        if (data?.participant) {
          this.peerParticipant = data.participant;
        }

        // Emit locally so UI updates remoteParticipant state immediately
        this.emitLocal('peer-joined', data);

        // If this was the initial announcement from peer, reply with our identity!
        if (data?.isInitial) {
          this.log('Responding with bidirectional identity packet to peer');
          conn.send({
            event: 'peer-joined',
            data: {
              isInitial: false,
              participant: {
                userId: this.user.id,
                displayName: this.user.displayName,
                isReady: this.isReady,
                isOwner: this.isHost,
                cameraOn: true,
                micOn: false
              }
            }
          });
        }
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
      this.peerParticipant = null;
      this.emitLocal('peer-disconnected');
    });

    conn.on('error', (err) => {
      this.log('Data connection error', { error: err.message });
    });
  }

  disconnect() {
    this.log('Disconnecting PeerRoomSignaler session');
    this.isDestroyed = true;
    if (typeof window !== 'undefined' && this.unloadHandler) {
      window.removeEventListener('beforeunload', this.unloadHandler);
    }
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
    if (this.connection) {
      try { this.connection.close(); } catch (e) {}
      this.connection = null;
    }
    if (this.mediaCall) {
      try { this.mediaCall.close(); } catch (e) {}
      this.mediaCall = null;
    }
    if (this.peer) {
      try { this.peer.destroy(); } catch (e) {}
      this.peer = null;
    }
    this.listeners.clear();
  }
}
