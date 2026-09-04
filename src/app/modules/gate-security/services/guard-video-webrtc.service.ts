import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subscription, interval, firstValueFrom } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { VideoCallSignalingService, VideoCallSignalMessage } from './video-call-signaling.service';

/** Browsers block camera/mic on plain HTTP except localhost. */
export function isWebRtcMediaAllowed(): boolean {
  return typeof window !== 'undefined' && !!window.isSecureContext;
}

export function webRtcMediaBlockedReason(): string {
  if (typeof window === 'undefined') {
    return 'Browser environment required.';
  }
  if (window.isSecureContext) {
    return '';
  }
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') {
    return '';
  }
  return (
    'Camera/microphone need HTTPS (or open on localhost). ' +
    `This page is ${window.location.protocol}//${host} — use https:// or test on the same PC at http://localhost:8080.`
  );
}

export type VideoCallPeerRole = 'CALLER' | 'GUARD';

export interface GuardVideoCallState {
  roomId: string;
  role: VideoCallPeerRole;
  status: 'idle' | 'ringing' | 'connecting' | 'connected' | 'ended' | 'failed';
  localVideoEnabled: boolean;
  localAudioEnabled: boolean;
  remoteConnected: boolean;
  errorMessage?: string;
}

/** Google STUN — enough for LAN / most NAT test setups. */
const ICE_SERVERS: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }];

/**
 * Browser WebRTC engine: camera/mic + peer connection, uses backend signaling service.
 */
@Injectable({ providedIn: 'root' })
export class GuardVideoWebRtcService implements OnDestroy {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private pollSub?: Subscription;
  private lastSequence = 0;
  private roomId = '';
  private role: VideoCallPeerRole = 'CALLER';
  private makingOffer = false;
  private ignoreOffer = false;
  private polite = false;

  readonly state$ = new BehaviorSubject<GuardVideoCallState>({
    roomId: '',
    role: 'CALLER',
    status: 'idle',
    localVideoEnabled: true,
    localAudioEnabled: true,
    remoteConnected: false
  });

  /** Fires when remote MediaStream is ready for <video srcObject>. */
  readonly remoteStream$ = new BehaviorSubject<MediaStream | null>(null);

  constructor(private signaling: VideoCallSignalingService) {}

  ngOnDestroy(): void {
    void this.endCall();
  }

  /** Attach local camera preview before or during call. */
  async attachLocalPreview(videoEl: HTMLVideoElement): Promise<MediaStream> {
    const stream = await this.ensureLocalStream();
    videoEl.srcObject = stream;
    await videoEl.play().catch(() => undefined);
    return stream;
  }

  /** Bind remote stream to a video element (call once per active call). */
  bindRemoteVideo(videoEl: HTMLVideoElement): Subscription {
    return this.remoteStream$.subscribe(stream => {
      videoEl.srcObject = stream;
      if (stream) {
        videoEl.play().catch(() => undefined);
      }
    });
  }

  /** Resident starts outgoing call to guard phone room. */
  async startOutgoingCall(roomId: string, displayName: string): Promise<void> {
    await this.startSession(roomId, 'CALLER', displayName, false);
    await this.createAndSendOffer();
  }

  /** Guard answers by joining same room (phone digits). */
  async joinIncomingCall(roomId: string, displayName: string): Promise<void> {
    await this.startSession(roomId, 'GUARD', displayName, true);
  }

  /** End call and release camera/mic. */
  async endCall(): Promise<void> {
    const state = this.state$.value;
    if (state.roomId) {
      this.signaling.hangup(state.roomId, state.role).subscribe({ error: () => undefined });
    }
    this.stopPolling();
    this.closePeerConnection();
    this.stopLocalStream();
    this.remoteStream$.next(null);
    this.state$.next({
      ...this.state$.value,
      status: 'ended',
      remoteConnected: false,
      roomId: ''
    });
    this.roomId = '';
    this.lastSequence = 0;
  }

  setVideoEnabled(enabled: boolean): void {
    this.localStream?.getVideoTracks().forEach(t => (t.enabled = enabled));
    this.state$.next({ ...this.state$.value, localVideoEnabled: enabled });
  }

  setAudioEnabled(enabled: boolean): void {
    this.localStream?.getAudioTracks().forEach(t => (t.enabled = enabled));
    this.state$.next({ ...this.state$.value, localAudioEnabled: enabled });
  }

  private async startSession(
    roomId: string,
    role: VideoCallPeerRole,
    displayName: string,
    polite: boolean
  ): Promise<void> {
    await this.endCall();
    this.roomId = roomId;
    this.role = role;
    this.polite = polite;
    this.lastSequence = 0;
    this.state$.next({
      roomId,
      role,
      status: 'ringing',
      localVideoEnabled: true,
      localAudioEnabled: true,
      remoteConnected: false
    });

    await this.ensureLocalStream();
    this.createPeerConnection();
    try {
      await firstValueFrom(this.signaling.joinRoom(roomId, role, displayName));
    } catch (err: unknown) {
      const httpErr = err as { error?: unknown; status?: number; message?: string };
      let detail = 'Could not join call room on backend.';
      if (typeof httpErr.error === 'string' && httpErr.error.trim().startsWith('<!')) {
        detail =
          'Backend signaling not reachable (got HTML instead of JSON). On the server: add /video-calls to nginx proxy and reload nginx.';
      } else if (httpErr.status === 405) {
        detail = 'POST blocked by nginx (405). Reload nginx config with /video-calls proxy.';
      } else if (httpErr.status === 0) {
        detail = 'Network error — cannot reach signaling API.';
      }
      this.fail(detail);
      throw new Error(detail);
    }
    this.startPolling();
  }

  private async ensureLocalStream(): Promise<MediaStream> {
    if (this.localStream) {
      return this.localStream;
    }
    const blocked = webRtcMediaBlockedReason();
    if (blocked) {
      this.fail(blocked);
      throw new Error(blocked);
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      const msg = 'This browser does not support camera/microphone access.';
      this.fail(msg);
      throw new Error(msg);
    }
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: { echoCancellation: true, noiseSuppression: true }
      });
      return this.localStream;
    } catch (err: unknown) {
      const name = err instanceof DOMException ? err.name : '';
      const msg =
        name === 'NotAllowedError' || name === 'PermissionDeniedError'
          ? 'Camera/microphone permission denied. Click the lock icon in the address bar and allow access.'
          : name === 'NotFoundError' || name === 'DevicesNotFoundError'
            ? 'No camera or microphone found on this device.'
            : 'Could not open camera/microphone. Allow permissions and try again.';
      this.fail(msg);
      throw new Error(msg);
    }
  }

  private createPeerConnection(): void {
    this.pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    this.localStream?.getTracks().forEach(track => this.pc!.addTrack(track, this.localStream!));

    this.pc.ontrack = event => {
      const remote = event.streams[0] ?? new MediaStream([event.track]);
      this.remoteStream$.next(remote);
      this.state$.next({
        ...this.state$.value,
        status: 'connected',
        remoteConnected: true
      });
    };

    this.pc.onicecandidate = event => {
      if (event.candidate && this.roomId) {
        this.signaling
          .postSignal(this.roomId, this.role, 'ice', event.candidate.toJSON())
          .subscribe({ error: () => undefined });
      }
    };

    this.pc.onconnectionstatechange = () => {
      const cs = this.pc?.connectionState;
      if (cs === 'connected') {
        this.state$.next({ ...this.state$.value, status: 'connected', remoteConnected: true });
      } else if (cs === 'failed' || cs === 'disconnected') {
        this.fail('Connection lost');
      }
    };
  }

  private async createAndSendOffer(): Promise<void> {
    if (!this.pc || !this.roomId) {
      return;
    }
    this.makingOffer = true;
    try {
      const offer = await this.pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
      await this.pc.setLocalDescription(offer);
      this.signaling
        .postSignal(this.roomId, this.role, 'offer', { type: offer.type, sdp: offer.sdp })
        .subscribe({
          next: () => {
            this.state$.next({ ...this.state$.value, status: 'connecting' });
          },
          error: () => this.fail('Failed to send call offer')
        });
    } finally {
      this.makingOffer = false;
    }
  }

  private startPolling(): void {
    this.stopPolling();
    this.pollSub = interval(800)
      .pipe(switchMap(() => this.signaling.pollSignals(this.roomId, this.lastSequence)))
      .subscribe({
        next: messages => {
          messages.forEach(msg => void this.handleSignal(msg));
        },
        error: () => undefined
      });
  }

  private stopPolling(): void {
    this.pollSub?.unsubscribe();
    this.pollSub = undefined;
  }

  private async handleSignal(msg: VideoCallSignalMessage): Promise<void> {
    if (msg.sequence > this.lastSequence) {
      this.lastSequence = msg.sequence;
    }
    if (msg.fromRole === this.role) {
      return;
    }

    if (msg.type === 'hangup') {
      await this.endCall();
      return;
    }

    if (!this.pc) {
      return;
    }

    if (msg.type === 'offer') {
      const payload = msg.payload as RTCSessionDescriptionInit;
      const offerCollision = this.makingOffer || this.pc.signalingState !== 'stable';
      this.ignoreOffer = !this.polite && offerCollision;
      if (this.ignoreOffer) {
        return;
      }
      await this.pc.setRemoteDescription(new RTCSessionDescription(payload));
      const answer = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answer);
      this.signaling
        .postSignal(this.roomId, this.role, 'answer', { type: answer.type, sdp: answer.sdp })
        .subscribe({ error: () => this.fail('Failed to send answer') });
      this.state$.next({ ...this.state$.value, status: 'connecting' });
      return;
    }

    if (msg.type === 'answer') {
      const payload = msg.payload as RTCSessionDescriptionInit;
      if (this.pc.signalingState === 'have-local-offer') {
        await this.pc.setRemoteDescription(new RTCSessionDescription(payload));
      }
      return;
    }

    if (msg.type === 'ice') {
      const payload = msg.payload as RTCIceCandidateInit;
      try {
        await this.pc.addIceCandidate(new RTCIceCandidate(payload));
      } catch {
        // Ignore stale ICE after reconnect
      }
    }
  }

  private closePeerConnection(): void {
    this.pc?.close();
    this.pc = null;
  }

  private stopLocalStream(): void {
    this.localStream?.getTracks().forEach(t => t.stop());
    this.localStream = null;
  }

  private fail(message: string): void {
    this.state$.next({
      ...this.state$.value,
      status: 'failed',
      errorMessage: message
    });
  }
}
