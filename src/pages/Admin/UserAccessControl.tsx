// Developer by: Buildnexdev.in
// Devevloper : Nandhakumar@gmail.com
import { useMutation, useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { KeyRound, Plus, Save, Shield, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { QueryState } from '../../components/ui/Data';
import { Checkbox, Input, Textarea } from '../../components/ui/Form';
import { Modal } from '../../components/ui/Overlay';
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
    is_system?: number;
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

    // Modal state for adding a custom role
    const [isAddRoleOpen, setIsAddRoleOpen] = useState(false);
    const [newRoleCode, setNewRoleCode] = useState('');
    const [newRoleName, setNewRoleName] = useState('');
    const [newRoleDesc, setNewRoleDesc] = useState('');

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

    const createRoleMutation = useMutation({
        mutationFn: (data: { code: string; name: string; description?: string }) => api.post<RolesPayload>('/api/users/roles', data),
        onSuccess: (data) => {
            invalidate(['user-roles']);
            q.refetch();
            toast.success('Custom role created');
            setIsAddRoleOpen(false);
            setNewRoleCode('');
            setNewRoleName('');
            setNewRoleDesc('');
            if (data.roles.length) {
                const created = data.roles.find((r) => r.code === newRoleCode.trim().toUpperCase());
                if (created) setSelectedCode(created.code);
            }
        },
        onError: (e) => toast.error(errorMessage(e)),
    });

    const deleteRoleMutation = useMutation({
        mutationFn: (code: string) => api.del<RolesPayload>(`/api/users/roles/${code}`),
        onSuccess: () => {
            invalidate(['user-roles']);
            q.refetch();
            toast.success('Role deleted');
            setSelectedCode(roles[0]?.code ?? null);
        },
        onError: (e) => toast.error(errorMessage(e)),
    });

    const toggle = (code: PermissionCode) => {
        if (!canEdit || locked) return;
        setDraft((prev) => (prev.includes(code) ? prev.filter((p) => p !== code) : [...prev, code]));
    };

    const handleCreateRoleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newRoleCode.trim() || !newRoleName.trim()) {
            toast.error('Role code and role name are required.');
            return;
        }
        createRoleMutation.mutate({
            code: newRoleCode.trim().toUpperCase(),
            name: newRoleName.trim(),
            description: newRoleDesc.trim() || undefined,
        });
    };

    return (
        <div className="uac-page space-y-4">
            <PageHeader
                title="User access control"
                subtitle="Manage default system roles and create custom studio roles with granular permissions."
            />

            <ColorListShell
                icon={KeyRound}
                tone="ink"
                title="Roles & Permissions"
                subtitle="Access is granted by role, then applied to every user with that role."
                actions={
                    canEdit && (
                        <Button
                            variant="secondary"
                            size="sm"
                            icon={<Plus className="size-4" />}
                            onClick={() => setIsAddRoleOpen(true)}
                        >
                            Add Custom Role
                        </Button>
                    )
                }
            >
                <QueryState query={q}>
                    {() => (
                        <div className="uac-layout">
                            <aside className="uac-roles" aria-label="Roles">
                                <div className="p-2 border-b border-stone-200/80 bg-stone-50/50 flex items-center justify-between">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                                        Defined Roles ({roles.length})
                                    </span>
                                </div>
                                {roles.map((role) => {
                                    const active = role.code === selected?.code;
                                    const isDefault = role.is_system === 1;

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
                                                <span className="uac-role__name flex items-center gap-1.5">
                                                    <span>{role.name}</span>
                                                    {isDefault ? (
                                                        <span className="rounded-sm bg-stone-100 px-1.5 py-0.2 text-[9px] font-semibold text-stone-600">
                                                            Default
                                                        </span>
                                                    ) : (
                                                        <span className="rounded-sm bg-emerald-50 px-1.5 py-0.2 text-[9px] font-semibold text-emerald-700">
                                                            Custom
                                                        </span>
                                                    )}
                                                </span>
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
                                                <div className="flex items-center gap-2">
                                                    <h2 className="uac-panel__title">{selected.name}</h2>
                                                    {selected.is_system === 1 ? (
                                                        <span className="rounded-md bg-stone-100 px-2 py-0.5 text-xs font-semibold text-stone-600">
                                                            System Default
                                                        </span>
                                                    ) : (
                                                        <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                                                            Custom Studio Role
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="uac-panel__desc font-mono text-xs text-stone-500 mt-0.5">{selected.code}</p>
                                                {selected.description && (
                                                    <p className="uac-panel__desc text-xs text-stone-600 mt-1">{selected.description}</p>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {canEdit && selected.is_system === 0 && (
                                                    <Button
                                                        variant="danger"
                                                        size="sm"
                                                        icon={<Trash2 className="size-3.5" />}
                                                        disabled={selected.users > 0 || deleteRoleMutation.isPending}
                                                        onClick={() => {
                                                            if (window.confirm(`Delete custom role "${selected.name}"?`)) {
                                                                deleteRoleMutation.mutate(selected.code);
                                                            }
                                                        }}
                                                    >
                                                        Delete Role
                                                    </Button>
                                                )}

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
                                        </div>

                                        {locked ? (
                                            <Alert className="mb-4">
                                                {selected.code === 'SUPER_ADMIN'
                                                    ? 'Super Admin always has every permission across the platform.'
                                                    : 'Only Super Admin can change owner or platform access for this role.'}
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

            {/* Modal for Creating Custom Role */}
            <Modal
                open={isAddRoleOpen}
                onClose={() => setIsAddRoleOpen(false)}
                title="Create Custom Studio Role"
                size="md"
            >
                <form onSubmit={handleCreateRoleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
                            Role Code *
                        </label>
                        <Input
                            placeholder="e.g. DRONE_PILOT or SENIOR_RETOUCHER"
                            value={newRoleCode}
                            onChange={(e) => setNewRoleCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_'))}
                            required
                        />
                        <p className="mt-1 text-[11px] text-stone-400">Unique uppercase identifier (A-Z, 0-9, underscore).</p>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
                            Display Name *
                        </label>
                        <Input
                            placeholder="e.g. Drone Pilot / Aerial Operator"
                            value={newRoleName}
                            onChange={(e) => setNewRoleName(e.target.value)}
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
                            Description (Optional)
                        </label>
                        <Textarea
                            placeholder="Describe what duties and functions this role handles..."
                            value={newRoleDesc}
                            onChange={(e) => setNewRoleDesc(e.target.value)}
                            rows={3}
                        />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200">
                        <Button variant="secondary" onClick={() => setIsAddRoleOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" loading={createRoleMutation.isPending}>
                            Create Role
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
