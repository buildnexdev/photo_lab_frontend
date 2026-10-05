import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { BadgeCheck, LogOut, Monitor } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';
import { z } from 'zod';
import { QueryState } from '../../components/data';
import { FormGrid, Input } from '../../components/form';
import { useConfirm } from '../../components/overlay';
import { useToast } from '../../components/toast';
import { Avatar, Button, Card, PageHeader } from '../../components/ui';
import { api, applyFieldErrors, type SessionUser } from '../../lib/api';
import { ROLE_LABELS, useAuth, type Role } from '../../lib/auth';
import { dateTime, relative } from '../../lib/format';
import { useInvalidate } from '../../lib/hooks';
import { optionalPhone, passwordRule } from '../../lib/validation';

interface Profile {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
    email_verified_at: string | null;
    phone_verified_at: string | null;
    last_login_at: string | null;
    created_at: string;
    customer_id: number | null;
    address: string | null;
    city: string | null;
    state: string | null;
    pincode: string | null;
}
interface Session {
    id: string;
    started_at: string;
    last_active_at: string;
    user_agent: string | null;
    ip: string | null;
}

const profileSchema = z.object({
    name: z.string().trim().min(2, 'Enter your name').max(120),
    phone: optionalPhone,
    address: z.string().trim().max(255),
    city: z.string().trim().max(80),
    state: z.string().trim().max(80),
    pincode: z.string().trim().refine((v) => !v || /^\d{6}$/.test(v), 'Enter a 6-digit PIN code'),
});
const passwordSchema = z
    .object({ currentPassword: z.string().min(1, 'Enter your current password'), newPassword: passwordRule, confirm: z.string() })
    .refine((v) => v.newPassword === v.confirm, { path: ['confirm'], message: 'Passwords do not match' })
    .refine((v) => v.newPassword !== v.currentPassword, { path: ['newPassword'], message: 'Choose a different password' });

const describeAgent = (ua: string | null) => {
    if (!ua) return 'Unknown device';
    if (/PhotoLabMobile|okhttp/i.test(ua)) return 'PhotoLab mobile app';
    const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
    const os = /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Mac OS/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : '';
    return os ? `${browser} on ${os}` : browser;
};

export default function ProfilePage() {
    const { user, reload, logout } = useAuth();
    const me = useQuery({ queryKey: ['me'], queryFn: () => api.get<{ user: SessionUser; profile: Profile }>('/api/auth/me') });
    return (
        <div className="space-y-6">
            <PageHeader title="My profile" subtitle="Manage your details, password and signed-in devices." />
            <QueryState query={me}>
                {(d) => (
                    <div className="grid gap-6 xl:grid-cols-3">
                        <div className="space-y-6 xl:col-span-2">
                            <ProfileForm profile={d.profile} isCustomer={!!d.profile.customer_id} onSaved={reload} />
                            <PasswordForm />
                        </div>
                        <div className="space-y-6">
                            <Card>
                                <div className="flex items-center gap-3">
                                    <Avatar name={d.profile.name} className="size-12 text-base" />
                                    <div className="min-w-0">
                                        <p className="truncate font-semibold">{d.profile.name}</p>
                                        <p className="truncate text-sm text-stone-500">{(user?.roles ?? []).map((r) => ROLE_LABELS[r as Role] ?? r).join(', ')}</p>
                                    </div>
                                </div>
                                <dl className="mt-4 space-y-2 text-sm">
                                    <Verified label="Email" value={d.profile.email} verified={!!d.profile.email_verified_at} purpose="email" />
                                    <Verified label="Phone" value={d.profile.phone} verified={!!d.profile.phone_verified_at} purpose="phone" />
                                    <div className="flex justify-between gap-2">
                                        <dt className="text-stone-500">Member since</dt>
                                        <dd>{dateTime(d.profile.created_at)}</dd>
                                    </div>
                                    {d.profile.last_login_at && (
                                        <div className="flex justify-between gap-2">
                                            <dt className="text-stone-500">Last sign-in</dt>
                                            <dd>{relative(d.profile.last_login_at)}</dd>
                                        </div>
                                    )}
                                </dl>
                            </Card>
                            <Sessions onSignOutAll={logout} />
                        </div>
                    </div>
                )}
            </QueryState>
        </div>
    );
}

function Verified({ label, value, verified, purpose }: { label: string; value: string | null; verified: boolean; purpose: 'email' | 'phone' }) {
    return (
        <div className="flex items-center justify-between gap-2">
            <dt className="text-stone-500">{label}</dt>
            <dd className="flex min-w-0 items-center gap-1.5">
                <span className="truncate">{value ?? '—'}</span>
                {value &&
                    (verified ? (
                        <BadgeCheck className="size-4 shrink-0 text-emerald-600" aria-label="Verified" />
                    ) : (
                        <Link to={`/verify-otp?purpose=VERIFY&destination=${encodeURIComponent(value)}`} className="shrink-0 text-xs font-medium text-brand-700 hover:underline" title={`Verify ${purpose}`}>
                            Verify
                        </Link>
                    ))}
            </dd>
        </div>
    );
}

function ProfileForm({ profile, isCustomer, onSaved }: { profile: Profile; isCustomer: boolean; onSaved: () => Promise<void> }) {
    const toast = useToast();
    const invalidate = useInvalidate();
    const {
        register,
        handleSubmit,
        reset,
        setError,
        formState: { errors, isSubmitting, isDirty },
    } = useForm<z.infer<typeof profileSchema>>({ resolver: zodResolver(profileSchema) });
    useEffect(() => {
        reset({ name: profile.name, phone: profile.phone ?? '', address: profile.address ?? '', city: profile.city ?? '', state: profile.state ?? '', pincode: profile.pincode ?? '' });
    }, [profile, reset]);

    const onSubmit = handleSubmit(async (v) => {
        try {
            const r = await api.send('PUT', '/api/auth/profile', {
                name: v.name,
                phone: v.phone || null,
                address: v.address || null,
                city: v.city || null,
                state: v.state || null,
                pincode: v.pincode || null,
            });
            toast.success(r.message || 'Profile updated');
            await Promise.all([invalidate(['me']), onSaved()]);
        } catch (e) {
            if (!applyFieldErrors(e, setError as never)) toast.error(e);
        }
    });

    return (
        <Card title="Personal details">
            <form onSubmit={onSubmit} noValidate className="space-y-4">
                <FormGrid>
                    <Input label="Full name" required {...register('name')} error={errors.name?.message} />
                    <Input label="Email" value={profile.email ?? ''} disabled hint="Contact the studio to change your sign-in email." />
                    <Input label="Phone" type="tel" {...register('phone')} error={errors.phone?.message} />
                    {isCustomer && (
                        <>
                            <Input label="Address" wrapperClassName="sm:col-span-2" {...register('address')} error={errors.address?.message} />
                            <Input label="City" {...register('city')} error={errors.city?.message} />
                            <Input label="State" {...register('state')} error={errors.state?.message} />
                            <Input label="PIN code" inputMode="numeric" maxLength={6} {...register('pincode')} error={errors.pincode?.message} />
                        </>
                    )}
                </FormGrid>
                <div className="flex justify-end">
                    <Button type="submit" loading={isSubmitting} disabled={!isDirty}>
                        Save changes
                    </Button>
                </div>
            </form>
        </Card>
    );
}

function PasswordForm() {
    const toast = useToast();
    const {
        register,
        handleSubmit,
        reset,
        setError,
        formState: { errors, isSubmitting },
    } = useForm<z.infer<typeof passwordSchema>>({ resolver: zodResolver(passwordSchema) });
    const onSubmit = handleSubmit(async (v) => {
        try {
            const r = await api.send('POST', '/api/auth/change-password', { currentPassword: v.currentPassword, newPassword: v.newPassword });
            toast.success(r.message);
            reset({ currentPassword: '', newPassword: '', confirm: '' });
        } catch (e) {
            if (!applyFieldErrors(e, setError as never)) toast.error(e);
        }
    });
    return (
        <Card title="Change password">
            <form onSubmit={onSubmit} noValidate className="space-y-4">
                <FormGrid cols={3}>
                    <Input label="Current password" type="password" autoComplete="current-password" {...register('currentPassword')} error={errors.currentPassword?.message} />
                    <Input label="New password" type="password" autoComplete="new-password" {...register('newPassword')} error={errors.newPassword?.message} />
                    <Input label="Confirm new password" type="password" autoComplete="new-password" {...register('confirm')} error={errors.confirm?.message} />
                </FormGrid>
                <div className="flex justify-end">
                    <Button type="submit" loading={isSubmitting}>
                        Update password
                    </Button>
                </div>
            </form>
        </Card>
    );
}

function Sessions({ onSignOutAll }: { onSignOutAll: () => Promise<void> }) {
    const toast = useToast();
    const navigate = useNavigate();
    const { ask, dialog } = useConfirm();
    const q = useQuery({ queryKey: ['sessions'], queryFn: () => api.get<Session[]>('/api/auth/sessions') });
    const revoke = useMutation({
        mutationFn: (id: string) => api.send('DELETE', `/api/auth/sessions/${id}`),
        onSuccess: (r) => {
            toast.success(r.message);
            q.refetch();
        },
        onError: (e) => toast.error(e),
    });
    const all = useMutation({
        mutationFn: () => api.send('POST', '/api/auth/logout-all'),
        onSuccess: async () => {
            await onSignOutAll().catch(() => undefined);
            navigate('/login', { replace: true });
        },
        onError: (e) => toast.error(e),
    });
    return (
        <Card
            title="Signed-in devices"
            actions={
                <Button
                    size="sm"
                    variant="ghost"
                    icon={<LogOut className="size-4" />}
                    loading={all.isPending}
                    onClick={async () => (await ask({ title: 'Sign out everywhere?', message: 'You will be signed out on all devices, including this one.', confirmLabel: 'Sign out all' })) && all.mutate()}
                >
                    Sign out all
                </Button>
            }
        >
            <QueryState query={q} isEmpty={(d) => !d.length} empty={<p className="text-sm text-stone-500">No active sessions.</p>}>
                {(rows) => (
                    <ul className="space-y-3">
                        {rows.map((s) => (
                            <li key={s.id} className="flex items-start gap-3">
                                <Monitor className="mt-0.5 size-5 shrink-0 text-stone-400" />
                                <div className="min-w-0 flex-1 text-sm">
                                    <p className="font-medium text-stone-800">{describeAgent(s.user_agent)}</p>
                                    <p className="text-xs text-stone-500">
                                        {s.ip ?? 'Unknown IP'} · active {relative(s.last_active_at)}
                                    </p>
                                </div>
                                <button type="button" className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50" disabled={revoke.isPending} onClick={() => revoke.mutate(s.id)}>
                                    Revoke
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </QueryState>
            {dialog}
        </Card>
    );
}
