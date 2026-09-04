# OTP Verification Module

## Overview

This module provides a complete, production-ready OTP (One-Time Password) verification system supporting both SMS and Email channels. It features a premium UI design with smooth animations, comprehensive validation, and security features.

## Features

### 🔐 Core Features
- **SMS OTP** - Send verification codes via SMS
- **Email OTP** - Send verification codes via Email  
- **Dual Channel** - Send to both SMS and Email simultaneously
- **Auto-verification** - Automatically verify when all digits entered
- **Paste Support** - Paste full OTP from clipboard
- **Countdown Timer** - Visual expiry countdown
- **Resend Cooldown** - Prevent spam with 30-second cooldown
- **Attempt Limiting** - Maximum 5 verification attempts
- **Session Persistence** - Resume verification after page refresh

### 🎨 UI Features
- **Premium Design** - Modern glass-morphism UI
- **Animated Backgrounds** - Floating shapes and gradient orbs
- **Dark Mode Support** - Full theme compatibility
- **Responsive** - Works on all screen sizes
- **Accessible** - Keyboard navigation and screen reader support
- **Visual Feedback** - Success/error animations

## File Structure

```
src/app/mobile/auth/otp-verification/
├── otp.service.ts                 # Core OTP service
├── otp-verification.component.ts  # Main verification component
└── OTP_VERIFICATION_README.md     # This documentation
```

## Routes

Add to your mobile routes:

```typescript
{
  path: 'otp-verify',
  loadComponent: () => import('./auth/otp-verification/otp-verification.component')
    .then(m => m.OtpVerificationComponent)
}
```

## Usage

### Standalone Page

Navigate to the OTP verification page with query parameters:

```typescript
this.router.navigate(['/mobile/auth/otp-verify'], {
  queryParams: {
    phone: '9876543210',
    email: 'user@example.com',
    purpose: 'registration'
  }
});
```

### Embedded Component

Use as a child component in registration or other flows:

```html
<app-otp-verification
  [embedded]="true"
  [phone]="userPhone"
  [email]="userEmail"
  [purpose]="'registration'"
  [preSelectedChannel]="'sms'"
  [showChannelSelector]="false"
  (verified)="onOtpVerified($event)"
  (cancelled)="onOtpCancelled()">
</app-otp-verification>
```

### Component Inputs

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `embedded` | boolean | false | Embedded mode (no header/background) |
| `phone` | string | '' | Phone number for SMS OTP |
| `email` | string | '' | Email address for Email OTP |
| `purpose` | OtpPurpose | 'registration' | Purpose of verification |
| `preSelectedChannel` | OtpChannel | null | Pre-select channel (skips selection) |
| `showChannelSelector` | boolean | true | Show channel selection UI |

### Component Outputs

| Output | Event Data | Description |
|--------|------------|-------------|
| `verified` | `{ token: string, channel: OtpChannel }` | Emitted on successful verification |
| `cancelled` | void | Emitted when user cancels |

## Service API

### OtpService Methods

```typescript
import { OtpService } from './otp.service';

// Send OTP
this.otpService.sendOtp({
  channel: 'sms', // 'sms' | 'email' | 'both'
  purpose: 'registration',
  phone: '9876543210',
  email: 'user@example.com'
}).subscribe(result => {
  console.log('OTP ID:', result.otpId);
  console.log('Expires:', result.expiresAt);
});

// Verify OTP
this.otpService.verifyOtp({
  otpId: 'OTP-xxx',
  otp: '123456',
  channel: 'sms'
}).subscribe(result => {
  if (result.verified) {
    console.log('Token:', result.token);
  }
});

// Resend OTP
this.otpService.resendOtp().subscribe(result => {
  console.log('Resent:', result.message);
});

// Get current session
this.otpService.getCurrentSession().subscribe(session => {
  console.log('Session:', session);
});

// Clear session
this.otpService.clearSession();
```

## Types

```typescript
type OtpChannel = 'sms' | 'email' | 'both';

type OtpPurpose = 
  | 'registration' 
  | 'login' 
  | 'password_reset' 
  | 'phone_change' 
  | 'email_change' 
  | 'transaction';

interface OtpSession {
  otpId: string;
  phone?: string;
  email?: string;
  channel: OtpChannel;
  purpose: OtpPurpose;
  expiresAt: Date;
  createdAt: Date;
  attempts: number;
  maxAttempts: number;
  status: 'pending' | 'verified' | 'expired' | 'max_attempts';
  verified: boolean;
}
```

## Integration with Registration

### Step 1: Add OTP Step to Registration

In your registration component, add an OTP verification step:

```typescript
// After Step 1 (Basic Info), add OTP step
case 2: // OTP Verification Step
  if (this.otpVerified) {
    this.currentStep++;
  } else {
    this.showOtpVerification = true;
  }
  break;
```

### Step 2: Handle Verification Result

```typescript
onOtpVerified(event: { token: string; channel: string }): void {
  this.otpVerified = true;
  this.otpToken = event.token;
  this.showOtpVerification = false;
  this.nextStep();
}
```

### Step 3: Template Integration

```html
<!-- OTP Verification Step -->
<div *ngIf="currentStep === 2 && showOtpVerification">
  <app-otp-verification
    [embedded]="true"
    [phone]="step1Form.get('phone')?.value"
    [email]="step1Form.get('email')?.value"
    [purpose]="'registration'"
    (verified)="onOtpVerified($event)"
    (cancelled)="previousStep()">
  </app-otp-verification>
</div>
```

## API Integration

Replace dummy service calls with actual API endpoints:

### Send OTP Endpoint
```
POST /api/v1/otp/send
Content-Type: application/json

{
  "channel": "sms",
  "purpose": "registration",
  "phone": "+919876543210",
  "email": "user@example.com"
}

Response:
{
  "success": true,
  "otpId": "OTP-abc123",
  "expiresAt": "2025-01-15T12:05:00Z",
  "maskedPhone": "98****10",
  "message": "OTP sent successfully"
}
```

### Verify OTP Endpoint
```
POST /api/v1/otp/verify
Content-Type: application/json

{
  "otpId": "OTP-abc123",
  "otp": "123456",
  "channel": "sms"
}

Response:
{
  "success": true,
  "verified": true,
  "token": "jwt-token-here",
  "message": "OTP verified successfully"
}
```

## Configuration

Default configuration in `otp.service.ts`:

```typescript
private readonly OTP_LENGTH = 6;              // OTP digits
private readonly OTP_EXPIRY_SECONDS = 300;    // 5 minutes
private readonly MAX_ATTEMPTS = 5;            // Max verification attempts
private readonly RESEND_COOLDOWN_SECONDS = 30; // Cooldown between resends
private readonly MAX_RESEND_COUNT = 5;        // Max resend requests
```

## Security Considerations

1. **Rate Limiting** - 30-second cooldown between resends, max 5 resends
2. **Attempt Limiting** - Maximum 5 verification attempts per OTP
3. **Expiry** - OTP expires after 5 minutes
4. **Session Management** - Sessions stored securely, cleared on verification
5. **Input Validation** - Only numeric input allowed
6. **No OTP Logging** - Test OTP logged only in development

## Testing

### Test OTP (Development Only)

The service logs the generated OTP to console in development:
```
🔐 Test OTP: 123456
```

You can also use the default test OTP: `123456`

### Test Scenarios

1. **Happy Path** - Enter correct OTP, verify success
2. **Wrong OTP** - Enter wrong OTP, see error and attempts remaining
3. **Expired OTP** - Wait 5 minutes, see expiry message
4. **Max Attempts** - Enter wrong OTP 5 times, see lockout
5. **Resend** - Click resend after cooldown, receive new OTP
6. **Paste** - Paste full OTP from clipboard
7. **Channel Switch** - Change from SMS to Email

## Troubleshooting

| Issue | Solution |
|-------|----------|
| OTP not received | Check phone/email validity, check spam folder |
| "Maximum attempts exceeded" | Request new OTP |
| "OTP expired" | Request new OTP |
| Input not accepting | Ensure numeric keyboard, clear and retry |
| Session lost on refresh | Check localStorage is enabled |

## Changelog

### v1.0.0 (Current)
- Initial implementation
- SMS, Email, and dual-channel support
- Premium UI with animations
- Dark mode support
- Resend cooldown and attempt limiting
- Session persistence
- Embedded and standalone modes
