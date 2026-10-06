// Developer by: Buildnexdev.in
// Devevloper : Nandhakumar@gmail.com
// Last Edited : 06-10-2026
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { api, applyFieldErrors, type Paged } from '../lib/api';
import { ROLE_LABELS, useAuth, type Role } from '../lib/auth';
import { relative } from '../lib/format';
import { useInvalidate, useListParams, useOpenParam } from '../lib/hooks';
import { emailRule, optionalPhone, passwordRule } from '../lib/validation';
import { DataTable, EmptyState, Pagination, QueryState, SearchInput, StatusBadge, TableHeaderToolbar } from './data';
import { Field, FormGrid, Input, Select } from './form';
import { Modal, useConfirm } from './overlay';
import { useToast } from './toast';
import { Button, Card } from './ui';

interface UserRow {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    status: 'ACTIVE' | 'INACTIVE' | 'LOCKED';
    last_login_at: string | null;
    roles: Role[];
    designation: string | null;
    department: string | null;
    camera_gear: string | null;
    photographer_specialties: string | null;
    software: string | null;
}
interface UserDetail extends UserRow {
    editor_specialties: string | null;
}

const STAFF_ROLE_CODES: Role[] = ['SUPER_ADMIN', 'STUDIO_OWNER', 'MANAGER', 'PHOTOGRAPHER', 'EDITOR_DESIGNER', 'PRINTER_DELIVERY_STAFF'];

const schema = (isNew: boolean) =>
    z.object({
        name: z.string().trim().min(2, 'Enter a name').max(120),
        email: emailRule,
        phone: optionalPhone,
        password: isNew ? passwordRule : z.union([z.literal(''), passwordRule]),
        roles: z.array(z.string()).min(1, 'Choose at least one role'),
        status: z.enum(['ACTIVE', 'INACTIVE', 'LOCKED']),
        designation: z.string().trim().max(80),
        department: z.string().trim().max(80),
        cameraGear: z.string().trim().max(255),
        specialties: z.string().trim().max(255),
        software: z.string().trim().max(255),
    });
type Form = z.infer<ReturnType<typeof schema>>;

/** Staff list scoped to one role (photographers, editors) or all staff. */
export function StaffDirectory({ role, title, subtitle }: { role?: Role; title: string; subtitle: string }) {
    const { can } = useAuth();
    const { page, search, filters, setPage, setSearch, setFilter } = useListParams(['status', 'role'] as const);
    const [openId, setOpenId] = useOpenParam();
    const [creating, setCreating] = useOpenParam('new');
    const roleFilter = role ?? (filters.role as Role | '');
    const q = useQuery({
        queryKey: ['users', 'list', role ?? 'staff', page, search, filters],
        queryFn: () => api.get<Paged<UserRow>>('/api/users', { page, pageSize: 25, search, status: filters.status, role: roleFilter || undefined, staffOnly: roleFilter ? undefined : 'true' }),
        placeholderData: (p) => p,
    });
    const manage = can('users.manage', 'staff.manage');
    return (
        <div>
            <Card padded={false} className="overflow-hidden">
                <TableHeaderToolbar
                    total={q.data?.total}
                    totalLabel="Staff"
                    search={search}
                    onSearch={setSearch}
                    searchPlaceholder="Name, email or phone"
                    onAdd={manage ? () => setCreating(1) : undefined}
                    addLabel={`Add ${role ? ROLE_LABELS[role].toLowerCase() : 'staff member'}`}
                    extraFilters={
                        <div className="flex flex-wrap items-center gap-2">
                            {!role && <Select wrapperClassName="w-52" aria-label="Role" value={filters.role} onChange={(e) => setFilter('role', e.target.value)} placeholder="All staff roles" options={STAFF_ROLE_CODES.map((r) => ({ value: r, label: ROLE_LABELS[r] }))} />}
                            <Select
                                wrapperClassName="w-40"
                                aria-label="Status"
                                value={filters.status}
                                onChange={(e) => setFilter('status', e.target.value)}
                                placeholder="Any status"
                                options={[
                                    { value: 'ACTIVE', label: 'Active' },
                                    { value: 'INACTIVE', label: 'Inactive' },
                                    { value: 'LOCKED', label: 'Locked' },
                                ]}
                            />
                        </div>
                    }
                />
                <QueryState query={q}>
                    {(d) => (
                        <>
                            <DataTable
                                rows={d.items}
                                rowKey={(r) => r.id}
                                onRowClick={manage ? (r) => setOpenId(r.id) : undefined}
                                empty={<EmptyState title="No one here yet" />}
                                columns={[
                                    {
                                        key: 'name',
                                        header: 'Name',
                                        cell: (r) => (
                                            <div>
                                                <p className="font-medium text-stone-900">{r.name}</p>
                                                <p className="text-xs text-stone-500">{[r.email, r.phone].filter(Boolean).join(' · ')}</p>
                                            </div>
                                        ),
                                    },
                                    { key: 'roles', header: 'Roles', cell: (r) => r.roles.map((x) => ROLE_LABELS[x] ?? x).join(', ') },
                                    {
                                        key: 'detail',
                                        header: role === 'PHOTOGRAPHER' ? 'Gear' : role === 'EDITOR_DESIGNER' ? 'Software' : 'Designation',
                                        cell: (r) => (role === 'PHOTOGRAPHER' ? r.camera_gear : role === 'EDITOR_DESIGNER' ? r.software : [r.designation, r.department].filter(Boolean).join(' · ')) || '—',
                                        hideOnMobile: true,
                                    },
                                    { key: 'login', header: 'Last sign-in', cell: (r) => (r.last_login_at ? relative(r.last_login_at) : 'Never'), hideOnMobile: true },
                                    { key: 'status', header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
                                ]}
                            />
                            <Pagination page={d.page} totalPages={d.totalPages} total={d.total} onPage={setPage} />
                        </>
                    )}
                </QueryState>
            </Card>
            <UserModal id={creating ? 'new' : openId} defaultRole={role} onClose={() => (creating ? setCreating(null) : setOpenId(null))} />
        </div>
    );
}

function UserModal({ id, defaultRole, onClose }: { id: number | 'new' | null; defaultRole?: Role; onClose: () => void }) {
    const { user, can } = useAuth();
    const toast = useToast();
    const invalidate = useInvalidate();
    const { ask, dialog } = useConfirm();
    const isNew = id === 'new';
    const detail = useQuery({ queryKey: ['users', 'detail', id], queryFn: () => api.get<UserDetail>(`/api/users/${id}`), enabled: typeof id === 'number' });
    const {
        register,
        handleSubmit,
        reset,
        watch,
        setValue,
        setError,
        formState: { errors, isSubmitting },
    } = useForm<Form>({ resolver: zodResolver(schema(isNew)) });

    useEffect(() => {
        if (isNew) reset({ name: '', email: '', phone: '', password: '', roles: defaultRole ? [defaultRole] : [], status: 'ACTIVE', designation: '', department: '', cameraGear: '', specialties: '', software: '' });
        else if (detail.data) {
            const u = detail.data;
            reset({
                name: u.name,
                email: u.email,
                phone: u.phone ?? '',
                password: '',
                roles: u.roles,
                status: u.status,
                designation: u.designation ?? '',
                department: u.department ?? '',
                cameraGear: u.camera_gear ?? '',
                specialties: u.photographer_specialties ?? u.editor_specialties ?? '',
                software: u.software ?? '',
            });
        }
    }, [isNew, detail.data, defaultRole, reset]);

    const roles = watch('roles') ?? [];
    const isSuper = user?.roles.includes('SUPER_ADMIN');
    const self = typeof id === 'number' && id === user?.id;
    const selectRole = (r: Role) => setValue('roles', [r], { shouldValidate: true });

    const del = useMutation({
        mutationFn: () => api.send('DELETE', `/api/users/${id}`),
        onSuccess: (r) => {
            toast.success(r.message);
            invalidate(['users']);
            onClose();
        },
        onError: (e) => toast.error(e),
    });

    const submit = handleSubmit(async (v) => {
        const body = {
            ...v,
            phone: v.phone || null,
            password: v.password || undefined,
            designation: v.designation || null,
            department: v.department || null,
            cameraGear: v.cameraGear || null,
            specialties: v.specialties || null,
            software: v.software || null,
        };
        try {
            const r = isNew ? await api.send('POST', '/api/users', body) : await api.send('PUT', `/api/users/${id}`, body);
            toast.success(r.message);
            await invalidate(['users']);
            onClose();
        } catch (e) {
            if (!applyFieldErrors(e, setError as never)) toast.error(e);
        }
    });

    return (
        <Modal
            open={id !== null}
            onClose={onClose}
            title={isNew ? 'Add staff member' : (detail.data?.name ?? 'Staff member')}
            size="lg"
            footer={
                <>
                    {!isNew && !self && can('users.manage') && (
                        <Button variant="ghost" className="mr-auto text-red-600" icon={<Trash2 className="size-4" />} loading={del.isPending} onClick={async () => (await ask({ title: 'Delete this account?', message: 'They are signed out everywhere and can no longer sign in. Their past work stays in the records.', confirmLabel: 'Delete' })) && del.mutate()}>
                            Delete
                        </Button>
                    )}
                    <Button variant="secondary" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button loading={isSubmitting} disabled={!isNew && !detail.data} onClick={submit}>
                        Save
                    </Button>
                </>
            }
        >
            {!isNew && detail.isLoading ? (
                <p className="py-8 text-center text-sm text-stone-500">Loading…</p>
            ) : detail.isError ? (
                <p className="py-8 text-center text-sm text-red-600">Could not load this user.</p>
            ) : (
                <form onSubmit={submit} noValidate className="space-y-5">
                    <FormGrid>
                        <Input label="Full name" required {...register('name')} error={errors.name?.message} />
                        <Input label="Email" type="email" required autoComplete="off" {...register('email')} error={errors.email?.message} />
                        <Input label="Phone" type="tel" {...register('phone')} error={errors.phone?.message} />
                        <Input label={isNew ? 'Password' : 'New password'} type="password" autoComplete="new-password" required={isNew} {...register('password')} error={errors.password?.message} hint={isNew ? 'At least 8 characters with a letter and a number.' : 'Leave blank to keep the current password. Setting one signs them out.'} />
                    </FormGrid>
                    <Field label="Role" required error={errors.roles?.message}>
                        <div className="grid gap-2 sm:grid-cols-2">
                            {STAFF_ROLE_CODES.filter((r) => r !== 'SUPER_ADMIN' && r !== 'STUDIO_OWNER').map((r) => (
                                <label key={r} className="flex items-center gap-2 rounded-lg border border-stone-200 px-3 py-2 text-sm cursor-pointer hover:bg-stone-50 transition-colors">
                                    <input type="radio" className="size-4 text-brand-600 focus:ring-brand-600" checked={roles.includes(r)} onChange={() => selectRole(r)} disabled={self} />
                                    {ROLE_LABELS[r]}
                                </label>
                            ))}
                        </div>
                    </Field>
                    <FormGrid>
                        <Select
                            label="Status"
                            {...register('status')}
                            disabled={self}
                            options={[
                                { value: 'ACTIVE', label: 'Active' },
                                { value: 'INACTIVE', label: 'Inactive — cannot sign in' },
                                { value: 'LOCKED', label: 'Locked' },
                            ]}
                        />
                        <Input label="Designation" {...register('designation')} error={errors.designation?.message} />
                        <Input label="Department" {...register('department')} error={errors.department?.message} />
                        {roles.includes('PHOTOGRAPHER') && <Input label="Camera gear" {...register('cameraGear')} error={errors.cameraGear?.message} placeholder="e.g. Sony A7 IV, 24-70mm" />}
                        {roles.includes('EDITOR_DESIGNER') && <Input label="Software" {...register('software')} error={errors.software?.message} placeholder="e.g. Lightroom, Photoshop" />}
                        {(roles.includes('PHOTOGRAPHER') || roles.includes('EDITOR_DESIGNER')) && <Input label="Specialties" {...register('specialties')} error={errors.specialties?.message} />}
                    </FormGrid>
                </form>
            )}
            {dialog}
        </Modal>
    );
}
