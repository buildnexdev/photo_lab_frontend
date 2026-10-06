// Developer by: Buildnexdev.in
// Devevloper : Nandhakumar@gmail.com
// Last Edited : 06-10-2026
import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { EmptyState, QueryState } from '../../components/data';
import { StaffDirectory } from '../../components/StaffDirectory';
import { useToast } from '../../components/toast';
import { Alert, Button, Card, PageHeader, Tabs } from '../../components/ui';
import { api } from '../../lib/api';
import { ROLE_LABELS, useAuth, type Role } from '../../lib/auth';
import { titleCase } from '../../lib/format';
import { useInvalidate } from '../../lib/hooks';

interface RolesData {
    roles: { id: number; code: Role; name: string; description: string | null; users: number; permissions: string[] }[];
    permissions: { code: string; module: string; description: string }[];
}

export default function AdminStaff() {
    const { can } = useAuth();
    const [params, setParams] = useSearchParams();
    const showRoles = can('roles.manage', 'users.manage');
    const tab = showRoles && params.get('tab') === 'roles' ? 'roles' : 'staff';
    return (
        <div>
            {showRoles && (
                <Tabs
                    className="mb-6"
                    value={tab}
                    onChange={(t) => setParams(t === 'staff' ? {} : { tab: t }, { replace: true })}
                    tabs={[
                        { value: 'staff', label: 'Staff' },
                        { value: 'roles', label: 'Roles & permissions' },
                    ]}
                />
            )}
            {tab === 'staff' ? (
                <StaffDirectory title="Staff" subtitle="Everyone who works in the studio and their access." />
            ) : (
                <>
                    <PageHeader title="Roles & permissions" subtitle="Changes apply to everyone with the role within a minute." />
                    <RolePermissions />
                </>
            )}
        </div>
    );
}

function RolePermissions() {
    const { can } = useAuth();
    const toast = useToast();
    const invalidate = useInvalidate();
    const q = useQuery({ queryKey: ['users', 'roles'], queryFn: () => api.get<RolesData>('/api/users/roles') });
    const [roleCode, setRoleCode] = useState<Role>('MANAGER');
    const [draft, setDraft] = useState<Set<string>>(new Set());
    const role = q.data?.roles.find((r) => r.code === roleCode);
    useEffect(() => {
        if (role) setDraft(new Set(role.permissions));
    }, [role]);
    const modules = useMemo(() => {
        const m = new Map<string, RolesData['permissions']>();
        for (const p of q.data?.permissions ?? []) m.set(p.module, [...(m.get(p.module) ?? []), p]);
        return [...m.entries()];
    }, [q.data]);
    const dirty = !!role && (role.permissions.length !== draft.size || role.permissions.some((p) => !draft.has(p)));
    const editable = can('roles.manage') && roleCode !== 'SUPER_ADMIN';
    const save = useMutation({
        mutationFn: () => api.send('PUT', `/api/users/roles/${roleCode}/permissions`, { permissions: [...draft] }),
        onSuccess: (r) => (toast.success(r.message), invalidate(['users', 'roles'])),
        onError: (e) => toast.error(e),
    });
    const toggle = (code: string) =>
        setDraft((s) => {
            const n = new Set(s);
            if (n.has(code)) n.delete(code);
            else n.add(code);
            return n;
        });
    return (
        <QueryState query={q} isEmpty={(d) => !d.roles.length} empty={<EmptyState title="No roles configured" />}>
            {(d) => (
                <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
                    <Card padded={false}>
                        <ul className="divide-y divide-stone-100">
                            {d.roles.filter(r => r.code !== 'SUPER_ADMIN' && r.code !== 'STUDIO_OWNER').map((r) => (
                                <li key={r.code}>
                                    <button type="button" onClick={() => setRoleCode(r.code)} className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm ${r.code === roleCode ? 'bg-brand-50 font-semibold text-brand-800' : 'hover:bg-stone-50'}`}>
                                        <span>{ROLE_LABELS[r.code] ?? r.name}</span>
                                        <span className="text-xs text-stone-500">{r.users}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </Card>
                    <Card
                        title={`${ROLE_LABELS[roleCode]} permissions`}
                        actions={
                            editable && (
                                <>
                                    <Button size="sm" variant="ghost" disabled={!dirty} onClick={() => role && setDraft(new Set(role.permissions))}>
                                        Reset
                                    </Button>
                                    <Button size="sm" disabled={!dirty} loading={save.isPending} onClick={() => save.mutate()}>
                                        Save changes
                                    </Button>
                                </>
                            )
                        }
                    >
                        {roleCode === 'SUPER_ADMIN' && <Alert className="mb-4">Super Admin always has every permission.</Alert>}
                        {roleCode === 'CUSTOMER' && <Alert tone="warning" className="mb-4">Customers only ever see their own bookings, galleries, orders and payments, whatever is granted here.</Alert>}
                        {role?.description && <p className="mb-4 text-sm text-stone-600">{role.description}</p>}
                        <div className="space-y-5">
                            {modules.map(([module, perms]) => (
                                <fieldset key={module}>
                                    <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">{titleCase(module)}</legend>
                                    <div className="grid gap-2 sm:grid-cols-2">
                                        {perms.map((p) => (
                                            <label key={p.code} className="flex items-start gap-2 rounded-lg border border-stone-200 px-3 py-2 text-sm">
                                                <input type="checkbox" className="mt-0.5 size-4 rounded border-stone-300" checked={roleCode === 'SUPER_ADMIN' || draft.has(p.code)} disabled={!editable} onChange={() => toggle(p.code)} />
                                                <span>
                                                    <span className="font-medium">{p.description}</span>
                                                    <span className="block font-mono text-xs text-stone-400">{p.code}</span>
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </fieldset>
                            ))}
                        </div>
                    </Card>
                </div>
            )}
        </QueryState>
    );
}
