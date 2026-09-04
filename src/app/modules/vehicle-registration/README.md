# Vehicle Registration Module

## Overview
Complete vehicle registration system with RFID/FASTag integration for society management. This module provides comprehensive vehicle tracking, automated gate access, and digital payment integration.

## Features

### ✅ Core Features
- **Vehicle Registration**: Complete registration flow with 4-step wizard
- **RFID Tag Integration**: Automated gate entry/exit with RFID scanning
- **FASTag Integration**: Link FASTag for cashless toll payments
- **Document Management**: Upload and manage vehicle documents
- **Approval Workflow**: Admin approval system for registrations
- **Vehicle Search & Filter**: Advanced search and filtering capabilities
- **Multiple View Modes**: Card and table views for vehicle list

### 🎯 Key Capabilities
1. **Multi-step Registration Form**
   - Step 1: Vehicle Details (Registration number, Make, Model, Color, Year)
   - Step 2: Owner Information (Owner details, Unit number, Parking slot)
   - Step 3: RFID/FASTag Integration
   - Step 4: Document Upload & Review

2. **RFID Tag Management**
   - Standard, Premium, and Temporary tag types
   - Customizable validity periods
   - Scan count tracking
   - Last scan timestamp
   - Tag status management (Active, Inactive, Damaged, Lost, Expired)

3. **FASTag Integration**
   - Link FASTag account to vehicle
   - Wallet balance tracking
   - Bank integration
   - Vehicle class management
   - Status monitoring

4. **Document Management**
   - RC Book
   - Driving License
   - Insurance Certificate
   - PUC Certificate
   - ID Proof & Address Proof
   - Vehicle & Owner Photos

5. **Advanced Filtering**
   - Search by registration number, owner, make, model
   - Filter by vehicle type
   - Filter by approval status
   - Filter by vehicle status
   - Real-time search results

## Project Structure

```
vehicle-registration/
├── components/
│   ├── vehicle-registration-form.component.ts      # Registration form component
│   ├── vehicle-registration-form.component.html    # Form template
│   ├── vehicle-registration-form.component.scss    # Form styles
│   ├── vehicle-list.component.ts                   # Vehicle list component
│   ├── vehicle-list.component.html                 # List template
│   └── vehicle-list.component.scss                 # List styles
├── services/
│   └── vehicle-registration.service.ts             # Service with dummy data
├── models/
│   └── vehicle.model.ts                           # TypeScript interfaces
├── vehicle-registration.routes.ts                  # Module routes
└── README.md                                       # This file
```

## Installation & Setup

### 1. Add Routes to Main App

Update `src/app/app.routes.ts`:

```typescript
import { Routes } from '@angular/router';
import { VEHICLE_REGISTRATION_ROUTES } from './modules/vehicle-registration/vehicle-registration.routes';

export const routes: Routes = [
  {
    path: 'vehicles',
    loadChildren: () => VEHICLE_REGISTRATION_ROUTES
  },
  // ... other routes
];
```

### 2. Install Dependencies

The module uses standard Angular 17 dependencies:
- @angular/common
- @angular/forms (ReactiveFormsModule, FormsModule)
- @angular/router
- rxjs

These should already be installed in your project.

### 3. Run the Application

```bash
npm start
# or
ng serve
```

Navigate to:
- Vehicle List: `http://localhost:4200/vehicles/list`
- Registration Form: `http://localhost:4200/vehicles/register`

## Usage Guide

### Registering a New Vehicle

1. **Navigate to Registration**
   - Go to `/vehicles/register` or click "Register New Vehicle" button

2. **Step 1: Vehicle Details**
   - Enter registration number (Format: MH12AB1234)
   - Select vehicle type (Two Wheeler, Four Wheeler, Commercial, etc.)
   - Choose make from dropdown
   - Enter model, color, and year
   - Click "Next Step"

3. **Step 2: Owner Information**
   - Enter Owner ID (your user ID in the system)
   - Enter owner name
   - Select owner type (Resident, Tenant, Staff, etc.)
   - Optionally enter unit number and parking slot
   - Click "Next Step"

4. **Step 3: RFID/FASTag**
   - **RFID Tag** (Toggle ON/OFF)
     - Select tag type (Standard, Premium, Temporary)
     - Choose validity period in months
   - **FASTag** (Toggle ON/OFF)
     - Enter FASTag number
     - Enter account ID
     - Enter bank name
     - Select vehicle class
   - Click "Next Step"

5. **Step 4: Documents & Review**
   - Upload required documents (RC, License, Insurance, PUC, etc.)
   - Add any remarks or additional information
   - Review the summary
   - Click "Submit Registration"

### Viewing Registered Vehicles

1. **Navigate to Vehicle List**
   - Go to `/vehicles/list`

2. **Search & Filter**
   - Use search box to find vehicles by registration, owner, make, or model
   - Filter by vehicle type, approval status, or vehicle status
   - Click "Clear" to reset all filters

3. **View Modes**
   - **Card View**: Visual cards with key information
   - **Table View**: Detailed table with all vehicles

4. **Vehicle Details**
   - Click "View Details" on any vehicle card
   - Modal will show complete vehicle information including:
     - Basic vehicle details
     - Owner information
     - RFID tag details
     - FASTag information
     - Status and approval history

### Admin Actions

For vehicles with PENDING approval status:

1. **Approve Vehicle**
   - Open vehicle details modal
   - Click "Approve" button
   - Vehicle status changes to APPROVED

2. **Reject Vehicle**
   - Open vehicle details modal
   - Click "Reject" button
   - Enter rejection reason
   - Vehicle status changes to REJECTED

### RFID Scanning

Simulate RFID tag scanning:

1. Click "Scan RFID" button in vehicle list
2. Enter RFID tag number when prompted
3. System will:
   - Find vehicle with matching RFID tag
   - Update scan count and last scan time
   - Display access granted/denied message

## Data Models

### Vehicle
```typescript
interface Vehicle {
  id?: string;
  registrationNumber: string;
  vehicleType: VehicleType;
  make: string;
  model: string;
  color: string;
  year: number;
  ownerId: string;
  ownerName: string;
  ownerType: OwnerType;
  unitNumber?: string;
  rfidTag?: RFIDTag;
  fasTag?: FASTag;
  parkingSlot?: string;
  status: VehicleStatus;
  approvalStatus: ApprovalStatus;
  documents: VehicleDocument[];
  insuranceDetails?: InsuranceDetails;
  pucDetails?: PUCDetails;
  registrationDate: Date;
  expiryDate?: Date;
  lastModified: Date;
  createdBy: string;
  approvedBy?: string;
  remarks?: string;
}
```

### RFIDTag
```typescript
interface RFIDTag {
  tagId: string;
  tagNumber: string;
  issueDate: Date;
  expiryDate?: Date;
  status: RFIDStatus;
  lastScanned?: Date;
  scanCount: number;
  isActive: boolean;
  assignedDate: Date;
  assignedBy: string;
}
```

### FASTag
```typescript
interface FASTag {
  tagId: string;
  tagNumber: string;
  accountId: string;
  walletBalance: number;
  issueDate: Date;
  expiryDate: Date;
  status: FASTagStatus;
  vehicleClass: string;
  bankName: string;
  lastRecharge?: Date;
  isLinked: boolean;
  linkedDate?: Date;
}
```

## API Integration

### Current Implementation (Dummy Data)

The service currently uses RxJS observables with dummy data:

```typescript
registerVehicle(request: VehicleRegistrationRequest): Observable<VehicleRegistrationResponse>
issueRFIDTag(request: RFIDRegistrationRequest): Observable<RFIDIssueResponse>
linkFASTag(request: FASTagLinkRequest): Observable<FASTagLinkResponse>
getAllVehicles(): Observable<Vehicle[]>
getVehicleById(id: string): Observable<Vehicle | undefined>
searchByRegistration(registrationNumber: string): Observable<Vehicle[]>
approveVehicle(vehicleId: string, approvedBy: string): Observable<VehicleRegistrationResponse>
rejectVehicle(vehicleId: string, reason: string): Observable<VehicleRegistrationResponse>
scanRFIDTag(tagNumber: string): Observable<Vehicle | undefined>
```

### Integrating with Real API

To connect to your Spring Boot backend, update `vehicle-registration.service.ts`:

```typescript
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class VehicleRegistrationService {
  private apiUrl = 'http://your-api-url/api/vehicles';  // Your API URL

  constructor(private http: HttpClient) {}

  registerVehicle(request: VehicleRegistrationRequest): Observable<VehicleRegistrationResponse> {
    return this.http.post<VehicleRegistrationResponse>(`${this.apiUrl}/register`, request);
  }

  issueRFIDTag(request: RFIDRegistrationRequest): Observable<RFIDIssueResponse> {
    return this.http.post<RFIDIssueResponse>(`${this.apiUrl}/rfid/issue`, request);
  }

  linkFASTag(request: FASTagLinkRequest): Observable<FASTagLinkResponse> {
    return this.http.post<FASTagLinkResponse>(`${this.apiUrl}/fastag/link`, request);
  }

  getAllVehicles(): Observable<Vehicle[]> {
    return this.http.get<Vehicle[]>(this.apiUrl);
  }

  getVehicleById(id: string): Observable<Vehicle> {
    return this.http.get<Vehicle>(`${this.apiUrl}/${id}`);
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

## Backend API Endpoints (Expected)

Your Spring Boot backend should implement these endpoints:

```
POST   /api/vehicles/register              - Register new vehicle
POST   /api/vehicles/rfid/issue            - Issue RFID tag
POST   /api/vehicles/fastag/link           - Link FASTag
GET    /api/vehicles                       - Get all vehicles
GET    /api/vehicles/{id}                  - Get vehicle by ID
GET    /api/vehicles/owner/{ownerId}       - Get vehicles by owner
GET    /api/vehicles/search?registration={} - Search by registration
PUT    /api/vehicles/{id}/approve          - Approve vehicle
PUT    /api/vehicles/{id}/reject           - Reject vehicle
GET    /api/vehicles/rfid/scan/{tagNumber} - Scan RFID tag
```

## Customization

### Adding New Vehicle Types

Update `vehicle.model.ts`:

```typescript
export enum VehicleType {
  TWO_WHEELER = 'TWO_WHEELER',
  FOUR_WHEELER = 'FOUR_WHEELER',
  COMMERCIAL = 'COMMERCIAL',
  EMERGENCY = 'EMERGENCY',
  GUEST = 'GUEST',
  YOUR_NEW_TYPE = 'YOUR_NEW_TYPE'  // Add here
}
```

### Customizing Form Fields

Modify `vehicle-registration-form.component.ts`:

```typescript
private initializeForm(): void {
  this.registrationForm = this.fb.group({
    // Add your custom fields here
    customField: ['', Validators.required],
    // ... existing fields
  });
}
```

Update the template `vehicle-registration-form.component.html` accordingly.

### Styling Customization

All styles are in SCSS files:
- `vehicle-registration-form.component.scss` - Registration form styles
- `vehicle-list.component.scss` - Vehicle list styles

Modify colors, spacing, animations as needed.

## Features Checklist

- ✅ Multi-step registration wizard
- ✅ RFID tag integration
- ✅ FASTag linking
- ✅ Document upload system
- ✅ Approval workflow
- ✅ Advanced search & filters
- ✅ Card and table views
- ✅ Responsive design
- ✅ Status badges
- ✅ Modal detail view
- ✅ RFID scanning simulation
- ✅ Real-time validation
- ✅ Dummy data for testing
- ✅ TypeScript models
- ✅ Service layer ready for API integration

## Next Steps

1. **Connect to Backend API**
   - Replace dummy data in service with HTTP calls
   - Update API endpoints
   - Handle authentication/authorization

2. **Add More Features**
   - Vehicle history tracking
   - Parking slot management
   - Gate entry/exit logs
   - Payment integration
   - Notifications

3. **Enhanced Security**
   - Role-based access control
   - Encrypted RFID communication
   - Document verification

4. **Mobile App**
   - React Native or Flutter app
   - QR code scanning
   - Push notifications

## Support

For issues or questions:
- Check the code comments
- Review the models and interfaces
- Test with dummy data first
- Verify API endpoints match backend

## License

Part of Society Management Application - Internal Use
