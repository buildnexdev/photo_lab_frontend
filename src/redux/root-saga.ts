import { all, fork } from 'redux-saga/effects';
import { authSaga } from './auth/auth.saga';
import { companySaga } from './companies/companies.saga';
import { assetSaga } from './assets/assets.saga';
import { staffSaga } from './staff/staff.saga';
import { eventSaga } from './events/events.saga';
import { reportSaga } from './reports/reports.saga';
import { shopSaga } from './shop/shop.saga';
import { customerSaga } from './customers/customers.saga';
import { bookingSaga } from './bookings/bookings.saga';
import { gallerySaga } from './galleries/galleries.saga';
import { orderSaga } from './orders/orders.saga';
import { paymentSaga } from './payments/payments.saga';
import { photographerSaga } from './photographer/photographer.saga';
import { editorSaga } from './editor/editor.saga';
import { deliverySaga } from './delivery/delivery.saga';
import { notificationSaga } from './notifications/notifications.saga';
import { settingsSaga } from './settings/settings.saga';
import { auditSaga } from './audit/audit.saga';
import { siteSaga } from './site/site.saga';

export function* rootSaga() {
    yield all([
        fork(authSaga),
        fork(companySaga),
        fork(assetSaga),
        fork(staffSaga),
        fork(eventSaga),
        fork(reportSaga),
        fork(shopSaga),
        fork(customerSaga),
        fork(bookingSaga),
        fork(gallerySaga),
        fork(orderSaga),
        fork(paymentSaga),
        fork(photographerSaga),
        fork(editorSaga),
        fork(deliverySaga),
        fork(notificationSaga),
        fork(settingsSaga),
        fork(auditSaga),
        fork(siteSaga),
    ]);
}
