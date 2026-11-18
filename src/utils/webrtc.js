// WebRTC PeerConnection & Media Stream Manager

const ICE_SERVERS = [
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

export class WebRTCManager {
  constructor({ socket, roomCode, userId, isPolite = false, onRemoteStream, onConnectionStateChange }) {
    this.socket = socket;
    this.roomCode = (roomCode || 'UNKNOWN').trim().toUpperCase();
    this.userId = userId || `user-${Math.random().toString(36).substr(2, 6)}`;
    this.isPolite = isPolite; // Polite peer rolls back on collisions (usually the guest)
    this.onRemoteStream = onRemoteStream;
    this.onConnectionStateChange = onConnectionStateChange;

    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.pendingCandidates = [];
    this.makingOffer = false;
    this.isSettingRemoteAnswerPending = false;
  }

  // Structured WebRTC Debugging Logger
  log(action, details = {}) {
    console.log(`[WEBRTC] [Room: ${this.roomCode}] [Participant: ${this.userId}] ${action}`, details);
  }

  // Initialize local webcam stream (Camera only by default)
  async initLocalStream({ video = true, audio = false, deviceId = null } = {}) {
    try {
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => track.stop());
      }

      const constraints = {
        video: deviceId 
          ? { deviceId: { exact: deviceId } } 
          : { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: audio // Explicitly false by default
      };

      this.log('Requesting local media stream', { constraints });
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      this.log('Local stream acquired', {
        streamId: this.localStream.id,
        videoTracks: this.localStream.getVideoTracks().length,
        audioTracks: this.localStream.getAudioTracks().length
      });

      // Attach tracks to existing peer connection if already created
      if (this.peerConnection) {
        this.attachLocalStream(this.localStream);
      }

      return { success: true, stream: this.localStream };
    } catch (err) {
      this.log('Error accessing camera', { error: err.name, message: err.message });
      return { success: false, error: err.name || 'Camera access denied' };
    }
  }

  // Get available video devices
  static async getVideoDevices() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter(d => d.kind === 'videoinput');
    } catch (err) {
      return [];
    }
  }

  // Attach local stream tracks to RTCPeerConnection
  attachLocalStream(stream) {
    if (!this.peerConnection || !stream) return;

    const videoTrack = stream.getVideoTracks()[0];
    const audioTrack = stream.getAudioTracks()[0];
    const senders = this.peerConnection.getSenders();

    if (videoTrack) {
      const videoSender = senders.find(s => s.track && s.track.kind === 'video') ||
                          senders.find(s => !s.track);
      if (videoSender) {
        this.log('Replacing video track on sender', { trackId: videoTrack.id });
        videoSender.replaceTrack(videoTrack).catch(err => {
          this.log('Error replacing video track', { error: err.message });
        });
      } else {
        this.log('Adding video track to peer connection', { trackId: videoTrack.id });
        this.peerConnection.addTrack(videoTrack, stream);
      }
    }

    if (audioTrack) {
      const audioSender = senders.find(s => s.track && s.track.kind === 'audio');
      if (audioSender) {
        this.log('Replacing audio track on sender', { trackId: audioTrack.id });
        audioSender.replaceTrack(audioTrack).catch(err => {
          this.log('Error replacing audio track', { error: err.message });
        });
      } else {
        this.log('Adding audio track to peer connection', { trackId: audioTrack.id });
        this.peerConnection.addTrack(audioTrack, stream);
      }
    }
  }

  // Synchronize remote media stream from receivers (covers browsers where ontrack is swallowed)
  syncRemoteStreamFromReceivers() {
    if (!this.peerConnection) return;
    try {
      const receivers = this.peerConnection.getReceivers();
      let updated = false;

      for (const receiver of receivers) {
        if (receiver.track && receiver.track.kind === 'video') {
          if (!this.remoteStream) {
            this.remoteStream = new MediaStream();
          }
          if (!this.remoteStream.getTracks().some(t => t.id === receiver.track.id)) {
            this.remoteStream.addTrack(receiver.track);
            updated = true;
            this.log('Attached remote video track from receiver sync', {
              trackId: receiver.track.id,
              readyState: receiver.track.readyState,
              muted: receiver.track.muted
            });
          }

          receiver.track.onunmute = () => {
            this.log('Receiver track unmuted (frames flowing)', { id: receiver.track.id });
            this.onRemoteStream?.(this.remoteStream);
          };
        }
      }

      if (updated && this.remoteStream) {
        this.onRemoteStream?.(this.remoteStream);
      }
    } catch (err) {
      this.log('Warning in syncRemoteStreamFromReceivers', { error: err.message });
    }
  }

  // Create RTCPeerConnection
  initPeerConnection() {
    if (this.peerConnection) return this.peerConnection;

    this.log('Peer connection created', {
      iceServers: ICE_SERVERS.map(s => s.urls),
      isPolite: this.isPolite
    });

    this.peerConnection = new RTCPeerConnection({
      iceServers: ICE_SERVERS
    });

    // Attach local stream tracks if already present, or add transceivers as placeholder
    if (this.localStream) {
      this.attachLocalStream(this.localStream);
    } else {
      const transceivers = this.peerConnection.getTransceivers();
      if (!transceivers.some(t => t.receiver.track?.kind === 'video')) {
        this.peerConnection.addTransceiver('video', { direction: 'sendrecv' });
      }
      if (!transceivers.some(t => t.receiver.track?.kind === 'audio')) {
        this.peerConnection.addTransceiver('audio', { direction: 'sendrecv' });
      }
    }

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.socket) {
        this.log('ICE candidate sent', {
          candidate: event.candidate.candidate,
          sdpMid: event.candidate.sdpMid,
          sdpMLineIndex: event.candidate.sdpMLineIndex
        });
        this.socket.emit('webrtc-ice-candidate', { candidate: event.candidate });
      } else if (!event.candidate) {
        this.log('ICE candidate gathering complete');
      }
    };

    // Handle incoming remote track
    this.peerConnection.ontrack = (event) => {
      let stream = event.streams?.[0];
      if (!stream) {
        if (!this.remoteStream) {
          this.remoteStream = new MediaStream();
        }
        this.remoteStream.addTrack(event.track);
        stream = this.remoteStream;
      } else {
        this.remoteStream = stream;
      }

      this.log('Remote track received', {
        kind: event.track.kind,
        id: event.track.id,
        streamId: stream.id,
        enabled: event.track.enabled,
        readyState: event.track.readyState
      });

      event.track.onunmute = () => {
        this.log('Remote track unmuted (frames flowing)', { kind: event.track.kind });
      };

      event.track.onended = () => {
        this.log('Remote track ended', { kind: event.track.kind });
      };

      this.onRemoteStream?.(stream);
    };

    // Connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection.connectionState;
      this.log('Connection state', { state });
      this.onConnectionStateChange?.(state);

      if (state === 'failed') {
        this.log('Connection failed, restarting ICE');
        this.restartIce();
      }
    };

    // ICE connection state changes
    this.peerConnection.oniceconnectionstatechange = () => {
      const iceState = this.peerConnection.iceConnectionState;
      this.log('ICE connection state', { state: iceState });

      if (iceState === 'disconnected' || iceState === 'failed') {
        this.onConnectionStateChange?.('disconnected');
      } else if (iceState === 'connected' || iceState === 'completed') {
        this.onConnectionStateChange?.('connected');
      }
    };

    // Signaling state changes
    this.peerConnection.onsignalingstatechange = () => {
      this.log('Signaling state change', { state: this.peerConnection.signalingState });
    };

    return this.peerConnection;
  }

  // Create & send WebRTC Offer
  async createOffer() {
    this.initPeerConnection();

    try {
      this.makingOffer = true;
      this.log('Offer created - starting creation');
      const offer = await this.peerConnection.createOffer({
        offerToReceiveVideo: true,
        offerToReceiveAudio: true
      });

      if (this.peerConnection.signalingState !== 'stable') {
        this.log('Signaling state not stable during offer creation', {
          state: this.peerConnection.signalingState
        });
        return;
      }

      await this.peerConnection.setLocalDescription(offer);
      this.log('Offer created & local description set', { type: offer.type });

      this.socket.emit('webrtc-offer', { offer });
    } catch (err) {
      this.log('Error creating offer', { error: err.message });
    } finally {
      this.makingOffer = false;
    }
  }

  // Handle incoming Offer & respond with Answer
  async handleOffer(offer) {
    this.initPeerConnection();
    this.log('Offer received', { type: offer.type });

    try {
      const offerCollision = (this.makingOffer || this.peerConnection.signalingState !== 'stable');

      if (offerCollision) {
        if (!this.isPolite) {
          // Impolite peer rejects incoming colliding offer
          this.log('Offer collision detected, impolite peer ignoring offer');
          return;
        } else {
          // Polite peer rolls back local description to accept the remote offer
          this.log('Offer collision detected, polite peer rolling back');
          await this.peerConnection.setLocalDescription({ type: 'rollback' });
        }
      }

      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      this.log('Remote description applied (Offer)');

      // Drain any queued ICE candidates
      await this.drainPendingCandidates();

      // Check receivers in case ontrack was already populated
      this.syncRemoteStreamFromReceivers();

      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      this.log('Answer created & local description set', { type: answer.type });

      this.socket.emit('webrtc-answer', { answer });
    } catch (err) {
      this.log('Error handling offer', { error: err.message });
    }
  }

  // Handle incoming Answer
  async handleAnswer(answer) {
    this.log('Answer received', { type: answer.type });
    try {
      if (!this.peerConnection) {
        this.log('Cannot handle answer: peer connection is null');
        return;
      }

      if (this.peerConnection.signalingState === 'have-local-offer') {
        this.isSettingRemoteAnswerPending = true;
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
        this.isSettingRemoteAnswerPending = false;
        this.log('Remote description applied (Answer)');

        // Drain any queued ICE candidates
        await this.drainPendingCandidates();

        // Check receivers immediately so remote video plays without relying solely on ontrack
        this.syncRemoteStreamFromReceivers();
      } else {
        this.log('Ignoring answer: signalingState is not have-local-offer', {
          state: this.peerConnection.signalingState
        });
      }
    } catch (err) {
      this.log('Error handling answer', { error: err.message });
    }
  }

  // Handle incoming ICE candidate
  async handleIceCandidate(candidate) {
    if (!candidate || !candidate.candidate) {
      this.log('Ignoring null / end-of-candidates candidate');
      return;
    }

    this.log('ICE candidate received', {
      candidate: candidate.candidate,
      sdpMid: candidate.sdpMid,
      sdpMLineIndex: candidate.sdpMLineIndex
    });

    try {
      const hasRemoteDesc = this.peerConnection && 
                            this.peerConnection.remoteDescription && 
                            this.peerConnection.remoteDescription.type;

      if (hasRemoteDesc) {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        this.log('ICE candidate applied');
      } else {
        this.pendingCandidates.push(candidate);
        this.log('ICE candidate queued (waiting for remote description)', {
          queueLength: this.pendingCandidates.length
        });
      }
    } catch (err) {
      this.log('Error applying ICE candidate', { error: err.message });
    }
  }

  // Drain pending ICE candidates
  async drainPendingCandidates() {
    if (this.pendingCandidates.length === 0) return;
    this.log('Draining pending ICE candidates', { count: this.pendingCandidates.length });

    while (this.pendingCandidates.length > 0) {
      const candidate = this.pendingCandidates.shift();
      try {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        this.log('ICE candidate applied from queue');
      } catch (err) {
        this.log('Error applying queued ICE candidate', { error: err.message });
      }
    }
  }

  // Restart ICE
  async restartIce() {
    if (!this.peerConnection) return;
    try {
      this.log('Restarting ICE negotiation');
      const offer = await this.peerConnection.createOffer({ iceRestart: true });
      await this.peerConnection.setLocalDescription(offer);
      this.socket.emit('webrtc-offer', { offer });
    } catch (err) {
      this.log('Error restarting ICE', { error: err.message });
    }
  }

  // Toggle local camera track
  toggleCamera(enabled) {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = enabled;
        this.log('Local camera track toggled', { enabled });
        return videoTrack.enabled;
      }
    }
    return false;
  }

  // Toggle local microphone track (Default is OFF)
  toggleMicrophone(enabled) {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = enabled;
        this.log('Local microphone track toggled', { enabled });
        return audioTrack.enabled;
      }
    }
    return false;
  }

  // Cleanup
  close() {
    this.log('Closing WebRTCManager session');
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    this.remoteStream = null;
    this.pendingCandidates = [];
  }
}
