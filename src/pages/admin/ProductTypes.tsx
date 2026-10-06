// Developer by: Buildnexdev.in
// Devevloper : Nandhakumar@gmail.com
// Last Edited : 06-10-2026
import { BookOpen, Coffee, Frame, Gift, Image, Layers, Pencil, Plus, Search, Trash2, Edit3, CheckCircle2, XCircle, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getProducts, getProductTypes, saveProductTypes, type ProductType } from '../../lib/photoShop';
import { clsx } from 'clsx';
import { COLORFUL_THEMES, DataTable, TableHeaderToolbar, StatusBadge } from '../../components/data';
import { Card, PageHeader, IconButton } from '../../components/ui';

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
    const [viewMode, setViewMode] = useState<'table' | 'grid'>('grid');

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
        <div>
            <PageHeader
                title="Product Types & Categories"
                subtitle="Define product lines, custom options, and categories for the storefront and studio portal."
            />
            
            <Card padded={false}>
                <TableHeaderToolbar
                    search={search}
                    onSearch={setSearch}
                    searchPlaceholder="Search product types by name, code..."
                    viewMode={viewMode}
                    onViewModeChange={setViewMode}
                    onAdd={() => {
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
                    addLabel="Add Product Type"
                />

                <DataTable
                    viewMode={viewMode}
                    rows={filtered}
                    rowKey={(r) => r.id}
                    onRowClick={(r) => {
                        setEditing(r);
                        setIsCreating(false);
                    }}
                    renderCard={(t) => {
                        const index = types.findIndex(x => x.id === t.id);
                        const IconComp = iconMap[t.icon] || Layers;
                        const count = products.filter((p) => p.category.toLowerCase().includes(t.name.toLowerCase()) || t.name.toLowerCase().includes(p.category.toLowerCase())).length;
                        const theme = COLORFUL_THEMES[Math.max(0, index) % COLORFUL_THEMES.length];

                        return (
                            <div className="flex h-full flex-col justify-between p-5">
                                <div>
                                    <div className="flex items-center justify-between gap-3 mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className={clsx('flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br shadow-sm', theme.bg, theme.text)}>
                                                <IconComp className="size-5" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-stone-900">{t.name}</h3>
                                                <span className="inline-block rounded-md bg-stone-100 px-2 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider text-stone-600">
                                                    {t.code}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-xs text-stone-600 line-clamp-2">{t.description || 'No description added yet.'}</p>
                                </div>
                                <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-4">
                                    <div className="flex flex-col">
                                        <StatusBadge status={t.active ? 'ACTIVE' : 'INACTIVE'} />
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className="text-xs text-stone-500 font-medium mr-2">
                                            <b className="text-stone-900 font-semibold">{count}</b> linked
                                        </span>
                                        <IconButton label="Edit" icon={<Pencil className="size-4" />} onClick={(e) => { e.stopPropagation(); setEditing(t); setIsCreating(false); }} />
                                        <IconButton tone="danger" label="Delete" icon={<Trash2 className="size-4" />} onClick={(e) => { e.stopPropagation(); handleDelete(t.id, t.name); }} />
                                    </div>
                                </div>
                            </div>
                        );
                    }}
                    columns={[
                        {
                            key: 'type',
                            header: 'Product Type',
                            cell: (t) => {
                                const index = types.findIndex(x => x.id === t.id);
                                const IconComp = iconMap[t.icon] || Layers;
                                const theme = COLORFUL_THEMES[Math.max(0, index) % COLORFUL_THEMES.length];
                                return (
                                    <div className="flex items-center gap-3 py-1">
                                        <div className={clsx('flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br shadow-sm', theme.bg, theme.text)}>
                                            <IconComp className="size-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="font-semibold text-stone-900">{t.name}</h3>
                                            <span className="inline-block rounded-md bg-stone-100 px-2 py-0.5 mt-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider text-stone-600">
                                                {t.code}
                                            </span>
                                        </div>
                                    </div>
                                );
                            },
                        },
                        {
                            key: 'desc',
                            header: 'Description',
                            cell: (t) => <p className="text-xs text-stone-600 truncate max-w-sm">{t.description || '—'}</p>,
                            hideOnMobile: true
                        },
                        {
                            key: 'linked',
                            header: 'Products Linked',
                            cell: (t) => {
                                const count = products.filter((p) => p.category.toLowerCase().includes(t.name.toLowerCase()) || t.name.toLowerCase().includes(p.category.toLowerCase())).length;
                                return <span className="text-xs text-stone-500 font-medium"><b className="text-stone-900 font-semibold">{count}</b> linked</span>;
                            },
                        },
                        {
                            key: 'status',
                            header: 'Status',
                            cell: (t) => <StatusBadge status={t.active ? 'ACTIVE' : 'INACTIVE'} />,
                        },
                        {
                            key: 'actions',
                            header: '',
                            className: 'text-right',
                            cell: (t) => (
                                <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                                    <button type="button" onClick={() => toggleActive(t.id)} className={`hidden sm:inline-flex rounded-lg px-2 py-1.5 text-[10px] font-bold uppercase transition-colors ${t.active ? 'text-emerald-700 hover:bg-emerald-50' : 'text-stone-500 hover:bg-stone-100'}`}>{t.active ? 'Disable' : 'Enable'}</button>
                                    <IconButton label="Edit" icon={<Pencil className="size-4" />} onClick={() => { setEditing(t); setIsCreating(false); }} />
                                    <IconButton tone="danger" label="Delete" icon={<Trash2 className="size-4" />} onClick={() => handleDelete(t.id, t.name)} />
                                </div>
                            ),
                        },
                    ]}
                />
            </Card>



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
