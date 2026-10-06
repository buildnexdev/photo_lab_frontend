// Developer by: Buildnexdev.in
// Devevloper : Nandhakumar@gmail.com
// Last Edited : 06-10-2026
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { CheckCircle2, Pencil, Plus, Star, Trash2, Upload } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useSearchParams } from 'react-router';
import { z } from 'zod';
import { DataTable, EmptyState, QueryState, StatusBadge } from '../../components/data';
import { Checkbox, Field, FormGrid, Input, Select, Textarea } from '../../components/form';
import { Modal, useConfirm } from '../../components/overlay';
import { useToast } from '../../components/toast';
import { Button, Card, IconButton, PageHeader, Tabs } from '../../components/ui';
import { api, applyFieldErrors } from '../../lib/api';
import { bytes } from '../../lib/format';
import { useInvalidate } from '../../lib/hooks';
import { apiAsset } from '../../lib/site';

interface PortfolioRow {
    id: number;
    title: string;
    category: string;
    description: string | null;
    is_featured: number;
    sort_order: number;
}

interface TestimonialRow {
    id: number;
    name: string;
    event_label: string | null;
    quote: string;
    rating: number;
    is_published: number;
    sort_order: number;
}

interface HeroSlideSetting {
    id: string;
    title: string;
    subtitle: string;
    imageUrl: string;
    tag: string;
    lens?: string;
    shutter?: string;
    iso?: string;
}

interface WebsiteSettingsData {
    bannerActive: boolean;
    bannerDiscount: string;
    bannerText: string;
    couponCode: string;
    heroSubtitle: string;
    historyText: string;
    whyChooseUs: string[];
    slides?: HeroSlideSetting[];
}

const MAX_UPLOAD = 25 * 1024 * 1024;

export default function AdminWebsite() {
    const [params, setParams] = useSearchParams();
    const tab = params.get('tab') || 'hero';

    return (
        <div className="space-y-6">
            <PageHeader
                title="Website Content"
                subtitle="Customize promotional banners, moving hero slides, brand story, portfolio showcase, and client reviews."
            />
            <Tabs
                className="mb-4"
                value={tab}
                onChange={(t) => setParams(t === 'hero' ? {} : { tab: t }, { replace: true })}
                tabs={[
                    { value: 'hero', label: 'Hero & Promo Banner' },
                    { value: 'about', label: 'Story & Why Choose Us' },
                    { value: 'portfolio', label: 'Portfolio' },
                    { value: 'testimonials', label: 'Testimonials' },
                ]}
            />
            {tab === 'hero' && <HeroBannerSettings />}
            {tab === 'about' && <AboutSettings />}
            {tab === 'portfolio' && <Portfolio />}
            {tab === 'testimonials' && <Testimonials />}
        </div>
    );
}

/* ---------------- Hero & Top Promo Banner Settings ---------------- */

function HeroBannerSettings() {
    const toast = useToast();
    const invalidate = useInvalidate();
    const q = useQuery({ queryKey: ['settings'], queryFn: () => api.get<{ website?: WebsiteSettingsData }>('/api/settings') });

    const [bannerActive, setBannerActive] = useState(true);
    const [bannerDiscount, setBannerDiscount] = useState('10% OFF');
    const [couponCode, setCouponCode] = useState('WELCOME10');
    const [bannerText, setBannerText] = useState('Bookings Open! Enjoy an exclusive 10% discount on all Wedding & Milestone packages');
    const [heroSubtitle, setHeroSubtitle] = useState('Stories told in light, delivered as they unfold across your celebrations.');
    const [slides, setSlides] = useState<HeroSlideSetting[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (q.data?.website) {
            const w = q.data.website;
            setBannerActive(w.bannerActive ?? true);
            setBannerDiscount(w.bannerDiscount || '10% OFF');
            setCouponCode(w.couponCode || 'WELCOME10');
            setBannerText(w.bannerText || '');
            setHeroSubtitle(w.heroSubtitle || '');
            setSlides(
                w.slides?.length
                    ? w.slides
                    : [
                          {
                              id: '1',
                              title: 'Timeless Wedding & Milestone Imagery',
                              subtitle: 'Authentic emotion, master framing, and effortless digital delivery for your big day.',
                              imageUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=2000&q=85',
                              tag: 'Wedding & Grand Celebrations',
                              lens: '85mm f/1.4 GM',
                              shutter: '1/800s',
                              iso: '100',
                          },
                          {
                              id: '2',
                              title: 'Birthdays & Intimate Ceremonies',
                              subtitle: 'Preserving laughter, candlelit milestones, and candid family bonds with editorial warmth.',
                              imageUrl: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=2000&q=85',
                              tag: 'Birthdays & Housewarming',
                              lens: '35mm f/1.4 Art',
                              shutter: '1/500s',
                              iso: '200',
                          },
                      ],
            );
        }
    }, [q.data]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const currentWebsite = q.data?.website || ({} as Partial<WebsiteSettingsData>);
            const payload: WebsiteSettingsData = {
                bannerActive,
                bannerDiscount: bannerDiscount.trim() || '10% OFF',
                bannerText: bannerText.trim(),
                couponCode: couponCode.trim() || 'WELCOME10',
                heroSubtitle: heroSubtitle.trim(),
                historyText: currentWebsite.historyText || 'Founded with a passion for authentic visual storytelling...',
                whyChooseUs: currentWebsite.whyChooseUs || [
                    'Instant Live QR Event Galleries for Guests',
                    'Full High-Resolution Master Digital Downloads',
                    'Handcrafted Flush-Mount Archival Albums',
                    'Dedicated Lead Photographers & Master Retouchers',
                    'Transparent All-Inclusive Pricing & Timely Delivery',
                ],
                slides,
            };
            const res = await api.send('PUT', '/api/settings/website', payload);
            toast.success(res.message || 'Website hero and promotional banner updated');
            await invalidate(['settings'], ['site']);
        } catch (err) {
            toast.error(err);
        } finally {
            setIsSaving(false);
        }
    };

    const addSlide = () => {
        setSlides([
            ...slides,
            {
                id: String(Date.now()),
                title: 'New Milestone Celebration',
                subtitle: 'Editorial storytelling and candid documentary photography.',
                imageUrl: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=2000&q=85',
                tag: 'Milestone & Events',
                lens: '50mm f/1.2 GM',
                shutter: '1/640s',
                iso: '160',
            },
        ]);
    };

    const removeSlide = (index: number) => {
        setSlides(slides.filter((_, i) => i !== index));
    };

    const updateSlide = (index: number, key: keyof HeroSlideSetting, val: string) => {
        const next = [...slides];
        next[index] = { ...next[index], [key]: val };
        setSlides(next);
    };

    return (
        <QueryState query={q}>
            {() => (
                <form onSubmit={handleSave} className="space-y-6">
                    <Card
                        title={
                            <div>
                                <h2 className="font-semibold text-stone-900">Top Promotional Header Banner (10% Discount Running)</h2>
                                <p className="text-xs text-stone-500 font-normal">Displays an animated announcement ribbon at the top of the website with direct coupon promo.</p>
                            </div>
                        }
                    >
                        <div className="space-y-4">
                            <Checkbox
                                label="Enable promotional header banner"
                                description="Display company announcements, booking open notices, and running discount codes."
                                checked={bannerActive}
                                onChange={(e) => setBannerActive(e.target.checked)}
                            />
                            <FormGrid>
                                <Input
                                    label="Discount badge label"
                                    value={bannerDiscount}
                                    onChange={(e) => setBannerDiscount(e.target.value)}
                                    placeholder="e.g. 10% OFF or SPECIAL OFFER"
                                />
                                <Input
                                    label="Coupon code"
                                    value={couponCode}
                                    onChange={(e) => setCouponCode(e.target.value)}
                                    placeholder="e.g. WELCOME10"
                                />
                            </FormGrid>
                            <Textarea
                                label="Promotional ticker message"
                                rows={2}
                                value={bannerText}
                                onChange={(e) => setBannerText(e.target.value)}
                                placeholder="Bookings Open! Enjoy an exclusive 10% discount on all Wedding & Milestone packages"
                            />
                        </div>
                    </Card>

                    <Card
                        title={
                            <div>
                                <h2 className="font-semibold text-stone-900">Moving Background Hero Slides</h2>
                                <p className="text-xs text-stone-500 font-normal">Hero section with automatic Ken Burns camera movement, dynamic taglines, and camera exposure specs.</p>
                            </div>
                        }
                        actions={
                            <Button type="button" size="sm" icon={<Plus className="size-4" />} onClick={addSlide}>
                                Add Hero Slide
                            </Button>
                        }
                    >
                        <div className="space-y-6">
                            <Textarea
                                label="Hero headline subtitle"
                                rows={2}
                                value={heroSubtitle}
                                onChange={(e) => setHeroSubtitle(e.target.value)}
                                placeholder="Stories told in light, delivered as they unfold across your celebrations."
                            />

                            <div className="space-y-4">
                                <p className="text-sm font-semibold text-stone-900">Background Slides ({slides.length})</p>
                                {slides.map((slide, idx) => (
                                    <div key={slide.id || idx} className="rounded-xl border border-stone-200 bg-stone-50/50 p-4">
                                        <div className="flex items-start justify-between gap-4 pb-3">
                                            <div className="flex items-center gap-2">
                                                <span className="flex size-6 items-center justify-center rounded-full bg-stone-200 text-xs font-bold text-stone-700">
                                                    {idx + 1}
                                                </span>
                                                <span className="text-sm font-semibold text-stone-800">{slide.tag || 'Slide'}</span>
                                            </div>
                                            {slides.length > 1 && (
                                                <IconButton
                                                    label="Remove slide"
                                                    tone="danger"
                                                    icon={<Trash2 className="size-4" />}
                                                    onClick={() => removeSlide(idx)}
                                                />
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
                                            <div className="lg:col-span-1">
                                                <div className="aspect-[16/10] overflow-hidden rounded-lg border border-stone-200 bg-stone-100">
                                                    <img
                                                        src={slide.imageUrl}
                                                        alt={slide.title}
                                                        className="size-full object-cover"
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80';
                                                        }}
                                                    />
                                                </div>
                                                <p className="mt-1 text-center text-xs text-stone-400">Live preview</p>
                                            </div>

                                            <div className="space-y-3 lg:col-span-3">
                                                <Input
                                                    label="Image URL"
                                                    value={slide.imageUrl}
                                                    onChange={(e) => updateSlide(idx, 'imageUrl', e.target.value)}
                                                    placeholder="https://..."
                                                />
                                                <FormGrid>
                                                    <Input
                                                        label="Slide title"
                                                        value={slide.title}
                                                        onChange={(e) => updateSlide(idx, 'title', e.target.value)}
                                                        placeholder="e.g. Timeless Wedding & Milestone Imagery"
                                                    />
                                                    <Input
                                                        label="Event category tag"
                                                        value={slide.tag}
                                                        onChange={(e) => updateSlide(idx, 'tag', e.target.value)}
                                                        placeholder="e.g. Wedding & Grand Celebrations"
                                                    />
                                                </FormGrid>
                                                <Input
                                                    label="Slide description"
                                                    value={slide.subtitle}
                                                    onChange={(e) => updateSlide(idx, 'subtitle', e.target.value)}
                                                    placeholder="Authentic emotion, master framing, and effortless digital delivery."
                                                />
                                                <div className="grid grid-cols-3 gap-2">
                                                    <Input
                                                        label="Lens"
                                                        value={slide.lens || ''}
                                                        onChange={(e) => updateSlide(idx, 'lens', e.target.value)}
                                                        placeholder="85mm f/1.4"
                                                    />
                                                    <Input
                                                        label="Shutter"
                                                        value={slide.shutter || ''}
                                                        onChange={(e) => updateSlide(idx, 'shutter', e.target.value)}
                                                        placeholder="1/800s"
                                                    />
                                                    <Input
                                                        label="ISO"
                                                        value={slide.iso || ''}
                                                        onChange={(e) => updateSlide(idx, 'iso', e.target.value)}
                                                        placeholder="100"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Card>

                    <div className="flex justify-end">
                        <Button type="submit" loading={isSaving}>
                            Save Hero & Banner Changes
                        </Button>
                    </div>
                </form>
            )}
        </QueryState>
    );
}

/* ---------------- About & Story Settings ---------------- */

function AboutSettings() {
    const toast = useToast();
    const invalidate = useInvalidate();
    const q = useQuery({ queryKey: ['settings'], queryFn: () => api.get<{ website?: WebsiteSettingsData }>('/api/settings') });

    const [historyText, setHistoryText] = useState('');
    const [whyChooseUs, setWhyChooseUs] = useState<string[]>([]);
    const [newPoint, setNewPoint] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (q.data?.website) {
            const w = q.data.website;
            setHistoryText(
                w.historyText ||
                    'Founded with a passion for authentic visual storytelling, PhotoLab Studio has spent over a decade documenting life’s most cherished celebrations.',
            );
            setWhyChooseUs(
                w.whyChooseUs?.length
                    ? w.whyChooseUs
                    : [
                          'Instant Live QR Event Galleries for Guests',
                          'Full High-Resolution Master Digital Downloads',
                          'Handcrafted Flush-Mount Archival Albums',
                          'Dedicated Lead Photographers & Master Retouchers',
                          'Transparent All-Inclusive Pricing & Timely Delivery',
                      ],
            );
        }
    }, [q.data]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const currentWebsite = q.data?.website || ({} as Partial<WebsiteSettingsData>);
            const payload: WebsiteSettingsData = {
                bannerActive: currentWebsite.bannerActive ?? true,
                bannerDiscount: currentWebsite.bannerDiscount || '10% OFF',
                bannerText: currentWebsite.bannerText || 'Bookings Open! Enjoy an exclusive 10% discount on all Wedding & Milestone packages',
                couponCode: currentWebsite.couponCode || 'WELCOME10',
                heroSubtitle: currentWebsite.heroSubtitle || 'Stories told in light, delivered as they unfold across your celebrations.',
                historyText: historyText.trim(),
                whyChooseUs: whyChooseUs.filter((p) => p.trim().length > 0),
                slides: currentWebsite.slides,
            };
            const res = await api.send('PUT', '/api/settings/website', payload);
            toast.success(res.message || 'About page and Why Choose Us content updated');
            await invalidate(['settings'], ['site']);
        } catch (err) {
            toast.error(err);
        } finally {
            setIsSaving(false);
        }
    };

    const addPoint = () => {
        if (!newPoint.trim()) return;
        setWhyChooseUs([...whyChooseUs, newPoint.trim()]);
        setNewPoint('');
    };

    const removePoint = (index: number) => {
        setWhyChooseUs(whyChooseUs.filter((_, i) => i !== index));
    };

    return (
        <QueryState query={q}>
            {() => (
                <form onSubmit={handleSave} className="space-y-6">
                    <Card
                        title={
                            <div>
                                <h2 className="font-semibold text-stone-900">Studio History & Heritage Story</h2>
                                <p className="text-xs text-stone-500 font-normal">Shown on the About page under the #history section, detailing your journey, values, and dedication to craft.</p>
                            </div>
                        }
                    >
                        <Textarea
                            label="Studio story & heritage narrative"
                            rows={6}
                            value={historyText}
                            onChange={(e) => setHistoryText(e.target.value)}
                            placeholder="Founded with a passion for authentic visual storytelling..."
                        />
                    </Card>

                    <Card
                        title={
                            <div>
                                <h2 className="font-semibold text-stone-900">Why Choose Us Checklist</h2>
                                <p className="text-xs text-stone-500 font-normal">Key client differentiators and quality commitments shown on the About page under #why-choose-us.</p>
                            </div>
                        }
                    >
                        <div className="space-y-4">
                            <div className="space-y-2">
                                {whyChooseUs.map((point, idx) => (
                                    <div key={idx} className="flex items-center justify-between gap-3 rounded-lg border border-stone-200 bg-stone-50/50 p-3">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                                            <span className="text-sm text-stone-800">{point}</span>
                                        </div>
                                        <IconButton
                                            label="Delete point"
                                            tone="danger"
                                            icon={<Trash2 className="size-4" />}
                                            onClick={() => removePoint(idx)}
                                        />
                                    </div>
                                ))}
                            </div>

                            <div className="flex gap-2 pt-2">
                                <Input
                                    placeholder="Add a new differentiator (e.g. Master Retouching Guaranteed)..."
                                    value={newPoint}
                                    onChange={(e) => setNewPoint(e.target.value)}
                                    wrapperClassName="flex-1"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            addPoint();
                                        }
                                    }}
                                />
                                <Button type="button" icon={<Plus className="size-4" />} onClick={addPoint}>
                                    Add Point
                                </Button>
                            </div>
                        </div>
                    </Card>

                    <div className="flex justify-end">
                        <Button type="submit" loading={isSaving}>
                            Save About & Story Changes
                        </Button>
                    </div>
                </form>
            )}
        </QueryState>
    );
}

/* ---------------- Portfolio Management ---------------- */

function Portfolio() {
    const toast = useToast();
    const invalidate = useInvalidate();
    const { ask, dialog } = useConfirm();
    const [editing, setEditing] = useState<PortfolioRow | 'new' | null>(null);
    const q = useQuery({ queryKey: ['catalog', 'portfolio'], queryFn: () => api.get<PortfolioRow[]>('/api/catalog/portfolio') });
    const del = useMutation({
        mutationFn: (id: number) => api.send('DELETE', `/api/catalog/portfolio/${id}`),
        onSuccess: (r) => (toast.success(r.message), invalidate(['catalog', 'portfolio'], ['site'])),
        onError: (e) => toast.error(e),
    });
    const categories = [...new Set((q.data ?? []).map((p) => p.category))].sort();
    return (
        <Card
            title="Portfolio"
            padded={false}
            actions={
                <Button size="sm" icon={<Upload className="size-4" />} onClick={() => setEditing('new')}>
                    Add image
                </Button>
            }
        >
            <QueryState query={q} isEmpty={(d) => !d.length} empty={<EmptyState title="No portfolio images" description="Upload your best work to show on the website." action={<Button onClick={() => setEditing('new')}>Upload an image</Button>} />}>
                {(rows) => (
                    <div className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3 lg:grid-cols-4">
                        {rows.map((p) => (
                            <figure key={p.id} className="overflow-hidden rounded-lg border border-stone-200">
                                <div className="relative aspect-[4/3] bg-stone-100">
                                    <img src={apiAsset(`/api/public/portfolio/${p.id}/image`)} alt={p.title} loading="lazy" className="size-full object-cover" />
                                    {p.is_featured ? (
                                        <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded bg-white/90 px-1.5 py-0.5 text-xs font-medium">
                                            <Star className="size-3 fill-amber-400 text-amber-400" /> Featured
                                        </span>
                                    ) : null}
                                </div>
                                <figcaption className="flex items-start justify-between gap-2 p-3">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium">{p.title}</p>
                                        <p className="text-xs text-stone-500">{p.category}</p>
                                    </div>
                                    <div className="flex shrink-0">
                                        <IconButton label="Edit" icon={<Pencil className="size-4" />} onClick={() => setEditing(p)} />
                                        <IconButton label="Delete" tone="danger" icon={<Trash2 className="size-4" />} onClick={async () => (await ask({ title: `Delete “${p.title}”?`, message: 'The image is removed from the website and storage.', confirmLabel: 'Delete' })) && del.mutate(p.id)} />
                                    </div>
                                </figcaption>
                            </figure>
                        ))}
                    </div>
                )}
            </QueryState>
            <PortfolioModal value={editing} categories={categories} onClose={() => setEditing(null)} />
            {dialog}
        </Card>
    );
}

const portfolioSchema = z.object({
    title: z.string().trim().min(2, 'Enter a title').max(160),
    category: z.string().trim().min(2, 'Enter a category').max(60),
    description: z.string().trim().max(255),
    isFeatured: z.boolean(),
    sortOrder: z.coerce.number().int().min(0).max(9999),
});
type PortfolioForm = z.input<typeof portfolioSchema>;

function PortfolioModal({ value, categories, onClose }: { value: PortfolioRow | 'new' | null; categories: string[]; onClose: () => void }) {
    const toast = useToast();
    const invalidate = useInvalidate();
    const [file, setFile] = useState<File | null>(null);
    const [fileError, setFileError] = useState('');
    const [preview, setPreview] = useState<string | null>(null);
    const isNew = value === 'new';
    const {
        register,
        handleSubmit,
        reset,
        setError,
        formState: { errors, isSubmitting },
    } = useForm<PortfolioForm, unknown, z.output<typeof portfolioSchema>>({ resolver: zodResolver(portfolioSchema) });
    useEffect(() => {
        if (!value) return;
        setFile(null);
        setFileError('');
        reset(value === 'new' ? { title: '', category: categories[0] ?? '', description: '', isFeatured: false, sortOrder: 0 } : { title: value.title, category: value.category, description: value.description ?? '', isFeatured: !!value.is_featured, sortOrder: value.sort_order });
    }, [value, reset, categories]);
    useEffect(() => {
        if (!file) return setPreview(null);
        const url = URL.createObjectURL(file);
        setPreview(url);
        return () => URL.revokeObjectURL(url);
    }, [file]);
    const pick = (f: File | undefined) => {
        setFileError('');
        if (!f) return setFile(null);
        if (!/^image\/(jpeg|png|webp)$/.test(f.type)) return setFileError('Use a JPEG, PNG or WebP image');
        if (f.size > MAX_UPLOAD) return setFileError(`Maximum ${bytes(MAX_UPLOAD)}`);
        setFile(f);
    };
    const submit = handleSubmit(async (v) => {
        try {
            let message: string;
            if (isNew) {
                if (!file) return setFileError('Choose an image');
                const fd = new FormData();
                fd.append('file', file);
                fd.append('title', v.title);
                fd.append('category', v.category);
                if (v.description) fd.append('description', v.description);
                fd.append('isFeatured', v.isFeatured ? 'true' : 'false');
                fd.append('sortOrder', String(v.sortOrder));
                message = (await api.send('POST', '/api/catalog/portfolio', fd)).message;
            } else {
                message = (await api.send('PUT', `/api/catalog/portfolio/${(value as PortfolioRow).id}`, { ...v, description: v.description || null })).message;
            }
            toast.success(message);
            await invalidate(['catalog', 'portfolio'], ['site']);
            onClose();
        } catch (e) {
            if (!applyFieldErrors(e, setError as never)) toast.error(e);
        }
    });
    return (
        <Modal
            open={!!value}
            onClose={onClose}
            title={isNew ? 'Add portfolio image' : 'Edit portfolio image'}
            size="lg"
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button loading={isSubmitting} onClick={submit}>
                        {isNew ? 'Upload' : 'Save'}
                    </Button>
                </>
            }
        >
            <form onSubmit={submit} noValidate className="space-y-4">
                {isNew ? (
                    <Field label="Image" required error={fileError} hint="JPEG, PNG or WebP up to 25 MB. Stored privately and served through short-lived links.">
                        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-stone-300 p-6 text-sm text-stone-500 hover:border-brand-500">
                            {preview ? <img src={preview} alt="" className="max-h-48 rounded" /> : <Upload className="size-6" />}
                            <span>{file ? `${file.name} · ${bytes(file.size)}` : 'Click to choose an image'}</span>
                            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
                        </label>
                    </Field>
                ) : (
                    <img src={apiAsset(`/api/public/portfolio/${(value as PortfolioRow).id}/image`)} alt="" className="max-h-48 rounded" />
                )}
                <FormGrid>
                    <Input label="Title" required {...register('title')} error={errors.title?.message} />
                    <div>
                        <Input label="Category" required list="portfolio-cats" {...register('category')} error={errors.category?.message} placeholder="e.g. Wedding" />
                        <datalist id="portfolio-cats">
                            {categories.map((c) => (
                                <option key={c} value={c} />
                            ))}
                        </datalist>
                    </div>
                    <Input label="Caption" wrapperClassName="sm:col-span-2" {...register('description')} error={errors.description?.message} />
                    <Input label="Sort order" type="number" min={0} {...register('sortOrder')} error={errors.sortOrder?.message} />
                </FormGrid>
                <Checkbox label="Featured on the home page" {...register('isFeatured')} />
            </form>
        </Modal>
    );
}

/* ---------------- Testimonials Management ---------------- */

function Testimonials() {
    const toast = useToast();
    const invalidate = useInvalidate();
    const { ask, dialog } = useConfirm();
    const [editing, setEditing] = useState<TestimonialRow | 'new' | null>(null);
    const q = useQuery({ queryKey: ['catalog', 'testimonials'], queryFn: () => api.get<TestimonialRow[]>('/api/catalog/testimonials') });
    const del = useMutation({
        mutationFn: (id: number) => api.send('DELETE', `/api/catalog/testimonials/${id}`),
        onSuccess: (r) => (toast.success(r.message), invalidate(['catalog', 'testimonials'], ['site'])),
        onError: (e) => toast.error(e),
    });
    return (
        <Card
            title="Testimonials"
            padded={false}
            actions={
                <Button size="sm" icon={<Plus className="size-4" />} onClick={() => setEditing('new')}>
                    Add testimonial
                </Button>
            }
        >
            <QueryState query={q}>
                {(rows) => (
                    <DataTable
                        rows={rows}
                        rowKey={(r) => r.id}
                        onRowClick={setEditing}
                        empty={<EmptyState title="No testimonials yet" />}
                        columns={[
                            {
                                key: 'name',
                                header: 'Client',
                                cell: (r) => (
                                    <div>
                                        <p className="font-medium">{r.name}</p>
                                        <p className="text-xs text-stone-500">{r.event_label}</p>
                                    </div>
                                ),
                            },
                            { key: 'quote', header: 'Quote', cell: (r) => <span className="line-clamp-2 max-w-md text-stone-600">{r.quote}</span>, hideOnMobile: true },
                            { key: 'rating', header: 'Rating', cell: (r) => `${r.rating}/5` },
                            { key: 'status', header: 'Status', cell: (r) => <StatusBadge status={r.is_published ? 'PUBLISHED' : 'DRAFT'} /> },
                            {
                                key: 'act',
                                header: '',
                                cell: (r) => (
                                    <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                                        <IconButton label="Edit" icon={<Pencil className="size-4" />} onClick={() => setEditing(r)} />
                                        <IconButton label="Delete" tone="danger" icon={<Trash2 className="size-4" />} onClick={async () => (await ask({ title: 'Delete testimonial?', message: `${r.name}'s testimonial will be removed from the website.`, confirmLabel: 'Delete' })) && del.mutate(r.id)} />
                                    </div>
                                ),
                            },
                        ]}
                    />
                )}
            </QueryState>
            <TestimonialModal value={editing} onClose={() => setEditing(null)} />
            {dialog}
        </Card>
    );
}

const testimonialSchema = z.object({
    name: z.string().trim().min(2, 'Enter the client name').max(120),
    eventLabel: z.string().trim().max(120),
    quote: z.string().trim().min(10, 'At least 10 characters').max(1000),
    rating: z.coerce.number().int().min(1).max(5),
    isPublished: z.boolean(),
    sortOrder: z.coerce.number().int().min(0).max(9999),
});
type TestimonialForm = z.input<typeof testimonialSchema>;

function TestimonialModal({ value, onClose }: { value: TestimonialRow | 'new' | null; onClose: () => void }) {
    const toast = useToast();
    const invalidate = useInvalidate();
    const {
        register,
        handleSubmit,
        reset,
        setError,
        formState: { errors, isSubmitting },
    } = useForm<TestimonialForm, unknown, z.output<typeof testimonialSchema>>({ resolver: zodResolver(testimonialSchema) });
    useEffect(() => {
        if (!value) return;
        reset(value === 'new' ? { name: '', eventLabel: '', quote: '', rating: 5, isPublished: true, sortOrder: 0 } : { name: value.name, eventLabel: value.event_label ?? '', quote: value.quote, rating: value.rating, isPublished: !!value.is_published, sortOrder: value.sort_order });
    }, [value, reset]);
    const submit = handleSubmit(async (v) => {
        const body = { ...v, eventLabel: v.eventLabel || null };
        try {
            const r = value === 'new' ? await api.send('POST', '/api/catalog/testimonials', body) : await api.send('PUT', `/api/catalog/testimonials/${(value as TestimonialRow).id}`, body);
            toast.success(r.message || 'Testimonial saved');
            await invalidate(['catalog', 'testimonials'], ['site']);
            onClose();
        } catch (e) {
            if (!applyFieldErrors(e, setError as never)) toast.error(e);
        }
    });
    return (
        <Modal
            open={!!value}
            onClose={onClose}
            title={value === 'new' ? 'Add testimonial' : 'Edit testimonial'}
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button loading={isSubmitting} onClick={submit}>
                        Save
                    </Button>
                </>
            }
        >
            <form onSubmit={submit} noValidate className="space-y-4">
                <FormGrid>
                    <Input label="Client name" required {...register('name')} error={errors.name?.message} />
                    <Input label="Event" {...register('eventLabel')} error={errors.eventLabel?.message} placeholder="e.g. Wedding, Chennai" />
                </FormGrid>
                <Textarea label="Quote" required rows={4} {...register('quote')} error={errors.quote?.message} />
                <FormGrid>
                    <Select label="Rating" {...register('rating')} options={[5, 4, 3, 2, 1].map((n) => ({ value: n, label: `${n} star${n > 1 ? 's' : ''}` }))} />
                    <Input label="Sort order" type="number" min={0} {...register('sortOrder')} error={errors.sortOrder?.message} />
                </FormGrid>
                <Checkbox label="Published" description="Shown on the website." {...register('isPublished')} />
            </form>
        </Modal>
    );
}
