import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GenericSocietyModuleComponent } from '../../shared/generic-society-module/generic-society-module.component';

@Component({
  selector: 'app-events',
  standalone: true,
  imports: [CommonModule, GenericSocietyModuleComponent],
  template: `<app-generic-society-module
    moduleCode="EVENTS"
    title="Event Management"
    subtitle="Organize society events and gatherings"
    icon="celebration"
  />`
})
export class EventsComponent {}
