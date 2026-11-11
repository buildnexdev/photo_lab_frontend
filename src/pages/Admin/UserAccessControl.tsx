// Developer by: Buildnexdev.in
// Devevloper : Nandhakumar@gmail.com
import { useMutation, useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { KeyRound, Save, Shield } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { QueryState } from '../../components/ui/Data';
import { Checkbox } from '../../components/ui/Form';
import { useToast } from '../../components/ui/Toast';
import { Alert, Button, Card, ColorListShell, PageHeader } from '../../components/ui';
import { useAuth } from '../../hooks/useAuth';
import { useInvalidate } from '../../hooks';
import { api, errorMessage } from '../../services/api';
import './UserAccessControl.scss';

type PermissionCode = string;

interface RoleRow {
    id: number;
    code: string;
    name: string;
    description: string | null;
    level: number;
    users: number;
    permissions: PermissionCode[];
}

interface PermissionRow {
    code: PermissionCode;
    module: string;
    description: string;
}

interface RolesPayload {
    roles: RoleRow[];
    permissions: PermissionRow[];
}

export default function UserAccessControl() {
    const { can, hasRole } = useAuth();
    const toast = useToast();
    const invalidate = useInvalidate();
    const canEdit = can('roles.manage');

    const q = useQuery({
        queryKey: ['user-roles'],
        queryFn: () => api.get<RolesPayload>('/api/users/roles'),
    });

    const [selectedCode, setSelectedCode] = useState<string | null>(null);
    const [draft, setDraft] = useState<PermissionCode[]>([]);

    const roles = q.data?.roles ?? [];
    const permissions = q.data?.permissions ?? [];
    const selected = roles.find((r) => r.code === selectedCode) ?? roles[0] ?? null;

    useEffect(() => {
        if (!selectedCode && roles[0]) setSelectedCode(roles[0].code);
    }, [roles, selectedCode]);

    useEffect(() => {
        if (selected) setDraft([...selected.permissions]);
    }, [selected?.code, selected?.permissions.join('|')]);

    const byModule = useMemo(() => {
        const map = new Map<string, PermissionRow[]>();
        for (const p of permissions) {
            const list = map.get(p.module) ?? [];
            list.push(p);
            map.set(p.module, list);
        }
        return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
    }, [permissions]);

    const dirty = !!selected && (draft.length !== selected.permissions.length || draft.some((p) => !selected.permissions.includes(p)));
    const locked = selected?.code === 'SUPER_ADMIN' || (!hasRole('SUPER_ADMIN') && (selected?.level === 100 || selected?.level === 1));

    const save = useMutation({
        mutationFn: () => api.put<RolesPayload>(`/api/users/roles/${selected!.code}/permissions`, { permissions: draft }),
        onSuccess: (data) => {
            invalidate(['user-roles']);
            q.refetch();
            toast.success('Access permissions updated');
            const next = data.roles.find((r) => r.code === selected!.code);
            if (next) setDraft([...next.permissions]);
        },
        onError: (e) => toast.error(errorMessage(e)),
    });

    const toggle = (code: PermissionCode) => {
        if (!canEdit || locked) return;
        setDraft((prev) => (prev.includes(code) ? prev.filter((p) => p !== code) : [...prev, code]));
    };

    return (
        <div className="uac-page space-y-4">
            <PageHeader
                title="User access control"
                subtitle="Choose a role and control which pages and actions that role can use."
            />

            <ColorListShell icon={KeyRound} tone="ink" title="Roles" subtitle="Access is granted by role, then applied to every user with that role.">
                <QueryState query={q}>
                    {() => (
                        <div className="uac-layout">
                            <aside className="uac-roles" aria-label="Roles">
                                {roles.map((role) => {
                                    const active = role.code === selected?.code;
                                    return (
                                        <button
                                            key={role.code}
                                            type="button"
                                            className={clsx('uac-role', active && 'is-active')}
                                            onClick={() => setSelectedCode(role.code)}
                                        >
                                            <span className="uac-role__icon" aria-hidden>
                                                <Shield className="size-3.5" strokeWidth={2.4} />
                                            </span>
                                            <span className="uac-role__text">
                                                <span className="uac-role__name">{role.name}</span>
                                                <span className="uac-role__meta">
                                                    {role.users} user{role.users === 1 ? '' : 's'} · {role.permissions.length} permissions
                                                </span>
                                            </span>
                                        </button>
                                    );
                                })}
                            </aside>

                            <Card className="uac-panel" padded>
                                {!selected ? (
                                    <Alert>No roles available.</Alert>
                                ) : (
                                    <>
                                        <div className="uac-panel__head">
                                            <div>
                                                <h2 className="uac-panel__title">{selected.name}</h2>
                                                <p className="uac-panel__desc">{selected.description || selected.code}</p>
                                            </div>
                                            {canEdit && !locked ? (
                                                <Button
                                                    icon={<Save className="size-4" />}
                                                    loading={save.isPending}
                                                    disabled={!dirty}
                                                    onClick={() => save.mutate()}
                                                >
                                                    Save access
                                                </Button>
                                            ) : null}
                                        </div>

                                        {locked ? (
                                            <Alert className="mb-4">
                                                {selected.code === 'SUPER_ADMIN'
                                                    ? 'Super Admin always has every permission and cannot be edited here.'
                                                    : 'Only a Super Admin can change owner or platform access for this role.'}
                                            </Alert>
                                        ) : !canEdit ? (
                                            <Alert className="mb-4">You can view roles, but need roles.manage permission to edit access.</Alert>
                                        ) : null}

                                        <div className="uac-modules">
                                            {byModule.map(([module, items]) => (
                                                <section key={module} className="uac-module">
                                                    <h3 className="uac-module__title">{module}</h3>
                                                    <ul className="uac-module__list">
                                                        {items.map((p) => (
                                                            <li key={p.code}>
                                                                <Checkbox
                                                                    label={
                                                                        <span>
                                                                            <span className="font-medium text-stone-800">{p.description}</span>
                                                                            <span className="mt-0.5 block font-mono text-[11px] text-stone-400">{p.code}</span>
                                                                        </span>
                                                                    }
                                                                    checked={selected.code === 'SUPER_ADMIN' ? true : draft.includes(p.code)}
                                                                    disabled={!canEdit || locked || selected.code === 'SUPER_ADMIN'}
                                                                    onChange={() => toggle(p.code)}
                                                                />
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </section>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </Card>
                        </div>
                    )}
                </QueryState>
            </ColorListShell>
        </div>
    );
}
