import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GenericSocietyModuleComponent } from '../../shared/generic-society-module/generic-society-module.component';

@Component({
  selector: 'app-marketplace',
  standalone: true,
  imports: [CommonModule, GenericSocietyModuleComponent],
  template: `<app-generic-society-module
    moduleCode="MARKETPLACE"
    title="Society Marketplace"
    subtitle="Buy/sell/rent classifieds"
    icon="storefront"
  />`
})
export class MarketplaceComponent {}
