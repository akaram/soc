import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GenericSocietyModuleComponent } from '../../shared/generic-society-module/generic-society-module.component';

@Component({
  selector: 'app-move-management',
  standalone: true,
  imports: [CommonModule, GenericSocietyModuleComponent],
  template: `<app-generic-society-module
    moduleCode="MOVE_MANAGEMENT"
    title="Move In/Out Management"
    subtitle="Complete relocation workflow"
    icon="moving"
  />`
})
export class MoveManagementComponent {}
