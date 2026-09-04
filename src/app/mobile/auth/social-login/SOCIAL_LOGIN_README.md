# Social Login Feature

This module provides social authentication (Google, Apple, Facebook) for the Society Management mobile app.

## Features

- **Google Sign-In** - OAuth 2.0 authentication with Google
- **Apple Sign-In** - Sign in with Apple ID (iOS/macOS)
- **Facebook Login** - OAuth authentication with Facebook
- **Account Linking** - Link multiple social accounts to one user
- **Embedded Mode** - Use as standalone page or embed in other components
- **Premium UI** - Animated backgrounds, smooth transitions, responsive design

## Files

```
social-login/
├── social-auth.service.ts    # Core authentication service
├── social-login.component.ts # Main UI component
├── index.ts                  # Public exports
└── SOCIAL_LOGIN_README.md    # This documentation
```

## Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/mobile/auth/social` | SocialLoginComponent | Full-page social login |

## Usage

### Standalone Page

Navigate to `/mobile/auth/social` for the full-page experience.

### Embedded in Login Page

```html
<app-social-login 
  [embedded]="true"
  [layout]="'horizontal'"
  [compact]="false"
  (loginSuccess)="onSocialLoginSuccess($event)"
  (loginError)="onSocialLoginError($event)">
</app-social-login>
```

### Compact Icon Buttons

```html
<app-social-login 
  [embedded]="true"
  [compact]="true"
  (loginSuccess)="handleSuccess($event)">
</app-social-login>
```

## Component Inputs

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `embedded` | boolean | false | Use embedded mode (no background/header) |
| `layout` | 'horizontal' \| 'vertical' | 'horizontal' | Button layout direction |
| `compact` | boolean | false | Show only icons (no text) |

## Component Outputs

| Output | Type | Description |
|--------|------|-------------|
| `loginSuccess` | SocialLoginResult | Emits on successful login |
| `loginError` | string | Emits error message on failure |

## Service API

### SocialAuthService

```typescript
import { SocialAuthService, SocialProvider } from './social-auth.service';

// Inject the service
constructor(private socialAuth: SocialAuthService) {}

// Login with specific provider
this.socialAuth.loginWithGoogle().subscribe(result => {
  if (result.success) {
    console.log('User:', result.user);
  }
});

// Or use generic method
this.socialAuth.loginWithProvider('facebook').subscribe(result => { ... });

// Get current user
this.socialAuth.getCurrentUser().subscribe(user => { ... });

// Link additional provider
this.socialAuth.linkProvider('apple').subscribe(result => { ... });

// Unlink provider
this.socialAuth.unlinkProvider('google').subscribe(result => { ... });

// Check if provider is linked
const isLinked = this.socialAuth.isProviderLinked('google');

// Logout
this.socialAuth.logout().subscribe(() => { ... });
```

## Types

```typescript
type SocialProvider = 'google' | 'apple' | 'facebook';

interface SocialUser {
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

interface SocialLoginResult {
  success: boolean;
  user?: SocialUser;
  error?: string;
  isNewUser?: boolean;
}

interface SocialLinkResult {
  success: boolean;
  provider: SocialProvider;
  message: string;
}
```

## Configuration

In production, configure the OAuth credentials:

```typescript
// social-auth.service.ts
private config: SocialAuthConfig = {
  google: {
    clientId: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
    scopes: ['email', 'profile']
  },
  apple: {
    clientId: 'com.yourcompany.societyapp',
    redirectUri: 'https://your-domain.com/auth/apple/callback'
  },
  facebook: {
    appId: 'YOUR_FACEBOOK_APP_ID',
    scopes: ['email', 'public_profile']
  }
};
```

## Test Data

For development/demo, the service provides test users:

| Provider | Email | Name |
|----------|-------|------|
| Google | john.doe@gmail.com | John Doe |
| Apple | john.doe@icloud.com | John Doe |
| Facebook | john.doe@facebook.com | John Doe |

## Flow

1. User clicks social login button
2. Service initiates OAuth flow (simulated in demo)
3. On success:
   - New user → Navigate to registration to complete profile
   - Existing user → Navigate to dashboard
4. On failure:
   - Display error message
   - User can retry

## Integration with MobileAuthService

After successful social login, the component automatically logs the user into the app:

```typescript
// In social-login.component.ts
this.mobileAuthService.login(
  result.user.email,
  'social-auth',
  UserRole.OWNER
).subscribe(() => {
  this.router.navigate(['/mobile/dashboard']);
});
```

## Backend API Endpoints (For Production)

```
POST /api/v1/auth/social/google
POST /api/v1/auth/social/apple
POST /api/v1/auth/social/facebook
POST /api/v1/auth/social/link
DELETE /api/v1/auth/social/unlink/{provider}
GET /api/v1/auth/social/linked-accounts
```

## Security Considerations

1. **Token Storage** - Access tokens stored in localStorage (use secure storage in production)
2. **Token Refresh** - Service supports token refresh
3. **HTTPS Only** - OAuth requires HTTPS in production
4. **CSRF Protection** - Implement state parameter validation
5. **Token Validation** - Validate ID tokens on backend

## Mobile Native Integration

For Capacitor/Ionic apps, use native plugins:

```typescript
// Google
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

// Apple
import { SignInWithApple } from '@capacitor-community/apple-sign-in';

// Facebook
import { FacebookLogin } from '@capacitor-community/facebook-login';
```

## Styling

The component uses CSS custom properties for theming:

```css
:host {
  --google-color: #4285F4;
  --apple-color: #000000;
  --facebook-color: #1877F2;
  --accent-start: #6366f1;
  --accent-end: #a855f7;
}
```

## Accessibility

- Keyboard navigation support
- Screen reader labels
- Focus indicators
- Loading states announced

## Testing

```typescript
// Mock social auth for testing
const mockResult: SocialLoginResult = {
  success: true,
  user: {
    id: 'test-123',
    email: 'test@example.com',
    name: 'Test User',
    firstName: 'Test',
    lastName: 'User',
    provider: 'google',
    accessToken: 'mock-token',
    expiresAt: new Date(Date.now() + 3600000)
  }
};

spyOn(socialAuthService, 'loginWithGoogle').and.returnValue(of(mockResult));
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Login popup blocked | Ensure button triggers native click event |
| Token expired | Call `refreshToken()` or re-authenticate |
| Account already linked | Show error, suggest unlinking first |
| Network error | Check connectivity, retry with backoff |
