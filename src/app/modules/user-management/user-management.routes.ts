import { Routes } from '@angular/router';
import { UserListComponent } from './components/user-list.component';
import { StaffUserFormComponent } from './components/staff-user-form.component';

export const USER_MANAGEMENT_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'list',
    pathMatch: 'full'
  },
  {
    path: 'list',
    component: UserListComponent,
    title: 'Registered Users'
  },
  {
    path: 'staff/create',
    component: StaffUserFormComponent,
    title: 'Add Staff User'
  },
  {
    path: 'staff/create/guard',
    component: StaffUserFormComponent,
    title: 'Add Security Guard'
  },
  {
    path: 'staff/edit/:id',
    component: StaffUserFormComponent,
    title: 'Edit Staff User'
  }
];
