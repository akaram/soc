import { Routes } from '@angular/router';
import { FacialRecognitionListComponent } from './components/facial-recognition-list.component';
import { FacialRecognitionFormComponent } from './components/facial-recognition-form.component';
import { FacialRecognitionVerifyComponent } from './components/facial-recognition-verify.component';
import { FacialRecognitionDetailComponent } from './components/facial-recognition-detail.component';
import { ANPRListComponent } from './components/anpr-list.component';
import { ANPRFormComponent } from './components/anpr-form.component';
import { ANPRDetectComponent } from './components/anpr-detect.component';
import { ANPREntriesComponent } from './components/anpr-entries.component';
import { ANPRDetailComponent } from './components/anpr-detail.component';
import { RFIDFastagListComponent } from './components/rfid-fastag-list.component';
import { RFIDFastagFormComponent } from './components/rfid-fastag-form.component';
import { RFIDFastagDetectComponent } from './components/rfid-fastag-detect.component';
import { RFIDFastagEntriesComponent } from './components/rfid-fastag-entries.component';
import { RFIDFastagDetailComponent } from './components/rfid-fastag-detail.component';
import { GateCameraFeedComponent } from './components/gate-camera-feed.component';
import { GateCameraFullscreenComponent } from './components/gate-camera-fullscreen.component';
import { GateCameraSettingsComponent } from './components/gate-camera-settings.component';
import { EIntercomComponent } from './components/e-intercom.component';
import { IVRManagementComponent } from './components/ivr-management.component';
import { VideoCallingComponent } from './components/video-calling.component';
import { VisitorPhotoGalleryComponent } from './components/visitor-photo-gallery.component';
import { VisitorPhotoCaptureComponent } from './components/visitor-photo-capture.component';
import { BlacklistListComponent } from './components/blacklist-list.component';
import { BlacklistFormComponent } from './components/blacklist-form.component';
import { InvestigationListComponent } from './components/investigation-list.component';
import { InvestigationFormComponent } from './components/investigation-form.component';
import { EmptyFlatLogsComponent } from './components/empty-flat-logs.component';
import { GateHardwareAuditComponent } from './components/gate-hardware-audit.component';

export const GATE_SECURITY_ROUTES: Routes = [
  {
    path: 'dashboard',
    redirectTo: '/admin/gate-security',
    pathMatch: 'full'
  },
  {
    path: 'facial-recognition',
    component: FacialRecognitionListComponent,
    title: 'Facial Recognition'
  },
  {
    path: 'facial-recognition/add',
    component: FacialRecognitionFormComponent,
    title: 'Register Face'
  },
  {
    path: 'facial-recognition/verify',
    component: FacialRecognitionVerifyComponent,
    title: 'Face Verification'
  },
  {
    path: 'facial-recognition/:id',
    component: FacialRecognitionDetailComponent,
    title: 'Face Profile Details'
  },
  {
    path: 'anpr',
    component: ANPRListComponent,
    title: 'ANPR - Automatic Number Plate Recognition'
  },
  {
    path: 'anpr/add',
    component: ANPRFormComponent,
    title: 'Register Vehicle'
  },
  {
    path: 'anpr/detect',
    component: ANPRDetectComponent,
    title: 'ANPR Detection'
  },
  {
    path: 'anpr/entries',
    component: ANPREntriesComponent,
    title: 'ANPR Entry History'
  },
  {
    path: 'anpr/:id',
    component: ANPRDetailComponent,
    title: 'Vehicle Registration Details'
  },
  {
    path: 'rfid-fastag',
    component: RFIDFastagListComponent,
    title: 'RFID/FASTag - Automatic Gate Opening'
  },
  {
    path: 'rfid-fastag/add',
    component: RFIDFastagFormComponent,
    title: 'Register RFID/FASTag'
  },
  {
    path: 'rfid-fastag/detect',
    component: RFIDFastagDetectComponent,
    title: 'Test Tag Detection'
  },
  {
    path: 'rfid-fastag/entries',
    component: RFIDFastagEntriesComponent,
    title: 'RFID Entry History'
  },
  {
    path: 'rfid-fastag/:id',
    component: RFIDFastagDetailComponent,
    title: 'Tag Registration Details'
  },
  {
    path: 'camera-feed',
    component: GateCameraFeedComponent,
    title: 'Live Gate Camera Feed'
  },
  {
    path: 'camera-feed/:id/fullscreen',
    component: GateCameraFullscreenComponent,
    title: 'Full Screen Camera View'
  },
  {
    path: 'camera-feed/:id/settings',
    component: GateCameraSettingsComponent,
    title: 'Camera Settings'
  },
  {
    path: 'e-intercom',
    component: EIntercomComponent,
    title: 'E-Intercom'
  },
  {
    path: 'ivr',
    component: IVRManagementComponent,
    title: 'IVR - Interactive Voice Response'
  },
  {
    path: 'ivr/:id',
    component: IVRManagementComponent, // Will create detail component later
    title: 'IVR Call Details'
  },
  {
    path: 'video-calling',
    component: VideoCallingComponent,
    title: 'Video Calling with Guard'
  },
  {
    path: 'visitor-photos',
    component: VisitorPhotoGalleryComponent,
    title: 'Visitor Photo Gallery'
  },
  {
    path: 'visitor-photos/capture',
    component: VisitorPhotoCaptureComponent,
    title: 'Capture Visitor Photo'
  },
  {
    path: 'blacklist',
    component: BlacklistListComponent,
    title: 'Blacklist Management'
  },
  {
    path: 'blacklist/add',
    component: BlacklistFormComponent,
    title: 'Add to Blacklist'
  },
  {
    path: 'blacklist/:id',
    component: BlacklistListComponent, // Will show details in modal or separate view
    title: 'Blacklist Entry Details'
  },
  {
    path: 'blacklist/:id/edit',
    component: BlacklistFormComponent,
    title: 'Edit Blacklist Entry'
  },
  {
    path: 'investigation',
    component: InvestigationListComponent,
    title: 'Investigation Module'
  },
  {
    path: 'investigation/add',
    component: InvestigationFormComponent,
    title: 'New Investigation'
  },
  {
    path: 'investigation/:id',
    component: InvestigationListComponent, // Will show details
    title: 'Investigation Details'
  },
  {
    path: 'investigation/:id/edit',
    component: InvestigationFormComponent,
    title: 'Edit Investigation'
  },
  {
    path: 'empty-flat-logs',
    component: EmptyFlatLogsComponent,
    title: 'Empty Flat Logs'
  },
  {
    path: 'hardware-audit',
    component: GateHardwareAuditComponent,
    title: 'Gate Hardware Audit'
  }
];

