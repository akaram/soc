import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GenericSocietyModuleComponent } from '../../shared/generic-society-module/generic-society-module.component';

@Component({
  selector: 'app-parking',
  standalone: true,
  imports: [CommonModule, GenericSocietyModuleComponent],
  template: `<app-generic-society-module
    moduleCode="PARKING"
    title="Smart Parking"
    subtitle="IoT-based parking slot management"
    icon="local_parking"
  />`
})
export class ParkingComponent {}
