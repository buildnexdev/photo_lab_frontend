import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Building2, Copy, Plus } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { EmptyState, QueryState, StatusBadge } from '../../components/data';
import { FormGrid, Input } from '../../components/form';
import { Modal } from '../../components/overlay';
import { useToast } from '../../components/toast';
import { Button, Card, PageHeader } from '../../components/ui';
import { api, applyFieldErrors } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { dateTime } from '../../lib/format';
import { useInvalidate } from '../../lib/hooks';

interface CompanyRow {
    id: number;
    name: string;
    slug: string;
    database_name: string;
    status: 'ACTIVE' | 'SUSPENDED';
    email: string | null;
    phone: string | null;
    city: string | null;
    owner_name: string | null;
    owner_email: string | null;
    is_primary: number;
    created_at: string;
}

interface CreatedStudio {
    id: number;
    name: string;
    slug: string;
    databaseName: string;
    ownerEmail: string;
    ownerPassword: string;
}

const schema = z.object({
    name: z.string().trim().min(2, 'Enter the studio name').max(120),
    ownerName: z.string().trim().min(2, 'Enter the owner name').max(120),
    ownerEmail: z.string().trim().email('Enter a valid email'),
    ownerPassword: z
        .string()
        .min(8, 'Use at least 8 characters')
        .regex(/[A-Za-z]/, 'Include a letter')
        .regex(/\d/, 'Include a number'),
    phone: z.string().trim(),
    city: z.string().trim().max(80),
    tagline: z.string().trim().max(200),
});
type Form = z.infer<typeof schema>;

export default function AdminCompanies() {
    const { hasRole } = useAuth();
    const toast = useToast();
    const invalidate = useInvalidate();
    const [open, setOpen] = useState(false);
    const [created, setCreated] = useState<CreatedStudio | null>(null);
    const q = useQuery({ queryKey: ['companies'], queryFn: () => api.get<CompanyRow[]>('/api/companies'), enabled: hasRole('SUPER_ADMIN') });
    const form = useForm<Form>({
        resolver: zodResolver(schema),
        defaultValues: { name: '', ownerName: '', ownerEmail: '', ownerPassword: '', phone: '', city: '', tagline: '' },
    });

    const create = useMutation({
        mutationFn: (v: Form) =>
            api.send<CreatedStudio>('POST', '/api/companies', {
                ...v,
                phone: v.phone.trim() || null,
                city: v.city.trim() || null,
                tagline: v.tagline.trim() || null,
            }),
        onSuccess: (r) => {
            toast.success(r.message);
            setCreated(r.data);
            setOpen(false);
            form.reset();
            invalidate(['companies']);
        },
        onError: (e) => {
            if (!applyFieldErrors(e, form.setError)) toast.error(e);
        },
    });

    const status = useMutation({
        mutationFn: (row: CompanyRow) => api.send('PUT', `/api/companies/${row.id}`, { status: row.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' }),
        onSuccess: (r) => (toast.success(r.message), invalidate(['companies'])),
        onError: (e) => toast.error(e),
    });

    if (!hasRole('SUPER_ADMIN')) {
        return (
            <Card>
                <EmptyState title="Super admin only" description="Creating studios is limited to the platform super admin." />
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Studios"
                actions={
                    <Button icon={<Plus className="size-4" />} onClick={() => setOpen(true)}>
                        New studio
                    </Button>
                }
            />
            <p className="text-sm text-stone-500">Each new studio gets its own database, named from the studio plus <span className="font-mono">_photo_lab</span>. Website text, packages, and portfolio for that studio come from that database.</p>
            <Card padded={false}>
                <QueryState query={q} isEmpty={(rows) => !rows.length} empty={<EmptyState title="No studios yet" description="Create the first studio to provision its database." icon={<Building2 className="size-10" />} />}>
                    {(rows) => (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[760px] text-left text-sm">
                                <thead className="border-b border-stone-200 text-xs uppercase tracking-wide text-stone-500">
                                    <tr>
                                        <th className="px-4 py-3 font-medium">Studio</th>
                                        <th className="px-4 py-3 font-medium">Database</th>
                                        <th className="px-4 py-3 font-medium">Owner</th>
                                        <th className="px-4 py-3 font-medium">Status</th>
                                        <th className="px-4 py-3 font-medium">Created</th>
                                        <th className="px-4 py-3 font-medium" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-100">
                                    {rows.map((row) => (
                                        <tr key={row.id}>
                                            <td className="px-4 py-3">
                                                <p className="font-medium text-stone-900">{row.name}</p>
                                                <p className="text-xs text-stone-500">
                                                    {row.slug}
                                                    {row.city ? ` · ${row.city}` : ''}
                                                    {row.is_primary ? ' · primary' : ''}
                                                </p>
                                            </td>
                                            <td className="px-4 py-3 font-mono text-xs text-stone-700">{row.database_name}</td>
                                            <td className="px-4 py-3">
                                                <p>{row.owner_name || '—'}</p>
                                                <p className="text-xs text-stone-500">{row.owner_email || row.email || ''}</p>
                                            </td>
                                            <td className="px-4 py-3">
                                                <StatusBadge status={row.status} />
                                            </td>
                                            <td className="px-4 py-3 text-stone-500">{dateTime(row.created_at)}</td>
                                            <td className="px-4 py-3 text-right">
                                                {!row.is_primary && (
                                                    <Button size="sm" variant="secondary" loading={status.isPending} onClick={() => status.mutate(row)}>
                                                        {row.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                                                    </Button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </QueryState>
            </Card>

            <Modal
                open={open}
                onClose={() => !create.isPending && setOpen(false)}
                title="Create a studio"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setOpen(false)} disabled={create.isPending}>
                            Cancel
                        </Button>
                        <Button loading={create.isPending} onClick={form.handleSubmit((v) => create.mutate(v))}>
                            Create database
                        </Button>
                    </>
                }
            >
                <form className="space-y-4" onSubmit={form.handleSubmit((v) => create.mutate(v))}>
                    <p className="text-sm text-stone-500">A new MySQL database is created as the studio name plus <span className="font-mono">_photo_lab</span>. The owner signs in with the studio code.</p>
                    <FormGrid>
                        <Input label="Studio name" required {...form.register('name')} error={form.formState.errors.name?.message} placeholder="Sunrise Studio" />
                        <Input label="City" {...form.register('city')} error={form.formState.errors.city?.message} />
                        <Input label="Owner name" required {...form.register('ownerName')} error={form.formState.errors.ownerName?.message} />
                        <Input label="Owner email" required type="email" {...form.register('ownerEmail')} error={form.formState.errors.ownerEmail?.message} />
                        <Input label="Owner password" required type="password" hint="At least 8 characters, with a letter and a number." {...form.register('ownerPassword')} error={form.formState.errors.ownerPassword?.message} />
                        <Input label="Phone" {...form.register('phone')} error={form.formState.errors.phone?.message} />
                    </FormGrid>
                    <Input label="Tagline" {...form.register('tagline')} error={form.formState.errors.tagline?.message} />
                </form>
            </Modal>

            <Modal open={!!created} onClose={() => setCreated(null)} title="Studio is ready">
                {created && (
                    <div className="space-y-3 text-sm">
                        <p>
                            <span className="font-medium">{created.name}</span> is stored in <span className="font-mono">{created.databaseName}</span>.
                        </p>
                        <p>The owner signs in with this studio code and the password below. The password is shown only once.</p>
                        <dl className="space-y-2 rounded-lg bg-stone-50 p-3">
                            <div className="flex items-center justify-between gap-3">
                                <dt className="text-stone-500">Studio code</dt>
                                <dd className="font-mono">{created.slug}</dd>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                                <dt className="text-stone-500">Email</dt>
                                <dd>{created.ownerEmail}</dd>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                                <dt className="text-stone-500">Password</dt>
                                <dd className="font-mono">{created.ownerPassword}</dd>
                            </div>
                        </dl>
                        <Button
                            variant="secondary"
                            icon={<Copy className="size-4" />}
                            onClick={() => navigator.clipboard.writeText(`Studio code: ${created.slug}\nEmail: ${created.ownerEmail}\nPassword: ${created.ownerPassword}`).then(() => toast.success('Copied'))}
                        >
                            Copy login details
                        </Button>
                    </div>
                )}
            </Modal>
        </div>
    );
}
