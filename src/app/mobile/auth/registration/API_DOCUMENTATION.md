# API Integration Guide - Registration Module

## Base URL
```
http://your-api-domain.com/api
```

## Authentication
Most endpoints after registration require JWT token:
```
Authorization: Bearer <jwt_token>
```

---

## 1. Check Email Availability

**Endpoint:** `GET /auth/check-email`

**Query Parameters:**
```
email: string (required)
```

**Request Example:**
```http
GET /auth/check-email?email=john.doe@example.com
```

**Response:**
```json
{
  "available": true,
  "message": "Email is available"
}
```

**Error Response:**
```json
{
  "available": false,
  "message": "Email already registered"
}
```

---

## 2. Check Phone Availability

**Endpoint:** `GET /auth/check-phone`

**Query Parameters:**
```
phone: string (required)
```

**Request Example:**
```http
GET /auth/check-phone?phone=9876543210
```

**Response:**
```json
{
  "available": true,
  "message": "Phone number is available"
}
```

---

## 3. Save Step 1 - Basic Information

**Endpoint:** `POST /registration/step1`

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "phone": "9876543210",
  "password": "SecurePass@123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Basic information saved successfully",
  "registrationId": "REG-1702831234567-ABC123XYZ",
  "data": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "phone": "9876543210"
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Validation error",
  "errors": [
    {
      "field": "email",
      "message": "Email already exists"
    }
  ]
}
```

---

## 4. Save Step 2 - Address & Personal Details

**Endpoint:** `POST /registration/step2`

**Request Body:**
```json
{
  "registrationId": "REG-1702831234567-ABC123XYZ",
  "flatNumber": "A-101",
  "tower": "Tower A",
  "society": "Green Valley Apartments",
  "city": "Mumbai",
  "state": "Maharashtra",
  "pincode": "400001",
  "dateOfBirth": "1990-01-15",
  "gender": "Male",
  "occupation": "Software Engineer"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Address details saved successfully",
  "registrationId": "REG-1702831234567-ABC123XYZ"
}
```

---

## 5. Upload Document

**Endpoint:** `POST /registration/upload-document`

**Request Type:** `multipart/form-data`

**Form Data:**
```
file: File (required)
documentType: string (required) - "Aadhar Card", "Address Proof", "Photo"
registrationId: string (required)
```

**Request Example:**
```javascript
const formData = new FormData();
formData.append('file', fileObject);
formData.append('documentType', 'Aadhar Card');
formData.append('registrationId', 'REG-1702831234567-ABC123XYZ');

fetch('/api/registration/upload-document', {
  method: 'POST',
  body: formData
})
```

**Response:**
```json
{
  "success": true,
  "message": "Aadhar Card uploaded successfully",
  "document": {
    "id": "DOC-123456",
    "documentType": "Aadhar Card",
    "fileName": "aadhar_card.jpg",
    "fileSize": 245678,
    "filePath": "documents/registrations/REG-1702831234567-ABC123XYZ/aadhar_card.jpg",
    "uploadDate": "2024-12-16T10:30:00Z",
    "verificationStatus": "pending"
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "File size exceeds maximum limit of 5MB",
  "errorCode": "FILE_TOO_LARGE"
}
```

**File Validation:**
- Max size: 5MB
- Allowed types: .jpg, .jpeg, .png, .pdf
- Allowed MIME types: image/jpeg, image/jpg, image/png, application/pdf

---

## 6. Verify Documents (AI Verification)

**Endpoint:** `POST /registration/verify-documents`

**Request Body:**
```json
{
  "registrationId": "REG-1702831234567-ABC123XYZ"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Document verification completed",
  "results": [
    {
      "documentId": "DOC-123456",
      "documentType": "Aadhar Card",
      "success": true,
      "confidence": 95.8,
      "verificationStatus": "verified",
      "message": "Aadhar Card verified successfully",
      "extractedData": {
        "name": "John Doe",
        "idNumber": "XXXX-XXXX-1234",
        "dob": "1990-01-15",
        "address": "A-101, Tower A"
      },
      "verifiedAt": "2024-12-16T10:35:00Z"
    },
    {
      "documentId": "DOC-123457",
      "documentType": "Address Proof",
      "success": true,
      "confidence": 92.3,
      "verificationStatus": "verified",
      "message": "Address Proof verified successfully",
      "extractedData": {
        "address": "A-101, Tower A, Green Valley Apartments, Mumbai",
        "pincode": "400001",
        "state": "Maharashtra"
      },
      "verifiedAt": "2024-12-16T10:35:00Z"
    },
    {
      "documentId": "DOC-123458",
      "documentType": "Photo",
      "success": true,
      "confidence": 97.1,
      "verificationStatus": "verified",
      "message": "Photo verified successfully",
      "extractedData": {
        "faceDetected": true,
        "quality": "Good",
        "matchWithId": true,
        "livenessCheck": true
      },
      "verifiedAt": "2024-12-16T10:35:00Z"
    }
  ],
  "allVerified": true,
  "totalDocuments": 3,
  "verifiedCount": 3,
  "rejectedCount": 0
}
```

**Partial Failure Response:**
```json
{
  "success": false,
  "message": "Some documents failed verification",
  "results": [
    {
      "documentId": "DOC-123456",
      "documentType": "Aadhar Card",
      "success": false,
      "confidence": 45.2,
      "verificationStatus": "rejected",
      "message": "Document image quality is too low. Please upload a clearer image.",
      "errorCode": "LOW_QUALITY",
      "suggestions": [
        "Ensure good lighting",
        "Hold camera steady",
        "Capture entire document in frame",
        "Avoid glare and shadows"
      ]
    }
  ],
  "allVerified": false,
  "totalDocuments": 3,
  "verifiedCount": 2,
  "rejectedCount": 1
}
```

**AI Verification Checks:**
1. **Document Authenticity:** Detect tampering, forgery
2. **OCR & Data Extraction:** Extract text and structured data
3. **Quality Check:** Image clarity, lighting, orientation
4. **Face Matching:** Match photo with ID document
5. **Liveness Detection:** Ensure photo is not a screenshot/printout

---

## 7. Final Submission

**Endpoint:** `POST /registration/submit`

**Request Body:**
```json
{
  "registrationId": "REG-1702831234567-ABC123XYZ",
  "termsAccepted": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Registration completed successfully! Your account is under review.",
  "registrationId": "REG-1702831234567-ABC123XYZ",
  "status": "pending_approval",
  "estimatedApprovalTime": "24-48 hours",
  "nextSteps": [
    "Check your email for confirmation",
    "Wait for admin approval",
    "You'll receive notification once approved",
    "Login credentials will be sent to your registered email"
  ],
  "contactSupport": {
    "email": "support@society.com",
    "phone": "1800-123-4567"
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Cannot submit registration",
  "errors": [
    {
      "code": "DOCUMENTS_NOT_VERIFIED",
      "message": "All documents must be verified before submission"
    }
  ]
}
```

---

## 8. Get Registration Status

**Endpoint:** `GET /registration/:registrationId`

**Request Example:**
```http
GET /registration/REG-1702831234567-ABC123XYZ
```

**Response:**
```json
{
  "success": true,
  "registration": {
    "registrationId": "REG-1702831234567-ABC123XYZ",
    "status": "pending_approval",
    "statusMessage": "Your registration is under review",
    "currentStep": 5,
    "completedSteps": 5,
    "personalInfo": {
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "phone": "9876543210"
    },
    "addressInfo": {
      "flatNumber": "A-101",
      "tower": "Tower A",
      "society": "Green Valley Apartments",
      "city": "Mumbai",
      "state": "Maharashtra",
      "pincode": "400001"
    },
    "documents": [
      {
        "documentType": "Aadhar Card",
        "verificationStatus": "verified",
        "uploadedAt": "2024-12-16T10:30:00Z",
        "verifiedAt": "2024-12-16T10:35:00Z"
      },
      {
        "documentType": "Address Proof",
        "verificationStatus": "verified",
        "uploadedAt": "2024-12-16T10:31:00Z",
        "verifiedAt": "2024-12-16T10:35:00Z"
      },
      {
        "documentType": "Photo",
        "verificationStatus": "verified",
        "uploadedAt": "2024-12-16T10:32:00Z",
        "verifiedAt": "2024-12-16T10:35:00Z"
      }
    ],
    "submittedAt": "2024-12-16T10:40:00Z",
    "createdAt": "2024-12-16T10:25:00Z",
    "updatedAt": "2024-12-16T10:40:00Z"
  }
}
```

---

## 9. Get Dropdown Data

### Get Societies List
**Endpoint:** `GET /registration/societies`

**Response:**
```json
{
  "success": true,
  "societies": [
    "Green Valley Apartments",
    "Sunshine Residency",
    "Royal Gardens",
    "Palm Heights"
  ]
}
```

### Get Cities List
**Endpoint:** `GET /registration/cities`

**Response:**
```json
{
  "success": true,
  "cities": [
    "Mumbai",
    "Delhi",
    "Bangalore",
    "Hyderabad"
  ]
}
```

### Get States List
**Endpoint:** `GET /registration/states`

**Response:**
```json
{
  "success": true,
  "states": [
    "Maharashtra",
    "Delhi",
    "Karnataka",
    "Telangana"
  ]
}
```

---

## Error Codes

| Code | Description |
|------|-------------|
| `EMAIL_EXISTS` | Email already registered |
| `PHONE_EXISTS` | Phone number already registered |
| `INVALID_REGISTRATION_ID` | Registration ID not found |
| `FILE_TOO_LARGE` | File exceeds 5MB limit |
| `INVALID_FILE_TYPE` | File type not allowed |
| `DOCUMENTS_NOT_VERIFIED` | Documents not verified |
| `VERIFICATION_FAILED` | AI verification failed |
| `LOW_QUALITY` | Image quality too low |
| `FACE_NOT_DETECTED` | Face not detected in photo |
| `FACE_MISMATCH` | Photo doesn't match ID |
| `TAMPERING_DETECTED` | Document appears tampered |
| `TERMS_NOT_ACCEPTED` | Terms and conditions not accepted |

---

## Status Values

**Registration Status:**
- `incomplete` - Not all steps completed
- `pending_verification` - Documents uploaded, awaiting verification
- `pending_approval` - All verified, awaiting admin approval
- `approved` - Registration approved
- `rejected` - Registration rejected
- `on_hold` - Additional information required

**Document Verification Status:**
- `pending` - Uploaded but not verified
- `verifying` - Currently being verified
- `verified` - Successfully verified
- `rejected` - Verification failed

---

## Rate Limiting

- Email/Phone check: 10 requests per minute per IP
- Document upload: 5 uploads per minute per registration
- Document verification: 3 requests per hour per registration
- Other endpoints: 100 requests per minute per IP

---

## Webhook Notifications (Optional)

Configure webhook URL in admin panel to receive real-time updates:

**Webhook Events:**
- `registration.created`
- `registration.step_completed`
- `document.uploaded`
- `document.verified`
- `document.rejected`
- `registration.submitted`
- `registration.approved`
- `registration.rejected`

**Webhook Payload Example:**
```json
{
  "event": "registration.approved",
  "timestamp": "2024-12-16T12:00:00Z",
  "data": {
    "registrationId": "REG-1702831234567-ABC123XYZ",
    "email": "john.doe@example.com",
    "status": "approved",
    "approvedBy": "ADMIN-123",
    "approvedAt": "2024-12-16T12:00:00Z"
  }
}
```

---

## Testing

### Test Environment
```
Base URL: https://api-test.society.com/api
```

### Test Credentials
```
Email: test@example.com (will always show as available)
Phone: 9000000001-9000000999 (will always show as available)
```

### Test Documents
Test images are available at:
```
https://api-test.society.com/test-documents/sample-aadhar.jpg
https://api-test.society.com/test-documents/sample-address-proof.pdf
https://api-test.society.com/test-documents/sample-photo.jpg
```

---

## Support

**Technical Support:**
- Email: dev-support@society.com
- Slack: #api-support
- Documentation: https://docs.society.com/api

**Issue Reporting:**
- Create ticket at: https://support.society.com
- Include: Registration ID, Error code, Timestamp, Request/Response
