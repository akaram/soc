# Domestic Staff Management Module

## Overview
Complete domestic staff/daily help management system with 6-digit passcode-based access control for society management.

## Features

### 1. **Staff Management**
- Add/Edit/Delete domestic staff members
- Multiple staff roles: Maid, Cook, Driver, Nanny, Gardener, Caretaker, Tutor
- Photo upload and profile management
- Document verification (Aadhar, PAN, Driving License, etc.)
- Emergency contact information
- Work schedule management (full-time/part-time, working days, timings)

### 2. **6-Digit Passcode System**
- Unique 6-digit passcode generated for each staff member
- Used for gate entry verification
- Passcode regeneration capability
- Passcode displayed prominently in staff profile

### 3. **Access Control**
- Guard-side passcode verification interface
- Real-time access grant/denial
- Automatic access log creation
- Visual and audio feedback for verification

### 4. **Access Logs**
- Comprehensive entry/exit tracking
- Check-in/check-out timestamps
- Gate information (entry/exit gates)
- Guard verification details
- Duration calculation
- Photo capture at entry

### 5. **Attendance Tracking**
- Daily attendance marking
- Work hours calculation
- Monthly attendance reports
- Status tracking (Present, Absent, Half Day, Leave)

### 6. **Rating System**
- Staff performance ratings (1-5 stars)
- Comments and feedback
- Average rating display
- Historical rating records

### 7. **Status Management**
- Active/Inactive/Blocked status
- Pending approval workflow
- Block/Unblock functionality
- Status-based access control

## File Structure

```
src/app/mobile/features/domestic-staff/
├── models/
│   └── domestic-staff.model.ts          # TypeScript interfaces and enums
├── services/
│   └── domestic-staff.service.ts        # Service with dummy data and API methods
├── domestic-staff-list.component.ts     # List view with search and filters
├── add-domestic-staff.component.ts      # Add new staff form
├── domestic-staff-detail.component.ts   # Staff profile and details
├── staff-access-log.component.ts        # Access history viewer
└── guard-passcode-verify.component.ts   # Guard verification interface
```

## Complete User Flows

### Flow 1: Owner/Resident - Add Domestic Staff

1. **Navigate to Domestic Staff**
   - From dashboard → Domestic Staff menu
   - Route: `/mobile/domestic-staff`

2. **Click Add Staff**
   - View list of existing staff
   - Click "+" button in header

3. **Fill Staff Details Form**
   ```typescript
   {
     // Basic Information
     name: "Lakshmi Devi",
     role: StaffRole.MAID,
     phoneNumber: "+91 9876543210",
     alternatePhone: "+91 8765432109",
     address: "Village Rampur, Pune",
     
     // Identity Documents
     documentType: DocumentType.AADHAR,
     documentNumber: "1234 5678 9012",
     
     // Emergency Contact
     emergencyContact: {
       name: "Ramesh Kumar",
       relationship: "Husband",
       phoneNumber: "+91 9876543211"
     },
     
     // Work Schedule
     workSchedule: {
       isFullTime: false,
       workingDays: [Monday, Tuesday, Wednesday, Thursday, Friday, Saturday],
       startTime: "08:00",
       endTime: "12:00"
     }
   }
   ```

4. **Auto-Generated Passcode**
   - System generates 6-digit passcode (e.g., "123456")
   - Displayed in purple highlighted box
   - Can regenerate if needed

5. **Submit**
   - Staff member added successfully
   - Show confirmation with passcode
   - Share passcode with staff member

### Flow 2: Guard - Verify Staff Entry

1. **Access Verification Interface**
   - Guard dashboard → Verify Passcode
   - Route: `/mobile/domestic-staff/verify-passcode`

2. **Staff Arrives at Gate**
   - Guard asks for 6-digit passcode
   - Staff provides: "123456"

3. **Enter Passcode**
   - Two input methods:
     - Type directly in 6 input boxes
     - Use number pad on screen
   
4. **Automatic Verification**
   - System verifies against database
   - Checks staff status (Active/Blocked)
   - Creates access log entry

5. **Result Display**
   
   **Success (Access Granted):**
   ```
   ✓ Access Granted
   Welcome Lakshmi Devi!
   
   Staff Details:
   - Name: Lakshmi Devi
   - Flat: A-101
   - Role: Maid
   - Phone: +91 9876543210
   
   Entry logged: Main Gate
   Time: 18 Dec 2024, 08:05 AM
   ```
   
   **Failure (Access Denied):**
   ```
   ✗ Access Denied
   Invalid passcode or staff is blocked
   ```

6. **Access Log Created**
   ```typescript
   {
     staffId: "DS001",
     staffName: "Lakshmi Devi",
     flatNumber: "A-101",
     checkInTime: "2024-12-18T08:05:00",
     entryGate: "Main Gate",
     verifiedBy: "Guard-Ramu",
     photoCapture: "https://..."
   }
   ```

### Flow 3: View Staff Details and History

1. **Navigate to Staff List**
   - Route: `/mobile/domestic-staff`
   - See all staff with search/filter

2. **Click on Staff Card**
   - View complete profile
   - Route: `/mobile/domestic-staff/detail/DS001`

3. **View Access Log**
   - Click "Access Log" button
   - Route: `/mobile/domestic-staff/access-log/DS001`
   - See all entry/exit records with:
     - Check-in/check-out times
     - Duration
     - Gate information
     - Guard who verified

4. **View Attendance**
   - Click "View Attendance" button
   - See monthly attendance
   - Work hours calculation

### Flow 4: Regenerate Passcode

1. **From Staff Detail Page**
   - Scroll to passcode section
   - Large passcode displayed: "123456"

2. **Click Regenerate**
   - Confirmation dialog appears
   - Confirm regeneration

3. **New Passcode Generated**
   - Old passcode: "123456"
   - New passcode: "789456"
   - Confirmation shown
   - Share new passcode with staff

4. **Old Passcode Invalidated**
   - Old passcode will no longer work
   - Access logs show last successful use

### Flow 5: Block/Unblock Staff

1. **From Staff Detail Page**
   - Scroll to "Danger Zone" section

2. **Block Staff**
   - Click "Block Staff Member"
   - Confirmation dialog
   - Staff status changed to "Blocked"

3. **Attempted Access with Blocked Status**
   - Guard enters passcode
   - System responds:
   ```
   ✗ Access Denied
   Staff status: Blocked
   Contact flat owner for access
   ```

4. **Unblock Staff**
   - Owner clicks "Unblock Staff Member"
   - Staff status changes to "Active"
   - Normal access restored

## API Integration Points

### Replace Dummy Data with Real APIs

**Current Implementation:** All data is stored in-memory with RxJS `of()` and `delay()` for simulation.

**To Integrate Real APIs:**

1. **Update Service Methods in `domestic-staff.service.ts`:**

```typescript
// BEFORE (Dummy):
getDomesticStaffByFlat(flatId: string): Observable<DomesticStaff[]> {
  return of(this.domesticStaffList.filter(staff => staff.flatId === flatId))
    .pipe(delay(500));
}

// AFTER (Real API):
getDomesticStaffByFlat(flatId: string): Observable<DomesticStaff[]> {
  return this.http.get<DomesticStaff[]>(`${this.apiUrl}/domestic-staff/flat/${flatId}`);
}
```

2. **Add HttpClient to Service:**

```typescript
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DomesticStaffService {
  private apiUrl = environment.apiUrl;
  
  constructor(private http: HttpClient) {}
  
  // Update all methods to use this.http instead of of()
}
```

3. **API Endpoints to Implement:**

```typescript
// Staff Management
GET    /api/domestic-staff/flat/:flatId          // Get all staff for flat
GET    /api/domestic-staff/:id                   // Get staff by ID
POST   /api/domestic-staff                       // Add new staff
PUT    /api/domestic-staff/:id                   // Update staff
DELETE /api/domestic-staff/:id                   // Delete staff

// Passcode Management
POST   /api/domestic-staff/:id/regenerate-passcode  // Regenerate passcode
POST   /api/domestic-staff/verify-passcode          // Verify passcode

// Access Logs
GET    /api/domestic-staff/:id/access-logs       // Get access logs
GET    /api/domestic-staff/society/:id/access-logs/today  // Today's logs
POST   /api/domestic-staff/access-log             // Create access log

// Attendance
GET    /api/domestic-staff/:id/attendance        // Get attendance
POST   /api/domestic-staff/attendance            // Mark attendance

// Ratings
GET    /api/domestic-staff/:id/ratings           // Get ratings
POST   /api/domestic-staff/rating                // Add rating
GET    /api/domestic-staff/:id/average-rating    // Get average rating

// Status Management
PUT    /api/domestic-staff/:id/block             // Block staff
PUT    /api/domestic-staff/:id/unblock           // Unblock staff
```

4. **Request/Response Examples:**

**Add Staff:**
```typescript
// Request
POST /api/domestic-staff
{
  "name": "Lakshmi Devi",
  "phoneNumber": "+91 9876543210",
  "role": "Maid",
  "flatId": "FLAT001",
  "flatNumber": "A-101",
  "societyId": "SOC001",
  "documentType": "Aadhar Card",
  "documentNumber": "1234 5678 9012",
  "workSchedule": {
    "isFullTime": false,
    "workingDays": ["Monday", "Tuesday", "Wednesday"],
    "startTime": "08:00",
    "endTime": "12:00"
  }
}

// Response
{
  "id": "DS001",
  "passcode": "123456",
  ...allOtherFields
}
```

**Verify Passcode:**
```typescript
// Request
POST /api/domestic-staff/verify-passcode
{
  "passcode": "123456",
  "entryGate": "Main Gate",
  "guardId": "GUARD001"
}

// Response (Success)
{
  "success": true,
  "message": "Welcome Lakshmi Devi! Access granted to A-101.",
  "staff": {
    "id": "DS001",
    "name": "Lakshmi Devi",
    "flatNumber": "A-101",
    "role": "Maid",
    "status": "Active"
  },
  "accessLog": {
    "id": "LOG001",
    "checkInTime": "2024-12-18T08:05:00Z",
    "entryGate": "Main Gate"
  }
}

// Response (Failure)
{
  "success": false,
  "message": "Invalid passcode. Please try again."
}
```

## Component Routes

| Route | Component | Purpose |
|-------|-----------|---------|
| `/mobile/domestic-staff` | DomesticStaffListComponent | View all staff with search/filter |
| `/mobile/domestic-staff/add` | AddDomesticStaffComponent | Add new staff member |
| `/mobile/domestic-staff/detail/:id` | DomesticStaffDetailComponent | View staff profile and details |
| `/mobile/domestic-staff/access-log/:id` | StaffAccessLogComponent | View access history |
| `/mobile/domestic-staff/verify-passcode` | GuardPasscodeVerifyComponent | Guard verification interface |

## Key Features in Components

### 1. DomesticStaffListComponent
- **Search:** Name, role, phone number
- **Filters:** By role (Maid, Cook, Driver, etc.)
- **Stats:** Active, Inactive, Total counts
- **Quick Actions:** 
  - View access log
  - View attendance
  - Block staff
  - Regenerate passcode

### 2. AddDomesticStaffComponent
- **Photo Upload:** Camera/gallery access
- **Form Validation:** Required fields marked
- **Working Days:** Multi-select with visual chips
- **Auto Passcode:** Generated and displayed
- **Emergency Contact:** Optional but recommended

### 3. DomesticStaffDetailComponent
- **Profile View:** Photo, role, status badges
- **Passcode Display:** Large, prominent display
- **Quick Info:** Phone, flat, documents
- **Work Schedule:** Visual day badges
- **Action Buttons:** Access log, attendance, ratings
- **Danger Zone:** Block/unblock, delete

### 4. GuardPasscodeVerifyComponent
- **6-Digit Input:** Auto-focus, auto-submit
- **Number Pad:** Alternative input method
- **Real-time Verification:** Instant feedback
- **Result Display:** Success/error with details
- **Access Log Creation:** Automatic on success

### 5. StaffAccessLogComponent
- **Stats Summary:** Total, this month, today
- **Detailed Records:** All entry/exit logs
- **Duration Calc:** Auto-calculated work hours
- **Gate Info:** Entry/exit gate names
- **Guard Verification:** Who verified entry

## Security Features

1. **Unique Passcodes:** Each staff gets unique 6-digit code
2. **Status Verification:** Blocked staff cannot access
3. **Access Logging:** All attempts logged
4. **Photo Capture:** Visual verification at gate
5. **Guard Authentication:** Only authorized guards can verify
6. **Passcode Regeneration:** Immediate invalidation of old code

## Mobile Responsive Design

- **Touch-optimized:** Large tap targets
- **Swipe Actions:** Quick access to common actions
- **Pull-to-refresh:** Update data easily
- **Offline Indication:** Show when offline
- **Loading States:** Smooth UX transitions

## Next Steps for Production

1. **Backend API Development:**
   - Implement all endpoints listed above
   - Add authentication and authorization
   - Implement rate limiting for passcode verification

2. **Photo Upload:**
   - Integrate with cloud storage (AWS S3, Cloudinary)
   - Add image compression
   - Implement camera capture

3. **Notifications:**
   - SMS notification with passcode to staff
   - Push notification to owner on staff entry
   - Alert on blocked staff access attempt

4. **Biometric Integration:**
   - Add fingerprint verification option
   - Face recognition at gate
   - Hybrid passcode + biometric

5. **Advanced Features:**
   - QR code generation for each staff
   - Geofencing for auto check-in/out
   - Multiple flat access for common staff
   - Visitor conversion to staff

6. **Reports and Analytics:**
   - Monthly attendance reports
   - Access pattern analysis
   - Staff performance metrics
   - Export to PDF/Excel

## Testing the Module

### Test Scenarios

1. **Add Staff:**
   - Fill all mandatory fields
   - Test form validation
   - Verify passcode generation
   - Check success message

2. **Guard Verification:**
   - Enter correct passcode → Should grant access
   - Enter wrong passcode → Should deny access
   - Try blocked staff passcode → Should deny
   - Verify access log creation

3. **Passcode Regeneration:**
   - Generate new passcode
   - Old passcode should fail
   - New passcode should work

4. **Search and Filter:**
   - Search by name
   - Filter by role
   - Combine search + filter

5. **Access Logs:**
   - Verify all entries shown
   - Check date formatting
   - Verify duration calculation

## Dummy Data Available

The service includes 5 pre-loaded staff members:
- **DS001:** Lakshmi Devi (Maid) - Passcode: 123456
- **DS002:** Suresh Patil (Driver) - Passcode: 654321
- **DS003:** Razia Begum (Cook) - Passcode: 789012
- **DS004:** Meena Kumari (Nanny) - Passcode: 456789
- **DS005:** Ramesh Yadav (Gardener) - Passcode: 111222

Test with these passcodes in the verification screen!

## Support

For questions or issues with the module, please refer to:
- Model definitions: `domestic-staff.model.ts`
- Service implementation: `domestic-staff.service.ts`
- Component documentation: Inline comments in each component

---

**Module Created:** December 2024  
**Version:** 1.0.0  
**Status:** Ready for API Integration
