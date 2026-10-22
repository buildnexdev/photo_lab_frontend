// Developer by: Buildnexdev.in
// Last Edited : 22-10-2026
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router';
import { DataTable, EmptyState, QueryState, StatusBadge } from '../../components/ui/Data';
import { Select } from '../../components/ui/Form';
import { useToast } from '../../components/ui/Toast';
import { Button, Card, PageHeader } from '../../components/ui';
import { api, type Paged } from '../../services/api';
import { ROLE_LABELS, ROLE_LEVEL, useAuth, type Role } from '../../hooks/useAuth';
import { useInvalidate } from '../../hooks';
import './AssignAccess.scss';

interface AccessUser {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
    status: string;
    roles: Role[];
}

interface RolesData {
    roles: { code: Role; name: string; level: number }[];
}

export default function AssignAccess() {
    const { user, hasRole } = useAuth();
    const toast = useToast();
    const invalidate = useInvalidate();
    const [choice, setChoice] = useState<Record<number, Role>>({});
    const people = useQuery({ queryKey: ['users', 'access'], queryFn: () => api.get<Paged<AccessUser>>('/api/users', { page: 1, pageSize: 100 }) });
    const roles = useQuery({ queryKey: ['users', 'roles'], queryFn: () => api.get<RolesData>('/api/users/roles') });
    const assignable = (roles.data?.roles ?? []).filter((role) => hasRole('SUPER_ADMIN') || (role.level !== 100 && role.level !== 1));
    const save = useMutation({
        mutationFn: ({ id, role }: { id: number; role: Role }) => api.send('PUT', `/api/users/${id}/role`, { role }),
        onSuccess: (r) => {
            toast.success(r.message || 'Access updated');
            invalidate(['users']);
        },
        onError: (e) => toast.error(e),
    });

    return (
        <div className="assign-access-page">
            <PageHeader
                title="Assign access"
                subtitle="Give each person one company role. Level 0 opens the customer panel. Owner access stays with the Super Admin."
                actions={
                    <Link to="/admin/access" className="link text-sm">
                        Edit role access
                    </Link>
                }
            />
            <Card padded={false}>
                <QueryState query={people} isEmpty={(d) => !d.items.length} empty={<EmptyState title="No users in this company" />}>
                    {(page) => (
                        <DataTable
                            rows={page.items}
                            rowKey={(row) => row.id}
                            columns={[
                                {
                                    key: 'name',
                                    header: 'User',
                                    cell: (row) => (
                                        <div className="min-w-0">
                                            <p className="truncate font-medium text-stone-900">{row.name}</p>
                                            <p className="truncate text-xs text-stone-500">{row.email || row.phone || 'No contact'}</p>
                                        </div>
                                    ),
                                },
                                {
                                    key: 'role',
                                    header: 'Current role',
                                    cell: (row) => (
                                        <span className="text-sm text-stone-700">
                                            {(row.roles[0] && ROLE_LABELS[row.roles[0]]) || 'None'}
                                            {row.roles[0] ? ` · ${ROLE_LEVEL[row.roles[0]] === 0 ? 'Level 0' : `Level ${ROLE_LEVEL[row.roles[0]]}`}` : ''}
                                        </span>
                                    ),
                                },
                                { key: 'status', header: 'Status', cell: (row) => <StatusBadge status={row.status} />, hideOnMobile: true },
                                {
                                    key: 'assign',
                                    header: 'Assign',
                                    cell: (row) => {
                                        const current = (choice[row.id] ?? row.roles[0]) as Role | undefined;
                                        const mine = row.id === user?.id;
                                        return (
                                            <div className="flex min-w-[14rem] flex-col gap-2 sm:flex-row sm:items-center">
                                                <Select
                                                    aria-label={`Role for ${row.name}`}
                                                    value={current ?? ''}
                                                    disabled={mine || save.isPending}
                                                    onChange={(e) => setChoice((prev) => ({ ...prev, [row.id]: e.target.value as Role }))}
                                                    options={assignable.map((role) => ({ value: role.code, label: `${ROLE_LABELS[role.code] ?? role.name} · ${role.level === 0 ? 'Level 0' : `Level ${role.level}`}` }))}
                                                />
                                                <Button size="sm" disabled={mine || !current || current === row.roles[0]} loading={save.isPending && save.variables?.id === row.id} onClick={() => current && save.mutate({ id: row.id, role: current })}>
                                                    Save
                                                </Button>
                                            </div>
                                        );
                                    },
                                },
                            ]}
                        />
                    )}
                </QueryState>
            </Card>
        </div>
    );
}
