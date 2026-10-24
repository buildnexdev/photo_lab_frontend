// Developer by: Buildnexdev.in
// Last Edited : 25-10-2026
import { useMutation, useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { Info, RotateCcw, Save, ShieldCheck } from 'lucide-react';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { Button } from '../ui';
import { QueryState } from '../ui/Data';
import { Select } from '../ui/Form';
import { Modal } from '../ui/Overlay';
import { useToast } from '../ui/Toast';
import { api } from '../../services/api';
import { ROLE_LABELS, type Role } from '../../hooks/useAuth';
import { titleCase } from '../../utils/format';
import { useInvalidate } from '../../hooks';
import { Avatar } from './staffCommon';

const ACTIONS = ['view', 'add', 'edit', 'delete'] as const;
type Action = (typeof ACTIONS)[number];
type Rule = Record<Action, boolean>;
const NONE: Rule = { view: false, add: false, edit: false, delete: false };
const ALL: Rule = { view: true, add: true, edit: true, delete: true };
const sameRule = (a: Rule, b: Rule) => ACTIONS.every((k) => a[k] === b[k]);

interface PageAccessData {
    user: { id: number; name: string; email: string | null; phone: string | null; status: string; roles: Role[] };
    pages: { key: string; label: string; group: string; hasManage: boolean }[];
    roles: { code: Role; name: string; level: number }[];
    roleDefaults: Record<string, Record<string, Rule>>;
    overrides: Record<string, Rule>;
}

/** Per-user page access (View / Add / Edit / Delete) and role, for admin users only. */
export function PageAccessModal({ id, onClose }: { id: number | null; onClose: () => void }) {
    const toast = useToast();
    const invalidate = useInvalidate();
    const q = useQuery({ queryKey: ['users', 'page-access', id], queryFn: () => api.get<PageAccessData>(`/api/users/access/${id}`), enabled: id !== null });
    const [role, setRole] = useState<Role | ''>('');
    const [draft, setDraft] = useState<Record<string, Rule>>({});
    const [custom, setCustom] = useState<Set<string>>(new Set());

    const base = (key: string, r: Role | '' = role): Rule => (r && q.data?.roleDefaults[r]?.[key]) || NONE;
    useEffect(() => {
        if (!q.data) return;
        const r = q.data.user.roles[0] ?? '';
        setRole(r);
        setCustom(new Set(Object.keys(q.data.overrides)));
        setDraft(Object.fromEntries(q.data.pages.map((p) => [p.key, q.data!.overrides[p.key] ?? (r && q.data!.roleDefaults[r]?.[p.key]) ?? NONE])));
    }, [q.data]);

    const isSuper = role === 'SUPER_ADMIN';
    const groups = useMemo(() => {
        const out = new Map<string, PageAccessData['pages']>();
        for (const p of q.data?.pages ?? []) out.set(p.group, [...(out.get(p.group) ?? []), p]);
        return [...out.entries()];
    }, [q.data]);
    const pages = q.data?.pages ?? [];

    const commit = (key: string, rule: Rule) => {
        setDraft((d) => ({ ...d, [key]: rule }));
        setCustom((c) => {
            const next = new Set(c);
            if (sameRule(rule, base(key))) next.delete(key);
            else next.add(key);
            return next;
        });
    };
    const normalize = (rule: Rule, hasManage: boolean, changed: Action): Rule => {
        const r = { ...rule };
        if (!hasManage) r.add = r.edit = r.delete = false;
        if (changed === 'view' && !r.view) r.add = r.edit = r.delete = false;
        if (changed !== 'view' && (r.add || r.edit || r.delete)) r.view = true;
        return r;
    };
    type Page = PageAccessData['pages'][number];
    const setCell = (p: Page, action: Action, on: boolean) => commit(p.key, normalize({ ...(draft[p.key] ?? NONE), [action]: on }, p.hasManage, action));
    const setRow = (p: Page, on: boolean) => commit(p.key, normalize(on ? ALL : NONE, p.hasManage, 'view'));
    const setColumn = (action: Action, on: boolean) => pages.forEach((p) => (action === 'view' || p.hasManage) && setCell(p, action, on));

    const changeRole = (r: Role) => {
        setRole(r);
        setDraft((d) => Object.fromEntries(pages.map((p) => [p.key, custom.has(p.key) ? d[p.key] : (q.data?.roleDefaults[r]?.[p.key] ?? NONE)])));
    };
    const resetAll = () => {
        setCustom(new Set());
        setDraft(Object.fromEntries(pages.map((p) => [p.key, base(p.key)])));
    };

    const save = useMutation({
        mutationFn: () => api.send('PUT', `/api/users/access/${id}`, { role: role || undefined, pages: isSuper ? [] : [...custom].map((key) => ({ key, ...draft[key] })) }),
        onSuccess: (r) => {
            toast.success(r.message || 'Access updated');
            invalidate(['users']);
            onClose();
        },
        onError: (e) => toast.error(e),
    });

    const colOn = (action: Action) => isSuper || (pages.length > 0 && pages.filter((p) => action === 'view' || p.hasManage).every((p) => draft[p.key]?.[action]));
    const u = q.data?.user;
    const currentRole = u?.roles[0];
    const dirty = !!q.data && (role !== (currentRole ?? '') || custom.size !== Object.keys(q.data.overrides).length || [...custom].some((k) => !q.data!.overrides[k] || !sameRule(q.data!.overrides[k], draft[k])));

    return (
        <Modal
            open={id !== null}
            onClose={onClose}
            size="xl"
            title={
                <span className="flex items-center gap-2.5">
                    <span className="flex size-9 items-center justify-center rounded-xl bg-ink-900 text-accent-400">
                        <ShieldCheck className="size-5" />
                    </span>
                    Page access
                </span>
            }
            footer={
                <>
                    <Button variant="secondary" className="mr-auto" icon={<RotateCcw className="size-4" />} disabled={!custom.size || isSuper} onClick={resetAll}>
                        Reset to role defaults
                    </Button>
                    <Button variant="secondary" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button icon={<Save className="size-4" />} loading={save.isPending} disabled={!dirty} onClick={() => save.mutate()}>
                        Save access
                    </Button>
                </>
            }
        >
            <QueryState query={q}>
                {(d) => (
                    <div className="space-y-4">
                        <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-stone-200 bg-stone-50/60 p-3">
                            {u && <Avatar name={u.name} className="size-12 rounded-full text-sm" />}
                            <div className="min-w-0 flex-1">
                                <p className="truncate font-semibold text-stone-900">{u?.name}</p>
                                <p className="truncate text-xs text-stone-500">{u?.email || u?.phone || 'No contact'}</p>
                            </div>
                            <Select
                                wrapperClassName="w-64"
                                label="Role"
                                value={role}
                                onChange={(e) => changeRole(e.target.value as Role)}
                                placeholder={currentRole ? undefined : 'Choose a role'}
                                options={d.roles.map((r) => ({ value: r.code, label: `${ROLE_LABELS[r.code] ?? r.name} · L${r.level}` }))}
                            />
                        </div>

                        <div className="flex items-start gap-2 rounded-xl bg-accent-50/60 px-3 py-2 text-xs text-stone-600">
                            <Info className="mt-0.5 size-4 shrink-0 text-accent-600" />
                            {isSuper ? (
                                <span>Super Admin always has every page and action.</span>
                            ) : (
                                <span>
                                    Ticks start from the role's access. Changing a tick makes that page <b className="text-violet-700">Custom</b> for this user only. Turning off View hides the page; Add, Edit and Delete need View.
                                </span>
                            )}
                        </div>

                        <div className="overflow-x-auto">
                            <table className="staff-table w-full min-w-[640px] border-collapse text-sm">
                                <thead>
                                    <tr>
                                        <th className="w-14">S.No</th>
                                        <th>Page name</th>
                                        {ACTIONS.map((a) => (
                                            <th key={a} className="w-20 text-center">
                                                <label className="flex cursor-pointer flex-col items-center gap-1">
                                                    {titleCase(a)}
                                                    <input type="checkbox" className="access-check" checked={colOn(a)} disabled={isSuper} onChange={(e) => setColumn(a, e.target.checked)} aria-label={`${titleCase(a)} on every page`} />
                                                </label>
                                            </th>
                                        ))}
                                        <th className="w-16 text-center">All</th>
                                        <th className="w-28">Source</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {groups.map(([group, list]) => (
                                        <Fragment key={group}>
                                            <tr className="access-group-row">
                                                <td colSpan={8} className="text-xs font-bold uppercase tracking-wide text-accent-800">
                                                    {group}
                                                </td>
                                            </tr>
                                            {list.map((p) => {
                                                const rule = isSuper ? ALL : (draft[p.key] ?? NONE);
                                                const isCustom = !isSuper && custom.has(p.key);
                                                const full = p.hasManage ? ACTIONS.every((a) => rule[a]) : rule.view;
                                                return (
                                                    <tr key={p.key} className={clsx(isCustom && 'access-row--changed')}>
                                                        <td className="text-stone-500">{pages.indexOf(p) + 1}</td>
                                                        <td className="font-medium text-stone-800">{p.label}</td>
                                                        {ACTIONS.map((a) => (
                                                            <td key={a} className="text-center">
                                                                {a !== 'view' && !p.hasManage ? <span className="text-xs text-stone-300">—</span> : <input type="checkbox" className="access-check" checked={rule[a]} disabled={isSuper} onChange={(e) => setCell(p, a, e.target.checked)} aria-label={`${titleCase(a)} ${p.label}`} />}
                                                            </td>
                                                        ))}
                                                        <td className="text-center">
                                                            <input type="checkbox" className="access-check" checked={full} disabled={isSuper} onChange={(e) => setRow(p, e.target.checked)} aria-label={`Everything on ${p.label}`} />
                                                        </td>
                                                        <td>
                                                            {isCustom ? (
                                                                <button type="button" onClick={() => commit(p.key, base(p.key))} title="Use the role's access again" className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-700 hover:bg-violet-100">
                                                                    Custom ×
                                                                </button>
                                                            ) : (
                                                                <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-stone-500">Role</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </QueryState>
        </Modal>
    );
}
