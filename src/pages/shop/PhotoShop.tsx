import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, ChevronRight, Crop, Minus, Move, Plus, RotateCcw, RotateCw, ShoppingBag, Sparkles, Upload, X } from 'lucide-react';
import { useEffect, useRef, useState, type ChangeEvent, type PointerEvent } from 'react';
import { getCart, getOrders, getProducts, imageFileToDataUrl, saveCart, saveOrders, SHOP_CATEGORIES, type PhotoAdjustment, type ProductCategory, type ShopCartItem, type ShopOrder, type ShopProduct } from '../../lib/photoShop';
import './photoShop.css';

const money = (value: number) => `₹${value.toLocaleString('en-IN')}`;
const freshAdjustment = (): PhotoAdjustment => ({ x: 0, y: 0, zoom: 1, rotation: 0, fit: 'fill' });

export function ProductCanvas({ product, photo, adjustment, onAdjustment, onPreview }: { product: ShopProduct; photo: string; adjustment: PhotoAdjustment; onAdjustment: (next: PhotoAdjustment) => void; onPreview?: (preview: string) => void }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const photoRef = useRef<HTMLImageElement | null>(null);
    const overlayRef = useRef<HTMLImageElement | null>(null);
    const dragOrigin = useRef<{ x: number; y: number; photoX: number; photoY: number } | null>(null);
    const placement = product.placement;
    const displayPhoto = photo || product.image;

    const paint = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;
        const width = canvas.width;
        const height = canvas.height;
        const x = (placement.x / 100) * width;
        const y = (placement.y / 100) * height;
        const areaWidth = (placement.width / 100) * width;
        const areaHeight = (placement.height / 100) * height;
        const edge = Math.max(15, placement.padding * 4);
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = '#ece7de';
        ctx.fillRect(0, 0, width, height);
        ctx.save();
        ctx.shadowColor = 'rgba(31,24,16,.3)';
        ctx.shadowBlur = 34;
        ctx.shadowOffsetY = 19;
        const wood = ctx.createLinearGradient(30, 20, width - 25, height - 20);
        wood.addColorStop(0, '#8f5e35'); wood.addColorStop(.23, '#d3a36d'); wood.addColorStop(.48, '#97653d'); wood.addColorStop(.74, '#c8955e'); wood.addColorStop(1, '#70462b');
        ctx.fillStyle = wood;
        ctx.fillRect(x - edge, y - edge, areaWidth + edge * 2, areaHeight + edge * 2);
        ctx.restore();
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 18;
        ctx.fillStyle = '#f5f0e7';
        ctx.fillRect(x - 9, y - 9, areaWidth + 18, areaHeight + 18);
        ctx.restore();
        ctx.save();
        ctx.beginPath(); ctx.rect(x, y, areaWidth, areaHeight); ctx.clip();
        ctx.fillStyle = '#dedbd5'; ctx.fillRect(x, y, areaWidth, areaHeight);
        const image = photoRef.current;
        if (image) {
            const rotated = Math.abs(adjustment.rotation % 180) === 90;
            const sourceWidth = rotated ? image.naturalHeight : image.naturalWidth;
            const sourceHeight = rotated ? image.naturalWidth : image.naturalHeight;
            const base = adjustment.fit === 'fill' ? Math.max(areaWidth / sourceWidth, areaHeight / sourceHeight) : Math.min(areaWidth / sourceWidth, areaHeight / sourceHeight);
            const drawWidth = image.naturalWidth * base * adjustment.zoom;
            const drawHeight = image.naturalHeight * base * adjustment.zoom;
            ctx.translate(x + areaWidth / 2 + adjustment.x, y + areaHeight / 2 + adjustment.y);
            ctx.rotate((adjustment.rotation * Math.PI) / 180);
            ctx.drawImage(image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
        }
        ctx.restore();
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,.78)'; ctx.lineWidth = 4;
        ctx.strokeRect(x - edge + 6, y - edge + 6, areaWidth + edge * 2 - 12, areaHeight + edge * 2 - 12);
        ctx.strokeStyle = 'rgba(44,29,18,.62)'; ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, areaWidth - 2, areaHeight - 2);
        ctx.restore();
        if (overlayRef.current) ctx.drawImage(overlayRef.current, 0, 0, width, height);
        if (onPreview && photo && image) onPreview(canvas.toDataURL('image/jpeg', .9));
    };

    useEffect(() => {
        if (!displayPhoto) { photoRef.current = null; paint(); return; }
        const image = new Image();
        image.onload = () => { photoRef.current = image; paint(); };
        image.src = displayPhoto;
        return () => { image.onload = null; };
    }, [displayPhoto]);
    useEffect(() => {
        if (!product.frameOverlay) { overlayRef.current = null; paint(); return; }
        const image = new Image();
        image.onload = () => { overlayRef.current = image; paint(); };
        image.src = product.frameOverlay;
        return () => { image.onload = null; };
    }, [product.frameOverlay]);
    useEffect(() => { paint(); }, [adjustment, product.placement]);

    const movePointer = (event: PointerEvent<HTMLCanvasElement>) => {
        if (!dragOrigin.current) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        onAdjustment({ ...adjustment, x: dragOrigin.current.photoX + ((event.clientX - dragOrigin.current.x) * event.currentTarget.width) / bounds.width, y: dragOrigin.current.photoY + ((event.clientY - dragOrigin.current.y) * event.currentTarget.height) / bounds.height });
    };

    return <canvas ref={canvasRef} width={720} height={760} className="shop-product-canvas" aria-label={photo ? 'Live product preview. Drag to reposition your photograph.' : 'Product frame preview'} onPointerDown={(event) => { if (!photo) return; event.currentTarget.setPointerCapture(event.pointerId); dragOrigin.current = { x: event.clientX, y: event.clientY, photoX: adjustment.x, photoY: adjustment.y }; }} onPointerMove={movePointer} onPointerUp={() => { dragOrigin.current = null; }} onPointerCancel={() => { dragOrigin.current = null; }} />;
}

function StepLabel({ active, done, number, label }: { active: boolean; done: boolean; number: number; label: string }) {
    return <div className={`shop-step ${active ? 'is-active' : ''} ${done ? 'is-done' : ''}`}><span>{done ? <Check size={13} /> : number}</span>{label}</div>;
}

export default function PhotoShop() {
    const [products] = useState<ShopProduct[]>(getProducts);
    const [cart, setCart] = useState<ShopCartItem[]>(getCart);
    const [category, setCategory] = useState<ProductCategory | 'All'>('All');
    const [activeProduct, setActiveProduct] = useState<ShopProduct | null>(null);
    const [step, setStep] = useState(1);
    const [variant, setVariant] = useState('');
    const [size, setSize] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [photo, setPhoto] = useState('');
    const [adjustment, setAdjustment] = useState<PhotoAdjustment>(freshAdjustment());
    const [customText, setCustomText] = useState('');
    const [preview, setPreview] = useState('');
    const [cartOpen, setCartOpen] = useState(false);
    const [checkoutOpen, setCheckoutOpen] = useState(false);
    const [notice, setNotice] = useState('');
    const [error, setError] = useState('');
    const [payment, setPayment] = useState('UPI / online payment');
    const [placedOrder, setPlacedOrder] = useState('');
    const uploadRef = useRef<HTMLInputElement>(null);

    useEffect(() => { saveCart(cart); }, [cart]);
    useEffect(() => { if (!notice) return; const timer = window.setTimeout(() => setNotice(''), 2600); return () => window.clearTimeout(timer); }, [notice]);
    const visibleProducts = products.filter((product) => product.active && (category === 'All' || product.category === category));
    const subtotal = cart.reduce((sum, item) => sum + item.basePrice * item.quantity, 0);
    const customTotal = cart.reduce((sum, item) => sum + item.customizationPrice * item.quantity, 0);
    const delivery = cart.length ? subtotal + customTotal >= 2500 ? 0 : 99 : 0;
    const total = subtotal + customTotal + delivery;
    const productPrice = activeProduct ? Math.round(activeProduct.price * (100 - activeProduct.discount) / 100) : 0;

    const openProduct = (product: ShopProduct) => {
        setActiveProduct(product); setStep(1); setVariant(product.variants[0] ?? ''); setSize(product.sizes[0] ?? ''); setQuantity(1); setPhoto(''); setPreview(''); setAdjustment(freshAdjustment()); setCustomText(''); setError('');
    };
    const uploadPhoto = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]; event.target.value = '';
        if (!file) return;
        if (file.size > 15 * 1024 * 1024) { setError('Choose a photo smaller than 15 MB.'); return; }
        try { setPhoto(await imageFileToDataUrl(file)); setAdjustment(freshAdjustment()); setError(''); setStep(2); }
        catch (reason) { setError(reason instanceof Error ? reason.message : 'The image could not be uploaded.'); }
    };
    const addToCart = () => {
        if (!activeProduct) return;
        if (activeProduct.customizable && (!photo || !preview)) { setError('Upload and position a photo to continue.'); setStep(2); return; }
        const item: ShopCartItem = { id: crypto.randomUUID(), productId: activeProduct.id, productName: activeProduct.name, image: activeProduct.image, variant, size, quantity, basePrice: productPrice, customizationPrice: activeProduct.customizable ? activeProduct.customizationPrice : 0, photo, preview: preview || activeProduct.image, adjustment, placement: activeProduct.placement, text: customText, lineTotal: (productPrice + (activeProduct.customizable ? activeProduct.customizationPrice : 0)) * quantity };
        setCart((current) => [...current, item]); setActiveProduct(null); setCartOpen(true); setNotice('Added to your bag'); setError('');
    };
    const updateQuantity = (id: string, delta: number) => setCart((items) => items.map((item) => item.id === id ? { ...item, quantity: Math.max(1, item.quantity + delta), lineTotal: (item.basePrice + item.customizationPrice) * Math.max(1, item.quantity + delta) } : item));
    const placeOrder = (event: ChangeEvent<HTMLFormElement>) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const customer = Object.fromEntries(['name', 'mobile', 'email', 'address', 'city', 'state', 'pincode', 'instructions'].map((key) => [key, String(form.get(key) ?? '')])) as ShopOrder['customer'];
        const order: ShopOrder = { id: `FL-${Date.now().toString().slice(-7)}`, createdAt: new Date().toISOString(), customer, items: cart, subtotal, customization: customTotal, delivery, discount: 0, total, payment, paymentStatus: 'Pending', status: 'New Order' };
        saveOrders([order, ...getOrders()]); setCart([]); setCheckoutOpen(false); setCartOpen(false); setPlacedOrder(order.id); window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return <div className="photo-shop">
        <header className="shop-header"><a className="shop-brand" href="/shop"><img src="/images/flashlight-emblem.png" alt="" /><span>FLASHLIGHT<small>PHOTOGRAPHY</small></span></a><nav><a href="#collection">Shop</a><a href="#our-craft">Our craft</a><a href="/login">Studio login</a></nav><button className="shop-bag-button" type="button" onClick={() => setCartOpen(true)} aria-label={`Shopping bag, ${cart.length} items`}><ShoppingBag size={18} /><span>Bag</span><b>{cart.length}</b></button></header>
        {placedOrder ? <section className="shop-success"><span><Check size={26} /></span><p className="shop-eyebrow">A LITTLE MOMENT, MADE YOURS</p><h1>Your order is in good hands.</h1><p>Order <strong>{placedOrder}</strong> is placed. We’ll send the next update as your piece moves through our studio.</p><button type="button" className="shop-button shop-button-dark" onClick={() => { setPlacedOrder(''); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Keep exploring <ArrowRight size={16} /></button></section> : <>
            <section className="shop-hero"><div className="shop-hero-copy"><p className="shop-eyebrow"><Sparkles size={14} /> YOUR STORY, BEAUTIFULLY KEPT</p><h1>Some moments<br />deserve a <em>place.</em></h1><p>Turn the photographs you love into the things you’ll keep close. Made by hand, made for you.</p><a href="#collection" className="shop-button shop-button-light">Find your keepsake <ArrowRight size={16} /></a><div className="shop-hero-foot"><span>01 / 03</span><i /><span>THE PERSONAL COLLECTION</span></div></div><div className="shop-hero-image"><img src="/images/hero-couple-petals.jpg" alt="A couple sharing a quiet moment beneath a shower of rose petals" /><div className="shop-hero-caption">A moment worth coming back to <span>— 2025, Chennai</span></div></div><div className="shop-hero-vertical">MADE TO HOLD ON TO</div></section>
            <section className="shop-editorial" id="our-craft"><span>PHOTOGRAPHY BECOMES PERSONAL</span><p>Not just a print. The story behind it, made tangible.</p><div><i /> <span>CRAFTED IN OUR STUDIO · MADE TO LAST</span></div></section>
            <section className="shop-collection" id="collection"><div className="shop-collection-head"><div><p className="shop-eyebrow">THE OBJECTS WE MAKE</p><h2>Keep the good things.</h2></div><p>Choose your piece, add the photograph that makes it yours.<br />Every order is made just for you.</p></div><div className="shop-categories" role="group" aria-label="Filter products">{['All', ...SHOP_CATEGORIES].map((item) => <button type="button" key={item} className={category === item ? 'selected' : ''} onClick={() => setCategory(item as ProductCategory | 'All')}>{item}</button>)}</div><div className="shop-product-grid">{visibleProducts.map((product, index) => <article className="shop-product-card" key={product.id} style={{ animationDelay: `${index * 70}ms` }}><button type="button" className="shop-product-image" onClick={() => openProduct(product)}><img src={product.image} alt={product.name} />{product.customizable && <span><Sparkles size={13} /> PERSONALISE</span>}<i><ArrowRight size={17} /></i></button><div className="shop-product-meta"><div><span>{product.category}</span><h3>{product.name}</h3></div><strong>{money(Math.round(product.price * (100 - product.discount) / 100))}</strong></div><button type="button" className="shop-product-link" onClick={() => openProduct(product)}>Make it yours <ChevronRight size={14} /></button></article>)}</div></section>
            <section className="shop-note"><div><span>THE FINISHING TOUCH</span><h2>Printed with care.<br /><em>Kept for years.</em></h2><p>Archival papers, thoughtfully sourced materials and a real person checking every custom order before it leaves our studio.</p></div><img src="/images/hero-wedding-garlands.jpg" alt="A joyful wedding celebration, photographed in warm light" /></section>
            <footer className="shop-footer"><a className="shop-brand" href="/shop"><img src="/images/flashlight-emblem.png" alt="" /><span>FLASHLIGHT<small>PHOTOGRAPHY</small></span></a><p>Made slowly, for the moments that stay.</p><span>© 2026 Flashlight Photography</span></footer>
        </>}

        {activeProduct && <div className="shop-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setActiveProduct(null); }}><section className="shop-customizer" role="dialog" aria-modal="true" aria-label={`Customize ${activeProduct.name}`}><header className="shop-customizer-header"><a className="shop-brand" href="/shop"><img src="/images/flashlight-emblem.png" alt="" /><span>FLASHLIGHT<small>PHOTOGRAPHY</small></span></a><button className="shop-icon-button" type="button" onClick={() => setActiveProduct(null)} aria-label="Close customizer"><X size={20} /></button></header><div className="shop-customizer-main"><div className="shop-preview-column"><div className="shop-preview-top"><span>YOUR PIECE, TAKING SHAPE</span><span>{activeProduct.customizable ? 'LIVE PREVIEW' : 'PRODUCT PREVIEW'}</span></div><ProductCanvas product={activeProduct} photo={photo} adjustment={adjustment} onAdjustment={setAdjustment} onPreview={setPreview} /><div className="shop-preview-help"><Move size={14} /> Drag your photo to find the perfect crop</div></div><div className="shop-config-column"><div className="shop-stepper"><StepLabel number={1} label="Choose" active={step === 1} done={step > 1} /><StepLabel number={2} label="Personalise" active={step === 2} done={step > 2} /><StepLabel number={3} label="Review" active={step === 3} done={false} /></div><p className="shop-eyebrow">{activeProduct.category.toUpperCase()}</p><h2>{activeProduct.name}</h2><p className="shop-product-description">{activeProduct.description}</p><p className="shop-detail-price">{money(productPrice)} <span>+ {money(activeProduct.customizationPrice)} personalisation</span></p>
                    <label className="shop-field-label">SIZE</label><div className="shop-choice-row">{activeProduct.sizes.map((option) => <button type="button" key={option} className={size === option ? 'active' : ''} onClick={() => setSize(option)}>{option}</button>)}</div><label className="shop-field-label">FINISH</label><div className="shop-choice-row">{activeProduct.variants.map((option) => <button type="button" key={option} className={variant === option ? 'active' : ''} onClick={() => setVariant(option)}>{option}</button>)}</div>
                    {activeProduct.customizable && <><label className="shop-field-label">YOUR PHOTOGRAPH</label><input ref={uploadRef} className="shop-visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadPhoto} /><button type="button" className="shop-upload" onClick={() => uploadRef.current?.click()}><Upload size={17} /><span>{photo ? 'Choose a different photo' : 'Upload your photo'}<small>JPG, PNG or WebP · up to 15 MB</small></span><ChevronRight size={17} /></button>{photo && <div className="shop-adjust"><span>ADJUST YOUR PHOTO</span><div className="shop-tool-row"><button type="button" onClick={() => setAdjustment({ ...adjustment, zoom: Math.max(.35, adjustment.zoom / 1.15) })} aria-label="Zoom out"><Minus /></button><button type="button" onClick={() => setAdjustment({ ...adjustment, zoom: Math.min(4, adjustment.zoom * 1.15) })} aria-label="Zoom in"><Plus /></button><button type="button" onClick={() => setAdjustment({ ...adjustment, x: adjustment.x - 18 })} aria-label="Move left"><ArrowLeft /></button><button type="button" onClick={() => setAdjustment({ ...adjustment, x: adjustment.x + 18 })} aria-label="Move right"><ArrowRight /></button><button type="button" onClick={() => setAdjustment({ ...adjustment, y: adjustment.y - 18 })} aria-label="Move up"><ArrowUp /></button><button type="button" onClick={() => setAdjustment({ ...adjustment, y: adjustment.y + 18 })} aria-label="Move down"><ArrowDown /></button><button type="button" onClick={() => setAdjustment({ ...adjustment, rotation: adjustment.rotation - 90 })} aria-label="Rotate left"><RotateCcw /></button><button type="button" onClick={() => setAdjustment({ ...adjustment, rotation: adjustment.rotation + 90 })} aria-label="Rotate right"><RotateCw /></button></div><div className="shop-fit-row"><button type="button" className={adjustment.fit === 'fit' ? 'active' : ''} onClick={() => setAdjustment({ ...adjustment, fit: 'fit', x: 0, y: 0, zoom: 1 })}>Fit</button><button type="button" className={adjustment.fit === 'fill' ? 'active' : ''} onClick={() => setAdjustment({ ...adjustment, fit: 'fill', x: 0, y: 0, zoom: 1 })}>Fill</button><button type="button" onClick={() => setAdjustment(freshAdjustment())}>Reset</button></div></div>}{activeProduct.category === 'Photo Frames' && <p className="shop-personal-note"><Sparkles size={14} /> Your photograph is printed beneath the frame's protective finish.</p>}</>}
                    {photo && <button type="button" className="shop-crop-action" onClick={() => setAdjustment({ ...adjustment, fit: 'fill', x: 0, y: 0, zoom: 1 })}><Crop size={13} /> Crop photo to frame</button>}
                    <label className="shop-field-label" htmlFor="shop-custom-text">GIFT NOTE FOR THE STUDIO <span>OPTIONAL</span></label><input id="shop-custom-text" className="shop-text-input" value={customText} onChange={(event) => setCustomText(event.target.value)} placeholder="A name, date or a few words" maxLength={60} />
                    <div className="shop-quantity-row"><span>QUANTITY</span><div><button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} aria-label="Decrease quantity"><Minus size={14} /></button><b>{quantity}</b><button type="button" onClick={() => setQuantity(Math.min(activeProduct.stock, quantity + 1))} aria-label="Increase quantity"><Plus size={14} /></button></div></div>
                    {error && <p className="shop-error">{error}</p>}{step < 3 ? <button type="button" className="shop-button shop-button-dark shop-continue" onClick={() => { if (step === 1 && activeProduct.customizable) { setStep(2); if (!photo) window.setTimeout(() => uploadRef.current?.click(), 0); } else setStep(3); }} disabled={step === 2 && activeProduct.customizable && !photo}>{step === 1 && activeProduct.customizable ? 'Add your photograph' : 'Review your piece'} <ArrowRight size={16} /></button> : <div className="shop-final-add"><span>YOUR CUSTOMISED PRODUCT</span><button type="button" className="shop-button shop-button-dark shop-continue" onClick={addToCart}><Check size={16} /> Looks Good — Add to Cart · {money((productPrice + activeProduct.customizationPrice) * quantity)}</button></div>}{step === 2 && photo && <button type="button" className="shop-review-link" onClick={() => setStep(3)}>Continue to final preview <ArrowRight size={14} /></button>}<p className="shop-secure-note">Made to order in our studio · Secure checkout</p>
                </div></div></section></div>}

        {cartOpen && <div className="shop-modal-backdrop shop-drawer-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setCartOpen(false); }}><aside className="shop-cart-drawer" role="dialog" aria-modal="true" aria-label="Shopping bag"><header><div><p className="shop-eyebrow">YOUR KEEPERS</p><h2>Shopping bag <span>({cart.length})</span></h2></div><button className="shop-icon-button" type="button" onClick={() => setCartOpen(false)} aria-label="Close bag"><X /></button></header>{!cart.length ? <div className="shop-empty-cart"><ShoppingBag size={28} /><p>Your bag is waiting for a favourite.</p><button className="shop-button shop-button-dark" type="button" onClick={() => { setCartOpen(false); document.getElementById('collection')?.scrollIntoView({ behavior: 'smooth' }); }}>Explore the collection</button></div> : <><div className="shop-cart-items">{cart.map((item) => <article key={item.id} className="shop-cart-item"><img src={item.preview} alt={`${item.productName} preview`} /><div><span>{item.productName}</span><small>{item.size} · {item.variant}</small><b>{money(item.basePrice + item.customizationPrice)}</b><div className="shop-cart-qty"><button type="button" onClick={() => updateQuantity(item.id, -1)} aria-label="Decrease quantity"><Minus size={12} /></button><span>{item.quantity}</span><button type="button" onClick={() => updateQuantity(item.id, 1)} aria-label="Increase quantity"><Plus size={12} /></button><button type="button" className="shop-remove" onClick={() => setCart((items) => items.filter((row) => row.id !== item.id))}>Remove</button></div></div></article>)}</div><div className="shop-cart-summary"><div><span>Items</span><b>{money(subtotal)}</b></div><div><span>Personalisation</span><b>{money(customTotal)}</b></div><div><span>Delivery</span><b>{delivery ? money(delivery) : 'Complimentary'}</b></div><div className="shop-cart-total"><span>Total</span><b>{money(total)}</b></div><button type="button" className="shop-button shop-button-dark" onClick={() => { setCheckoutOpen(true); setCartOpen(false); }}>Continue to checkout <ArrowRight size={16} /></button><p>Complimentary delivery on orders over ₹2,500</p></div></>}</aside></div>}

        {checkoutOpen && <div className="shop-modal-backdrop"><section className="shop-checkout" role="dialog" aria-modal="true" aria-label="Checkout"><header><div><p className="shop-eyebrow">ALMOST YOURS</p><h2>Delivery & payment</h2></div><button className="shop-icon-button" type="button" onClick={() => setCheckoutOpen(false)} aria-label="Close checkout"><X /></button></header><div className="shop-checkout-grid"><form onSubmit={placeOrder} className="shop-checkout-form"><div className="shop-form-grid"><label>Full name<input name="name" autoComplete="name" required /></label><label>Mobile number<input name="mobile" type="tel" autoComplete="tel" pattern="[0-9+() -]{8,16}" required /></label><label className="shop-form-wide">Email address<input name="email" type="email" autoComplete="email" required /></label><label className="shop-form-wide">Delivery address<textarea name="address" autoComplete="street-address" rows={2} required /></label><label>City<input name="city" autoComplete="address-level2" required /></label><label>State<input name="state" autoComplete="address-level1" required /></label><label>Pincode<input name="pincode" inputMode="numeric" pattern="[0-9]{6}" autoComplete="postal-code" required /></label><label className="shop-form-wide">Delivery instructions <span>Optional</span><textarea name="instructions" rows={2} /></label></div><fieldset className="shop-payment"><legend>PAYMENT METHOD</legend>{['UPI / online payment', 'Cash on delivery'].map((method) => <label key={method}><input type="radio" name="payment" checked={payment === method} onChange={() => setPayment(method)} />{method}</label>)}</fieldset><button className="shop-button shop-button-dark" type="submit">Place order · {money(total)} <ArrowRight size={16} /></button><p className="shop-payment-disclaimer">Checkout is in preview mode. Orders are saved to this browser and payment is recorded as a demo status.</p></form><div className="shop-order-summary"><h3>Your order</h3>{cart.map((item) => <div key={item.id} className="shop-summary-product"><img src={item.preview} alt="" /><div><span>{item.productName}</span><small>{item.size} · Qty {item.quantity}</small></div><b>{money(item.lineTotal)}</b></div>)}<div className="shop-summary-lines"><div><span>Product subtotal</span><b>{money(subtotal)}</b></div><div><span>Customisation</span><b>{money(customTotal)}</b></div><div><span>Delivery</span><b>{delivery ? money(delivery) : 'Complimentary'}</b></div><div className="shop-cart-total"><span>Final total</span><b>{money(total)}</b></div></div></div></div></section></div>}
        {notice && <div className="shop-toast" role="status"><Check size={16} />{notice}</div>}
    </div>;
}