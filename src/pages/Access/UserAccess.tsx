// Developer by: Buildnexdev.in
// Last Edited : 22-10-2026
import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Alert, Button, Card, PageHeader } from '../../components/ui';
import { EmptyState, QueryState } from '../../components/ui/Data';
import { useToast } from '../../components/ui/Toast';
import { api } from '../../services/api';
import { ROLE_LABELS, ROLE_LEVEL, useAuth, type Role } from '../../hooks/useAuth';
import { titleCase } from '../../utils/format';
import { useInvalidate } from '../../hooks';
import './UserAccess.scss';

interface RolesData {
    roles: { id: number; code: Role; name: string; description: string | null; level: number; users: number; permissions: string[] }[];
    permissions: { code: string; module: string; description: string }[];
}

const levelLabel = (level: number) => (level === 100 ? 'Level 100 · Platform' : level === 0 ? 'Level 0 · Customer panel' : `Level ${level}`);

export default function UserAccess() {
    const { can, hasRole } = useAuth();
    const toast = useToast();
    const invalidate = useInvalidate();
    const q = useQuery({ queryKey: ['users', 'roles'], queryFn: () => api.get<RolesData>('/api/users/roles') });
    const [roleCode, setRoleCode] = useState<Role>('MANAGER');
    const [draft, setDraft] = useState<Set<string>>(new Set());
    const roles = useMemo(() => [...(q.data?.roles ?? [])].sort((a, b) => (a.level === 0 ? 99 : a.level) - (b.level === 0 ? 99 : b.level)), [q.data]);
    const role = roles.find((r) => r.code === roleCode) ?? roles[0];
    useEffect(() => {
        if (role) setDraft(new Set(role.permissions));
    }, [role]);
    const modules = useMemo(() => {
        const grouped = new Map<string, RolesData['permissions']>();
        for (const permission of q.data?.permissions ?? []) grouped.set(permission.module, [...(grouped.get(permission.module) ?? []), permission]);
        return [...grouped.entries()];
    }, [q.data]);
    const level = role ? (ROLE_LEVEL[role.code] ?? role.level) : 0;
    const locked = !role || level === 100 || (level === 1 && !hasRole('SUPER_ADMIN')) || !can('roles.manage');
    const dirty = !!role && (role.permissions.length !== draft.size || role.permissions.some((code) => !draft.has(code)));
    const save = useMutation({
        mutationFn: () => api.send('PUT', `/api/users/roles/${role?.code}/permissions`, { permissions: [...draft] }),
        onSuccess: (r) => (toast.success(r.message || 'Access updated'), invalidate(['users', 'roles'])),
        onError: (e) => toast.error(e),
    });
    const toggle = (code: string) =>
        setDraft((current) => {
            const next = new Set(current);
            if (next.has(code)) next.delete(code);
            else next.add(code);
            return next;
        });

    return (
        <div className="user-access-page">
            <PageHeader
                title="User access"
                subtitle="Control what each company role can open. Level 0 is the customer panel. Level 100 is the platform super admin."
                actions={
                    <Link to="/admin/access/assign" className="link text-sm">
                        Assign a user
                    </Link>
                }
            />
            <QueryState query={q} isEmpty={(d) => !d.roles.length} empty={<EmptyState title="No roles configured" />}>
                {() => (
                    <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
                        <Card padded={false} className="overflow-hidden">
                            <ul className="max-h-[70dvh] divide-y divide-stone-100 overflow-y-auto">
                                {roles.map((item) => (
                                    <li key={item.code}>
                                        <button
                                            type="button"
                                            onClick={() => setRoleCode(item.code)}
                                            className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm transition-colors ${item.code === role?.code ? 'bg-brand-50 font-semibold text-brand-700' : 'hover:bg-stone-50'}`}
                                        >
                                            <span className="min-w-0">
                                                <span className="block truncate">{ROLE_LABELS[item.code] ?? item.name}</span>
                                                <span className="block text-xs font-normal text-stone-500">{levelLabel(item.level)}</span>
                                            </span>
                                            <span className="text-xs text-stone-500">{item.users}</span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </Card>
                        {role && (
                            <Card
                                title={`${ROLE_LABELS[role.code] ?? role.name}`}
                                actions={
                                    !locked && (
                                        <>
                                            <Button size="sm" variant="ghost" disabled={!dirty} onClick={() => setDraft(new Set(role.permissions))}>
                                                Reset
                                            </Button>
                                            <Button size="sm" disabled={!dirty} loading={save.isPending} onClick={() => save.mutate()}>
                                                Save access
                                            </Button>
                                        </>
                                    )
                                }
                            >
                                <p className="mb-4 text-sm text-stone-500">{levelLabel(level)}. {role.users} user{role.users === 1 ? '' : 's'}.</p>
                                {level === 100 && <Alert className="mb-4">Super Admin always has every permission.</Alert>}
                                {level === 1 && !hasRole('SUPER_ADMIN') && <Alert className="mb-4">Only a Super Admin can change owner and company admin access.</Alert>}
                                {level === 0 && <Alert tone="warning" className="mb-4">Level 0 opens the customer panel. Customers only see their own bookings, galleries, orders and payments.</Alert>}
                                <div className="space-y-5">
                                    {modules.map(([module, permissions]) => (
                                        <fieldset key={module}>
                                            <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">{titleCase(module)}</legend>
                                            <div className="grid gap-2 sm:grid-cols-2">
                                                {permissions.map((permission) => (
                                                    <label key={permission.code} className="flex items-start gap-2 rounded-lg border border-stone-200 px-3 py-2 text-sm transition-colors hover:border-brand-200">
                                                        <input type="checkbox" className="mt-0.5 size-4 rounded border-stone-300" checked={level === 100 || draft.has(permission.code)} disabled={locked} onChange={() => toggle(permission.code)} />
                                                        <span>
                                                            <span className="font-medium">{permission.description}</span>
                                                            <span className="block font-mono text-xs text-stone-400">{permission.code}</span>
                                                        </span>
                                                    </label>
                                                ))}
                                            </div>
                                        </fieldset>
                                    ))}
                                </div>
                            </Card>
                        )}
                    </div>
                )}
            </QueryState>
        </div>
    );
}
