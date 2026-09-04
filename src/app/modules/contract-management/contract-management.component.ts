import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GenericSocietyModuleComponent } from '../../shared/generic-society-module/generic-society-module.component';

@Component({
  selector: 'app-contract-management',
  standalone: true,
  imports: [CommonModule, GenericSocietyModuleComponent],
  template: `<app-generic-society-module
    moduleCode="CONTRACT_MANAGEMENT"
    title="Contract Management"
    subtitle="AMC tracking and contract renewals"
    icon="description"
  />`
})
export class ContractManagementComponent {}
