import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export enum DeviceType {
  MOBILE = 'mobile',
  TABLET = 'tablet',
  DESKTOP = 'desktop'
}

export interface DeviceInfo {
  type: DeviceType;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  userAgent: string;
  screenWidth: number;
  screenHeight: number;
}

@Injectable({
  providedIn: 'root'
})
export class DeviceDetectionService {
  private deviceInfoSubject = new BehaviorSubject<DeviceInfo>(this.detectDevice());
  public deviceInfo$: Observable<DeviceInfo> = this.deviceInfoSubject.asObservable();

  constructor() {
    // Listen for window resize
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', () => {
        this.deviceInfoSubject.next(this.detectDevice());
      });
    }
  }

  /**
   * Detect device type based on screen width and user agent
   */
  private detectDevice(): DeviceInfo {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      // Server-side rendering fallback
      return {
        type: DeviceType.DESKTOP,
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        userAgent: '',
        screenWidth: 1920,
        screenHeight: 1080
      };
    }

    const userAgent = navigator.userAgent.toLowerCase();
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    // Check for mobile devices via user agent
    const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    const isTabletUA = /ipad|android(?!.*mobile)|tablet/i.test(userAgent);

    // Determine device type based on screen width and user agent
    let type: DeviceType;
    let isMobile = false;
    let isTablet = false;
    let isDesktop = false;

    if (screenWidth < 768 || (isMobileUA && !isTabletUA)) {
      type = DeviceType.MOBILE;
      isMobile = true;
    } else if ((screenWidth >= 768 && screenWidth < 1024) || isTabletUA) {
      type = DeviceType.TABLET;
      isTablet = true;
    } else {
      type = DeviceType.DESKTOP;
      isDesktop = true;
    }

    return {
      type,
      isMobile,
      isTablet,
      isDesktop,
      userAgent,
      screenWidth,
      screenHeight
    };
  }

  /**
   * Get current device info
   */
  getCurrentDevice(): DeviceInfo {
    return this.deviceInfoSubject.value;
  }

  /**
   * Check if current device is mobile
   */
  isMobile(): boolean {
    return this.deviceInfoSubject.value.isMobile;
  }

  /**
   * Check if current device is tablet
   */
  isTablet(): boolean {
    return this.deviceInfoSubject.value.isTablet;
  }

  /**
   * Check if current device is desktop
   */
  isDesktop(): boolean {
    return this.deviceInfoSubject.value.isDesktop;
  }

  /**
   * Get device type
   */
  getDeviceType(): DeviceType {
    return this.deviceInfoSubject.value.type;
  }

  /**
   * Check if user prefers mobile interface (stored in localStorage)
   */
  userPrefersMobile(): boolean {
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem('preferMobile') === 'true';
  }

  /**
   * Check if user prefers desktop interface (stored in localStorage)
   */
  userPrefersDesktop(): boolean {
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem('preferDesktop') === 'true';
  }

  /**
   * Set user preference for mobile interface
   */
  setPreferMobile(prefer: boolean): void {
    if (typeof localStorage === 'undefined') return;
    if (prefer) {
      localStorage.setItem('preferMobile', 'true');
      localStorage.removeItem('preferDesktop');
    } else {
      localStorage.removeItem('preferMobile');
    }
  }

  /**
   * Set user preference for desktop interface
   */
  setPreferDesktop(prefer: boolean): void {
    if (typeof localStorage === 'undefined') return;
    if (prefer) {
      localStorage.setItem('preferDesktop', 'true');
      localStorage.removeItem('preferMobile');
    } else {
      localStorage.removeItem('preferDesktop');
    }
  }

  /**
   * Determine which interface to show based on device and user preference
   */
  shouldShowMobileInterface(): boolean {
    // User explicitly wants mobile
    if (this.userPrefersMobile()) {
      return true;
    }

    // User explicitly wants desktop
    if (this.userPrefersDesktop()) {
      return false;
    }

    // Auto-detect: show mobile for mobile devices and small tablets
    const device = this.getCurrentDevice();
    return device.isMobile || (device.isTablet && device.screenWidth < 900);
  }

  /**
   * Determine which interface to show based on device and user preference
   */
  shouldShowDesktopInterface(): boolean {
    return !this.shouldShowMobileInterface();
  }

  /**
   * Get recommended interface
   */
  getRecommendedInterface(): 'mobile' | 'desktop' {
    return this.shouldShowMobileInterface() ? 'mobile' : 'desktop';
  }
}
