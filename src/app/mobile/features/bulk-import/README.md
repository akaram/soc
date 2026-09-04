# Bulk Resident Import Module

## 📊 Overview
Complete bulk import system for importing residents from Excel/CSV files with validation, progress tracking, and error handling.

## ✅ What Has Been Created

### 1. **Complete Type Definitions** (`models/bulk-import.model.ts`)

#### Core Interfaces:
- ✅ **BulkImportSession** - Import session tracking
- ✅ **ResidentImportData** - Individual resident record with validation
- ✅ **ImportValidationResult** - Validation results
- ✅ **ImportProgress** - Real-time progress tracking
- ✅ **ImportSummary** - Final import summary
- ✅ **ImportError** & **ImportWarning** - Error/warning tracking
- ✅ **ExcelTemplateColumn** - Template structure definition

#### Enums:
- ✅ **ImportStatus**: Uploaded, Validating, Validation Failed, Ready to Import, Importing, Completed, Partially Completed, Failed
- ✅ **ResidentType**: Owner, Tenant, Family Member
- ✅ **VehicleType**: Two Wheeler, Four Wheeler, Bicycle

#### Template Columns (26 fields):
```
Basic Info:
- Flat Number, Block, Floor
- Owner Name, Email, Phone Number, Alternate Phone
- Resident Type, Occupancy Date

Tenant Info:
- Lease Start Date, Lease End Date

Emergency:
- Emergency Contact Name, Emergency Contact Phone

Family Members (up to 2):
- Family Member 1: Name, Relationship, Age
- Family Member 2: Name, Relationship, Age

Vehicles (up to 2):
- Vehicle 1: Type, Registration, Brand, Model
- Vehicle 2: Type, Registration
```

### 2. **Fully Functional Service** (`services/bulk-import.service.ts`)

#### Dummy Data Included:
- ✅ **7 Sample Records**: Mix of valid (5) and invalid (2) records
  - Valid records with complete family and vehicle info
  - Invalid records showing email/phone validation errors
  - Records with warnings (missing optional fields)
- ✅ **1 Pre-loaded Session**: Ready for testing

#### Service Methods:

**File Upload:**
```typescript
uploadFile(file: File, societyId: string): Observable<FileUploadResponse>
// Simulates file upload with 1.5s delay
```

**Validation:**
```typescript
validateImportData(sessionId: string): Observable<ImportValidationResult>
// Returns validation results with errors and warnings
// Delay: 2s

validateField(fieldName: string, value: any): string[]
// Validates individual fields
```

**Import Process:**
```typescript
startImport(sessionId: string): Observable<ImportProgress>
// Progressive import with real-time updates
// 0.5s per record

getImportSummary(sessionId: string): Observable<ImportSummary>
// Final summary after import
```

**Template Downloads:**
```typescript
downloadTemplate(): Observable<Blob>
// Empty template CSV

downloadSampleData(): Observable<Blob>
// Sample data CSV with 3 example records
```

**Session Management:**
```typescript
getSession(sessionId: string): Observable<BulkImportSession>
getAllSessions(societyId: string): Observable<BulkImportSession[]>
retryFailedRecords(sessionId: string): Observable<ImportProgress>
```

**Validation Rules:**
```typescript
getValidationRules(): Observable<any>
// Returns validation rules for all fields
```

### 3. **Complete UI Component** (`bulk-import.component.ts`)

#### 4-Step Wizard:

**Step 1: Upload File**
- Drag & drop file upload
- Click to browse
- File size validation (max 10 MB)
- Supported formats: .xlsx, .xls, .csv
- Download empty template
- Download sample data
- View import history

**Step 2: Validation Results**
- Success/Failure summary card
- Stats grid: Total, Valid, Invalid, Warnings
- Detailed error list (with row numbers)
- Detailed warning list
- Action buttons: Cancel or Import valid records

**Step 3: Import Progress**
- Real-time progress bar
- Records processed counter
- Success/Failed counters
- Estimated time remaining
- Current record being processed

**Step 4: Import Complete**
- Success confirmation
- Final statistics
- Duration and completion time
- Action buttons: View residents or Start new import
- Download import report (CSV)

#### Additional Features:
- Import history viewer
- Session details
- Responsive design
- Loading indicators
- Empty states
- Error handling

**Route:** `/mobile/bulk-import`

## 📋 Complete Data Flow

### Flow 1: Upload and Import Process

```
STEP 1: UPLOAD FILE
┌────────────────────────────────────────┐
│ User Interface                         │
│ ┌────────────────────────────────────┐ │
│ │ 📋 Before You Start                │ │
│ │ • Download template                │ │
│ │ • Ensure required fields filled    │ │
│ │ • Use proper date format           │ │
│ │ • Phone must include +91           │ │
│ └────────────────────────────────────┘ │
│                                        │
│ ┌────────────────────────────────────┐ │
│ │ Download Template                  │ │
│ │ [Empty Template] [Sample Data]     │ │
│ └────────────────────────────────────┘ │
│                                        │
│ ┌────────────────────────────────────┐ │
│ │  📤 Drag & Drop File Here          │ │
│ │     or click to browse             │ │
│ │                                    │ │
│ │  Supported: Excel & CSV            │ │
│ └────────────────────────────────────┘ │
│                                        │
│ Selected: residents_sample.xlsx (45 KB)│
│                                        │
│         [Upload & Validate]            │
└────────────────────────────────────────┘
                  │
                  ▼
┌────────────────────────────────────────┐
│ Backend Processing                     │
│ 1. Upload file to server              │
│ 2. Parse Excel/CSV                     │
│ 3. Extract records                     │
│ 4. Create import session               │
│    Session ID: SESSION001              │
└────────────────────────────────────────┘
                  │
                  ▼
STEP 2: VALIDATION
┌────────────────────────────────────────┐
│ Validation Process                     │
│                                        │
│ For Each Record:                       │
│ ├─ Row 2: A-101, Rajesh Sharma        │
│ │  ├─ Check flat number format        │
│ │  ├─ Validate email                  │
│ │  ├─ Validate phone (+91...)         │
│ │  ├─ Check resident type             │
│ │  └─ Result: ✓ VALID                │
│ │                                      │
│ ├─ Row 3: A-102, Priya Mehta          │
│ │  └─ Result: ✓ VALID                │
│ │     Warning: No alternate phone     │
│ │                                      │
│ ├─ Row 4: B-201, Amit Desai           │
│ │  ├─ Email: amit.desai@invalid       │
│ │  │  └─ Error: Invalid email format  │
│ │  ├─ Phone: 7766554433               │
│ │  │  └─ Error: Must start with +91   │
│ │  └─ Result: ✗ INVALID              │
│ │                                      │
│ └─ Row 6: [Empty fields]              │
│     ├─ Flat number: empty              │
│     │  └─ Error: Required field       │
│     ├─ Owner name: empty               │
│     │  └─ Error: Required field       │
│     └─ Result: ✗ INVALID              │
└────────────────────────────────────────┘
                  │
                  ▼
┌────────────────────────────────────────┐
│ Validation Results Screen              │
│ ┌────────────────────────────────────┐ │
│ │  ✓ Validation Successful            │ │
│ │  (or ✗ Validation Failed)           │ │
│ └────────────────────────────────────┘ │
│                                        │
│ Statistics:                            │
│ ┌─────┬─────┬─────┬─────┐            │
│ │ 📋  │ ✓   │ ✗   │ ⚠   │            │
│ │  7  │  5  │  2  │  1  │            │
│ │Total│Valid│Invld│Warn │            │
│ └─────┴─────┴─────┴─────┘            │
│                                        │
│ ✗ Validation Errors (2):              │
│ ┌────────────────────────────────────┐ │
│ │ Row 4: Invalid email format        │ │
│ │ Row 4: Phone must start with +91   │ │
│ │ Row 6: Flat number is required     │ │
│ │ Row 6: Owner name is required      │ │
│ └────────────────────────────────────┘ │
│                                        │
│ [Cancel] [Import 5 Valid Records]     │
└────────────────────────────────────────┘
                  │
                  ▼
STEP 3: IMPORT PROGRESS
┌────────────────────────────────────────┐
│ Import Progress Screen                 │
│                                        │
│ Importing Residents...                 │
│ Please wait, this may take a few mins  │
│                                        │
│ ▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░  60%              │
│ 3 / 5 records                          │
│                                        │
│ ┌──────┬──────┬──────┐               │
│ │  ✓   │  ✗   │  ⏱   │               │
│ │  3   │  0   │ 10s  │               │
│ │Success│Failed│ ETA  │               │
│ └──────┴──────┴──────┘               │
│                                        │
│ Processing record 3 of 5...            │
└────────────────────────────────────────┘
                  │
                  ▼
STEP 4: IMPORT COMPLETE
┌────────────────────────────────────────┐
│ Success Screen                         │
│                                        │
│     ✓                                  │
│ Import Completed!                      │
│ Your bulk import has been processed    │
│                                        │
│ ┌──────┬──────┬──────┐               │
│ │   7  │   5  │   2  │               │
│ │Total │Success│Failed│               │
│ └──────┴──────┴──────┘               │
│                                        │
│ File Name: residents_sample.xlsx       │
│ Duration: 2 min 30 sec                │
│ Completed: 18 Dec 2024, 10:35 AM      │
│                                        │
│ [View Imported Residents]              │
│ [Start New Import]                     │
│                                        │
│ Download Import Report                 │
└────────────────────────────────────────┘
```

### Flow 2: Error Handling

```
Invalid Record Processing:

Row 4: Amit Desai
├─ Email: "amit.desai@invalid"
│  └─ Validation: Invalid email format
│     └─ Error added to session
│     └─ Record marked as invalid
│     └─ Record NOT imported
│
├─ Phone: "7766554433"
│  └─ Validation: Missing country code
│     └─ Error: "Phone must start with +91"
│     └─ Record marked as invalid
│
└─ Result:
    ├─ Row Status: FAILED
    ├─ Error Message: "Invalid email format, Phone must start with +91"
    └─ Included in failed records report
```

### Flow 3: Warning Handling

```
Record with Warning:

Row 3: Priya Mehta
├─ All required fields: ✓ VALID
│  ├─ Flat Number: "A-102"  ✓
│  ├─ Owner Name: "Priya Mehta"  ✓
│  ├─ Email: "priya@example.com"  ✓
│  └─ Phone: "+91 9988776655"  ✓
│
├─ Optional field missing:
│  └─ Alternate Phone: [empty]
│     └─ Warning: "Alternate phone not provided"
│     └─ Does NOT prevent import
│
└─ Result:
    ├─ Row Status: SUCCESS
    ├─ Warning logged
    └─ Record imported successfully
```

## 🗂️ File Structure

```
src/app/mobile/features/bulk-import/
├── models/
│   └── bulk-import.model.ts          # All TypeScript interfaces
├── services/
│   └── bulk-import.service.ts        # Business logic + dummy data
└── bulk-import.component.ts           # ✅ Complete UI (COMPLETED)
```

## 📝 Excel/CSV Template Format

### Required Columns:
```csv
Flat Number,Block,Floor,Owner Name,Email,Phone Number,Alternate Phone,Resident Type,Occupancy Date,Lease Start Date,Lease End Date,Emergency Contact Name,Emergency Contact Phone,Family Member 1 Name,Family Member 1 Relationship,Family Member 1 Age,Family Member 2 Name,Family Member 2 Relationship,Family Member 2 Age,Vehicle 1 Type,Vehicle 1 Registration,Vehicle 1 Brand,Vehicle 1 Model,Vehicle 2 Type,Vehicle 2 Registration
```

### Sample Data:
```csv
A-101,A,1,Rajesh Sharma,rajesh@example.com,+91 9876543210,+91 9876543211,Owner,01/01/2024,,,Amit Sharma,+91 9876543213,Priya Sharma,Spouse,35,Rohan Sharma,Son,10,Four Wheeler,MH12AB1234,Honda,City,Two Wheeler,MH12CD5678
A-102,A,1,Priya Mehta,priya@example.com,+91 9988776655,,Owner,01/02/2024,,,Neha Mehta,+91 9988776656,Rohit Mehta,Spouse,38,Aarav Mehta,Son,12,Four Wheeler,MH12EF9012,Maruti,Swift,,
B-201,B,2,Amit Desai,amit@example.com,+91 7766554433,,Tenant,,01/03/2024,28/02/2025,Sneha Desai,+91 7766554434,Sneha Desai,Spouse,32,,,,,,,,
```

## ✅ Validation Rules

### 1. **Flat Number**
- **Required:** Yes
- **Format:** `[A-Z]-[0-9]{3}` (e.g., A-101)
- **Examples:** A-101, B-202, C-305
- **Error:** "Invalid flat number format. Use: A-101"

### 2. **Owner Name**
- **Required:** Yes
- **Min Length:** 2 characters
- **Max Length:** 100 characters
- **Error:** "Owner name is required"

### 3. **Email**
- **Required:** Yes
- **Format:** Standard email format
- **Pattern:** `^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`
- **Examples:** rajesh@example.com, user.name@domain.co.in
- **Error:** "Invalid email format"

### 4. **Phone Number**
- **Required:** Yes
- **Format:** `+91` followed by 10 digits
- **Pattern:** `^\+91[0-9]{10}$`
- **Examples:** +91 9876543210, +919876543210
- **Error:** "Phone must start with +91 followed by 10 digits"

### 5. **Resident Type**
- **Required:** Yes
- **Allowed Values:** "Owner", "Tenant"
- **Case Sensitive:** No
- **Error:** "Resident type must be Owner or Tenant"

### 6. **Dates**
- **Format:** DD/MM/YYYY
- **Examples:** 01/01/2024, 15/03/2024
- **Occupancy Date:** Optional
- **Lease Dates:** Required only for Tenants

### 7. **Vehicle Registration**
- **Format:** `[A-Z]{2}[0-9]{2}[A-Z]{2}[0-9]{4}`
- **Examples:** MH12AB1234, DL01CD5678
- **Error:** "Invalid vehicle registration format"

## 🧪 Testing with Dummy Data

### Available Test Data:

**Record 1: Complete Valid Record**
```
Flat: A-101
Owner: Rajesh Sharma
Email: rajesh.sharma@example.com
Phone: +91 9876543210
Type: Owner
Family: 2 members
Vehicles: 2 (Car + Bike)
Status: ✓ VALID
```

**Record 2: Valid with Warning**
```
Flat: A-102
Owner: Priya Mehta
Email: priya.mehta@example.com
Phone: +91 9988776655
Type: Owner
Family: 3 members
Vehicles: 1 (Car)
Warning: No alternate phone
Status: ✓ VALID (with warning)
```

**Record 3: Invalid Email & Phone**
```
Flat: B-201
Owner: Amit Desai
Email: amit.desai@invalid  ✗
Phone: 7766554433  ✗ (missing +91)
Type: Tenant
Errors:
- Invalid email format
- Phone must start with +91
Status: ✗ INVALID
```

**Record 4: Valid Tenant**
```
Flat: B-202
Owner: Neha Gupta
Email: neha.gupta@example.com
Phone: +91 8899001122
Type: Tenant
Lease: 01/04/2024 to 31/03/2025
Vehicles: 1 (Bike)
Status: ✓ VALID
```

**Record 5: Missing Required Fields**
```
Flat: [empty]  ✗
Owner: [empty]  ✗
Email: test@example.com
Phone: +91 7755443322
Errors:
- Flat number is required
- Owner name is required
Status: ✗ INVALID
```

**Record 6: Complete Family**
```
Flat: C-301
Owner: Suresh Patel
Email: suresh.patel@example.com
Phone: +91 7755443322
Type: Owner
Family: 4 members (Spouse + 3 children)
Vehicles: 2 (Car + Bike)
Status: ✓ VALID
```

### Test Scenarios:

**Scenario 1: All Valid Records**
- Upload sample file with 5 valid records
- Validation: 5 valid, 0 invalid
- Import: All 5 imported successfully
- Duration: ~2.5 seconds

**Scenario 2: Mixed Valid/Invalid**
- Upload file with 7 records (5 valid, 2 invalid)
- Validation: Shows 2 errors
- Import: Only 5 valid records imported
- Failed records: Available in report

**Scenario 3: All Invalid Records**
- Upload file with only invalid data
- Validation: Shows all errors
- Import button: Disabled
- Action: Fix errors and re-upload

**Scenario 4: Import Progress**
- Start import with 5 records
- Watch real-time progress: 0% → 100%
- See ETA countdown
- Completion in ~2.5 seconds (0.5s per record)

## 🔄 API Integration Points

### Replace Dummy Data:

**1. File Upload Endpoint:**
```typescript
// BEFORE (Dummy):
uploadFile(file: File, societyId: string): Observable<FileUploadResponse> {
  return of({
    sessionId: `SESSION${pad}`,
    fileName: file.name,
    fileSize: file.size,
    totalRecords: 7,
    message: 'File uploaded successfully'
  }).pipe(delay(1500));
}

// AFTER (Real API):
uploadFile(file: File, societyId: string): Observable<FileUploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('societyId', societyId);
  
  return this.http.post<FileUploadResponse>(
    `${this.apiUrl}/bulk-import/upload`,
    formData
  );
}
```

**2. API Endpoints Needed:**
```typescript
// File Upload
POST   /api/bulk-import/upload
Request: FormData with file
Response: { sessionId, fileName, fileSize, totalRecords, message }

// Validation
POST   /api/bulk-import/validate/:sessionId
Response: ImportValidationResult

// Start Import
POST   /api/bulk-import/import/:sessionId
Response: Stream of ImportProgress events (WebSocket/SSE)

// Get Summary
GET    /api/bulk-import/summary/:sessionId
Response: ImportSummary

// Session Management
GET    /api/bulk-import/sessions/:societyId
GET    /api/bulk-import/session/:sessionId

// Template Downloads
GET    /api/bulk-import/template
Response: Excel/CSV file blob

GET    /api/bulk-import/sample-data
Response: Excel/CSV file with sample data

// Retry Failed
POST   /api/bulk-import/retry/:sessionId
Response: ImportProgress
```

**3. WebSocket for Real-time Progress:**
```typescript
// For production, use WebSocket or Server-Sent Events
import { webSocket } from 'rxjs/webSocket';

startImport(sessionId: string): Observable<ImportProgress> {
  const ws = webSocket(`${this.wsUrl}/import/${sessionId}`);
  return ws.asObservable();
}
```

## 🎨 UI Design System

### Colors:
- **Primary:** #3b82f6 (Blue) - Import theme
- **Success:** #10b981 (Green) - Valid records
- **Error:** #ef4444 (Red) - Invalid records
- **Warning:** #f59e0b (Amber) - Warnings
- **Info:** #6366f1 (Indigo)

### Step Indicator:
- Active step: Blue highlight
- Completed step: Green checkmark
- Pending step: Gray

### Progress Bar:
- Animated gradient: Blue to darker blue
- Smooth transitions
- Percentage display

### Cards:
- Rounded corners: 12px
- Shadow: Subtle elevation
- Hover effects: Lift on hover

## 📊 Features Summary

### Core Features:
- ✅ Excel/CSV file upload
- ✅ Drag & drop support
- ✅ File validation (size, format)
- ✅ Template download
- ✅ Sample data download
- ✅ Real-time validation
- ✅ Error highlighting (row-level)
- ✅ Warning notifications
- ✅ Progressive import
- ✅ Progress tracking
- ✅ Import summary
- ✅ Report generation
- ✅ Import history
- ✅ Session management

### Validation Features:
- Email format validation
- Phone number format (+91)
- Flat number pattern
- Resident type validation
- Date format validation
- Vehicle registration format
- Required field checks
- Data type validation

### User Experience:
- 4-step wizard
- Clear instructions
- Visual feedback
- Loading indicators
- Empty states
- Success confirmations
- Error messages
- Responsive design

## 🚀 Quick Start

### 1. Access Bulk Import:
```
http://localhost:4200/mobile/bulk-import
```

### 2. Download Template:
Click "Download Empty Template" button

### 3. Fill Data:
Open template and add resident data

### 4. Upload:
Drag & drop or click to browse

### 5. Validate:
System automatically validates

### 6. Import:
Click "Import Valid Records"

### 7. View Summary:
See import results

## 💡 Best Practices

### For Users:
1. **Download Template First**: Always use the provided template
2. **Check Sample Data**: Review sample data for correct format
3. **Required Fields**: Fill all fields marked with *
4. **Phone Format**: Always include +91
5. **Email Validation**: Use valid email addresses
6. **Date Format**: Use DD/MM/YYYY
7. **Review Errors**: Fix all errors before import
8. **Backup Data**: Keep a copy of your Excel file

### For Developers:
1. **Validate Early**: Validate on upload, not on import
2. **Clear Errors**: Show specific row and field errors
3. **Progress Updates**: Update UI every 0.5s
4. **Error Recovery**: Allow retry for failed records
5. **Session Management**: Clean up old sessions
6. **File Size Limits**: Enforce reasonable limits (10 MB)
7. **Timeout Handling**: Handle long-running imports
8. **Report Generation**: Provide detailed import reports

## 🔐 Security Considerations

- File type validation
- File size limits
- Virus scanning (production)
- Data sanitization
- SQL injection prevention
- XSS protection
- Role-based access (admin only)
- Session expiration
- Secure file storage
- Audit logging

## 📈 Performance Tips

1. **Batch Processing**: Process records in batches of 100
2. **Async Processing**: Use background jobs for large files
3. **Progress Updates**: Update UI efficiently
4. **Memory Management**: Stream large files
5. **Database Optimization**: Use bulk inserts
6. **Caching**: Cache validation rules
7. **Error Handling**: Fail gracefully

## 🐛 Common Issues & Solutions

**Issue 1: File Upload Fails**
- Check file size (max 10 MB)
- Verify file format (.xlsx, .xls, .csv)
- Ensure stable internet connection

**Issue 2: Validation Errors**
- Review error messages carefully
- Check phone format (+91 required)
- Verify email format
- Ensure flat number format (A-101)

**Issue 3: Import Stuck**
- Check browser console for errors
- Refresh page and retry
- Reduce file size
- Contact admin if persists

## 📞 Support

For integration help:
1. Review model definitions in `bulk-import.model.ts`
2. Check service methods in `bulk-import.service.ts`
3. Reference component for UI patterns
4. Test with provided dummy data
5. Follow validation rules strictly

---

**Module Status:** ✅ Complete Implementation
**Ready for:** Production Use with API Integration
**Admin Only:** Yes (role-based access required)
