import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GenericSocietyModuleComponent } from '../../shared/generic-society-module/generic-society-module.component';

@Component({
  selector: 'app-vendor-management',
  standalone: true,
  imports: [CommonModule, GenericSocietyModuleComponent],
  template: `<app-generic-society-module
    moduleCode="VENDOR_MANAGEMENT"
    title="Vendor Management"
    subtitle="Vendor database with rating system"
    icon="business"
  />`
})
export class VendorManagementComponent {}
