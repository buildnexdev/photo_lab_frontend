import { BookOpen, Coffee, Frame, Gift, Image, Layers, Plus, Search, Trash2, Edit3, CheckCircle2, XCircle, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getProducts, getProductTypes, saveProductTypes, type ProductType } from '../../lib/photoShop';

const iconMap: Record<string, typeof Frame> = {
    Frame,
    BookOpen,
    Image,
    Coffee,
    Gift,
    Layers,
};

export default function ProductTypes() {
    const [types, setTypes] = useState<ProductType[]>(getProductTypes);
    const [products] = useState(getProducts);
    const [search, setSearch] = useState('');
    const [editing, setEditing] = useState<ProductType | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        saveProductTypes(types);
    }, [types]);

    const filtered = types.filter(
        (t) =>
            t.name.toLowerCase().includes(search.toLowerCase()) ||
            t.code.toLowerCase().includes(search.toLowerCase()) ||
            t.description.toLowerCase().includes(search.toLowerCase())
    );

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editing) return;
        const trimmed: ProductType = {
            ...editing,
            name: editing.name.trim(),
            code: editing.code.trim().toUpperCase(),
        };

        if (!trimmed.name || !trimmed.code) return;

        setTypes((prev) =>
            prev.some((item) => item.id === trimmed.id)
                ? prev.map((item) => (item.id === trimmed.id ? trimmed : item))
                : [trimmed, ...prev]
        );
        setEditing(null);
        setIsCreating(false);
    };

    const handleDelete = (id: string, name: string) => {
        if (window.confirm(`Delete product type "${name}"?`)) {
            setTypes((prev) => prev.filter((t) => t.id !== id));
        }
    };

    const toggleActive = (id: string) => {
        setTypes((prev) => prev.map((t) => (t.id === id ? { ...t, active: !t.active } : t)));
    };

    return (
        <div className="space-y-6 p-4 sm:p-6">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="inline-flex size-2 rounded-full bg-amber-500" />
                        <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">Catalog Architecture</p>
                    </div>
                    <h1 className="mt-1 text-2xl font-bold text-stone-900">Product Types & Categories</h1>
                    <p className="mt-1 text-sm text-stone-500">
                        Define product lines, custom options, and categories for the storefront and studio portal.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => {
                        setEditing({
                            id: `type-${Date.now()}`,
                            name: '',
                            code: '',
                            description: '',
                            icon: 'Layers',
                            active: true,
                        });
                        setIsCreating(true);
                    }}
                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-amber-600 px-4 text-sm font-semibold text-white shadow-xs hover:bg-amber-700 transition-colors cursor-pointer"
                >
                    <Plus className="size-4" /> Add Product Type
                </button>
            </div>

            {/* Toolbar */}
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-stone-200/80 bg-white p-4 shadow-xs">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3.5 top-2.5 size-4 text-stone-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search product types by name, code or description..."
                        className="h-10 w-full rounded-xl border border-stone-200 bg-stone-50/50 pl-10 pr-4 text-sm text-stone-900 placeholder:text-stone-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                </div>
                <div className="text-xs text-stone-500">
                    Total Types: <b className="text-stone-900">{types.length}</b> ({types.filter((t) => t.active).length} Active)
                </div>
            </div>

            {/* Product Types Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((t) => {
                    const IconComp = iconMap[t.icon] || Layers;
                    const count = products.filter((p) => p.category.toLowerCase().includes(t.name.toLowerCase()) || t.name.toLowerCase().includes(p.category.toLowerCase())).length;

                    return (
                        <div
                            key={t.id}
                            className="group relative flex flex-col justify-between rounded-2xl border border-stone-200/80 bg-white p-5 shadow-xs transition-all hover:border-amber-400/80 hover:shadow-md"
                        >
                            <div>
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-700">
                                            <IconComp className="size-5" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-stone-900">{t.name}</h3>
                                            <span className="inline-block rounded-md bg-stone-100 px-2 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider text-stone-600">
                                                {t.code}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => toggleActive(t.id)}
                                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium cursor-pointer transition-colors ${
                                            t.active ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                                        }`}
                                    >
                                        {t.active ? <CheckCircle2 className="size-3.5" /> : <XCircle className="size-3.5" />}
                                        {t.active ? 'Active' : 'Disabled'}
                                    </button>
                                </div>
                                <p className="mt-3 text-xs text-stone-600 leading-relaxed">{t.description || 'No description added yet.'}</p>
                            </div>

                            <div className="mt-5 flex items-center justify-between border-t border-stone-100 pt-3 text-xs">
                                <span className="text-stone-500 font-medium">
                                    <b className="text-stone-900 font-semibold">{count}</b> Products linked
                                </span>
                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEditing(t);
                                            setIsCreating(false);
                                        }}
                                        className="rounded-lg p-1.5 text-stone-500 hover:bg-amber-50 hover:text-amber-700 transition-colors cursor-pointer"
                                        title="Edit type"
                                    >
                                        <Edit3 className="size-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(t.id, t.name)}
                                        className="rounded-lg p-1.5 text-stone-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                                        title="Delete type"
                                    >
                                        <Trash2 className="size-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Modal for Add / Edit */}
            {editing && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
                    <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between border-b border-stone-100 bg-stone-50 px-6 py-4">
                            <div>
                                <h2 className="font-bold text-stone-900">{isCreating ? 'Add New Product Type' : 'Edit Product Type'}</h2>
                                <p className="text-xs text-stone-500">Configure type code, display name and icon.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setEditing(null)}
                                className="rounded-lg p-1 text-stone-400 hover:bg-stone-200 hover:text-stone-700 cursor-pointer"
                            >
                                <X className="size-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
                                    Type Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={editing.name}
                                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                                    placeholder="e.g. Acrylic Prints"
                                    className="h-10 w-full rounded-xl border border-stone-300 px-3 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
                                        Type Code *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={editing.code}
                                        onChange={(e) => setEditing({ ...editing, code: e.target.value.toUpperCase() })}
                                        placeholder="e.g. ACRYLIC"
                                        className="h-10 w-full rounded-xl border border-stone-300 px-3 text-sm font-mono uppercase focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
                                        Icon
                                    </label>
                                    <select
                                        value={editing.icon}
                                        onChange={(e) => setEditing({ ...editing, icon: e.target.value })}
                                        className="h-10 w-full rounded-xl border border-stone-300 bg-white px-3 text-sm focus:border-amber-500 focus:outline-none"
                                    >
                                        <option value="Frame">Frame</option>
                                        <option value="BookOpen">Album Book</option>
                                        <option value="Image">Photo Print</option>
                                        <option value="Coffee">Cup / Mug</option>
                                        <option value="Gift">Keepsake Gift</option>
                                        <option value="Layers">Generic Layer</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
                                    Description
                                </label>
                                <textarea
                                    rows={3}
                                    value={editing.description}
                                    onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                                    placeholder="Describe this product type..."
                                    className="w-full rounded-xl border border-stone-300 p-3 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                                />
                            </div>

                            <div className="flex items-center gap-2 pt-2">
                                <input
                                    type="checkbox"
                                    id="activeCheck"
                                    checked={editing.active}
                                    onChange={(e) => setEditing({ ...editing, active: e.target.checked })}
                                    className="size-4 accent-amber-600 rounded"
                                />
                                <label htmlFor="activeCheck" className="text-sm font-medium text-stone-800 cursor-pointer">
                                    Active on storefront & catalog
                                </label>
                            </div>

                            <div className="flex justify-end gap-3 border-t border-stone-100 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setEditing(null)}
                                    className="h-10 rounded-xl border border-stone-300 px-4 text-sm font-medium text-stone-700 hover:bg-stone-50 cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="h-10 rounded-xl bg-amber-600 px-5 text-sm font-semibold text-white shadow-xs hover:bg-amber-700 cursor-pointer"
                                >
                                    Save Product Type
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
