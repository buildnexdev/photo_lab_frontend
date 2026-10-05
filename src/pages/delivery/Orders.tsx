import { OrdersTable } from '../admin/Orders';

export default function DeliveryOrders() {
    return <OrdersTable base="delivery" title="Orders" subtitle="Paid orders moving through production and delivery." />;
}
