import { Routes } from '@angular/router';
import { HardwareIntegrationComponent } from './hardware-integration.component';
import { RFIDReaderListComponent } from './components/rfid-reader-list.component';
import { RFIDReaderFormComponent } from './components/rfid-reader-form.component';
import { DeviceFormComponent } from './components/device-form.component';
import { DeviceDetailComponent } from './components/device-detail.component';
import { BiometricDeviceListComponent } from './components/biometric-device-list.component';
import { BiometricDeviceFormComponent } from './components/biometric-device-form.component';
import { BiometricDeviceDetailComponent } from './components/biometric-device-detail.component';
import { ANPRCameraListComponent } from './components/anpr-camera-list.component';
import { ANPRCameraFormComponent } from './components/anpr-camera-form.component';
import { ANPRCameraDetailComponent } from './components/anpr-camera-detail.component';
import { BoomBarrierListComponent } from './components/boom-barrier-list.component';
import { BoomBarrierFormComponent } from './components/boom-barrier-form.component';
import { BoomBarrierDetailComponent } from './components/boom-barrier-detail.component';
import { AccessControlListComponent } from './components/access-control-list.component';
import { AccessControlFormComponent } from './components/access-control-form.component';
import { AccessControlDetailComponent } from './components/access-control-detail.component';

export const HARDWARE_INTEGRATION_ROUTES: Routes = [
  {
    path: '',
    component: HardwareIntegrationComponent,
    title: 'Hardware Integration'
  },
  {
    path: 'rfid-readers',
    component: RFIDReaderListComponent,
    title: 'RFID/Smart Card Readers'
  },
  {
    path: 'rfid-readers/add',
    component: RFIDReaderFormComponent,
    title: 'Add RFID/Smart Card Reader'
  },
  {
    path: 'rfid-readers/:id',
    component: RFIDReaderListComponent, // Will show details
    title: 'Reader Details'
  },
  {
    path: 'rfid-readers/:id/edit',
    component: RFIDReaderFormComponent,
    title: 'Edit RFID/Smart Card Reader'
  },
  {
    path: 'biometric-devices',
    component: BiometricDeviceListComponent,
    title: 'Biometric Devices'
  },
  {
    path: 'biometric-devices/add',
    component: BiometricDeviceFormComponent,
    title: 'Add Biometric Device'
  },
  {
    path: 'biometric-devices/:id',
    component: BiometricDeviceDetailComponent,
    title: 'Biometric Device Details'
  },
  {
    path: 'biometric-devices/:id/edit',
    component: BiometricDeviceFormComponent,
    title: 'Edit Biometric Device'
  },
  {
    path: 'anpr-cameras',
    component: ANPRCameraListComponent,
    title: 'ANPR Cameras'
  },
  {
    path: 'anpr-cameras/add',
    component: ANPRCameraFormComponent,
    title: 'Add ANPR Camera'
  },
  {
    path: 'anpr-cameras/:id',
    component: ANPRCameraDetailComponent,
    title: 'ANPR Camera Details'
  },
  {
    path: 'anpr-cameras/:id/edit',
    component: ANPRCameraFormComponent,
    title: 'Edit ANPR Camera'
  },
  {
    path: 'boom-barriers',
    component: BoomBarrierListComponent,
    title: 'Boom Barriers'
  },
  {
    path: 'boom-barriers/add',
    component: BoomBarrierFormComponent,
    title: 'Add Boom Barrier'
  },
  {
    path: 'boom-barriers/:id',
    component: BoomBarrierDetailComponent,
    title: 'Boom Barrier Details'
  },
  {
    path: 'boom-barriers/:id/edit',
    component: BoomBarrierFormComponent,
    title: 'Edit Boom Barrier'
  },
  {
    path: 'access-control',
    component: AccessControlListComponent,
    title: 'Access Control Systems'
  },
  {
    path: 'access-control/add',
    component: AccessControlFormComponent,
    title: 'Add Access Control System'
  },
  {
    path: 'access-control/:id',
    component: AccessControlDetailComponent,
    title: 'Access Control System Details'
  },
  {
    path: 'access-control/:id/edit',
    component: AccessControlFormComponent,
    title: 'Edit Access Control System'
  },
  {
    path: 'add',
    component: DeviceFormComponent,
    title: 'Add Hardware Device'
  },
  {
    path: ':id/edit',
    component: DeviceFormComponent,
    title: 'Edit Device'
  },
  {
    path: ':id',
    component: DeviceDetailComponent,
    title: 'Device Details'
  }
];

