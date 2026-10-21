// Developer by: Buildnexdev.in
// Devevloper : Nandhakumar@gmail.com
// Last Edited : 06-10-2026
/* Shapes returned by the API (snake_case columns as served). Money is always in paise. */

export type BookingStatus = 'ENQUIRY' | 'QUOTED' | 'ADVANCE_PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED';
export const BOOKING_STATUSES: BookingStatus[] = ['ENQUIRY', 'QUOTED', 'ADVANCE_PENDING', 'CONFIRMED', 'IN_PROGRESS', 'DELIVERED', 'COMPLETED', 'CANCELLED'];

export type EventStatus = 'UPCOMING' | 'LIVE' | 'UPLOADING' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED';
export const EVENT_STATUSES: EventStatus[] = ['UPCOMING', 'LIVE', 'UPLOADING', 'PROCESSING', 'COMPLETED', 'CANCELLED'];

export type OrderStatus = 'CREATED' | 'PAID' | 'PROCESSING' | 'READY' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED';
export const ORDER_STATUSES: OrderStatus[] = ['CREATED', 'PAID', 'PROCESSING', 'READY', 'DELIVERED', 'COMPLETED', 'CANCELLED'];
export type OrderType = 'PHOTO_DOWNLOAD' | 'ALBUM' | 'PRINT' | 'FRAME' | 'CANVAS' | 'PACKAGE';
export const ORDER_TYPES: OrderType[] = ['PHOTO_DOWNLOAD', 'ALBUM', 'PRINT', 'FRAME', 'CANVAS', 'PACKAGE'];
export const ORDER_TYPE_LABELS: Record<OrderType, string> = { PHOTO_DOWNLOAD: 'HD photos', ALBUM: 'Printed album', PRINT: 'Prints', FRAME: 'Frames', CANVAS: 'Canvas', PACKAGE: 'Package' };

export const GALLERY_STATUSES = ['DRAFT', 'LIVE', 'PUBLISHED', 'ARCHIVED'] as const;
export type GalleryStatus = (typeof GALLERY_STATUSES)[number];

export const PHOTO_STATUSES = ['UPLOADED', 'PROCESSING', 'PREVIEW', 'SELECTED', 'EDITING', 'EDITED', 'APPROVED', 'DELIVERED'] as const;
export type PhotoStatus = (typeof PHOTO_STATUSES)[number];
export const PHOTO_CATEGORIES = ['SINGLE', 'COUPLE', 'FAMILY', 'GROUP', 'OTHER'] as const;

export type PaymentStatus = 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
export const PAYMENT_STATUSES: PaymentStatus[] = ['PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'REFUNDED'];
export const PAYMENT_PURPOSES = ['ADVANCE', 'BALANCE', 'PHOTO_PURCHASE', 'PACKAGE', 'HD_UNLOCK', 'PRINT', 'ALBUM'] as const;

export interface BookingRow {
    id: number;
    booking_no: string;
    event_type: string;
    event_date: string;
    start_time: string | null;
    venue: string | null;
    status: BookingStatus;
    total_amount: number;
    advance_amount: number;
    paid_amount: number;
    source: string;
    created_at: string;
    customer_id: number;
    customer_name: string;
    customer_phone: string | null;
    customer_email: string | null;
    package_name: string | null;
    service_name: string | null;
    event_id: number | null;
}

export interface QuotationItem {
    id: number;
    description: string;
    quantity: number;
    unit_price: number;
    total: number;
}

export interface Quotation {
    id: number;
    quotation_no: string;
    status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
    subtotal: number;
    discount: number;
    tax_percent: string | number;
    tax: number;
    total: number;
    advance_amount: number;
    valid_until: string | null;
    notes: string | null;
    terms: string | null;
    sent_at: string | null;
    responded_at: string | null;
    created_at: string;
    items: QuotationItem[];
}

export interface PaymentLine {
    id: number;
    payment_no: string;
    purpose?: string;
    amount: number;
    refunded_amount?: number;
    status: PaymentStatus;
    method: string | null;
    provider: string;
    paid_at: string | null;
    created_at: string;
}

export interface BookingDetail extends Omit<BookingRow, 'event_id'> {
    service_id: number | null;
    package_id: number | null;
    end_time: string | null;
    guests: number | null;
    message: string | null;
    internal_notes?: string | null;
    customer_city: string | null;
    includes_digital: number | null;
    includes_album: number | null;
    coupon_code: string | null;
    confirmed_at: string | null;
    cancelled_at: string | null;
    balance_due: number;
    advance_due: number;
    can_pay_advance: boolean;
    can_pay_balance: boolean;
    quotations: Quotation[];
    payments: PaymentLine[];
    event: { id: number; event_code: string; title: string; status: EventStatus } | null;
}

export interface EventRow {
    id: number;
    event_code: string;
    title: string;
    event_type: string;
    event_date: string;
    start_time: string | null;
    end_time?: string | null;
    venue: string | null;
    status: EventStatus;
    customer_id: number;
    customer_name?: string;
    booking_id?: number | null;
    booking_no?: string | null;
    photo_count: number;
    photographers?: string | null;
    gallery_id: number | null;
    gallery_status?: string | null;
    payment_status?: string | null;
    expires_at?: string | null;
}

export interface Address {
    name: string;
    phone: string;
    line1: string;
    line2?: string | null;
    city: string;
    state: string;
    pincode: string;
}

export interface OrderRow {
    id: number;
    order_no: string;
    type: OrderType;
    status: OrderStatus;
    total: number;
    delivery_method: 'DIGITAL' | 'PICKUP' | 'COURIER';
    paid_at: string | null;
    created_at: string;
    event_id: number | null;
    customer_id: number;
    customer_name: string;
    customer_phone: string | null;
    event_title: string | null;
    item_count: number;
    delivery_status: string | null;
}

export interface OrderItem {
    id: number;
    item_type: OrderType;
    photo_id: number | null;
    package_id: number | null;
    description: string;
    size: string | null;
    quantity: number;
    unit_price: number;
    total: number;
    thumb_url: string | null;
}

export interface PrintJob {
    id: number;
    order_id: number;
    kind: string;
    photo_id: number;
    size: string;
    quantity: number;
    status: string;
    assigned_to: number | null;
    assigned_name: string | null;
    notes: string | null;
}

export interface DeliveryInfo {
    id: number;
    order_id: number;
    method: 'PICKUP' | 'COURIER' | 'HAND_DELIVERY';
    address: Address | string | null;
    status: string;
    courier: string | null;
    tracking_no: string | null;
    assigned_to: number | null;
    notes: string | null;
    dispatched_at: string | null;
    delivered_at: string | null;
}

export interface OrderDetail extends Omit<OrderRow, 'item_count' | 'delivery_status'> {
    subtotal: number;
    discount: number;
    tax: number;
    customer_email: string | null;
    coupon_code: string | null;
    shipping_address: Address | string | null;
    notes: string | null;
    completed_at: string | null;
    items: OrderItem[];
    payments: PaymentLine[];
    prints: PrintJob[];
    delivery: DeliveryInfo | null;
    invoice: { id: number; invoice_no: string } | null;
    can_pay: boolean;
}

export interface PaymentRow {
    id: number;
    payment_no: string;
    purpose: string;
    amount: number;
    refunded_amount: number;
    currency: string;
    status: PaymentStatus;
    provider: string;
    provider_payment_id: string | null;
    method: string | null;
    failure_reason: string | null;
    paid_at: string | null;
    created_at: string;
    customer_id: number;
    customer_name: string;
    booking_no: string | null;
    order_no: string | null;
    invoice_id: number | null;
    invoice_no: string | null;
}

export interface Proof {
    id: number;
    event_id: number;
    event_title?: string;
    version: number;
    title: string;
    status: 'DRAFT' | 'SENT' | 'APPROVED' | 'REVISION_REQUESTED';
    customer_note: string | null;
    page_count?: number;
    cover_url?: string | null;
    open_revisions?: number;
    sent_at: string | null;
    approved_at: string | null;
    created_at: string;
}

export interface ProofDetail extends Proof {
    pages: { index: number; name: string; url: string }[];
    revisions: { id: number; notes: string; page_refs: string | null; status: 'OPEN' | 'RESOLVED'; requested_by_name?: string; resolved_at: string | null; created_at: string }[];
    can_respond: boolean;
}

export const parseAddress = (a: Address | string | null | undefined): Address | null => {
    if (!a) return null;
    if (typeof a === 'string') {
        try {
            return JSON.parse(a) as Address;
        } catch {
            return null;
        }
    }
    return a;
};

export const formatAddress = (a: Address | string | null | undefined) => {
    const v = parseAddress(a);
    return v ? [v.name, v.phone, v.line1, v.line2, `${v.city}, ${v.state} ${v.pincode}`].filter(Boolean).join('\n') : null;
};
