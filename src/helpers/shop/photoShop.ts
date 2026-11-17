// Developer by: Buildnexdev.in
// Devevloper : Nandhakumar@gmail.com
// Last Edited : 06-10-2026
export type ProductCategory = 'Photo Frames' | 'Photo Cups' | 'Photo Albums' | 'Photo Prints' | 'Customized Gifts' | 'Coming Soon';

export interface PhotoPlacement {
    x: number;
    y: number;
    width: number;
    height: number;
    aspectRatio: string;
    padding: number;
}

export interface ShopProduct {
    id: string;
    name: string;
    category: ProductCategory;
    description: string;
    price: number;
    discount: number;
    variants: string[];
    sizes: string[];
    stock: number;
    active: boolean;
    customizable: boolean;
    customizationPrice: number;
    image: string;
    frameOverlay: string;
    placement: PhotoPlacement;
    comingSoon?: boolean;
}

export interface PhotoAdjustment {
    x: number;
    y: number;
    zoom: number;
    rotation: number;
    fit: 'fit' | 'fill';
}

export interface ShopCartItem {
    id: string;
    productId: string;
    productName: string;
    image: string;
    variant: string;
    size: string;
    quantity: number;
    basePrice: number;
    customizationPrice: number;
    photo: string;
    preview: string;
    adjustment: PhotoAdjustment;
    placement: PhotoPlacement;
    text: string;
    lineTotal: number;
}

export type ShopOrderStatus = 'New Order' | 'Confirmed' | 'Photo Verification' | 'Design / Customization' | 'Production' | 'Ready' | 'Shipped' | 'Delivered';

export interface ShopOrder {
    id: string;
    createdAt: string;
    customer: { name: string; mobile: string; email: string; address: string; city: string; state: string; pincode: string; instructions: string };
    items: ShopCartItem[];
    subtotal: number;
    customization: number;
    delivery: number;
    discount: number;
    total: number;
    payment: string;
    paymentStatus: 'Pending' | 'Paid';
    status: ShopOrderStatus;
    trackingNumber?: string | null;
    courierPartner?: string | null;
}

export interface ProductType {
    id: string;
    name: string;
    code: string;
    description: string;
    icon: string;
    active: boolean;
}

export const SHOP_CATEGORIES: ProductCategory[] = ['Photo Frames', 'Photo Cups', 'Photo Albums', 'Photo Prints', 'Customized Gifts', 'Coming Soon'];
export const SHOP_ORDER_STATUSES: ShopOrderStatus[] = ['New Order', 'Confirmed', 'Photo Verification', 'Design / Customization', 'Production', 'Ready', 'Shipped', 'Delivered'];

const STORAGE = { types: 'photolab.shop.types.v1', products: 'photolab.shop.products.v1', cart: 'photolab.shop.cart.v1', orders: 'photolab.shop.orders.v1', wishlist: 'photolab.shop.wishlist.v1' } as const;

export const DEMO_TYPE_IDS = new Set([
    'type-frames',
    'type-albums',
    'type-prints',
    'type-cups',
    'type-gifts',
    'type-coming',
]);

export const DEMO_PRODUCT_IDS = new Set([
    'frame-classic',
    'frame-gallery',
    'album-heirloom',
    'prints-fineart',
    'cup-photo',
    'gift-keepsake',
    'cs-3d-photo',
    'cs-pencil-art',
    'cs-led-frame',
    'cs-magic-mug',
    'cs-phone-case',
    'cs-photo-pillow',
    'test',
]);

export const seededProductTypes: ProductType[] = [];

const seededProducts: ShopProduct[] = [];

function read<T>(key: string, fallback: T): T {
    if (typeof window === 'undefined') return fallback;
    try {
        const raw = window.localStorage.getItem(key);
        return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
        return fallback;
    }
}

function write<T>(key: string, value: T): void {
    if (typeof window !== 'undefined') window.localStorage.setItem(key, JSON.stringify(value));
}

export const getProductTypes = (): ProductType[] => {
    const list = read<ProductType[]>(STORAGE.types, seededProductTypes);
    return Array.isArray(list) ? list.filter((t) => t && !DEMO_TYPE_IDS.has(t.id)) : [];
};
export const saveProductTypes = (types: ProductType[]) => write(STORAGE.types, types);
const DEFAULT_PLACEMENT: PhotoPlacement = { x: 15, y: 12, width: 70, height: 76, aspectRatio: '4:5', padding: 4 };

const stringList = (value: unknown): string[] => (Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []);

// Must match productPrice() on the public website: values of 10000+ are stored in paise.
const rupees = (value: unknown) => {
    const n = Number(value) || 0;
    return n >= 10000 ? Math.round(n / 100) : Math.round(n);
};

const toCategory = (value: unknown): ProductCategory => {
    const text = String(value ?? '');
    const exact = SHOP_CATEGORIES.find((c) => c.toLowerCase() === text.toLowerCase());
    if (exact) return exact;
    if (/album/i.test(text)) return 'Photo Albums';
    if (/frame/i.test(text)) return 'Photo Frames';
    if (/cup|mug/i.test(text)) return 'Photo Cups';
    if (/gift|keepsake|box/i.test(text)) return 'Customized Gifts';
    return 'Photo Prints';
};

// Website settings store a slimmer product shape, so fill anything the shop needs.
export function normalizeProduct(raw: Partial<ShopProduct> & Record<string, unknown>): ShopProduct {
    return {
        id: String(raw.id ?? crypto.randomUUID()),
        name: String(raw.name ?? ''),
        category: toCategory(raw.category ?? raw.name),
        description: String(raw.description ?? ''),
        price: rupees(raw.price),
        discount: Number(raw.discount) || 0,
        variants: stringList(raw.variants),
        sizes: stringList(raw.sizes),
        stock: Number.isFinite(Number(raw.stock)) ? Number(raw.stock) : 0,
        active: raw.active ?? true,
        customizable: raw.customizable ?? false,
        customizationPrice: rupees(raw.customizationPrice),
        image: typeof raw.image === 'string' && raw.image ? raw.image : '/images/hero-couple-petals.jpg',
        frameOverlay: typeof raw.frameOverlay === 'string' ? raw.frameOverlay : '',
        placement: { ...DEFAULT_PLACEMENT, ...(raw.placement ?? {}) },
    };
}

export const normalizeProducts = (list: unknown): ShopProduct[] =>
    Array.isArray(list)
        ? list
              .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
              .filter((item) => !DEMO_PRODUCT_IDS.has(String(item.id ?? '')))
              .map(normalizeProduct)
        : [];

export const getProducts = (): ShopProduct[] => {
    const list = normalizeProducts(read<unknown>(STORAGE.products, seededProducts));
    return list.filter((p) => !DEMO_PRODUCT_IDS.has(p.id));
};
export const saveProducts = (products: ShopProduct[]) => write(STORAGE.products, products);
export const getCart = () => read<ShopCartItem[]>(STORAGE.cart, []);
export const saveCart = (cart: ShopCartItem[]) => write(STORAGE.cart, cart);
export const getOrders = () => read<ShopOrder[]>(STORAGE.orders, []);
export const saveOrders = (orders: ShopOrder[]) => write(STORAGE.orders, orders);
export const getWishlist = () => read<string[]>(STORAGE.wishlist, []);
export const saveWishlist = (ids: string[]) => write(STORAGE.wishlist, ids);
export const toggleWishlistHelper = (id: string): string[] => {
    const current = getWishlist();
    const updated = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    saveWishlist(updated);
    return updated;
};

export async function imageFileToDataUrl(file: File, maxEdge = 1800): Promise<string> {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error('Choose a JPG, PNG or WebP image.');
    const source = await new Promise<HTMLImageElement>((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const image = new Image();
        image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
        image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('This image could not be opened.')); };
        image.src = url;
    });
    const scale = Math.min(1, maxEdge / Math.max(source.naturalWidth, source.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(source.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(source.naturalHeight * scale));
    canvas.getContext('2d')!.drawImage(source, 0, 0, canvas.width, canvas.height);
    return file.type === 'image/png' ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', 0.86);
}