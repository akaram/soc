# Domestic Staff Module - Quick Start Guide

## 🚀 Getting Started in 5 Minutes

### Step 1: Navigate to Domestic Staff
```
http://localhost:4200/mobile/domestic-staff
```

### Step 2: See Pre-loaded Demo Data
You'll see 5 staff members already loaded:
- Lakshmi Devi (Maid) - Passcode: **123456**
- Suresh Patil (Driver) - Passcode: **654321**
- Razia Begum (Cook) - Passcode: **789012**
- Meena Kumari (Nanny) - Passcode: **456789**
- Ramesh Yadav (Gardener) - Passcode: **111222**

### Step 3: Test Guard Verification
```
http://localhost:4200/mobile/domestic-staff/verify-passcode
```
1. Enter passcode: **123456**
2. See "Access Granted" with Lakshmi Devi's details
3. Click "Verify Another" to test other passcodes

### Step 4: Add New Staff
1. Click **+** button in header
2. Fill basic information:
   - Name: Your test name
   - Role: Select from dropdown
   - Phone: +91 XXXXX XXXXX
3. Note the auto-generated passcode
4. Click "Add Staff Member"

### Step 5: View Staff Details
1. Click on any staff card
2. See complete profile with passcode
3. Try these actions:
   - View Access Log
   - Regenerate Passcode
   - Block/Unblock Staff

## 📱 Key Screens

### Owner/Resident Screens
1. **Staff List** → `/mobile/domestic-staff`
2. **Add Staff** → `/mobile/domestic-staff/add`
3. **Staff Details** → `/mobile/domestic-staff/detail/DS001`
4. **Access Log** → `/mobile/domestic-staff/access-log/DS001`

### Guard Screens
1. **Verify Passcode** → `/mobile/domestic-staff/verify-passcode`

## 🧪 Testing Scenarios

### Scenario 1: Successful Entry
1. Go to verification screen
2. Enter: **123456**
3. ✅ Result: Access Granted for Lakshmi Devi

### Scenario 2: Invalid Passcode
1. Go to verification screen
2. Enter: **999999**
3. ❌ Result: Invalid passcode

### Scenario 3: Blocked Staff
1. Go to staff detail for DS001
2. Click "Block Staff Member"
3. Go to verification screen
4. Enter: **123456**
5. ❌ Result: Access Denied (Staff Blocked)

### Scenario 4: Passcode Regeneration
1. Go to staff detail for DS001
2. Current passcode: **123456**
3. Click regenerate button
4. New passcode generated (e.g., **456789**)
5. Old passcode **123456** will no longer work
6. New passcode **456789** now grants access

## 🎯 Quick Actions

### From List Screen:
- **Search:** Type name, role, or phone
- **Filter:** Click role chips (Maid, Cook, etc.)
- **Regenerate:** Click 🔄 icon on any card
- **Access Log:** Click "Access Log" button
- **Block:** Click "Block" button

### From Detail Screen:
- **Edit:** Click ✏️ in header
- **View Logs:** Click "View Access Log"
- **View Attendance:** Click "View Attendance"
- **Rate Staff:** Click "Rate Performance"
- **Regenerate Passcode:** Click regenerate in passcode section
- **Block:** Scroll to "Danger Zone"

## 🔢 Understanding Passcodes

### What is a Passcode?
- 6-digit number (e.g., 123456)
- Unique to each staff member
- Used for gate entry verification
- Can be regenerated anytime

### How It Works:
1. **Owner adds staff** → System generates passcode
2. **Owner shares with staff** → Staff memorizes it
3. **Staff arrives at gate** → Tells passcode to guard
4. **Guard enters passcode** → System verifies
5. **Access granted/denied** → Based on verification

### Security:
- Each staff has unique code
- Blocked staff cannot access (even with correct passcode)
- All attempts are logged
- Passcode can be regenerated if compromised

## 📊 Features Overview

| Feature | Screen | Status |
|---------|--------|--------|
| View Staff List | ✅ | Working with dummy data |
| Add New Staff | ✅ | Working with dummy data |
| Edit Staff | ⏳ | Coming soon |
| Delete Staff | ✅ | Working with dummy data |
| Passcode Verification | ✅ | Working with dummy data |
| Access Logs | ✅ | Working with dummy data |
| Attendance Tracking | ⏳ | Model ready, UI pending |
| Rating System | ⏳ | Model ready, UI pending |
| Block/Unblock | ✅ | Working with dummy data |
| Passcode Regeneration | ✅ | Working with dummy data |

## 🔄 Converting to Real APIs

### Current State:
All data is stored in-memory in `domestic-staff.service.ts`

### To Integrate APIs:
1. Open `domestic-staff.service.ts`
2. Find methods like:
   ```typescript
   getDomesticStaffByFlat(flatId: string): Observable<DomesticStaff[]> {
     return of(this.domesticStaffList.filter(...))
       .pipe(delay(500));
   }
   ```
3. Replace with:
   ```typescript
   getDomesticStaffByFlat(flatId: string): Observable<DomesticStaff[]> {
     return this.http.get<DomesticStaff[]>(`${API_URL}/staff/flat/${flatId}`);
   }
   ```
4. Add HttpClient:
   ```typescript
   constructor(private http: HttpClient) {}
   ```

### API Endpoints Needed:
```
GET    /api/domestic-staff/flat/:flatId
POST   /api/domestic-staff
PUT    /api/domestic-staff/:id
DELETE /api/domestic-staff/:id
POST   /api/domestic-staff/verify-passcode
POST   /api/domestic-staff/:id/regenerate-passcode
GET    /api/domestic-staff/:id/access-logs
```

## 🎨 UI/UX Highlights

### Design System:
- **Primary Color:** #667eea (Purple gradient)
- **Success:** #10b981 (Green)
- **Error:** #ef4444 (Red)
- **Card Style:** Rounded 16px, shadow
- **Spacing:** Consistent 1rem padding

### Mobile First:
- Touch-optimized buttons (min 44px)
- Smooth transitions
- Loading indicators
- Error states
- Empty states

### Components:
- ✅ Responsive cards
- ✅ Search with live filtering
- ✅ Filter chips
- ✅ Stats summary
- ✅ Photo upload
- ✅ Form validation
- ✅ Number pad for passcode
- ✅ Success/error feedback

## 💡 Pro Tips

1. **Testing Passcodes:**
   - Use the 5 pre-loaded staff passcodes
   - They're in the README and in the UI

2. **Search is Smart:**
   - Searches name, role, AND phone number
   - Combines with filters

3. **Passcode Input:**
   - Can type OR use number pad
   - Auto-submits when complete
   - Press backspace to edit

4. **Access Logs:**
   - Show real timestamps
   - Calculate duration automatically
   - Filter by today/month

5. **Status Management:**
   - Active = Green
   - Inactive = Yellow
   - Blocked = Red
   - Visual indicators everywhere

## 🐛 Common Issues

### Issue: "Staff not found"
**Solution:** Check the staffId in URL, use DS001-DS005

### Issue: "Passcode not working"
**Solution:** Check if staff is blocked, try regenerating

### Issue: "Form not submitting"
**Solution:** Fill all required fields (marked with *)

### Issue: "Can't see staff in list"
**Solution:** Check search/filter, clear and try again

## 📚 File Locations

```
src/app/mobile/features/domestic-staff/
├── README.md                          ← Full documentation
├── QUICKSTART.md                      ← This file
├── models/
│   └── domestic-staff.model.ts       ← All TypeScript types
├── services/
│   └── domestic-staff.service.ts     ← Business logic + dummy data
└── [components].ts                    ← UI components
```

## 🎓 Learning Path

1. **Beginner:** Just use the UI, test with dummy data
2. **Intermediate:** Look at models, understand data structure
3. **Advanced:** Read service code, see RxJS patterns
4. **Expert:** Integrate real APIs, add features

## ✨ Next Features to Build

Want to contribute? Try implementing:
- [ ] Edit staff functionality
- [ ] Attendance UI screen
- [ ] Rating UI screen
- [ ] Export access logs to PDF
- [ ] WhatsApp passcode sharing
- [ ] QR code generation
- [ ] Multiple flat access
- [ ] Photo capture at gate

## 📞 Need Help?

1. Check the main README.md
2. Read inline code comments
3. Look at TypeScript interfaces
4. Test with dummy data first

---

**Happy Testing! 🎉**

Remember: All data is dummy and in-memory. Perfect for testing without backend!
