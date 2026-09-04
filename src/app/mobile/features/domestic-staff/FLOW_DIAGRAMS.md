# Domestic Staff Management - Complete Flow Diagrams

## Flow 1: Add Domestic Staff (Owner/Resident)

```
┌─────────────────────────────────────────────────────────────┐
│                     OWNER DASHBOARD                         │
│  [Dashboard Home] → [Domestic Staff] Menu Item              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              DOMESTIC STAFF LIST SCREEN                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Header: Domestic Staff                        [+]    │   │
│  │ Search: [🔍 Search by name, role...]                │   │
│  │ Filters: [All] [Maid] [Cook] [Driver] [Nanny]      │   │
│  │                                                       │   │
│  │ Stats: Active: 4 | Inactive: 1 | Total: 5          │   │
│  │                                                       │   │
│  │ ┌───────────────────────────────────────────────┐   │   │
│  │ │ 📷 Lakshmi Devi          [Maid]    [Active]  │   │
│  │ │ Flat: A-101  📞 +91 9876543210               │   │
│  │ │ Passcode: 123456                    [🔄]     │   │
│  │ │ [Access Log] [Attendance] [Block]            │   │
│  │ └───────────────────────────────────────────────┘   │   │
│  │ [More staff cards...]                                │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────────┘
                     │ Click [+] to Add
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                ADD DOMESTIC STAFF FORM                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ [←] Add Domestic Staff                               │   │
│  │                                                       │   │
│  │ Photo Upload:  [👤 Upload Photo]                    │   │
│  │                                                       │   │
│  │ Basic Information:                                   │   │
│  │ ┌─────────────────────────────────────────┐         │   │
│  │ │ Full Name: [Lakshmi Devi              ]│ *       │   │
│  │ │ Role: [Maid ▼                         ]│ *       │   │
│  │ │ Phone: [+91 9876543210                ]│ *       │   │
│  │ │ Alternate: [+91 8765432109            ]│         │   │
│  │ │ Address: [Village Rampur, Pune        ]│         │   │
│  │ └─────────────────────────────────────────┘         │   │
│  │                                                       │   │
│  │ Identity Documents:                                  │   │
│  │ ┌─────────────────────────────────────────┐         │   │
│  │ │ Type: [Aadhar Card ▼                  ]│         │   │
│  │ │ Number: [1234 5678 9012               ]│         │   │
│  │ └─────────────────────────────────────────┘         │   │
│  │                                                       │   │
│  │ Emergency Contact:                                   │   │
│  │ ┌─────────────────────────────────────────┐         │   │
│  │ │ Name: [Ramesh Kumar                   ]│         │   │
│  │ │ Relation: [Husband                    ]│         │   │
│  │ │ Phone: [+91 9876543211                ]│         │   │
│  │ └─────────────────────────────────────────┘         │   │
│  │                                                       │   │
│  │ Work Schedule:                                       │   │
│  │ ┌─────────────────────────────────────────┐         │   │
│  │ │ ☐ Full-time employee                   │         │   │
│  │ │ Days: [Mon][Tue][Wed][Thu][Fri][Sat]  │         │   │
│  │ │ Time: [08:00] to [12:00]               │         │   │
│  │ └─────────────────────────────────────────┘         │   │
│  │                                                       │   │
│  │ 🔒 6-Digit Access Passcode:                         │   │
│  │ ┌─────────────────────────────────────────┐         │   │
│  │ │ Auto-generated passcode:                │         │   │
│  │ │         123456           [🔄 Regenerate]│         │   │
│  │ └─────────────────────────────────────────┘         │   │
│  │                                                       │   │
│  │ [Cancel]            [Add Staff Member]               │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────────┘
                     │ Submit Form
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  SUCCESS CONFIRMATION                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ ✓ Staff Member Added Successfully!                   │   │
│  │                                                       │   │
│  │ Name: Lakshmi Devi                                   │   │
│  │ Role: Maid                                           │   │
│  │ Passcode: 123456                                     │   │
│  │                                                       │   │
│  │ ⚠️  Please share this passcode with the staff       │   │
│  │     member for gate entry access.                   │   │
│  │                                                       │   │
│  │ [Copy Passcode]  [Share via WhatsApp]               │   │
│  │                  [Done]                              │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
              [Back to Staff List]
```

## Flow 2: Guard Passcode Verification at Gate

```
┌─────────────────────────────────────────────────────────────┐
│                  GUARD DASHBOARD                             │
│  [Dashboard] → [Verify Passcode] Menu                        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│        PASSCODE VERIFICATION SCREEN (Guard)                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ [←] Verify Passcode                                  │   │
│  │                                                       │   │
│  │              🔒                                       │   │
│  │                                                       │   │
│  │        Enter 6-Digit Passcode                        │   │
│  │   Ask the staff member to provide                    │   │
│  │        their access passcode                         │   │
│  │                                                       │   │
│  │  ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐              │   │
│  │  │ 1 │ │ 2 │ │ 3 │ │ 4 │ │ 5 │ │ 6 │              │   │
│  │  └───┘ └───┘ └───┘ └───┘ └───┘ └───┘              │   │
│  │                                                       │   │
│  │           [Verify Access]                            │   │
│  │              [Clear]                                 │   │
│  │                                                       │   │
│  │  Number Pad:                                         │   │
│  │  ┌───┐ ┌───┐ ┌───┐                                 │   │
│  │  │ 1 │ │ 2 │ │ 3 │                                 │   │
│  │  ├───┤ ├───┤ ├───┤                                 │   │
│  │  │ 4 │ │ 5 │ │ 6 │                                 │   │
│  │  ├───┤ ├───┤ ├───┤                                 │   │
│  │  │ 7 │ │ 8 │ │ 9 │                                 │   │
│  │  ├───┴─┼───┼───┤                                    │   │
│  │  │  0  │                                             │   │
│  │  └─────┘                                             │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────────┘
                     │ Staff enters: 123456
                     │ Guard clicks [Verify Access]
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              VERIFICATION IN PROGRESS                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              ⏳ Verifying...                          │   │
│  │                                                       │   │
│  │  • Checking passcode                                 │   │
│  │  • Verifying staff status                            │   │
│  │  • Creating access log                               │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        ▼                         ▼
   [SUCCESS]                  [FAILURE]
        │                         │
        ▼                         ▼
┌──────────────────────┐   ┌──────────────────────┐
│   ACCESS GRANTED     │   │    ACCESS DENIED     │
│  ┌──────────────┐    │   │  ┌──────────────┐    │
│  │      ✓       │    │   │  │      ✗       │    │
│  └──────────────┘    │   │  └──────────────┘    │
│                      │   │                      │
│  Access Granted      │   │  Access Denied       │
│  Welcome Lakshmi!    │   │  Invalid passcode    │
│                      │   │  or staff blocked    │
│  Staff Details:      │   │                      │
│  📷 [Photo]          │   │  Please try again    │
│  Name: Lakshmi Devi  │   │  or contact owner    │
│  Flat: A-101         │   │                      │
│  Role: Maid          │   │  [Try Again]         │
│  Phone: +91 9876...  │   │                      │
│                      │   └──────────────────────┘
│  Entry Logged:       │
│  Main Gate           │
│  18 Dec, 08:05 AM    │
│                      │
│  [Verify Another]    │
│  [Done]              │
└──────────────────────┘
```

## Flow 3: View Staff Details and Access Log

```
┌─────────────────────────────────────────────────────────────┐
│                  STAFF LIST SCREEN                           │
│  Click on any staff card → Navigate to detail                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              STAFF DETAIL SCREEN                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ [←] Staff Details                            [✏️]    │   │
│  │                                                       │   │
│  │              ┌───────────┐                           │   │
│  │              │    📷     │                           │   │
│  │              │  Photo    │                           │   │
│  │              └───────────┘                           │   │
│  │                                                       │   │
│  │            Lakshmi Devi                              │   │
│  │              [Maid]                                  │   │
│  │             [Active ✓]                               │   │
│  │          ★★★★★ 5.0 / 5.0                            │   │
│  │                                                       │   │
│  │ ┌─────────────────────────────────────────────────┐ │   │
│  │ │ 🔒 Access Passcode                              │ │   │
│  │ │                                                  │ │   │
│  │ │         123456           [🔄 Regenerate]        │ │   │
│  │ │                                                  │ │   │
│  │ │ Share this passcode with staff for gate entry  │ │   │
│  │ └─────────────────────────────────────────────────┘ │   │
│  │                                                       │   │
│  │ Contact Information:                                 │   │
│  │ ┌─────────────────────────────────────────────────┐ │   │
│  │ │ Primary: +91 9876543210                         │ │   │
│  │ │ Alternate: +91 8765432109                       │ │   │
│  │ │ Address: Village Rampur, Pune                   │ │   │
│  │ └─────────────────────────────────────────────────┘ │   │
│  │                                                       │   │
│  │ Identity Document:                                   │   │
│  │ ┌─────────────────────────────────────────────────┐ │   │
│  │ │ Type: Aadhar Card                               │ │   │
│  │ │ Number: 1234 5678 9012                          │ │   │
│  │ └─────────────────────────────────────────────────┘ │   │
│  │                                                       │   │
│  │ Emergency Contact:                                   │   │
│  │ ┌─────────────────────────────────────────────────┐ │   │
│  │ │ Name: Ramesh Kumar                              │ │   │
│  │ │ Relationship: Husband                           │ │   │
│  │ │ Phone: +91 9876543211                           │ │   │
│  │ └─────────────────────────────────────────────────┘ │   │
│  │                                                       │   │
│  │ Work Schedule:                                       │   │
│  │ ┌─────────────────────────────────────────────────┐ │   │
│  │ │ Type: Part-time                                 │ │   │
│  │ │ Days: [Mon][Tue][Wed][Thu][Fri][Sat]          │ │   │
│  │ │ Time: 08:00 to 12:00                           │ │   │
│  │ └─────────────────────────────────────────────────┘ │   │
│  │                                                       │   │
│  │ Quick Actions:                                       │   │
│  │ ┌─────────────────────────────────────────────────┐ │   │
│  │ │ [📋 View Access Log]                            │ │   │
│  │ │ [📅 View Attendance]                            │ │   │
│  │ │ [⭐ Rate Performance]                            │ │   │
│  │ └─────────────────────────────────────────────────┘ │   │
│  │                                                       │   │
│  │ Danger Zone:                                         │   │
│  │ ┌─────────────────────────────────────────────────┐ │   │
│  │ │ [🚫 Block Staff Member]                         │ │   │
│  │ │ [🗑️ Delete Staff Member]                        │ │   │
│  │ └─────────────────────────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────────┘
                     │ Click [View Access Log]
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                ACCESS LOG SCREEN                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ [←] Access Log                                       │   │
│  │                                                       │   │
│  │ Stats: Total: 25 | This Month: 18 | Today: 1        │   │
│  │                                                       │   │
│  │ ┌───────────────────────────────────────────────┐   │   │
│  │ │ 📷 Lakshmi Devi      [A-101]  [Checked Out]  │   │   │
│  │ │                                                │   │   │
│  │ │ ➡️ Check-in: 18 Dec 2024, 08:05 AM           │   │   │
│  │ │ ⬅️ Check-out: 18 Dec 2024, 12:10 PM          │   │   │
│  │ │ ⏱️ Duration: 4h 5m                            │   │   │
│  │ │ 🏠 Entry Gate: Main Gate                      │   │   │
│  │ │ 🏠 Exit Gate: Main Gate                       │   │   │
│  │ │ 👤 Verified by: Guard-Ramu                    │   │   │
│  │ └───────────────────────────────────────────────┘   │   │
│  │                                                       │   │
│  │ ┌───────────────────────────────────────────────┐   │   │
│  │ │ 📷 Lakshmi Devi      [A-101]  [Checked In]   │   │   │
│  │ │                                                │   │   │
│  │ │ ➡️ Check-in: 17 Dec 2024, 08:00 AM           │   │   │
│  │ │ ⬅️ Check-out: 17 Dec 2024, 12:05 PM          │   │   │
│  │ │ ⏱️ Duration: 4h 5m                            │   │   │
│  │ │ 🏠 Entry Gate: Main Gate                      │   │   │
│  │ │ 🏠 Exit Gate: Main Gate                       │   │   │
│  │ │ 👤 Verified by: Guard-Shyam                   │   │   │
│  │ └───────────────────────────────────────────────┘   │   │
│  │                                                       │   │
│  │ [Load More...]                                       │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Flow 4: Regenerate Passcode

```
┌─────────────────────────────────────────────────────────────┐
│              STAFF DETAIL SCREEN                             │
│  Current Passcode: 123456                                    │
└────────────────────┬────────────────────────────────────────┘
                     │ Click [Regenerate] button
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              CONFIRMATION DIALOG                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ ⚠️  Generate New Passcode?                           │   │
│  │                                                       │   │
│  │ A new 6-digit passcode will be generated.           │   │
│  │ The old passcode (123456) will no longer work.      │   │
│  │                                                       │   │
│  │ Make sure to share the new passcode with the        │   │
│  │ staff member immediately.                            │   │
│  │                                                       │   │
│  │        [Cancel]          [Generate]                  │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────────┘
                     │ Click [Generate]
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              GENERATING...                                   │
│  ⏳ Generating new passcode...                               │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              SUCCESS CONFIRMATION                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ ✓ New Passcode Generated!                            │   │
│  │                                                       │   │
│  │ Staff: Lakshmi Devi                                  │   │
│  │                                                       │   │
│  │ Old Passcode: 123456 ❌ (No longer valid)           │   │
│  │ New Passcode: 789456 ✓ (Active now)                 │   │
│  │                                                       │   │
│  │ ⚠️  Please share this new passcode with the staff   │   │
│  │     member immediately.                              │   │
│  │                                                       │   │
│  │ [Copy Passcode]  [Share via SMS]  [Done]            │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Flow 5: Block Staff Member

```
┌─────────────────────────────────────────────────────────────┐
│              STAFF DETAIL SCREEN                             │
│  Status: [Active ✓]                                          │
└────────────────────┬────────────────────────────────────────┘
                     │ Scroll to Danger Zone
                     │ Click [Block Staff Member]
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              CONFIRMATION DIALOG                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ ⚠️  Block Lakshmi Devi?                              │   │
│  │                                                       │   │
│  │ This staff member will NOT be able to access the    │   │
│  │ premises even with correct passcode.                │   │
│  │                                                       │   │
│  │ You can unblock them later if needed.               │   │
│  │                                                       │   │
│  │        [Cancel]          [Block]                     │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────────┘
                     │ Click [Block]
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              STAFF BLOCKED                                   │
│  Status: [Blocked 🚫]                                        │
│  • Passcode: 123456 (Still visible but won't work)          │
│  • Access: DENIED                                            │
│  • Can be unblocked anytime                                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ Staff tries to enter
                     ▼
┌─────────────────────────────────────────────────────────────┐
│        GUARD VERIFICATION (With Blocked Staff)               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Guard enters: 123456                                 │   │
│  │                                                       │   │
│  │              ✗                                        │   │
│  │        Access Denied                                 │   │
│  │                                                       │   │
│  │   Staff Status: Blocked                              │   │
│  │   Please contact flat owner                          │   │
│  │                                                       │   │
│  │   [Try Again]                                        │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Angular)                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              COMPONENTS LAYER                        │   │
│  │  • domestic-staff-list.component.ts                  │   │
│  │  • add-domestic-staff.component.ts                   │   │
│  │  • domestic-staff-detail.component.ts                │   │
│  │  • staff-access-log.component.ts                     │   │
│  │  • guard-passcode-verify.component.ts                │   │
│  └──────────────────┬───────────────────────────────────┘   │
│                     │ Uses                                   │
│                     ▼                                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              SERVICE LAYER                           │   │
│  │         domestic-staff.service.ts                    │   │
│  │                                                       │   │
│  │  Methods:                                            │   │
│  │  • getDomesticStaffByFlat()                         │   │
│  │  • addDomesticStaff()                               │   │
│  │  • updateDomesticStaff()                            │   │
│  │  • verifyPasscode()                                 │   │
│  │  • regeneratePasscode()                             │   │
│  │  • getAccessLogs()                                  │   │
│  │  • blockStaff() / unblockStaff()                    │   │
│  │                                                       │   │
│  │  ┌─────────────────────────────────────────┐        │   │
│  │  │ CURRENTLY: Dummy In-Memory Data         │        │   │
│  │  │ • domesticStaffList[]                   │        │   │
│  │  │ • accessLogs[]                          │        │   │
│  │  │ • attendanceRecords[]                   │        │   │
│  │  └─────────────────────────────────────────┘        │   │
│  └──────────────────┬───────────────────────────────────┘   │
└────────────────────┼────────────────────────────────────────┘
                     │ Will be replaced with HTTP calls
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              BACKEND API (To be implemented)                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              REST API ENDPOINTS                      │   │
│  │                                                       │   │
│  │  GET    /api/domestic-staff/flat/:flatId            │   │
│  │  POST   /api/domestic-staff                         │   │
│  │  PUT    /api/domestic-staff/:id                     │   │
│  │  DELETE /api/domestic-staff/:id                     │   │
│  │  POST   /api/domestic-staff/verify-passcode         │   │
│  │  POST   /api/domestic-staff/:id/regenerate-passcode │   │
│  │  GET    /api/domestic-staff/:id/access-logs         │   │
│  │  PUT    /api/domestic-staff/:id/block               │   │
│  │  PUT    /api/domestic-staff/:id/unblock             │   │
│  └──────────────────┬───────────────────────────────────┘   │
│                     │                                        │
│                     ▼                                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              DATABASE LAYER                          │   │
│  │                                                       │   │
│  │  Tables:                                             │   │
│  │  • domestic_staff                                    │   │
│  │  • staff_access_logs                                │   │
│  │  • staff_attendance                                 │   │
│  │  • staff_ratings                                    │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## State Management Flow

```
USER ACTION → COMPONENT → SERVICE → DUMMY DATA / API → RESPONSE → UPDATE UI

Example: Verify Passcode
┌───────────────────────────────────────────────────────┐
│ 1. Guard enters: 123456                               │
│    └→ GuardPasscodeVerifyComponent                    │
│                                                        │
│ 2. Component calls service                            │
│    └→ domesticStaffService.verifyPasscode({           │
│         passcode: '123456',                           │
│         entryGate: 'Main Gate',                       │
│         guardId: 'GUARD001'                           │
│       })                                              │
│                                                        │
│ 3. Service processes                                  │
│    └→ Find staff with passcode                        │
│    └→ Check status (Active/Blocked)                   │
│    └→ Create access log entry                         │
│    └→ Return result                                   │
│                                                        │
│ 4. Component receives response                        │
│    └→ {                                               │
│         success: true,                                │
│         staff: { name: 'Lakshmi Devi', ... },        │
│         message: 'Access granted',                    │
│         accessLog: { checkInTime: ..., ... }         │
│       }                                               │
│                                                        │
│ 5. UI Updates                                         │
│    └→ Show success screen                             │
│    └→ Display staff details                           │
│    └→ Show access granted message                     │
└───────────────────────────────────────────────────────┘
```

---

## Navigation Flow Map

```
/mobile/dashboard
    │
    └─→ Domestic Staff Menu
         │
         ├─→ /mobile/domestic-staff (List)
         │    │
         │    ├─→ [+] → /mobile/domestic-staff/add
         │    │         └─→ Submit → Back to List
         │    │
         │    └─→ [Click Card] → /mobile/domestic-staff/detail/:id
         │                        │
         │                        ├─→ [Access Log] → /mobile/domestic-staff/access-log/:id
         │                        ├─→ [Attendance] → (Coming soon)
         │                        ├─→ [Rate] → (Coming soon)
         │                        └─→ [Edit] → (Coming soon)
         │
         └─→ /mobile/domestic-staff/verify-passcode (Guard)
              └─→ Verify → Show Result → Verify Another / Done
```

## Summary

This document provides visual representations of:
1. **User Flows** - Step-by-step screens users will see
2. **Component Interactions** - How screens connect
3. **Data Flow** - How information moves through the system
4. **State Management** - How actions trigger updates
5. **Navigation** - How to move between screens

All flows are currently working with **dummy data** and ready for **API integration**!
