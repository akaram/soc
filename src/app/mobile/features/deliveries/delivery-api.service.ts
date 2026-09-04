/** Re-export shared deliveries API for mobile feature module */
export {
  DeliveriesApiService,
  DeliveryRow,
  DELIVERY_TYPES,
  DELIVERY_STATUSES
} from '../../../core/services/deliveries-api.service';

/** @deprecated Use DeliveryRow from core deliveries-api.service */
export type DeliveryUi = import('../../../core/services/deliveries-api.service').DeliveryRow;
