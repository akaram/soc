import {
  Component,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ElementRef,
  ViewChild,
  AfterViewInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import type { GateCameraPlaybackType } from '../../../core/models/gate-camera-stream.config';

/**
 * Plays browser-safe camera URLs (HLS, MJPEG, MP4, or polled JPEG snapshots).
 * RTSP must be converted on the server first — see deploy/CAMERA-TESTING.md.
 */
@Component({
  selector: 'app-gate-camera-player',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="player-wrap" [class.fullscreen]="fullscreen">
      <video
        *ngIf="playbackType === 'hls' || playbackType === 'mp4'"
        #videoEl
        class="player-media"
        [attr.playsinline]="true"
        [muted]="true"
        autoplay
        controls
      ></video>
      <img
        *ngIf="playbackType === 'mjpeg' || playbackType === 'snapshot'"
        class="player-media"
        [src]="snapshotSrc"
        [alt]="label"
        (error)="onMediaError()"
      />
      <div class="player-error" *ngIf="errorMessage">
        <i class="material-icons">videocam_off</i>
        <p>{{ errorMessage }}</p>
      </div>
    </div>
  `,
  styles: [
    `
      .player-wrap {
        position: relative;
        width: 100%;
        height: 100%;
        min-height: 180px;
        background: #0f172a;
        border-radius: 8px;
        overflow: hidden;
      }
      .player-wrap.fullscreen {
        min-height: 60vh;
      }
      .player-media {
        width: 100%;
        height: 100%;
        object-fit: contain;
        display: block;
        background: #000;
      }
      .player-error {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: #94a3b8;
        padding: 16px;
        text-align: center;
        font-size: 13px;
      }
      .player-error .material-icons {
        font-size: 48px;
        margin-bottom: 8px;
      }
    `
  ]
})
export class GateCameraPlayerComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() playbackUrl = '';
  @Input() playbackType: GateCameraPlaybackType = 'snapshot';
  @Input() label = 'Camera';
  @Input() fullscreen = false;
  /** Increment to force stream re-attach (e.g. after relay restart). */
  @Input() refreshKey = 0;

  @ViewChild('videoEl') videoEl?: ElementRef<HTMLVideoElement>;

  snapshotSrc = '';
  errorMessage = '';
  private snapshotTimer?: ReturnType<typeof setInterval>;
  private hlsInstance: { destroy(): void } | null = null;

  ngAfterViewInit(): void {
    void this.attachStream();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['playbackUrl'] || changes['playbackType'] || changes['refreshKey']) {
      void this.attachStream();
    }
  }

  ngOnDestroy(): void {
    this.teardown();
  }

  onMediaError(): void {
    this.errorMessage =
      'Cannot load camera image. Check URL, firewall, and that the stream relay (MediaMTX/FFmpeg) is running.';
  }

  private teardown(): void {
    if (this.snapshotTimer) {
      clearInterval(this.snapshotTimer);
      this.snapshotTimer = undefined;
    }
    if (this.hlsInstance) {
      this.hlsInstance.destroy();
      this.hlsInstance = null;
    }
  }

  private async attachStream(): Promise<void> {
    this.teardown();
    this.errorMessage = '';
    if (!this.playbackUrl?.trim()) {
      this.errorMessage = 'No playback URL configured.';
      return;
    }

    if (this.playbackType === 'snapshot') {
      this.refreshSnapshot();
      this.snapshotTimer = setInterval(() => this.refreshSnapshot(), 2000);
      return;
    }

    if (this.playbackType === 'mjpeg') {
      this.snapshotSrc = this.playbackUrl;
      return;
    }

    // HLS or MP4 — need video element
    setTimeout(() => void this.attachVideo(), 0);
  }

  private refreshSnapshot(): void {
    const sep = this.playbackUrl.includes('?') ? '&' : '?';
    this.snapshotSrc = `${this.playbackUrl}${sep}_t=${Date.now()}`;
  }

  private async attachVideo(): Promise<void> {
    const video = this.videoEl?.nativeElement;
    if (!video) {
      return;
    }

    if (this.playbackType === 'mp4') {
      video.src = this.playbackUrl;
      try {
        await video.play();
      } catch {
        this.errorMessage = 'MP4 stream failed to play.';
      }
      return;
    }

    // HLS
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = this.playbackUrl;
      try {
        await video.play();
      } catch {
        this.errorMessage = 'HLS stream failed (Safari/native HLS).';
      }
      return;
    }

    try {
      const mod = await import('hls.js');
      const Hls = mod.default;
      if (!Hls.isSupported()) {
        this.errorMessage = 'HLS not supported in this browser. Use Chrome/Edge or serve MJPEG instead.';
        return;
      }
      const hls = new Hls({ enableWorker: true, lowLatencyMode: true });
      hls.loadSource(this.playbackUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.ERROR, () => {
        this.errorMessage =
          'HLS error — verify MediaMTX/FFmpeg is running and the URL opens in VLC/browser.';
      });
      this.hlsInstance = hls;
      await video.play();
    } catch (e) {
      console.error(e);
      this.errorMessage = 'Install hls.js and rebuild, or use MJPEG/snapshot URL (see CAMERA-TESTING.md).';
    }
  }
}
