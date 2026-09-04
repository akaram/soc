import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GenericSocietyModuleComponent } from '../../shared/generic-society-module/generic-society-module.component';

@Component({
  selector: 'app-community',
  standalone: true,
  imports: [CommonModule, GenericSocietyModuleComponent],
  template: `<app-generic-society-module
    moduleCode="COMMUNITY"
    title="Community Feed"
    subtitle="Social features and discussion forums"
    icon="forum"
  />`
})
export class CommunityComponent {}
