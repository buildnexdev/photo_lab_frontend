import { combineReducers } from 'redux';
import { authReducer } from './auth/auth.reducer';
import { companyReducer } from './companies/companies.reducer';
import { assetReducer } from './assets/assets.reducer';
import { staffReducer } from './staff/staff.reducer';
import { eventReducer } from './events/events.reducer';
import { reportReducer } from './reports/reports.reducer';
import { shopReducer } from './shop/shop.reducer';
import { customerReducer } from './customers/customers.reducer';
import { bookingReducer } from './bookings/bookings.reducer';
import { galleryReducer } from './galleries/galleries.reducer';
import { orderReducer } from './orders/orders.reducer';
import { paymentReducer } from './payments/payments.reducer';
import { photographerReducer } from './photographer/photographer.reducer';
import { editorReducer } from './editor/editor.reducer';
import { deliveryReducer } from './delivery/delivery.reducer';
import { notificationReducer } from './notifications/notifications.reducer';
import { settingsReducer } from './settings/settings.reducer';
import { auditReducer } from './audit/audit.reducer';
import { siteReducer } from './site/site.reducer';

export const rootReducer = combineReducers({
    auth: authReducer,
    company: companyReducer,
    asset: assetReducer,
    staff: staffReducer,
    event: eventReducer,
    report: reportReducer,
    shop: shopReducer,
    customer: customerReducer,
    booking: bookingReducer,
    gallery: galleryReducer,
    order: orderReducer,
    payment: paymentReducer,
    photographer: photographerReducer,
    editor: editorReducer,
    delivery: deliveryReducer,
    notification: notificationReducer,
    settings: settingsReducer,
    audit: auditReducer,
    site: siteReducer,
});

export type RootState = ReturnType<typeof rootReducer>;
