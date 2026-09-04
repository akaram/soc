import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GenericSocietyModuleComponent } from '../../shared/generic-society-module/generic-society-module.component';

/** Admin CRUD for society announcements shown on mobile My Society. */
@Component({
  selector: 'app-announcements',
  standalone: true,
  imports: [CommonModule, GenericSocietyModuleComponent],
  template: `<app-generic-society-module
    moduleCode="ANNOUNCEMENT"
    title="Announcements"
    subtitle="Notices published here appear on the mobile My Society page"
    icon="campaign"
    statusLabel="Category"
    [statusOptions]="categoryOptions"
  />`
})
export class AnnouncementsComponent {
  categoryOptions = [
    { value: 'General', label: 'General' },
    { value: 'Meeting', label: 'Meeting' },
    { value: 'Maintenance', label: 'Maintenance' },
    { value: 'Event', label: 'Event' },
    { value: 'Emergency', label: 'Emergency' },
    { value: 'DRAFT', label: 'Draft (hidden on mobile)' }
  ];
}
