import { Routes } from '@angular/router';
import { VehicleRegistrationFormComponent } from './components/vehicle-registration-form.component';
import { VehicleListComponent } from './components/vehicle-list.component';

export const VEHICLE_REGISTRATION_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'list',
    pathMatch: 'full'
  },
  {
    path: 'list',
    component: VehicleListComponent,
    title: 'Registered Vehicles'
  },
  {
    path: 'register',
    component: VehicleRegistrationFormComponent,
    title: 'Vehicle Registration'
  }
];
