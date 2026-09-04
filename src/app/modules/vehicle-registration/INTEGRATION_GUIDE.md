# Vehicle Registration Module - Integration Guide

## Quick Start

### 1. Module Structure Created

The complete vehicle registration module has been created at:
```
D:\poc\poc\src\app\modules\vehicle-registration\
```

### 2. Add Routes to Your Application

Update your `src/app/app.routes.ts` file to include the vehicle registration routes.

**Add this import at the top:**
```typescript
import { VEHICLE_REGISTRATION_ROUTES } from './modules/vehicle-registration/vehicle-registration.routes';
```

**Add this route in your routes array (inside admin children):**
```typescript
{ 
  path: 'vehicles',
  loadChildren: () => import('./modules/vehicle-registration/vehicle-registration.routes')
    .then(m => m.VEHICLE_REGISTRATION_ROUTES)
},
```

**Complete example:**
```typescript
{
  path: 'admin',
  loadComponent: () => import('./admin/layout/admin-layout.component').then(m => m.AdminLayoutComponent),
  children: [
    { path: 'dashboard', loadComponent: () => import('./components/dashboard/dashboard.component').then(m => m.DashboardComponent) },
    // ... other routes ...
    { path: 'parking', loadComponent: () => import('./modules/parking/parking.component').then(m => m.ParkingComponent) },
    { 
      path: 'vehicles',
      loadChildren: () => import('./modules/vehicle-registration/vehicle-registration.routes').then(m => m.VEHICLE_REGISTRATION_ROUTES)
    },
    { path: 'ai-assistant', loadComponent: () => import('./modules/ai-assistant/ai-assistant.component').then(m => m.AiAssistantComponent) },
    // ... rest of routes ...
  ]
}
```

### 3. Navigation Links

Add navigation links in your admin layout sidebar:

```html
<a routerLink="/admin/vehicles/list" routerLinkActive="active">
  <i class="icon-vehicle"></i>
  <span>Vehicles</span>
</a>
```

Or add a menu item with submenu:
```html
<div class="menu-item" [class.active]="isVehicleMenuOpen">
  <a (click)="toggleVehicleMenu()">
    <i class="icon-vehicle"></i>
    <span>Vehicle Management</span>
    <i class="icon-chevron-down"></i>
  </a>
  <div class="submenu" *ngIf="isVehicleMenuOpen">
    <a routerLink="/admin/vehicles/list">All Vehicles</a>
    <a routerLink="/admin/vehicles/register">Register Vehicle</a>
  </div>
</div>
```

### 4. Test the Module

Start your development server:
```bash
npm start
# or
ng serve
```

Navigate to:
- **Vehicle List**: `http://localhost:4200/admin/vehicles/list`
- **Register Vehicle**: `http://localhost:4200/admin/vehicles/register`

## Features Available

### ✅ Vehicle Registration Form
- **URL**: `/admin/vehicles/register`
- **Features**:
  - 4-step wizard interface
  - Vehicle details input with validation
  - Owner information management
  - RFID tag request (3 types: Standard, Premium, Temporary)
  - FASTag linking with bank integration
  - Document upload (RC, License, Insurance, PUC, etc.)
  - Review and submit

### ✅ Vehicle List & Management
- **URL**: `/admin/vehicles/list`
- **Features**:
  - Card and table view modes
  - Advanced search and filters
  - Vehicle details modal
  - Approve/Reject pending registrations
  - RFID tag scanning simulation
  - Status badges and indicators

## Module Components

### 1. VehicleRegistrationFormComponent
**Location**: `components/vehicle-registration-form.component.ts`

**Usage**:
```typescript
import { VehicleRegistrationFormComponent } from './modules/vehicle-registration/components/vehicle-registration-form.component';

// In your component
<app-vehicle-registration-form></app-vehicle-registration-form>
```

### 2. VehicleListComponent
**Location**: `components/vehicle-list.component.ts`

**Usage**:
```typescript
import { VehicleListComponent } from './modules/vehicle-registration/components/vehicle-list.component';

// In your component
<app-vehicle-list></app-vehicle-list>
```

### 3. VehicleRegistrationService
**Location**: `services/vehicle-registration.service.ts`

**Usage**:
```typescript
import { VehicleRegistrationService } from './modules/vehicle-registration/services/vehicle-registration.service';

constructor(private vehicleService: VehicleRegistrationService) {}

// Register vehicle
this.vehicleService.registerVehicle(request).subscribe(response => {
  if (response.success) {
    console.log('Vehicle registered:', response.vehicle);
  }
});

// Get all vehicles
this.vehicleService.getAllVehicles().subscribe(vehicles => {
  console.log('All vehicles:', vehicles);
});

// Scan RFID
this.vehicleService.scanRFIDTag(tagNumber).subscribe(vehicle => {
  if (vehicle) {
    console.log('Access granted:', vehicle);
  }
});
```

## Dummy Data

The service comes with 3 pre-populated vehicles:

### Vehicle 1
- **Registration**: MH12AB1234
- **Type**: Four Wheeler (Maruti Suzuki Swift)
- **Owner**: Rajesh Kumar (Resident, A-101)
- **RFID**: Active with 245 scans
- **FASTag**: Active with ₹2,500 balance
- **Status**: Approved

### Vehicle 2
- **Registration**: KA05CD5678
- **Type**: Two Wheeler (Honda Activa 6G)
- **Owner**: Priya Sharma (Resident, B-205)
- **RFID**: Active with 189 scans
- **Status**: Approved

### Vehicle 3
- **Registration**: DL08EF9012
- **Type**: Four Wheeler (Hyundai Creta)
- **Owner**: Amit Patel (Tenant, C-310)
- **Status**: Pending Approval

## API Integration

### Current Setup (Dummy Data)
The service uses RxJS observables with simulated delays to mimic API calls.

### Connecting to Real Backend

Replace the service methods in `vehicle-registration.service.ts`:

```typescript
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class VehicleRegistrationService {
  private apiUrl = environment.apiUrl + '/api/vehicles';

  constructor(private http: HttpClient) {}

  registerVehicle(request: VehicleRegistrationRequest): Observable<VehicleRegistrationResponse> {
    return this.http.post<VehicleRegistrationResponse>(`${this.apiUrl}/register`, request);
  }

  getAllVehicles(): Observable<Vehicle[]> {
    return this.http.get<Vehicle[]>(this.apiUrl);
  }

  issueRFIDTag(request: RFIDRegistrationRequest): Observable<RFIDIssueResponse> {
    return this.http.post<RFIDIssueResponse>(`${this.apiUrl}/rfid/issue`, request);
  }

  linkFASTag(request: FASTagLinkRequest): Observable<FASTagLinkResponse> {
    return this.http.post<FASTagLinkResponse>(`${this.apiUrl}/fastag/link`, request);
  }

  approveVehicle(vehicleId: string, approvedBy: string): Observable<VehicleRegistrationResponse> {
    return this.http.put<VehicleRegistrationResponse>(
      `${this.apiUrl}/${vehicleId}/approve`,
      { approvedBy }
    );
  }

  scanRFIDTag(tagNumber: string): Observable<Vehicle> {
    return this.http.get<Vehicle>(`${this.apiUrl}/rfid/scan/${tagNumber}`);
  }
}
```

### Expected Backend Endpoints

Your Spring Boot backend should implement:

```java
@RestController
@RequestMapping("/api/vehicles")
public class VehicleController {
    
    @PostMapping("/register")
    public VehicleRegistrationResponse registerVehicle(@RequestBody VehicleRegistrationRequest request) {
        // Implementation
    }
    
    @GetMapping
    public List<Vehicle> getAllVehicles() {
        // Implementation
    }
    
    @GetMapping("/{id}")
    public Vehicle getVehicleById(@PathVariable String id) {
        // Implementation
    }
    
    @PostMapping("/rfid/issue")
    public RFIDIssueResponse issueRFIDTag(@RequestBody RFIDRegistrationRequest request) {
        // Implementation
    }
    
    @PostMapping("/fastag/link")
    public FASTagLinkResponse linkFASTag(@RequestBody FASTagLinkRequest request) {
        // Implementation
    }
    
    @PutMapping("/{id}/approve")
    public VehicleRegistrationResponse approveVehicle(
        @PathVariable String id,
        @RequestBody ApprovalRequest request
    ) {
        // Implementation
    }
    
    @PutMapping("/{id}/reject")
    public VehicleRegistrationResponse rejectVehicle(
        @PathVariable String id,
        @RequestBody RejectionRequest request
    ) {
        // Implementation
    }
    
    @GetMapping("/rfid/scan/{tagNumber}")
    public Vehicle scanRFIDTag(@PathVariable String tagNumber) {
        // Implementation
    }
}
```

## Testing Scenarios

### 1. Register a New Vehicle
1. Go to `/admin/vehicles/register`
2. Fill in Step 1: MH01XX9999, Four Wheeler, Tata, Nexon, Blue, 2024
3. Fill in Step 2: USR-004, Your Name, Resident, D-405
4. Enable RFID: Standard, 12 months
5. Optionally enable FASTag and fill details
6. Upload documents (optional for testing)
7. Submit

### 2. View and Filter Vehicles
1. Go to `/admin/vehicles/list`
2. Search: Type "MH12" to find first dummy vehicle
3. Filter by Type: Select "FOUR_WHEELER"
4. Filter by Status: Select "PENDING" to see pending approvals
5. Toggle between Card and Table views

### 3. Approve/Reject Vehicles
1. In vehicle list, find vehicle with PENDING status (DL08EF9012)
2. Click "View Details"
3. Click "Approve" or "Reject"
4. Verify status update

### 4. RFID Scanning
1. Click "Scan RFID" button in vehicle list
2. Enter tag number: RFID-ABC123XYZ
3. Should show access granted for first vehicle
4. Try invalid tag: RFID-INVALID
5. Should show access denied

## Troubleshooting

### Route not working
- Verify route is added to `app.routes.ts`
- Check path is `/admin/vehicles/list` or `/admin/vehicles/register`
- Ensure module is imported correctly

### Component not loading
- Check all imports are correct
- Verify standalone: true in component decorators
- Check CommonModule and ReactiveFormsModule imports

### Service errors
- Check service is provided in 'root'
- Verify Observable imports from 'rxjs'
- Check HttpClient is imported if using real API

### Styling issues
- Verify SCSS files are in correct location
- Check component styleUrls path
- Ensure global styles don't override

## Next Steps

1. **Test with Dummy Data**
   - Use the module with pre-populated data
   - Test all features and workflows
   - Verify UI/UX is as expected

2. **Connect to Backend**
   - Update service with HTTP calls
   - Match API endpoints with backend
   - Add error handling

3. **Enhance Features**
   - Add more vehicle types
   - Implement document verification
   - Add parking slot management
   - Create entry/exit logs

4. **Security**
   - Add authentication guards
   - Implement role-based access
   - Secure RFID communication

## Support

For detailed information, see:
- Module README: `modules/vehicle-registration/README.md`
- Models documentation: `models/vehicle.model.ts`
- Service implementation: `services/vehicle-registration.service.ts`

## Complete File Structure

```
vehicle-registration/
├── components/
│   ├── vehicle-registration-form.component.ts      (TypeScript)
│   ├── vehicle-registration-form.component.html    (Template)
│   ├── vehicle-registration-form.component.scss    (Styles)
│   ├── vehicle-list.component.ts                   (TypeScript)
│   ├── vehicle-list.component.html                 (Template)
│   └── vehicle-list.component.scss                 (Styles)
├── services/
│   └── vehicle-registration.service.ts             (Service Layer)
├── models/
│   └── vehicle.model.ts                           (TypeScript Interfaces)
├── vehicle-registration.routes.ts                  (Routing)
├── README.md                                       (Documentation)
└── INTEGRATION_GUIDE.md                           (This File)
```

## Checklist

- ✅ Module created with all components
- ✅ Service with dummy data implemented
- ✅ Models and interfaces defined
- ✅ Routing configured
- ✅ Responsive design with SCSS
- ⬜ Routes added to main app (Manual step)
- ⬜ Navigation links added (Manual step)
- ⬜ Backend API integration (When ready)
- ⬜ Testing completed
- ⬜ Production deployment

---

**Module Ready!** 🎉

The Vehicle Registration module is complete and ready to use. Follow the integration steps above to add it to your application.
