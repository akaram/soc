import { Routes } from '@angular/router';
import { FamilyMemberListComponent } from './components/family-member-list.component';

export const FAMILY_MANAGEMENT_ROUTES: Routes = [
  {
    path: '',
    component: FamilyMemberListComponent,
    title: 'Family Members'
  }
];
