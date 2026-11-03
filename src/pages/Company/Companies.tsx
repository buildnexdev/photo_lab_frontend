// Developer by: Buildnexdev.in
// Last Edited : 29-10-2026
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
    BarChart3,
    Building2,
    CalendarDays,
    Camera,
    Check,
    CheckSquare,
    Copy,
    Globe,
    Image as ImageIcon,
    Inbox,
    KeyRound,
    Mail,
    Phone,
    Plus,
    QrCode,
    Receipt,
    RefreshCw,
    ShoppingBag,
    Square,
    Trash2,
    Upload,
    UserCheck,
    X,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button, Card, PageHeader } from '../../components/ui';
import { EmptyState, QueryState, StatusBadge } from '../../components/ui/Data';
import { FormGrid, Input, PasswordInput, Textarea } from '../../components/ui/Form';
import { Modal } from '../../components/ui/Overlay';
import { useToast } from '../../components/ui/Toast';
import { useInvalidate } from '../../hooks';
import { useAuth } from '../../hooks/useAuth';
import { api, applyFieldErrors } from '../../services/api';
import { dateTime, relative } from '../../utils/format';
import './Companies.scss';

export const COMPANY_SERVICES = [
    { code: 'asset', label: 'Assets Management', icon: Camera, desc: 'Cameras, lenses & gear tracking' },
    { code: 'report', label: 'Reports', icon: BarChart3, desc: 'Business analytics & metrics' },
    { code: 'event', label: 'Event Management', icon: CalendarDays, desc: 'Events, shoots & client assignments' },
    { code: 'ecommerce', label: 'Ecommerce', icon: ShoppingBag, desc: 'Print orders & online products' },
    { code: 'website', label: 'Own Website', icon: Globe, desc: 'Public studio portal & portfolio' },
    { code: 'qr', label: 'QR Management', icon: QrCode, desc: 'Live guest QR codes & real-time galleries' },
    { code: 'finance', label: 'Finance Management', icon: Receipt, desc: 'Invoices, payments & accounts' },
] as const;

export type ServiceCode = (typeof COMPANY_SERVICES)[number]['code'];

interface CompanyRow {
    id: number;
    name: string;
    slug: string;
    database_name: string;
    status: 'ACTIVE' | 'SUSPENDED';
    email: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    owner_name: string | null;
    owner_email: string | null;
    notes: string | null;
    modules: string | null;
    logo_url: string | null;
    is_primary: number;
    created_at: string;
}

interface CompanyRequestRow {
    id: number;
    company_name: string;
    phone: string;
    email: string;
    notes: string | null;
    status: 'PENDING' | 'CONTACTED' | 'APPROVED' | 'REJECTED';
    company_id: number | null;
    created_at: string;
    updated_at: string;
}

interface CreatedStudio {
    id: number;
    name: string;
    slug: string;
    databaseName: string;
    ownerEmail: string;
    ownerPassword: string;
}

const formSchema = z.object({
    name: z.string().trim().min(2, 'Enter the company name').max(120),
    ownerName: z.string().trim().min(2, 'Enter the contact person / owner name').max(120),
    ownerEmail: z.string().trim().email('Enter a valid email address'),
    phone: z.string().trim().min(10, 'Enter a 10-digit phone number').max(15),
    address: z.string().trim().max(300).optional(),
    ownerPassword: z
        .string()
        .min(8, 'Use at least 8 characters')
        .regex(/[A-Za-z]/, 'Include a letter')
        .regex(/\d/, 'Include a number'),
    notes: z.string().trim().max(2000).optional(),
    requestId: z.number().int().positive().optional().nullable(),
    logoUrl: z.string().trim().optional().nullable(),
});

type FormValues = z.infer<typeof formSchema>;

function generatePassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let res = 'Studio@';
    for (let i = 0; i < 4; i++) res += chars.charAt(Math.floor(Math.random() * chars.length));
    return res + '1';
}

export default function AdminCompanies({ embedded = false }: { embedded?: boolean }) {
    const { hasRole } = useAuth();
    const toast = useToast();
    const invalidate = useInvalidate();

    const [activeTab, setActiveTab] = useState<'requests' | 'companies'>('requests');
    const [openModal, setOpenModal] = useState(false);
    const [created, setCreated] = useState<CreatedStudio | null>(null);
    const [selectedServices, setSelectedServices] = useState<string[]>(COMPANY_SERVICES.map((s) => s.code));

    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [editingLogoCompany, setEditingLogoCompany] = useState<CompanyRow | null>(null);
    const [editLogoUrl, setEditLogoUrl] = useState<string>('');
    const [editLogoPreview, setEditLogoPreview] = useState<string | null>(null);
    const editFileInputRef = useRef<HTMLInputElement>(null);

    const isSuperAdmin = hasRole('SUPER_ADMIN');

    const companiesQ = useQuery({
        queryKey: ['companies'],
        queryFn: () => api.get<CompanyRow[]>('/api/companies'),
        enabled: isSuperAdmin,
    });

    const requestsQ = useQuery({
        queryKey: ['company-requests'],
        queryFn: () => api.get<CompanyRequestRow[]>('/api/companies/requests'),
        enabled: isSuperAdmin,
    });

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: '',
            ownerName: '',
            ownerEmail: '',
            phone: '',
            address: '',
            ownerPassword: generatePassword(),
            notes: '',
            requestId: null,
            logoUrl: '',
        },
    });

    const pendingRequestsCount = useMemo(
        () => (requestsQ.data ?? []).filter((r) => r.status === 'PENDING').length,
        [requestsQ.data],
    );

    const openCreateModal = (req?: CompanyRequestRow) => {
        setLogoPreview(null);
        if (req) {
            form.reset({
                name: req.company_name,
                ownerName: '',
                ownerEmail: req.email,
                phone: req.phone,
                address: '',
                ownerPassword: generatePassword(),
                notes: req.notes || '',
                requestId: req.id,
                logoUrl: '',
            });
        } else {
            form.reset({
                name: '',
                ownerName: '',
                ownerEmail: '',
                phone: '',
                address: '',
                ownerPassword: generatePassword(),
                notes: '',
                requestId: null,
                logoUrl: '',
            });
        }
        setSelectedServices(COMPANY_SERVICES.map((s) => s.code));
        setOpenModal(true);
    };

    const createMutation = useMutation({
        mutationFn: (v: FormValues) =>
            api.send<CreatedStudio>('POST', '/api/companies', {
                ...v,
                phone: v.phone.trim() || null,
                address: v.address?.trim() || null,
                notes: v.notes?.trim() || null,
                modules: selectedServices,
                logoUrl: v.logoUrl || null,
            }),
        onSuccess: (r) => {
            toast.success(r.message);
            setCreated(r.data);
            setOpenModal(false);
            setLogoPreview(null);
            form.reset();
            invalidate(['companies'], ['company-requests']);
        },
        onError: (e) => {
            if (!applyFieldErrors(e, form.setError)) toast.error(e);
        },
    });

    const updateLogoMutation = useMutation({
        mutationFn: ({ id, logoUrl }: { id: number; logoUrl: string | null }) =>
            api.send('PUT', `/api/companies/${id}`, { logoUrl }),
        onSuccess: (r) => {
            toast.success(r.message || 'Company logo updated');
            setEditingLogoCompany(null);
            invalidate(['companies']);
        },
        onError: (e) => toast.error(e),
    });

    const companyStatusMutation = useMutation({
        mutationFn: (row: CompanyRow) =>
            api.send('PUT', `/api/companies/${row.id}`, { status: row.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' }),
        onSuccess: (r) => {
            toast.success(r.message);
            invalidate(['companies']);
        },
        onError: (e) => toast.error(e),
    });

    const requestStatusMutation = useMutation({
        mutationFn: ({ id, status }: { id: number; status: CompanyRequestRow['status'] }) =>
            api.send('PUT', `/api/companies/requests/${id}`, { status }),
        onSuccess: () => {
            toast.success('Request status updated');
            invalidate(['company-requests']);
        },
        onError: (e) => toast.error(e),
    });

    const requestDeleteMutation = useMutation({
        mutationFn: (id: number) => api.send('DELETE', `/api/companies/requests/${id}`),
        onSuccess: () => {
            toast.success('Request removed');
            invalidate(['company-requests']);
        },
        onError: (e) => toast.error(e),
    });

    const toggleService = (code: string) => {
        setSelectedServices((prev) =>
            prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
        );
    };

    const toggleAllServices = () => {
        if (selectedServices.length === COMPANY_SERVICES.length) {
            setSelectedServices([]);
        } else {
            setSelectedServices(COMPANY_SERVICES.map((s) => s.code));
        }
    };

    const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
            toast.error('Logo image must be smaller than 2MB');
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            if (isEdit) {
                setEditLogoPreview(result);
                setEditLogoUrl(result);
            } else {
                setLogoPreview(result);
                form.setValue('logoUrl', result, { shouldDirty: true });
            }
        };
        reader.readAsDataURL(file);
    };

    const handleRemoveLogo = (isEdit = false) => {
        if (isEdit) {
            setEditLogoPreview(null);
            setEditLogoUrl('');
            if (editFileInputRef.current) editFileInputRef.current.value = '';
        } else {
            setLogoPreview(null);
            form.setValue('logoUrl', '', { shouldDirty: true });
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    if (!isSuperAdmin) {
        return (
            <Card>
                <EmptyState
                    title="Super admin only"
                    description="Company creation and platform management are restricted to the platform super admin."
                />
            </Card>
        );
    }

    return (
        <div className="companies-container space-y-6">
            {!embedded && (
                <PageHeader
                    title="Super Admin — Company Management"
                    subtitle="Review incoming studio requests and provision multi-tenant company accounts with selected services."
                    actions={
                        <Button icon={<Plus className="size-4" />} onClick={() => openCreateModal()}>
                            New company / studio
                        </Button>
                    }
                />
            )}

            {/* Top Navigation Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 pb-3">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setActiveTab('requests')}
                        className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                            activeTab === 'requests'
                                ? 'bg-brand-600 text-white shadow-sm'
                                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                        }`}
                    >
                        <Inbox className="size-4" />
                        <span>Registration Requests</span>
                        {pendingRequestsCount > 0 && (
                            <span className="rounded-full bg-rose-500 px-2 py-0.5 text-xs text-white">
                                {pendingRequestsCount} new
                            </span>
                        )}
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('companies')}
                        className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                            activeTab === 'companies'
                                ? 'bg-brand-600 text-white shadow-sm'
                                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                        }`}
                    >
                        <Building2 className="size-4" />
                        <span>All Studios & Companies ({companiesQ.data?.length ?? 0})</span>
                    </button>
                </div>

                {embedded && (
                    <Button size="sm" icon={<Plus className="size-4" />} onClick={() => openCreateModal()}>
                        New company
                    </Button>
                )}
            </div>

            {/* TAB 1: Registration Requests */}
            {activeTab === 'requests' && (
                <Card
                    title={
                        <div>
                            <span className="block font-semibold">Incoming Studio Requests (from Login Page)</span>
                            <span className="block text-xs font-normal text-stone-500">Photographers and studio owners who submitted the registration form.</span>
                        </div>
                    }
                    padded={false}
                >
                    <QueryState
                        query={requestsQ}
                        isEmpty={(rows) => !rows.length}
                        empty={
                            <EmptyState
                                title="No registration requests"
                                description="Incoming company requests from the public login page will appear here."
                                icon={<Inbox className="size-10 text-stone-400" />}
                            />
                        }
                    >
                        {(requests) => (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[780px] text-left text-sm">
                                    <thead className="border-b border-stone-200 bg-stone-50 text-xs font-semibold uppercase tracking-wider text-stone-600">
                                        <tr>
                                            <th className="px-4 py-3">Company Name</th>
                                            <th className="px-4 py-3">Contact Details</th>
                                            <th className="px-4 py-3">Notes 📝</th>
                                            <th className="px-4 py-3">Status</th>
                                            <th className="px-4 py-3">Submitted</th>
                                            <th className="px-4 py-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-stone-100">
                                        {requests.map((req) => (
                                            <tr key={req.id} className="hover:bg-stone-50/70 transition">
                                                <td className="px-4 py-3.5">
                                                    <p className="font-semibold text-stone-900">{req.company_name}</p>
                                                    <span className="text-xs text-stone-500">ID #{req.id}</span>
                                                </td>
                                                <td className="px-4 py-3.5">
                                                    <div className="space-y-1">
                                                        <a
                                                            href={`tel:${req.phone}`}
                                                            className="flex items-center gap-1.5 font-medium text-stone-800 hover:text-brand-600"
                                                        >
                                                            <Phone className="size-3.5 text-stone-400" />
                                                            <span>{req.phone}</span>
                                                        </a>
                                                        <a
                                                            href={`mailto:${req.email}`}
                                                            className="flex items-center gap-1.5 text-xs text-stone-600 hover:text-brand-600"
                                                        >
                                                            <Mail className="size-3.5 text-stone-400" />
                                                            <span>{req.email}</span>
                                                        </a>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3.5 max-w-xs">
                                                    {req.notes ? (
                                                        <p className="rounded-md bg-stone-100 p-2 text-xs text-stone-700 whitespace-pre-wrap">
                                                            {req.notes}
                                                        </p>
                                                    ) : (
                                                        <span className="text-xs italic text-stone-400">— No notes —</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3.5">
                                                    <span
                                                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                                            req.status === 'PENDING'
                                                                ? 'bg-amber-100 text-amber-800'
                                                                : req.status === 'CONTACTED'
                                                                  ? 'bg-sky-100 text-sky-800'
                                                                  : req.status === 'APPROVED'
                                                                    ? 'bg-emerald-100 text-emerald-800'
                                                                    : 'bg-stone-100 text-stone-700'
                                                        }`}
                                                    >
                                                        {req.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3.5 text-xs text-stone-500">
                                                    {dateTime(req.created_at)}
                                                    <span className="block text-[11px] text-stone-400">
                                                        ({relative(req.created_at)})
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3.5 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {req.status !== 'APPROVED' ? (
                                                            <Button
                                                                size="sm"
                                                                variant="primary"
                                                                icon={<Plus className="size-3.5" />}
                                                                onClick={() => openCreateModal(req)}
                                                            >
                                                                Create Company
                                                            </Button>
                                                        ) : (
                                                            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700">
                                                                <Check className="size-4" /> Provisioned
                                                            </span>
                                                        )}

                                                        {req.status === 'PENDING' && (
                                                            <Button
                                                                size="sm"
                                                                variant="secondary"
                                                                onClick={() =>
                                                                    requestStatusMutation.mutate({
                                                                        id: req.id,
                                                                        status: 'CONTACTED',
                                                                    })
                                                                }
                                                            >
                                                                Mark Contacted
                                                            </Button>
                                                        )}

                                                        <button
                                                            type="button"
                                                            title="Delete request"
                                                            className="rounded p-1.5 text-stone-400 hover:bg-stone-100 hover:text-rose-600 transition"
                                                            onClick={() => {
                                                                if (window.confirm('Delete this registration request?')) {
                                                                    requestDeleteMutation.mutate(req.id);
                                                                }
                                                            }}
                                                        >
                                                            <Trash2 className="size-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </QueryState>
                </Card>
            )}

            {/* TAB 2: All Active Studios / Companies */}
            {activeTab === 'companies' && (
                <Card padded={false}>
                    <QueryState
                        query={companiesQ}
                        isEmpty={(rows) => !rows.length}
                        empty={
                            <EmptyState
                                title="No studios yet"
                                description="Create your first studio to provision its tenant database."
                                icon={<Building2 className="size-10 text-stone-400" />}
                            />
                        }
                    >
                        {(rows) => (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[800px] text-left text-sm">
                                    <thead className="border-b border-stone-200 bg-stone-50 text-xs font-semibold uppercase tracking-wider text-stone-600">
                                        <tr>
                                            <th className="px-4 py-3">Company / Studio</th>
                                            <th className="px-4 py-3">Owner & Contact</th>
                                            <th className="px-4 py-3">Database</th>
                                            <th className="px-4 py-3">Services Enabled</th>
                                            <th className="px-4 py-3">Status</th>
                                            <th className="px-4 py-3 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-stone-100">
                                        {rows.map((row) => {
                                            const activeModules = (row.modules ?? '').split(',').filter(Boolean);
                                            return (
                                                <tr key={row.id} className="hover:bg-stone-50/70 transition">
                                                    <td className="px-4 py-3.5">
                                                        <div className="flex items-center gap-3">
                                                            {row.logo_url ? (
                                                                <img
                                                                    src={row.logo_url}
                                                                    alt={row.name}
                                                                    className="size-10 rounded-lg object-contain bg-stone-100 border border-stone-200 p-0.5 shrink-0"
                                                                />
                                                            ) : (
                                                                <div className="size-10 rounded-lg bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-500 shrink-0 font-bold text-sm">
                                                                    {row.name.charAt(0).toUpperCase()}
                                                                </div>
                                                            )}
                                                            <div className="min-w-0">
                                                                <p className="font-semibold text-stone-900 truncate">{row.name}</p>
                                                                <p className="text-xs text-stone-500">
                                                                    Code: <span className="font-mono text-stone-700">{row.slug}</span>
                                                                    {row.city ? ` · ${row.city}` : ''}
                                                                    {row.is_primary ? ' · primary' : ''}
                                                                </p>
                                                                {row.address && (
                                                                    <p className="mt-0.5 text-xs text-stone-600 max-w-xs truncate">
                                                                        📍 {row.address}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3.5">
                                                        <p className="font-medium text-stone-800">{row.owner_name || '—'}</p>
                                                        <p className="text-xs text-stone-500">{row.owner_email || row.email || ''}</p>
                                                        {row.phone && <p className="text-xs text-stone-500">📞 {row.phone}</p>}
                                                    </td>
                                                    <td className="px-4 py-3.5 font-mono text-xs text-stone-700">
                                                        {row.database_name}
                                                    </td>
                                                    <td className="px-4 py-3.5 max-w-xs">
                                                        <div className="flex flex-wrap gap-1">
                                                            {activeModules.length > 0 ? (
                                                                activeModules.map((m) => {
                                                                    const meta = COMPANY_SERVICES.find((s) => s.code === m);
                                                                    return (
                                                                        <span
                                                                            key={m}
                                                                            className="rounded bg-stone-100 px-1.5 py-0.5 text-[11px] font-medium text-stone-700"
                                                                        >
                                                                            {meta?.label ?? m}
                                                                        </span>
                                                                    );
                                                                })
                                                            ) : (
                                                                <span className="text-xs text-stone-400">All features</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3.5">
                                                        <StatusBadge status={row.status} />
                                                    </td>
                                                    <td className="px-4 py-3.5 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                icon={<ImageIcon className="size-3.5" />}
                                                                onClick={() => {
                                                                    setEditingLogoCompany(row);
                                                                    setEditLogoUrl(row.logo_url || '');
                                                                    setEditLogoPreview(row.logo_url || null);
                                                                }}
                                                                title="Change Company Logo"
                                                            >
                                                                {row.logo_url ? 'Logo' : '+ Logo'}
                                                            </Button>
                                                            {!row.is_primary && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="secondary"
                                                                    loading={companyStatusMutation.isPending}
                                                                    onClick={() => companyStatusMutation.mutate(row)}
                                                                >
                                                                    {row.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </QueryState>
                </Card>
            )}

            {/* MODAL: Create Company (Just form mari vai da anga...) */}
            <Modal
                open={openModal}
                onClose={() => !createMutation.isPending && setOpenModal(false)}
                title="Create Company / Studio"
                footer={
                    <>
                        <Button
                            variant="secondary"
                            onClick={() => setOpenModal(false)}
                            disabled={createMutation.isPending}
                        >
                            Cancel
                        </Button>
                        <Button
                            loading={createMutation.isPending}
                            onClick={form.handleSubmit((v) => createMutation.mutate(v))}
                        >
                            Provision & Create Company
                        </Button>
                    </>
                }
            >
                <form className="space-y-4" onSubmit={form.handleSubmit((v) => createMutation.mutate(v))}>
                    <p className="text-xs text-stone-500">
                        Enter company details and check the services to enable for this studio.
                    </p>

                    <FormGrid>
                        <Input
                            label="Company name"
                            required
                            {...form.register('name')}
                            error={form.formState.errors.name?.message}
                            placeholder="e.g. Sunrise Photo Lab"
                        />
                        <Input
                            label="Person name (Owner / Manager)"
                            required
                            {...form.register('ownerName')}
                            error={form.formState.errors.ownerName?.message}
                            placeholder="e.g. Karthik Raja"
                        />
                        <Input
                            label="Mail ID"
                            required
                            type="email"
                            {...form.register('ownerEmail')}
                            error={form.formState.errors.ownerEmail?.message}
                            placeholder="e.g. karthik@sunrise.com"
                        />
                        <Input
                            label="Phone number"
                            required
                            {...form.register('phone')}
                            error={form.formState.errors.phone?.message}
                            placeholder="e.g. 9876543210"
                        />
                    </FormGrid>

                    <Textarea
                        label="Address"
                        rows={2}
                        {...form.register('address')}
                        error={form.formState.errors.address?.message}
                        placeholder="Street, City, PIN code"
                    />

                    {/* Company Logo Upload & Input */}
                    <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-3.5">
                        <label className="block text-xs font-semibold text-stone-700 mb-2">
                            Company Logo
                        </label>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                            {logoPreview || form.watch('logoUrl') ? (
                                <div className="relative group shrink-0">
                                    <img
                                        src={logoPreview || form.watch('logoUrl') || ''}
                                        alt="Logo preview"
                                        className="size-16 rounded-lg object-contain bg-white border border-stone-200 p-1 shadow-sm"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveLogo(false)}
                                        className="absolute -top-1.5 -right-1.5 size-5 rounded-full bg-rose-500 text-white flex items-center justify-center hover:bg-rose-600 shadow-sm"
                                        title="Remove logo"
                                    >
                                        <X className="size-3" />
                                    </button>
                                </div>
                            ) : (
                                <div className="size-16 rounded-lg border-2 border-dashed border-stone-300 bg-white flex flex-col items-center justify-center text-stone-400 shrink-0">
                                    <ImageIcon className="size-5 mb-0.5 text-stone-400" />
                                    <span className="text-[10px] font-medium text-stone-400">No logo</span>
                                </div>
                            )}
                            <div className="flex-1 w-full space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => handleLogoFileChange(e, false)}
                                    />
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="secondary"
                                        icon={<Upload className="size-3.5" />}
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        Upload Logo
                                    </Button>
                                    {(logoPreview || form.watch('logoUrl')) && (
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handleRemoveLogo(false)}
                                        >
                                            Remove
                                        </Button>
                                    )}
                                    <span className="text-xs text-stone-500">PNG, JPG, SVG or WEBP (max 2MB)</span>
                                </div>
                                <Input
                                    placeholder="Or paste image URL (https://...)"
                                    value={form.watch('logoUrl') || ''}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        form.setValue('logoUrl', val);
                                        setLogoPreview(val || null);
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <PasswordInput
                                label="Owner Password"
                                required
                                hint="At least 8 characters with a letter and a number."
                                {...form.register('ownerPassword')}
                                error={form.formState.errors.ownerPassword?.message}
                            />
                            <button
                                type="button"
                                onClick={() => form.setValue('ownerPassword', generatePassword())}
                                className="mt-1.5 inline-flex items-center gap-1 text-xs text-brand-600 hover:underline"
                            >
                                <RefreshCw className="size-3" /> Auto-generate password
                            </button>
                        </div>
                        <Textarea
                            label="Notes 📝"
                            rows={3}
                            {...form.register('notes')}
                            error={form.formState.errors.notes?.message}
                            placeholder="Special requirements, pricing plan, billing notes..."
                        />
                    </div>

                    {/* Checkboxes for Services */}
                    <div className="mt-4 rounded-xl border border-stone-200 bg-stone-50 p-4">
                        <div className="mb-3 flex items-center justify-between">
                            <div>
                                <h4 className="text-sm font-semibold text-stone-800">Services & Features</h4>
                                <p className="text-xs text-stone-500">Enable services required for this company.</p>
                            </div>
                            <button
                                type="button"
                                onClick={toggleAllServices}
                                className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:underline"
                            >
                                {selectedServices.length === COMPANY_SERVICES.length ? (
                                    <>
                                        <Square className="size-3.5" /> Clear all
                                    </>
                                ) : (
                                    <>
                                        <CheckSquare className="size-3.5" /> Select all
                                    </>
                                )}
                            </button>
                        </div>

                        <div className="grid gap-2 sm:grid-cols-2">
                            {COMPANY_SERVICES.map((s) => {
                                const checked = selectedServices.includes(s.code);
                                const Icon = s.icon;
                                return (
                                    <label
                                        key={s.code}
                                        className={`flex cursor-pointer items-start gap-3 rounded-lg border p-2.5 transition ${
                                            checked
                                                ? 'border-brand-500 bg-brand-50/50 text-stone-900'
                                                : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={() => toggleService(s.code)}
                                            className="mt-0.5 size-4 rounded border-stone-300 text-brand-600 focus:ring-brand-500"
                                        />
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <Icon className="size-3.5 text-stone-500" />
                                                <span className="text-xs font-semibold leading-tight">{s.label}</span>
                                            </div>
                                            <p className="mt-0.5 text-[11px] text-stone-500">{s.desc}</p>
                                        </div>
                                    </label>
                                );
                            })}
                        </div>
                    </div>
                </form>
            </Modal>

            {/* MODAL: Update Company Logo */}
            <Modal
                open={!!editingLogoCompany}
                onClose={() => !updateLogoMutation.isPending && setEditingLogoCompany(null)}
                title={`Company Logo: ${editingLogoCompany?.name || ''}`}
                footer={
                    <>
                        <Button
                            variant="secondary"
                            onClick={() => setEditingLogoCompany(null)}
                            disabled={updateLogoMutation.isPending}
                        >
                            Cancel
                        </Button>
                        <Button
                            loading={updateLogoMutation.isPending}
                            onClick={() => {
                                if (editingLogoCompany) {
                                    updateLogoMutation.mutate({
                                        id: editingLogoCompany.id,
                                        logoUrl: editLogoUrl.trim() || null,
                                    });
                                }
                            }}
                        >
                            Save Logo
                        </Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <p className="text-xs text-stone-500">
                        Upload or change the logo for <strong className="text-stone-800">{editingLogoCompany?.name}</strong>.
                        This logo appears on invoices, customer galleries, and headers.
                    </p>
                    <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
                        <div className="flex flex-col sm:flex-row items-center gap-4">
                            {editLogoPreview || editLogoUrl ? (
                                <div className="relative group shrink-0">
                                    <img
                                        src={editLogoPreview || editLogoUrl}
                                        alt="Preview"
                                        className="size-20 rounded-lg object-contain bg-white border border-stone-200 p-1 shadow-sm"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveLogo(true)}
                                        className="absolute -top-2 -right-2 size-5 rounded-full bg-rose-500 text-white flex items-center justify-center hover:bg-rose-600 shadow-sm"
                                        title="Remove logo"
                                    >
                                        <X className="size-3" />
                                    </button>
                                </div>
                            ) : (
                                <div className="size-20 rounded-lg border-2 border-dashed border-stone-300 bg-white flex flex-col items-center justify-center text-stone-400 shrink-0">
                                    <ImageIcon className="size-6 mb-1 text-stone-400" />
                                    <span className="text-xs text-stone-400">No logo</span>
                                </div>
                            )}
                            <div className="flex-1 w-full space-y-2">
                                <div className="flex items-center gap-2">
                                    <input
                                        ref={editFileInputRef}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => handleLogoFileChange(e, true)}
                                    />
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="secondary"
                                        icon={<Upload className="size-3.5" />}
                                        onClick={() => editFileInputRef.current?.click()}
                                    >
                                        Upload Logo
                                    </Button>
                                    {(editLogoPreview || editLogoUrl) && (
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handleRemoveLogo(true)}
                                        >
                                            Remove
                                        </Button>
                                    )}
                                </div>
                                <Input
                                    label="Or paste logo URL"
                                    placeholder="https://example.com/logo.png"
                                    value={editLogoUrl}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setEditLogoUrl(val);
                                        setEditLogoPreview(val || null);
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* MODAL: Studio Ready */}
            <Modal open={!!created} onClose={() => setCreated(null)} title="🎉 Studio Created Successfully">
                {created && (
                    <div className="space-y-4 text-sm">
                        <p>
                            <strong className="text-stone-900">{created.name}</strong> has been created with its
                            dedicated database <span className="font-mono text-brand-700">{created.databaseName}</span>.
                        </p>
                        <p className="text-xs text-stone-500">
                            Provide these credentials to the client. The studio code is used if logging in from another domain.
                        </p>
                        <dl className="space-y-2 rounded-xl border border-stone-200 bg-stone-50 p-4">
                            <div className="flex items-center justify-between">
                                <dt className="text-stone-500">Studio Code</dt>
                                <dd className="font-mono font-semibold text-stone-900">{created.slug}</dd>
                            </div>
                            <div className="flex items-center justify-between">
                                <dt className="text-stone-500">Login Mail ID</dt>
                                <dd className="font-medium text-stone-900">{created.ownerEmail}</dd>
                            </div>
                            <div className="flex items-center justify-between">
                                <dt className="text-stone-500">Password</dt>
                                <dd className="font-mono font-semibold text-brand-700">{created.ownerPassword}</dd>
                            </div>
                        </dl>
                        <Button
                            variant="primary"
                            className="w-full"
                            icon={<Copy className="size-4" />}
                            onClick={() => {
                                const details = `Welcome to NammaQR Studio Platform!\n\nCompany: ${created.name}\nStudio Code: ${created.slug}\nEmail: ${created.ownerEmail}\nPassword: ${created.ownerPassword}\nLogin Portal: https://nammaqr.in/login`;
                                navigator.clipboard.writeText(details).then(() => toast.success('Credentials copied to clipboard!'));
                            }}
                        >
                            Copy Client Login Details
                        </Button>
                    </div>
                )}
            </Modal>
        </div>
    );
}
