export type ProductCategory = 'Photo Frames' | 'Photo Cups' | 'Photo Albums' | 'Photo Prints' | 'Customized Gifts';

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
}

export interface ProductType {
    id: string;
    name: string;
    code: string;
    description: string;
    icon: string;
    active: boolean;
}

export const SHOP_CATEGORIES: ProductCategory[] = ['Photo Frames', 'Photo Cups', 'Photo Albums', 'Photo Prints', 'Customized Gifts'];
export const SHOP_ORDER_STATUSES: ShopOrderStatus[] = ['New Order', 'Confirmed', 'Photo Verification', 'Design / Customization', 'Production', 'Ready', 'Shipped', 'Delivered'];

const STORAGE = { types: 'photolab.shop.types.v1', products: 'photolab.shop.products.v1', cart: 'photolab.shop.cart.v1', orders: 'photolab.shop.orders.v1' } as const;

export const seededProductTypes: ProductType[] = [
    { id: 'type-frames', name: 'Photo Frames', code: 'FRAMES', description: 'Hardwood and metal gallery frames with archival matting.', icon: 'Frame', active: true },
    { id: 'type-albums', name: 'Photo Albums', code: 'ALBUMS', description: 'Flush-mount layflat handcrafted leather & linen albums.', icon: 'BookOpen', active: true },
    { id: 'type-prints', name: 'Photo Prints', code: 'PRINTS', description: 'Fine-art museum quality cotton & lustre prints.', icon: 'Image', active: true },
    { id: 'type-cups', name: 'Photo Cups & Mugs', code: 'CUPS', description: 'Custom printed ceramic mugs and travel tumblers.', icon: 'Coffee', active: true },
    { id: 'type-gifts', name: 'Customized Gifts', code: 'GIFTS', description: 'Engraved keepsake boxes, acrylic blocks & merchandise.', icon: 'Gift', active: true },
];

const seededProducts: ShopProduct[] = [
    { id: 'frame-classic', name: 'Classic walnut frame', category: 'Photo Frames', description: 'A solid walnut-look frame, museum-style mat and your photograph, finished by hand.', price: 499, discount: 0, variants: ['Walnut', 'Natural oak', 'Matte black'], sizes: ['8 × 10', '12 × 18', '16 × 24'], stock: 24, active: true, customizable: true, customizationPrice: 100, image: '/images/hero-couple-petals.jpg', frameOverlay: '', placement: { x: 15, y: 12, width: 70, height: 76, aspectRatio: '4:5', padding: 4 } },
    { id: 'frame-gallery', name: 'Gallery float frame', category: 'Photo Frames', description: 'A contemporary floating mount with a soft, archival finish for the moments you keep close.', price: 799, discount: 0, variants: ['Black', 'White', 'Oak'], sizes: ['12 × 18', '16 × 24', '20 × 30'], stock: 12, active: true, customizable: true, customizationPrice: 150, image: '/images/hero-couple-outdoor.jpg', frameOverlay: '', placement: { x: 15, y: 12, width: 70, height: 76, aspectRatio: '4:5', padding: 4 } },
    { id: 'album-heirloom', name: 'Heirloom photo album', category: 'Photo Albums', description: 'Lay-flat pages, a linen cover and room for 40 of your favourite photographs.', price: 1899, discount: 10, variants: ['Linen sand', 'Linen forest', 'Linen charcoal'], sizes: ['20 pages', '30 pages', '40 pages'], stock: 15, active: true, customizable: true, customizationPrice: 250, image: '/images/hero-wedding-garlands.jpg', frameOverlay: '', placement: { x: 15, y: 12, width: 70, height: 76, aspectRatio: '4:5', padding: 4 } },
    { id: 'prints-fineart', name: 'Fine art photo prints', category: 'Photo Prints', description: 'Rich, true-to-life colour on archival matte paper with a beautifully soft texture.', price: 299, discount: 0, variants: ['Matte', 'Lustre', 'Fine-art cotton'], sizes: ['5 × 7', '8 × 10', '12 × 18'], stock: 80, active: true, customizable: true, customizationPrice: 0, image: '/images/weddingphoto1.jpg', frameOverlay: '', placement: { x: 10, y: 10, width: 80, height: 80, aspectRatio: '4:5', padding: 0 } },
    { id: 'cup-photo', name: 'Personalised photo cup', category: 'Photo Cups', description: 'A glossy ceramic cup, made personal with the photograph you choose.', price: 449, discount: 0, variants: ['White ceramic', 'Colour inside'], sizes: ['11 oz', '15 oz'], stock: 32, active: true, customizable: true, customizationPrice: 75, image: '/images/BabyShower.jfif', frameOverlay: '', placement: { x: 10, y: 22, width: 80, height: 54, aspectRatio: '3:2', padding: 0 } },
    { id: 'gift-keepsake', name: 'Printed keepsake box', category: 'Customized Gifts', description: 'A keepsake box finished with a favourite photograph and a soft-touch lid.', price: 999, discount: 5, variants: ['Ivory', 'Midnight'], sizes: ['Small', 'Large'], stock: 9, active: true, customizable: true, customizationPrice: 125, image: '/images/house warming.jfif', frameOverlay: '', placement: { x: 15, y: 12, width: 70, height: 76, aspectRatio: '4:5', padding: 4 } },
];

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

export const getProductTypes = () => read(STORAGE.types, seededProductTypes);
export const saveProductTypes = (types: ProductType[]) => write(STORAGE.types, types);
export const getProducts = () => read(STORAGE.products, seededProducts);
export const saveProducts = (products: ShopProduct[]) => write(STORAGE.products, products);
export const getCart = () => read<ShopCartItem[]>(STORAGE.cart, []);
export const saveCart = (cart: ShopCartItem[]) => write(STORAGE.cart, cart);
export const getOrders = () => read<ShopOrder[]>(STORAGE.orders, []);
export const saveOrders = (orders: ShopOrder[]) => write(STORAGE.orders, orders);

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