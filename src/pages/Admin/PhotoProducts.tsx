// Developer by: Buildnexdev.in
// Devevloper : Nandhakumar@gmail.com
// Last Edited : 06-10-2026
import { Check, CheckCircle2, ChevronDown, ChevronUp, Clock, ExternalLink, ImagePlus, Loader2, Package, PackageCheck, PackagePlus, Pencil, RefreshCw, Save, Search, ShoppingBag, Trash2, Truck, Upload, X } from 'lucide-react';
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { ProductCanvas } from '../Shop/PhotoShop';
import { getOrders, getProducts, imageFileToDataUrl, normalizeProducts, saveOrders, saveProducts, SHOP_CATEGORIES, SHOP_ORDER_STATUSES, type PhotoAdjustment, type ProductCategory, type ShopOrder, type ShopProduct } from '../../helpers/shop/photoShop';
import './PhotoProducts.scss';

const emptyProduct = (): ShopProduct => ({ id: crypto.randomUUID(), name: '', category: 'Photo Frames', description: '', price: 499, discount: 0, variants: ['Walnut', 'Natural oak', 'Matte black'], sizes: ['8 × 10', '12 × 18', '16 × 24'], stock: 10, active: true, customizable: true, customizationPrice: 100, image: '/images/hero-couple-petals.jpg', frameOverlay: '', placement: { x: 15, y: 12, width: 70, height: 76, aspectRatio: '4:5', padding: 4 } });
const adjustment: PhotoAdjustment = { x: 0, y: 0, zoom: 1, rotation: 0, fit: 'fill' };
const money = (value: number) => `₹${value.toLocaleString('en-IN')}`;

export default function PhotoProducts({ embedded = false }: { embedded?: boolean }) {
    const [products, setProducts] = useState(getProducts);
    const [orders, setOrders] = useState<ShopOrder[]>(getOrders);
    const [tab, setTab] = useState<'products' | 'orders'>('products');
    const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
    const [editing, setEditing] = useState<ShopProduct | null>(null);
    const [expandedOrder, setExpandedOrder] = useState('');
    const [error, setError] = useState('');
    const [orderSearch, setOrderSearch] = useState('');
    const [orderStatusFilter, setOrderStatusFilter] = useState<string>('All');
    const [trackingInputs, setTrackingInputs] = useState<Record<string, { courier: string; tracking: string }>>({});
    const [isSavingTracking, setIsSavingTracking] = useState<Record<string, boolean>>({});

    const imageInput = useRef<HTMLInputElement>(null);
    const overlayInput = useRef<HTMLInputElement>(null);

    const { data: settingsData } = useQuery({
        queryKey: ['settings'],
        queryFn: () => api.get<{ website?: any }>('/api/settings'),
    });

    const { data: remoteOrders, refetch: refetchOrders, isFetching: ordersFetching } = useQuery({
        queryKey: ['shop-orders'],
        queryFn: async () => {
            const res = await api.get<ShopOrder[]>('/api/orders/shop');
            return res || [];
        },
    });

    useEffect(() => {
        const remote = normalizeProducts(settingsData?.website?.products);
        if (remote.length > 0) {
            setProducts(remote);
            saveProducts(remote);
        }
    }, [settingsData]);

    useEffect(() => {
        if (remoteOrders && remoteOrders.length > 0) {
            setOrders(remoteOrders);
            saveOrders(remoteOrders);
        }
    }, [remoteOrders]);

    const syncToBackend = async (newProducts: ShopProduct[]) => {
        try {
            const currentWebsite = settingsData?.website || {};
            await api.put('/api/settings/website', {
                ...currentWebsite,
                products: newProducts,
            });
        } catch (err) {
            console.error('Failed to sync products to website settings:', err);
        }
    };

    useEffect(() => { saveProducts(products); }, [products]);
    useEffect(() => { saveOrders(orders); }, [orders]);

    const updateEditing = (changes: Partial<ShopProduct>) => setEditing((product) => product ? { ...product, ...changes } : product);
    const updatePlacement = (key: keyof ShopProduct['placement'], value: string) => setEditing((product) => product ? { ...product, placement: { ...product.placement, [key]: key === 'aspectRatio' ? value : Number(value) } } : product);
    const readUpload = async (event: ChangeEvent<HTMLInputElement>, property: 'image' | 'frameOverlay') => {
        const file = event.target.files?.[0]; event.target.value = '';
        if (!file) return;
        if (file.size > 15 * 1024 * 1024) { setError('Choose an image smaller than 15 MB.'); return; }
        try { updateEditing({ [property]: await imageFileToDataUrl(file) }); setError(''); }
        catch (reason) { setError(reason instanceof Error ? reason.message : 'The image could not be uploaded.'); }
    };
    const saveProduct = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!editing) return;
        const product = { ...editing, name: editing.name.trim(), variants: editing.variants.map((value) => value.trim()).filter(Boolean), sizes: editing.sizes.map((value) => value.trim()).filter(Boolean) };
        if (!product.name || !product.sizes.length || !product.variants.length) { setError('Add a product name, at least one size and one finish.'); return; }
        const updated = products.some((item) => item.id === product.id) ? products.map((item) => item.id === product.id ? product : item) : [product, ...products];
        setProducts(updated);
        syncToBackend(updated);
        setEditing(null); setError('');
    };
    const toggleActive = (id: string) => {
        const updated = products.map((item) => item.id === id ? { ...item, active: !item.active } : item);
        setProducts(updated);
        syncToBackend(updated);
    };
    const deleteProduct = (id: string) => {
        const updated = products.filter((item) => item.id !== id);
        setProducts(updated);
        syncToBackend(updated);
    };

    const changeOrderStatus = async (id: string, status: ShopOrder['status']) => {
        setOrders((current) => current.map((order) => order.id === id ? { ...order, status } : order));
        try {
            await api.put(`/api/orders/shop/${id}`, { status });
            refetchOrders();
        } catch (err) {
            console.error('Failed to update order status on server:', err);
        }
    };

    const changePaymentStatus = async (id: string, paymentStatus: 'Pending' | 'Paid') => {
        setOrders((current) => current.map((order) => order.id === id ? { ...order, paymentStatus } : order));
        try {
            await api.put(`/api/orders/shop/${id}`, { paymentStatus });
            refetchOrders();
        } catch (err) {
            console.error('Failed to update payment status on server:', err);
        }
    };

    const handleSaveTracking = async (id: string) => {
        const currentTracking = trackingInputs[id];
        if (!currentTracking) return;
        setIsSavingTracking((prev) => ({ ...prev, [id]: true }));
        try {
            await api.put(`/api/orders/shop/${id}`, {
                courierPartner: currentTracking.courier,
                trackingNumber: currentTracking.tracking,
            });
            setOrders((current) => current.map((order) => order.id === id ? { ...order, courierPartner: currentTracking.courier, trackingNumber: currentTracking.tracking } : order));
            refetchOrders();
        } catch (err) {
            console.error('Failed to save tracking details:', err);
        } finally {
            setIsSavingTracking((prev) => ({ ...prev, [id]: false }));
        }
    };

    const filteredOrders = orders.filter((order) => {
        if (orderStatusFilter !== 'All' && order.status !== orderStatusFilter) return false;
        if (orderSearch.trim()) {
            const q = orderSearch.toLowerCase();
            const idMatch = order.id.toLowerCase().includes(q);
            const nameMatch = order.customer.name.toLowerCase().includes(q);
            const phoneMatch = order.customer.mobile.toLowerCase().includes(q);
            const cityMatch = order.customer.city.toLowerCase().includes(q);
            const statusMatch = order.status.toLowerCase().includes(q);
            return idMatch || nameMatch || phoneMatch || cityMatch || statusMatch;
        }
        return true;
    });

    return <div className={embedded ? 'space-y-5' : 'space-y-5 p-4 sm:p-6'}>
        <div className="flex flex-wrap items-end justify-between gap-4"><div>{!embedded && <p className="text-xs font-semibold uppercase tracking-wider text-brand-700">CUSTOM PRINTS & KEEPSAKES</p>}{!embedded && <h1 className="mt-1 font-display text-2xl font-semibold text-stone-900">Photo products & Orders</h1>}{embedded ? <p className="text-sm text-stone-500">Storefront collection, frame templates and made-to-order products.</p> : <p className="mt-1 text-sm text-stone-500">Manage storefront collection, live custom orders, payment status and courier tracking.</p>}</div>{tab === 'products' && <button className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-600 px-4 text-sm font-semibold text-white shadow-sm hover:from-sky-400 hover:to-cyan-500 transition-colors" type="button" onClick={() => { setEditing(emptyProduct()); setError(''); }}><PackagePlus size={16} /> Add product</button>}</div>
        <div className="flex items-center justify-between border-b border-stone-200">
            <div className="flex gap-5" role="tablist">
                <button type="button" role="tab" aria-selected={tab === 'products'} onClick={() => setTab('products')} className={`inline-flex items-center gap-2 border-b-2 px-1 pb-3 text-sm ${tab === 'products' ? 'border-brand-200 font-medium text-stone-900' : 'border-transparent text-stone-500'}`}><ImagePlus size={16} /> Products <span className="text-xs text-stone-400">{products.length}</span></button>
                <button type="button" role="tab" aria-selected={tab === 'orders'} onClick={() => setTab('orders')} className={`inline-flex items-center gap-2 border-b-2 px-1 pb-3 text-sm ${tab === 'orders' ? 'border-brand-200 font-medium text-stone-900' : 'border-transparent text-stone-500'}`}><ShoppingBag size={16} /> Custom orders <span className="text-xs text-stone-400">{orders.length}</span></button>
            </div>
            {tab === 'products' && (
                <div className="flex items-center rounded-xl border border-slate-200 bg-slate-100/80 p-0.5 shadow-2xs mb-2">
                    <button type="button" onClick={() => setViewMode('table')} className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${viewMode === 'table' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-500 hover:text-slate-900'}`}>Table</button>
                    <button type="button" onClick={() => setViewMode('grid')} className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${viewMode === 'grid' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-500 hover:text-slate-900'}`}>Grid</button>
                </div>
            )}
            {tab === 'orders' && (
                <button
                    type="button"
                    onClick={() => refetchOrders()}
                    className="flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 shadow-2xs hover:bg-stone-50 mb-2"
                >
                    <RefreshCw size={14} className={ordersFetching ? 'animate-spin' : ''} />
                    Refresh
                </button>
            )}
        </div>

        {tab === 'products' && viewMode === 'table' && <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs"><div className="hidden grid-cols-[minmax(0,1.6fr)_1fr_100px_90px_110px] gap-4 border-b border-stone-200 bg-slate-50/75 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-600 md:grid"><span>Product</span><span>Category</span><span>Price</span><span>Stock</span><span>Availability</span></div><div className="divide-y divide-slate-100">{products.map((product) => <article key={product.id} className="grid gap-3 p-4 hover:bg-slate-50 transition-colors md:grid-cols-[minmax(0,1.6fr)_1fr_100px_90px_110px] md:items-center md:gap-4"><div className="flex min-w-0 items-center gap-3"><img src={product.image} alt="" className="size-14 shrink-0 rounded-lg object-cover border border-slate-200" /><div className="min-w-0"><h2 className="truncate text-sm font-medium text-stone-900">{product.name}</h2><p className="mt-1 text-xs text-stone-500">{product.sizes.join(' · ')} {product.customizable ? '· Custom photo' : ''}</p></div></div><span className="text-xs text-stone-600">{product.category}</span><span className="text-sm font-semibold text-stone-800">{money(product.price)}{product.discount > 0 && <small className="ml-1 text-xs text-rose-700">−{product.discount}%</small>}</span><span className="text-xs text-stone-600">{product.stock} units</span><div className="flex items-center justify-between gap-3"><button type="button" className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${product.active ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' : 'bg-stone-50 text-stone-600 ring-stone-500/20'}`} onClick={() => toggleActive(product.id)}>{product.active ? 'Active' : 'Paused'}</button><div className="flex gap-1"><button type="button" aria-label={`Edit ${product.name}`} className="grid size-8 place-items-center rounded-lg text-stone-500 hover:bg-stone-100" onClick={() => { setEditing(product); setError(''); }}><Pencil size={15} /></button><button type="button" aria-label={`Delete ${product.name}`} className="grid size-8 place-items-center rounded-lg text-stone-400 hover:bg-rose-50 hover:text-rose-700" onClick={() => { if (window.confirm(`Delete ${product.name}?`)) deleteProduct(product.id); }}><Trash2 size={15} /></button></div></div></article>)}</div>{!products.length && <p className="p-8 text-center text-sm text-stone-500">No products yet. Add your first photo product to start the collection.</p>}</div>}
        {tab === 'products' && viewMode === 'grid' && <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{products.map((product) => <article key={product.id} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all flex flex-col justify-between hover:border-brand-200/40 hover:shadow-md"><div className="flex items-center gap-4 mb-4"><img src={product.image} alt="" className="size-16 shrink-0 rounded-xl object-cover border border-slate-200" /><div className="min-w-0"><h2 className="truncate text-sm font-bold text-stone-900">{product.name}</h2><p className="text-xs font-medium text-brand-700 uppercase tracking-wide mt-0.5">{product.category}</p></div></div><div className="space-y-2 mb-4"><div className="flex justify-between text-xs border-b border-slate-100 pb-1.5"><span className="text-slate-500 uppercase">Sizes</span><span className="font-medium">{product.sizes.length} sizes</span></div><div className="flex justify-between text-xs border-b border-slate-100 pb-1.5"><span className="text-slate-500 uppercase">Stock</span><span className="font-medium">{product.stock} units</span></div><div className="flex justify-between text-xs border-b border-slate-100 pb-1.5"><span className="text-slate-500 uppercase">Price</span><span className="font-bold text-stone-800">{money(product.price)}</span></div></div><div className="flex items-center justify-between border-t border-slate-100 pt-4"><button type="button" className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${product.active ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' : 'bg-stone-50 text-stone-600 ring-stone-500/20'}`} onClick={() => toggleActive(product.id)}>{product.active ? 'Active' : 'Paused'}</button><div className="flex gap-1"><button type="button" aria-label={`Edit ${product.name}`} className="grid size-8 place-items-center rounded-lg text-stone-500 hover:bg-stone-100" onClick={() => { setEditing(product); setError(''); }}><Pencil size={15} /></button><button type="button" aria-label={`Delete ${product.name}`} className="grid size-8 place-items-center rounded-lg text-stone-400 hover:bg-rose-50 hover:text-rose-700" onClick={() => { if (window.confirm(`Delete ${product.name}?`)) deleteProduct(product.id); }}><Trash2 size={15} /></button></div></div></article>)}{!products.length && <p className="p-8 text-center text-sm text-stone-500 col-span-full">No products yet. Add your first photo product to start the collection.</p>}</div>}

        {/* Custom Orders Management & Tracking Tab */}
        {tab === 'orders' && (
            <div className="space-y-4">
                {/* Search & Filter Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white p-3 shadow-2xs">
                    <div className="relative flex-1 min-w-[220px]">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                        <input
                            type="search"
                            value={orderSearch}
                            onChange={(e) => setOrderSearch(e.target.value)}
                            placeholder="Search orders by ID, customer name, mobile, city..."
                            className="h-9 w-full rounded-lg border border-stone-200 bg-stone-50/50 pl-9 pr-3 text-xs text-stone-800 focus:border-brand-500 focus:bg-white focus:outline-hidden"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-stone-500">Status:</span>
                        <select
                            value={orderStatusFilter}
                            onChange={(e) => setOrderStatusFilter(e.target.value)}
                            className="h-9 rounded-lg border border-stone-200 bg-stone-50/50 px-2.5 text-xs text-stone-800 focus:outline-hidden"
                        >
                            <option value="All">All statuses ({orders.length})</option>
                            {SHOP_ORDER_STATUSES.map((status) => (
                                <option key={status} value={status}>
                                    {status} ({orders.filter((o) => o.status === status).length})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="space-y-3">
                    {filteredOrders.map((order) => {
                        const isExpanded = expandedOrder === order.id;
                        const currentTracking = trackingInputs[order.id] || {
                            courier: order.courierPartner || '',
                            tracking: order.trackingNumber || '',
                        };

                        return (
                            <article key={order.id} className="rounded-xl border border-stone-200 bg-white shadow-2xs overflow-hidden transition-all">
                                <button
                                    type="button"
                                    className="grid w-full gap-3 p-4 text-left sm:grid-cols-[1.2fr_1.2fr_1fr_110px_110px_32px] sm:items-center hover:bg-stone-50/70"
                                    onClick={() => {
                                        setExpandedOrder(isExpanded ? '' : order.id);
                                        if (!trackingInputs[order.id]) {
                                            setTrackingInputs((prev) => ({
                                                ...prev,
                                                [order.id]: { courier: order.courierPartner || '', tracking: order.trackingNumber || '' },
                                            }));
                                        }
                                    }}
                                >
                                    <div>
                                        <b className="block text-sm font-semibold text-stone-900">{order.id}</b>
                                        <small className="mt-0.5 block text-xs text-stone-500">{new Date(order.createdAt).toLocaleString()}</small>
                                    </div>
                                    <div>
                                        <span className="text-sm font-medium text-stone-800">{order.customer.name}</span>
                                        <small className="mt-0.5 block text-xs text-stone-500">{order.customer.mobile} · {order.customer.city}</small>
                                    </div>
                                    <div>
                                        <span className="text-xs text-stone-600 block">{order.items.length} item(s)</span>
                                        <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium mt-1 ${order.paymentStatus === 'Paid' ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20' : 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20'}`}>
                                            {order.paymentStatus === 'Paid' ? <Check size={11} /> : <Clock size={11} />}
                                            {order.paymentStatus}
                                        </span>
                                    </div>
                                    <strong className="text-sm text-stone-900">{money(order.total)}</strong>
                                    <div>
                                        <span className={`inline-block rounded-md px-2 py-1 text-xs font-medium ${
                                            order.status === 'Delivered' ? 'bg-emerald-100 text-emerald-800' :
                                            order.status === 'Shipped' ? 'bg-sky-100 text-sky-800' :
                                            order.status === 'Production' ? 'bg-purple-100 text-purple-800' :
                                            'bg-stone-100 text-stone-700'
                                        }`}>
                                            {order.status}
                                        </span>
                                    </div>
                                    <div className="grid place-items-center text-stone-400">
                                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                    </div>
                                </button>

                                {isExpanded && (
                                    <div className="border-t border-stone-200 bg-stone-50/50 p-5">
                                        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
                                            {/* Customer & Items Details */}
                                            <div className="space-y-4">
                                                <div className="rounded-xl border border-stone-200 bg-white p-4">
                                                    <p className="text-xs font-bold uppercase tracking-wider text-stone-500">Shipping / Delivery Details</p>
                                                    <p className="mt-2 text-sm font-medium text-stone-800">{order.customer.name} ({order.customer.mobile})</p>
                                                    <p className="mt-1 text-xs text-stone-600 leading-relaxed">
                                                        {order.customer.address}, {order.customer.city}, {order.customer.state} - {order.customer.pincode}
                                                    </p>
                                                    <p className="mt-1 text-xs text-stone-500">Email: {order.customer.email}</p>
                                                    {order.customer.instructions && (
                                                        <div className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-800 border border-amber-200/60">
                                                            <strong>Special Instructions:</strong> {order.customer.instructions}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="rounded-xl border border-stone-200 bg-white p-4">
                                                    <p className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-3">Ordered Items ({order.items.length})</p>
                                                    <div className="space-y-3">
                                                        {order.items.map((item) => (
                                                            <div key={item.id} className="flex items-center gap-3.5 border-b border-stone-100 pb-3 last:border-b-0 last:pb-0">
                                                                <img
                                                                    src={item.preview}
                                                                    alt={item.productName}
                                                                    className="size-18 shrink-0 rounded-lg object-cover border border-stone-200 shadow-2xs"
                                                                />
                                                                <div className="min-w-0 flex-1">
                                                                    <p className="text-sm font-semibold text-stone-900 truncate">{item.productName}</p>
                                                                    <p className="mt-0.5 text-xs text-stone-500">{item.size} · Finish: {item.variant} · Qty: {item.quantity}</p>
                                                                    <p className="text-xs font-medium text-stone-700 mt-1">{money(item.lineTotal)}</p>
                                                                    {item.text && (
                                                                        <p className="text-xs text-brand-700 mt-0.5 font-medium">Custom Gift Note: "{item.text}"</p>
                                                                    )}
                                                                </div>
                                                                {item.photo && (
                                                                    <a
                                                                        href={item.photo}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100"
                                                                        title="Download original customer uploaded photo"
                                                                    >
                                                                        <ExternalLink size={13} />
                                                                        Original Photo
                                                                    </a>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Order Management, Payment Tracking & Courier Tracking */}
                                            <div className="space-y-4">
                                                {/* Order Status & Payment Tracking */}
                                                <div className="rounded-xl border border-stone-200 bg-white p-4">
                                                    <p className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-3">Order & Payment Tracking</p>
                                                    <div className="space-y-3">
                                                        <div>
                                                            <label className="text-xs font-medium text-stone-600 block mb-1">Production / Order Status</label>
                                                            <select
                                                                value={order.status}
                                                                onChange={(e) => changeOrderStatus(order.id, e.target.value as ShopOrder['status'])}
                                                                className="h-9 w-full rounded-lg border border-stone-300 bg-white px-2.5 text-xs font-medium text-stone-800 focus:border-brand-500 focus:outline-hidden"
                                                            >
                                                                {SHOP_ORDER_STATUSES.map((status) => (
                                                                    <option key={status} value={status}>{status}</option>
                                                                ))}
                                                            </select>
                                                        </div>

                                                        <div className="border-t border-stone-100 pt-3">
                                                            <div className="flex items-center justify-between mb-1.5">
                                                                <span className="text-xs font-medium text-stone-600">Payment Method:</span>
                                                                <span className="text-xs font-bold text-stone-800">{order.payment}</span>
                                                            </div>
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-xs font-medium text-stone-600">Payment Status:</span>
                                                                <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ${order.paymentStatus === 'Paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                                                                    {order.paymentStatus}
                                                                </span>
                                                            </div>
                                                            <div className="mt-2.5 flex gap-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => changePaymentStatus(order.id, 'Paid')}
                                                                    className={`flex-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                                                                        order.paymentStatus === 'Paid'
                                                                            ? 'bg-emerald-600 text-white'
                                                                            : 'border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                                                                    }`}
                                                                >
                                                                    <CheckCircle2 size={13} className="inline mr-1" /> Mark Paid
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => changePaymentStatus(order.id, 'Pending')}
                                                                    className={`flex-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                                                                        order.paymentStatus === 'Pending'
                                                                            ? 'bg-amber-600 text-white'
                                                                            : 'border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
                                                                    }`}
                                                                >
                                                                    <Clock size={13} className="inline mr-1" /> Mark Pending
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Courier / Shipping Tracking */}
                                                <div className="rounded-xl border border-stone-200 bg-white p-4">
                                                    <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-stone-500 mb-3">
                                                        <Truck size={14} className="text-brand-600" />
                                                        Courier & Tracking Details
                                                    </div>
                                                    <div className="space-y-2.5">
                                                        <div>
                                                            <label className="text-[11px] font-medium text-stone-600 block mb-1">Courier Partner</label>
                                                            <input
                                                                type="text"
                                                                placeholder="e.g. DTDC, Blue Dart, India Post, Delhivery"
                                                                value={currentTracking.courier}
                                                                onChange={(e) => {
                                                                    setTrackingInputs((prev) => ({
                                                                        ...prev,
                                                                        [order.id]: { ...currentTracking, courier: e.target.value },
                                                                    }));
                                                                }}
                                                                className="h-8.5 w-full rounded-lg border border-stone-300 px-2.5 text-xs text-stone-800 focus:outline-hidden"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-[11px] font-medium text-stone-600 block mb-1">Tracking Number / AWB</label>
                                                            <input
                                                                type="text"
                                                                placeholder="e.g. D12345678 or tracking link"
                                                                value={currentTracking.tracking}
                                                                onChange={(e) => {
                                                                    setTrackingInputs((prev) => ({
                                                                        ...prev,
                                                                        [order.id]: { ...currentTracking, tracking: e.target.value },
                                                                    }));
                                                                }}
                                                                className="h-8.5 w-full rounded-lg border border-stone-300 px-2.5 text-xs text-stone-800 focus:outline-hidden"
                                                            />
                                                        </div>
                                                        <button
                                                            type="button"
                                                            disabled={isSavingTracking[order.id]}
                                                            onClick={() => handleSaveTracking(order.id)}
                                                            className="mt-1 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-stone-900 py-1.5 text-xs font-semibold text-white hover:bg-stone-800 transition-colors disabled:opacity-50"
                                                        >
                                                            {isSavingTracking[order.id] ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                                                            Save Tracking
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Price Breakdown */}
                                                <div className="rounded-xl border border-stone-200 bg-white p-4 text-xs text-stone-600">
                                                    <p className="flex justify-between py-1"><span>Products Subtotal</span><b>{money(order.subtotal)}</b></p>
                                                    <p className="flex justify-between py-1"><span>Customisation Charges</span><b>{money(order.customization)}</b></p>
                                                    <p className="flex justify-between py-1"><span>Delivery Charges</span><b>{order.delivery ? money(order.delivery) : 'Complimentary'}</b></p>
                                                    <p className="flex justify-between border-t border-stone-200 pt-2 text-sm font-bold text-stone-900"><span>Grand Total</span><b>{money(order.total)}</b></p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </article>
                        );
                    })}

                    {!filteredOrders.length && (
                        <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-5 py-14 text-center">
                            <ShoppingBag className="mx-auto size-8 text-stone-400" />
                            <p className="mt-3 text-sm font-semibold text-stone-800">No custom orders found</p>
                            <p className="mt-1 text-xs text-stone-500">Customer storefront orders and payment details will appear here live.</p>
                        </div>
                    )}
                </div>
            </div>
        )}

        {editing && <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-0 backdrop-blur-sm sm:items-center sm:p-5"><form onSubmit={saveProduct} className="flex max-h-[96dvh] w-full max-w-5xl flex-col overflow-hidden bg-white shadow-2xl"><header className="flex items-center justify-between border-b border-stone-200 px-5 py-4 sm:px-7"><div><p className="text-[10px] font-semibold uppercase tracking-wider text-brand-700">CATALOG CONFIGURATION</p><h2 className="mt-1 text-lg font-semibold">{products.some((product) => product.id === editing.id) ? 'Edit product' : 'Add photo product'}</h2></div><button type="button" aria-label="Close editor" className="grid size-9 place-items-center hover:bg-stone-100" onClick={() => setEditing(null)}><X size={19} /></button></header><div className="grid flex-1 gap-0 overflow-y-auto lg:grid-cols-[1.04fr_.96fr]"><div className="space-y-4 p-5 sm:p-7"><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-medium text-stone-600">Product name<input required value={editing.name} onChange={(event) => updateEditing({ name: event.target.value })} className="mt-1.5 h-10 w-full border border-stone-300 px-3 text-sm text-stone-900" /></label><label className="text-xs font-medium text-stone-600">Category<select value={editing.category} onChange={(event) => updateEditing({ category: event.target.value as ProductCategory })} className="mt-1.5 h-10 w-full border border-stone-300 bg-white px-3 text-sm">{SHOP_CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></label><label className="text-xs font-medium text-stone-600">Price (₹)<input type="number" min="0" value={editing.price} onChange={(event) => updateEditing({ price: Number(event.target.value) })} className="mt-1.5 h-10 w-full border border-stone-300 px-3 text-sm" /></label><label className="text-xs font-medium text-stone-600">Discount (%)<input type="number" min="0" max="100" value={editing.discount} onChange={(event) => updateEditing({ discount: Number(event.target.value) })} className="mt-1.5 h-10 w-full border border-stone-300 px-3 text-sm" /></label><label className="text-xs font-medium text-stone-600">Customisation charge (₹)<input type="number" min="0" value={editing.customizationPrice} onChange={(event) => updateEditing({ customizationPrice: Number(event.target.value) })} className="mt-1.5 h-10 w-full border border-stone-300 px-3 text-sm" /></label><label className="text-xs font-medium text-stone-600">Stock<input type="number" min="0" value={editing.stock} onChange={(event) => updateEditing({ stock: Number(event.target.value) })} className="mt-1.5 h-10 w-full border border-stone-300 px-3 text-sm" /></label></div><label className="block text-xs font-medium text-stone-600">Description<textarea rows={3} value={editing.description} onChange={(event) => updateEditing({ description: event.target.value })} className="mt-1.5 w-full border border-stone-300 p-3 text-sm" /></label><label className="block text-xs font-medium text-stone-600">Sizes <span className="font-normal text-stone-400">(comma separated)</span><input value={editing.sizes.join(', ')} onChange={(event) => updateEditing({ sizes: event.target.value.split(',') })} className="mt-1.5 h-10 w-full border border-stone-300 px-3 text-sm" /></label><label className="block text-xs font-medium text-stone-600">Variants / finishes <span className="font-normal text-stone-400">(comma separated)</span><input value={editing.variants.join(', ')} onChange={(event) => updateEditing({ variants: event.target.value.split(',') })} className="mt-1.5 h-10 w-full border border-stone-300 px-3 text-sm" /></label><div className="flex flex-wrap gap-5 border-y border-stone-100 py-3"><label className="flex items-center gap-2 text-xs text-stone-700"><input type="checkbox" checked={editing.customizable} onChange={(event) => updateEditing({ customizable: event.target.checked })} /> Photo customisation</label><label className="flex items-center gap-2 text-xs text-stone-700"><input type="checkbox" checked={editing.active} onChange={(event) => updateEditing({ active: event.target.checked })} /> Published</label></div><div className="grid gap-3 sm:grid-cols-2"><input ref={imageInput} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => readUpload(event, 'image')} /><input ref={overlayInput} type="file" accept="image/png" className="hidden" onChange={(event) => readUpload(event, 'frameOverlay')} /><button type="button" className="flex min-h-11 items-center justify-center gap-2 border border-stone-300 px-3 text-xs text-stone-700 hover:bg-stone-50" onClick={() => imageInput.current?.click()}><ImagePlus size={15} /> Upload product image</button><button type="button" className="flex min-h-11 items-center justify-center gap-2 border border-stone-300 px-3 text-xs text-stone-700 hover:bg-stone-50" onClick={() => overlayInput.current?.click()}><Upload size={15} /> Transparent PNG overlay</button></div>{error && <p className="text-xs text-rose-700">{error}</p>}</div>
        <div className="border-t border-stone-200 bg-[#f2f0ea] p-5 sm:p-7 lg:border-l lg:border-t-0"><div className="mb-3 flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-stone-700">Frame placement</p><p className="mt-1 text-[10px] text-stone-500">Preview uses a sample photograph beneath the overlay.</p></div><span className="text-[10px] text-stone-500">X / Y / W / H in %</span></div><div className="mx-auto max-w-75"><ProductCanvas product={editing} photo="/images/weddingphoto1.jpg" adjustment={adjustment} onAdjustment={() => undefined} /></div><div className="mt-4 grid grid-cols-2 gap-3">{([['x', 'Photo area X'], ['y', 'Photo area Y'], ['width', 'Photo area width'], ['height', 'Photo area height'], ['padding', 'Frame border / mat']] as const).map(([key, label]) => <label className="text-[10px] text-stone-600" key={key}>{label}<input type="number" min={key === 'padding' ? 0 : 1} max={100} value={editing.placement[key]} onChange={(event) => updatePlacement(key, event.target.value)} className="mt-1 h-9 w-full border border-stone-300 bg-white px-2 text-xs" /></label>)}<label className="text-[10px] text-stone-600">Photo aspect ratio<input value={editing.placement.aspectRatio} onChange={(event) => updatePlacement('aspectRatio', event.target.value)} placeholder="4:5" className="mt-1 h-9 w-full border border-stone-300 bg-white px-2 text-xs" /></label></div></div></div><footer className="flex items-center justify-between border-t border-stone-200 px-5 py-3 sm:px-7"><span className="text-[10px] text-stone-500">Changes are published live to the studio website storefront.</span><div className="flex gap-2"><button type="button" className="h-9 px-4 text-xs text-stone-600 hover:bg-stone-100" onClick={() => setEditing(null)}>Cancel</button><button type="submit" className="inline-flex h-9 items-center gap-2 bg-stone-900 px-4 text-xs font-medium text-white hover:bg-stone-700"><Save size={14} /> Save product</button></div></footer></form></div>}
    </div>;
}