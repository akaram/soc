import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GenericSocietyModuleComponent } from '../../shared/generic-society-module/generic-society-module.component';

@Component({
  selector: 'app-agm',
  standalone: true,
  imports: [CommonModule, GenericSocietyModuleComponent],
  template: `<app-generic-society-module
    moduleCode="AGM"
    title="AGM Management"
    subtitle="Annual General Meeting with secret ballot"
    icon="how_to_vote"
  />`
})
export class AgmComponent {}
