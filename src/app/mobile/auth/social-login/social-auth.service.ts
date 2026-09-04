import { Injectable } from '@angular/core';
import { Observable, of, throwError, delay, BehaviorSubject } from 'rxjs';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type SocialProvider = 'google' | 'apple' | 'facebook';

export interface SocialUser {
  id: string;
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  photoUrl?: string;
  provider: SocialProvider;
  accessToken: string;
  idToken?: string;
  expiresAt: Date;
}

export interface SocialAuthConfig {
  google?: {
    clientId: string;
    scopes?: string[];
  };
  apple?: {
    clientId: string;
    redirectUri?: string;
  };
  facebook?: {
    appId: string;
    scopes?: string[];
  };
}

export interface SocialLoginResult {
  success: boolean;
  user?: SocialUser;
  error?: string;
  isNewUser?: boolean;
}

export interface SocialLinkResult {
  success: boolean;
  provider: SocialProvider;
  message: string;
}

// ============================================================================
// SERVICE
// ============================================================================

@Injectable({
  providedIn: 'root'
})
export class SocialAuthService {
  private currentUser$ = new BehaviorSubject<SocialUser | null>(null);
  private linkedProviders$ = new BehaviorSubject<SocialProvider[]>([]);

  // Configuration - In production, these would come from environment
  private config: SocialAuthConfig = {
    google: {
      clientId: 'your-google-client-id.apps.googleusercontent.com',
      scopes: ['email', 'profile']
    },
    apple: {
      clientId: 'com.yourcompany.societyapp',
      redirectUri: 'https://your-domain.com/auth/apple/callback'
    },
    facebook: {
      appId: 'your-facebook-app-id',
      scopes: ['email', 'public_profile']
    }
  };

  // Test users for demo
  private testUsers: Record<SocialProvider, SocialUser> = {
    google: {
      id: 'google-123456789',
      email: 'john.doe@gmail.com',
      name: 'John Doe',
      firstName: 'John',
      lastName: 'Doe',
      photoUrl: 'https://lh3.googleusercontent.com/a/default-user',
      provider: 'google',
      accessToken: 'ya29.test-google-access-token',
      idToken: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.test-id-token',
      expiresAt: new Date(Date.now() + 3600000)
    },
    apple: {
      id: 'apple-001234.abcdef',
      email: 'john.doe@icloud.com',
      name: 'John Doe',
      firstName: 'John',
      lastName: 'Doe',
      provider: 'apple',
      accessToken: 'apple-test-access-token',
      idToken: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.apple-id-token',
      expiresAt: new Date(Date.now() + 3600000)
    },
    facebook: {
      id: 'fb-9876543210',
      email: 'john.doe@facebook.com',
      name: 'John Doe',
      firstName: 'John',
      lastName: 'Doe',
      photoUrl: 'https://graph.facebook.com/9876543210/picture?type=large',
      provider: 'facebook',
      accessToken: 'EAAtest-facebook-access-token',
      expiresAt: new Date(Date.now() + 3600000)
    }
  };

  constructor() {
    this.loadPersistedSession();
  }

  // ============================================================================
  // PUBLIC METHODS
  // ============================================================================

  /**
   * Get current authenticated social user
   */
  getCurrentUser(): Observable<SocialUser | null> {
    return this.currentUser$.asObservable();
  }

  /**
   * Get linked social providers for current user
   */
  getLinkedProviders(): Observable<SocialProvider[]> {
    return this.linkedProviders$.asObservable();
  }

  /**
   * Login with Google
   */
  loginWithGoogle(): Observable<SocialLoginResult> {
    console.log('🔵 Initiating Google Sign-In...');
    return this.simulateSocialLogin('google');
  }

  /**
   * Login with Apple
   */
  loginWithApple(): Observable<SocialLoginResult> {
    console.log('⚫ Initiating Apple Sign-In...');
    return this.simulateSocialLogin('apple');
  }

  /**
   * Login with Facebook
   */
  loginWithFacebook(): Observable<SocialLoginResult> {
    console.log('🔷 Initiating Facebook Sign-In...');
    return this.simulateSocialLogin('facebook');
  }

  /**
   * Generic login method
   */
  loginWithProvider(provider: SocialProvider): Observable<SocialLoginResult> {
    switch (provider) {
      case 'google':
        return this.loginWithGoogle();
      case 'apple':
        return this.loginWithApple();
      case 'facebook':
        return this.loginWithFacebook();
      default:
        return throwError(() => new Error('Unknown provider'));
    }
  }

  /**
   * Link a social account to existing user
   */
  linkProvider(provider: SocialProvider): Observable<SocialLinkResult> {
    console.log(`🔗 Linking ${provider} account...`);
    
    return new Observable(observer => {
      setTimeout(() => {
        const currentLinked = this.linkedProviders$.value;
        
        if (currentLinked.includes(provider)) {
          observer.next({
            success: false,
            provider,
            message: `${this.getProviderName(provider)} account is already linked`
          });
        } else {
          this.linkedProviders$.next([...currentLinked, provider]);
          this.persistLinkedProviders();
          
          observer.next({
            success: true,
            provider,
            message: `${this.getProviderName(provider)} account linked successfully`
          });
        }
        observer.complete();
      }, 1500);
    });
  }

  /**
   * Unlink a social account
   */
  unlinkProvider(provider: SocialProvider): Observable<SocialLinkResult> {
    console.log(`🔓 Unlinking ${provider} account...`);
    
    return new Observable(observer => {
      setTimeout(() => {
        const currentLinked = this.linkedProviders$.value;
        
        if (!currentLinked.includes(provider)) {
          observer.next({
            success: false,
            provider,
            message: `${this.getProviderName(provider)} account is not linked`
          });
        } else if (currentLinked.length === 1 && !this.hasPasswordAuth()) {
          observer.next({
            success: false,
            provider,
            message: 'Cannot unlink the only authentication method'
          });
        } else {
          this.linkedProviders$.next(currentLinked.filter(p => p !== provider));
          this.persistLinkedProviders();
          
          observer.next({
            success: true,
            provider,
            message: `${this.getProviderName(provider)} account unlinked successfully`
          });
        }
        observer.complete();
      }, 1000);
    });
  }

  /**
   * Check if provider is linked
   */
  isProviderLinked(provider: SocialProvider): boolean {
    return this.linkedProviders$.value.includes(provider);
  }

  /**
   * Logout from social auth
   */
  logout(): Observable<boolean> {
    return new Observable(observer => {
      this.currentUser$.next(null);
      localStorage.removeItem('social_user');
      console.log('👋 Social auth session cleared');
      observer.next(true);
      observer.complete();
    });
  }

  /**
   * Refresh access token
   */
  refreshToken(): Observable<SocialUser | null> {
    const user = this.currentUser$.value;
    if (!user) {
      return of(null);
    }

    return new Observable(observer => {
      setTimeout(() => {
        const refreshedUser: SocialUser = {
          ...user,
          accessToken: `refreshed-${user.accessToken}-${Date.now()}`,
          expiresAt: new Date(Date.now() + 3600000)
        };
        
        this.currentUser$.next(refreshedUser);
        this.persistSession(refreshedUser);
        
        observer.next(refreshedUser);
        observer.complete();
      }, 500);
    });
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  getProviderName(provider: SocialProvider): string {
    const names: Record<SocialProvider, string> = {
      google: 'Google',
      apple: 'Apple',
      facebook: 'Facebook'
    };
    return names[provider];
  }

  getProviderIcon(provider: SocialProvider): string {
    const icons: Record<SocialProvider, string> = {
      google: 'G',
      apple: '',
      facebook: 'f'
    };
    return icons[provider];
  }

  getProviderColor(provider: SocialProvider): string {
    const colors: Record<SocialProvider, string> = {
      google: '#4285F4',
      apple: '#000000',
      facebook: '#1877F2'
    };
    return colors[provider];
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private simulateSocialLogin(provider: SocialProvider): Observable<SocialLoginResult> {
    return new Observable(observer => {
      // Simulate OAuth popup delay
      setTimeout(() => {
        // Random chance of failure for demo
        const shouldFail = Math.random() < 0.05; // 5% failure rate
        
        if (shouldFail) {
          observer.next({
            success: false,
            error: `${this.getProviderName(provider)} authentication was cancelled`
          });
        } else {
          const user = this.testUsers[provider];
          const isNewUser = Math.random() < 0.2; // 20% chance of new user
          
          this.currentUser$.next(user);
          this.persistSession(user);
          
          // Add to linked providers if not already
          if (!this.linkedProviders$.value.includes(provider)) {
            this.linkedProviders$.next([...this.linkedProviders$.value, provider]);
            this.persistLinkedProviders();
          }
          
          console.log(`✅ ${this.getProviderName(provider)} login successful:`, user.email);
          
          observer.next({
            success: true,
            user,
            isNewUser
          });
        }
        observer.complete();
      }, 1500); // Simulate OAuth flow delay
    });
  }

  private persistSession(user: SocialUser): void {
    try {
      localStorage.setItem('social_user', JSON.stringify({
        ...user,
        expiresAt: user.expiresAt.toISOString()
      }));
    } catch (e) {
      console.error('Failed to persist social session:', e);
    }
  }

  private loadPersistedSession(): void {
    try {
      const stored = localStorage.getItem('social_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        const user: SocialUser = {
          ...parsed,
          expiresAt: new Date(parsed.expiresAt)
        };
        
        // Check if token is still valid
        if (user.expiresAt > new Date()) {
          this.currentUser$.next(user);
        } else {
          localStorage.removeItem('social_user');
        }
      }

      // Load linked providers
      const linkedStored = localStorage.getItem('linked_providers');
      if (linkedStored) {
        this.linkedProviders$.next(JSON.parse(linkedStored));
      }
    } catch (e) {
      console.error('Failed to load persisted social session:', e);
    }
  }

  private persistLinkedProviders(): void {
    try {
      localStorage.setItem('linked_providers', JSON.stringify(this.linkedProviders$.value));
    } catch (e) {
      console.error('Failed to persist linked providers:', e);
    }
  }

  private hasPasswordAuth(): boolean {
    // In a real app, check if user has password-based auth
    return true;
  }
}
