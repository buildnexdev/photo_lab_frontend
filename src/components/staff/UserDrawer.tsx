// Developer by: Buildnexdev.in
// Devevloper : Nandhakumar@gmail.com
// Last Edited : 06-10-2026
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import {
    Briefcase,
    Check,
    ChevronLeft,
    ClipboardList,
    Eye,
    FileText,
    FolderUp,
    GraduationCap,
    HeartPulse,
    Home,
    ImageIcon,
    KeyRound,
    MapPin,
    Pencil,
    Plus,
    ShieldCheck,
    Trash2,
    Upload,
    UserCircle2,
    UserRound,
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { useFieldArray, useForm, type FieldErrors } from 'react-hook-form';
import { z } from 'zod';
import { api, applyFieldErrors } from '../../services/api';
import { ROLE_LABELS, useAuth, type Role } from '../../hooks/useAuth';
import { useInvalidate } from '../../hooks';
import { emailRule, optionalPhone, passwordRule } from '../../helpers/validation';
import { Checkbox, Field, FormGrid, Input, Select, Textarea } from '../ui/Form';
import { Drawer, useConfirm } from '../ui/Overlay';
import { useToast } from '../ui/Toast';
import { Button } from '../ui';
import { Avatar, STAFF_ROLE_CODES, type StaffProfile, type UserDetail } from './staffCommon';

const DOC_TYPES = [
    { value: 'AADHAAR', label: 'Aadhaar card' },
    { value: 'PAN', label: 'PAN card' },
    { value: 'PHOTO', label: 'Passport photo' },
    { value: 'RESUME', label: 'Resume / CV' },
    { value: 'CERTIFICATE', label: 'Education certificate' },
    { value: 'OFFER_LETTER', label: 'Offer / appointment letter' },
    { value: 'BANK', label: 'Bank proof / cheque' },
    { value: 'OTHER', label: 'Other' },
];
const docLabel = (t: string) => DOC_TYPES.find((d) => d.value === t)?.label ?? t;
const DOC_ACCEPT = /\.(pdf|jpe?g|png|webp)$/i;
const MAX_DOC_BYTES = 10 * 1024 * 1024;
const formatSize = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

interface StaffDocument {
    id: number;
    doc_type: string;
    file_name: string;
    mime_type: string;
    size_bytes: number;
    created_at: string;
    url: string;
}
interface PendingDoc {
    key: string;
    docType: string;
    file: File;
}

const uploadDocument = (userId: number, docType: string, file: File) => {
    const form = new FormData();
    form.append('docType', docType);
    form.append('file', file);
    return api.send('POST', `/api/users/${userId}/documents`, form);
};

const text = (max: number) => z.string().trim().max(max, `Use at most ${max} characters`);
const optionalPattern = (re: RegExp, message: string) => z.string().trim().refine((v) => !v || re.test(v), message);
const address = z.object({ line1: text(160), line2: text(160), city: text(80), state: text(80), pincode: optionalPattern(/^\d{6}$/, 'Enter a 6-digit PIN code'), country: text(60) });

const schema = (isNew: boolean) =>
    z
        .object({
            name: z.string().trim().min(2, 'Enter a name').max(120),
            email: emailRule,
            phone: optionalPhone,
            password: isNew ? passwordRule : z.union([z.literal(''), passwordRule]),
            confirmPassword: z.string(),
            roles: z.array(z.string()).min(1, 'Choose at least one role'),
            status: z.enum(['ACTIVE', 'INACTIVE', 'LOCKED']),
            designation: text(80),
            department: text(80),
            cameraGear: text(255),
            specialties: text(255),
            software: text(255),
            personal: z.object({ dob: z.string(), gender: z.string(), bloodGroup: z.string(), joinedOn: z.string(), emergencyName: text(120), emergencyPhone: optionalPhone }),
            address,
            permanentAddress: address.extend({ same: z.boolean() }),
            education: z.array(z.object({ qualification: text(120), institution: text(160), field: text(120), year: optionalPattern(/^(19|20)\d{2}$/, 'Enter a year like 2018'), grade: text(20) })),
            experience: z.array(z.object({ company: text(160), role: text(120), from: z.string(), to: z.string(), current: z.boolean(), description: text(1000) })),
        })
        .superRefine((v, ctx) => {
            if (v.password && v.password !== v.confirmPassword) ctx.addIssue({ code: 'custom', path: ['confirmPassword'], message: 'Passwords do not match' });
            v.experience.forEach((e, i) => {
                if (e.from && !e.current && e.to && e.to < e.from) ctx.addIssue({ code: 'custom', path: ['experience', i, 'to'], message: 'Ends before it starts' });
            });
        });
type Form = z.infer<ReturnType<typeof schema>>;

const EMPTY_ADDRESS = { line1: '', line2: '', city: '', state: '', pincode: '', country: 'India' };
const EMPTY_EDUCATION = { qualification: '', institution: '', field: '', year: '', grade: '' };
const EMPTY_EXPERIENCE = { company: '', role: '', from: '', to: '', current: false, description: '' };

function toForm(u: UserDetail | null, defaultRole?: Role): Form {
    const p: StaffProfile = u?.profile ?? {};
    return {
        name: u?.name ?? '',
        email: u?.email ?? '',
        phone: u?.phone ?? '',
        password: '',
        confirmPassword: '',
        roles: u ? u.roles : defaultRole ? [defaultRole] : [],
        status: u?.status ?? 'ACTIVE',
        designation: u?.designation ?? '',
        department: u?.department ?? '',
        cameraGear: u?.camera_gear ?? '',
        specialties: u?.photographer_specialties ?? u?.editor_specialties ?? '',
        software: u?.software ?? '',
        personal: { dob: '', gender: '', bloodGroup: '', joinedOn: '', emergencyName: '', emergencyPhone: '', ...p.personal },
        address: { ...EMPTY_ADDRESS, ...p.address },
        permanentAddress: { ...EMPTY_ADDRESS, same: true, ...p.permanentAddress },
        education: (p.education ?? []).map((e) => ({ ...EMPTY_EDUCATION, ...e })),
        experience: (p.experience ?? []).map((e) => ({ ...EMPTY_EXPERIENCE, ...e })),
    };
}

const compact = <T extends Record<string, unknown>>(o: T) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== '' && v !== undefined)) as Partial<T>;

function toProfile(v: Form): StaffProfile {
    return {
        personal: compact(v.personal),
        address: compact(v.address),
        permanentAddress: v.permanentAddress.same ? { same: true } : compact(v.permanentAddress),
        education: v.education.filter((e) => e.qualification || e.institution).map(compact),
        experience: v.experience.filter((e) => e.company || e.role).map((e) => compact({ ...e, to: e.current ? '' : e.to })),
    };
}

const SECTIONS = [
    { title: 'Account details', hint: 'Basic and personal details', icon: ClipboardList, fields: ['name', 'email', 'phone', 'designation', 'department', 'personal'] },
    { title: 'Address', hint: 'Current and permanent address', icon: MapPin, fields: ['address', 'permanentAddress'] },
    { title: 'Education', hint: 'Degrees and courses', icon: GraduationCap, fields: ['education'] },
    { title: 'Experience', hint: 'Previous jobs', icon: Briefcase, fields: ['experience'] },
    { title: 'Password', hint: 'Sign-in password', icon: KeyRound, fields: ['password', 'confirmPassword'] },
    { title: 'Role & access', hint: 'Role and account status', icon: ShieldCheck, fields: ['roles', 'status', 'cameraGear', 'specialties', 'software'] },
    { title: 'Documents', hint: 'ID proofs and certificates', icon: FolderUp, fields: [] },
] as const;

function Panel({ icon, title, action, children }: { icon: ReactNode; title: string; action?: ReactNode; children: ReactNode }) {
    return (
        <div className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-[var(--soft-shadow)]">
            <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="flex items-center gap-2 font-semibold text-stone-900">
                    {icon}
                    {title}
                </h3>
                {action}
            </div>
            {children}
        </div>
    );
}

function EmptyBlock({ icon, title, hint, onAdd, addLabel }: { icon: ReactNode; title: string; hint: string; onAdd: () => void; addLabel: string }) {
    return (
        <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-stone-200 px-4 py-10 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-accent-50 text-accent-600">{icon}</span>
            <p className="font-semibold text-stone-900">{title}</p>
            <p className="max-w-sm text-sm text-stone-500">{hint}</p>
            <Button variant="secondary" className="mt-2" icon={<Plus className="size-4" />} onClick={onAdd}>
                {addLabel}
            </Button>
        </div>
    );
}

export function UserDrawer({ id, defaultRole, onClose }: { id: number | 'new' | null; defaultRole?: Role; onClose: () => void }) {
    const { user, can } = useAuth();
    const toast = useToast();
    const invalidate = useInvalidate();
    const { ask, dialog } = useConfirm();
    const isNew = id === 'new';
    const [step, setStep] = useState(0);
    const [pending, setPending] = useState<PendingDoc[]>([]);
    const detail = useQuery({ queryKey: ['users', 'detail', id], queryFn: () => api.get<UserDetail>(`/api/users/${id}`), enabled: typeof id === 'number' });
    const {
        register,
        control,
        handleSubmit,
        reset,
        watch,
        setValue,
        setError,
        formState: { errors, isSubmitting },
    } = useForm<Form>({ resolver: zodResolver(schema(isNew)), defaultValues: toForm(null, defaultRole) });
    const education = useFieldArray({ control, name: 'education' });
    const experience = useFieldArray({ control, name: 'experience' });

    useEffect(() => {
        setStep(0);
        setPending([]);
    }, [id]);
    useEffect(() => {
        if (isNew) reset(toForm(null, defaultRole));
        else if (detail.data) reset(toForm(detail.data));
    }, [isNew, detail.data, defaultRole, reset]);

    const roles = watch('roles') ?? [];
    const name = watch('name') ?? '';
    const sameAddress = watch('permanentAddress.same');
    const current = watch('experience');
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

    const jumpToError = (errs: FieldErrors<Form>) => {
        const idx = SECTIONS.findIndex((s) => s.fields.some((f) => f in errs));
        if (idx >= 0) setStep(idx);
    };
    const submit = handleSubmit(async (v) => {
        const { confirmPassword: _, personal: _1, address: _2, permanentAddress: _3, education: _4, experience: _5, ...core } = v;
        void _; void _1; void _2; void _3; void _4; void _5;
        const body = {
            ...core,
            roles: v.roles,
            phone: v.phone || null,
            password: v.password || undefined,
            designation: v.designation || null,
            department: v.department || null,
            cameraGear: v.cameraGear || null,
            specialties: v.specialties || null,
            software: v.software || null,
            profile: toProfile(v),
        };
        try {
            const r = isNew ? await api.send<UserDetail>('POST', '/api/users', body) : await api.send<UserDetail>('PUT', `/api/users/${id}`, body);
            if (isNew && pending.length) {
                const failed: string[] = [];
                for (const p of pending) await uploadDocument(r.data.id, p.docType, p.file).catch(() => failed.push(p.file.name));
                if (failed.length) toast.error(`Staff member created, but these documents did not upload: ${failed.join(', ')}`);
            }
            toast.success(r.message);
            await invalidate(['users']);
            onClose();
        } catch (e) {
            if (!applyFieldErrors(e, setError as never)) toast.error(e);
        }
    }, jumpToError);

    const section = SECTIONS[step];
    const loading = !isNew && detail.isLoading;
    const hasError = (fields: readonly string[]) => fields.some((f) => f in errors);

    return (
        <Drawer
            open={id !== null}
            onClose={onClose}
            width="lg:w-[90vw]"
            title={
                <span className="flex items-center gap-2.5">
                    <span className="flex size-9 items-center justify-center rounded-xl bg-ink-900 text-accent-400">{isNew ? <Plus className="size-5" /> : <Pencil className="size-4" />}</span>
                    {isNew ? 'Add staff member' : (detail.data?.name ?? 'Staff member')}
                </span>
            }
            footer={
                <>
                    <Button variant="secondary" className="mr-auto" onClick={onClose}>
                        Cancel
                    </Button>
                    {step > 0 && (
                        <Button variant="secondary" icon={<ChevronLeft className="size-4" />} onClick={() => setStep(step - 1)}>
                            Back
                        </Button>
                    )}
                    {step < SECTIONS.length - 1 && (
                        <Button variant="dark" onClick={() => setStep(step + 1)}>
                            Next
                        </Button>
                    )}
                    <Button loading={isSubmitting} disabled={!isNew && !detail.data} onClick={submit}>
                        {isNew ? 'Create staff member' : 'Save changes'}
                    </Button>
                </>
            }
        >
            {loading ? (
                <p className="py-8 text-center text-sm text-stone-500">Loading…</p>
            ) : detail.isError ? (
                <p className="py-8 text-center text-sm text-red-600">Could not load this user.</p>
            ) : (
                <form onSubmit={submit} noValidate className="-mx-5 -my-4 grid min-h-full gap-4 bg-[var(--portal-bg)] p-4 md:grid-cols-[16rem_minmax(0,1fr)]">
                    <nav className="flex gap-1.5 overflow-x-auto rounded-2xl border border-stone-200/80 bg-white p-2 shadow-[var(--soft-shadow)] md:sticky md:top-0 md:flex-col md:self-start md:overflow-visible md:p-3">
                        <p className="mb-1 hidden items-center gap-2 px-1 font-semibold text-stone-900 md:flex">
                            <UserCircle2 className="size-5 text-accent-600" />
                            User information
                        </p>
                        {SECTIONS.map((s, i) => (
                            <button
                                key={s.title}
                                type="button"
                                onClick={() => setStep(i)}
                                className={clsx(
                                    'flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-colors',
                                    i === step ? 'bg-ink-900 text-accent-300 shadow-sm' : 'text-stone-700 hover:bg-accent-50',
                                    hasError(s.fields) && i !== step && 'ring-2 ring-rose-300',
                                )}
                            >
                                <span className={clsx('flex size-8 shrink-0 items-center justify-center rounded-lg', i === step ? 'bg-white/10' : 'bg-accent-50 text-accent-700')}>
                                    <s.icon className="size-4" />
                                </span>
                                <span className="min-w-0">
                                    <span className="block text-sm font-semibold">{s.title}</span>
                                    <span className={clsx('hidden truncate text-[11px] md:block', i === step ? 'text-accent-200/70' : 'text-stone-500')}>{s.hint}</span>
                                </span>
                            </button>
                        ))}
                        {!isNew && !self && can('users.manage') && (
                            <button type="button" disabled={del.isPending} onClick={async () => (await ask({ title: 'Delete this account?', message: 'They are signed out everywhere and can no longer sign in. Their past work stays in the records.', confirmLabel: 'Delete' })) && del.mutate()} className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-rose-50 md:mt-3 px-3 py-2.5 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-100 disabled:opacity-50">
                                <Trash2 className="size-4" />
                                Delete user
                            </button>
                        )}
                    </nav>

                    <div className="min-w-0 space-y-4 rounded-2xl border border-stone-200/80 bg-white p-4 shadow-[var(--soft-shadow)]">
                        <h3 className="flex items-center gap-2 font-semibold text-stone-900">
                            <section.icon className="size-5 text-accent-600" />
                            {section.title}
                            <span className="ml-auto text-xs font-medium text-stone-500">
                                Step {step + 1} of {SECTIONS.length}
                            </span>
                        </h3>
                        <ol className="flex items-start">
                            {SECTIONS.map((s, i) => (
                                <li key={s.title} className={clsx('flex items-center', i < SECTIONS.length - 1 && 'flex-1')}>
                                    <button type="button" onClick={() => setStep(i)} aria-label={`Step ${i + 1}: ${s.title}`} title={s.title} className={clsx('flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors', hasError(s.fields) ? 'bg-rose-500 text-white' : i < step ? 'bg-accent-500 text-ink-900' : i === step ? 'bg-ink-900 text-accent-300 ring-4 ring-accent-200' : 'bg-stone-100 text-stone-500')}>
                                        {i < step && !hasError(s.fields) ? <Check className="size-3.5" /> : i + 1}
                                    </button>
                                    {i < SECTIONS.length - 1 && <span className={clsx('mx-2 h-0.5 flex-1 rounded-full', i < step ? 'bg-accent-400' : 'bg-stone-200')} />}
                                </li>
                            ))}
                        </ol>

                        {step === 0 && (
                            <>
                                <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-stone-200/80 bg-stone-50/60 p-4">
                                    <Avatar name={name || 'New staff'} className="size-20 rounded-full text-2xl" />
                                    <div className="min-w-0">
                                        <p className="font-semibold text-stone-900">{name || 'New staff member'}</p>
                                        <p className="text-sm text-stone-500">The avatar uses their initials and helps teammates recognise them.</p>
                                    </div>
                                </div>
                                <Panel icon={<Pencil className="size-4 text-amber-500" />} title="Personal information">
                                    <FormGrid cols={3}>
                                        <Input label="Full name" required {...register('name')} error={errors.name?.message} />
                                        <Input label="Email" type="email" required autoComplete="off" {...register('email')} error={errors.email?.message} />
                                        <Input label="Phone number" type="tel" {...register('phone')} error={errors.phone?.message} />
                                        <Input label="Date of birth" type="date" {...register('personal.dob')} />
                                        <Select label="Gender" placeholder="Select" {...register('personal.gender')} options={['Male', 'Female', 'Other'].map((g) => ({ value: g, label: g }))} />
                                        <Select label="Blood group" placeholder="Select" {...register('personal.bloodGroup')} options={['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((g) => ({ value: g, label: g }))} />
                                    </FormGrid>
                                </Panel>
                                <Panel icon={<Briefcase className="size-4 text-sky-500" />} title="Job details">
                                    <FormGrid cols={3}>
                                        <Input label="Designation" {...register('designation')} error={errors.designation?.message} placeholder="e.g. Senior photographer" />
                                        <Input label="Department" {...register('department')} error={errors.department?.message} placeholder="e.g. Production" />
                                        <Input label="Joining date" type="date" {...register('personal.joinedOn')} />
                                    </FormGrid>
                                </Panel>
                                <Panel icon={<HeartPulse className="size-4 text-rose-500" />} title="Emergency contact">
                                    <FormGrid>
                                        <Input label="Contact name" {...register('personal.emergencyName')} error={errors.personal?.emergencyName?.message} />
                                        <Input label="Contact phone" type="tel" {...register('personal.emergencyPhone')} error={errors.personal?.emergencyPhone?.message} />
                                    </FormGrid>
                                </Panel>
                            </>
                        )}

                        {step === 1 && (
                            <>
                                <Panel icon={<MapPin className="size-4 text-emerald-500" />} title="Current address">
                                    <FormGrid cols={3}>
                                        <Input label="Address line 1" wrapperClassName="sm:col-span-2 lg:col-span-3" {...register('address.line1')} error={errors.address?.line1?.message} placeholder="House no., street" />
                                        <Input label="Address line 2" wrapperClassName="sm:col-span-2 lg:col-span-3" {...register('address.line2')} error={errors.address?.line2?.message} placeholder="Area, landmark" />
                                        <Input label="City" {...register('address.city')} error={errors.address?.city?.message} />
                                        <Input label="State" {...register('address.state')} error={errors.address?.state?.message} />
                                        <Input label="PIN code" inputMode="numeric" maxLength={6} {...register('address.pincode')} error={errors.address?.pincode?.message} />
                                        <Input label="Country" {...register('address.country')} error={errors.address?.country?.message} />
                                    </FormGrid>
                                </Panel>
                                <Panel icon={<Home className="size-4 text-violet-500" />} title="Permanent address">
                                    <Checkbox label="Same as current address" {...register('permanentAddress.same')} />
                                    {!sameAddress && (
                                        <FormGrid cols={3} className="mt-4">
                                            <Input label="Address line 1" wrapperClassName="sm:col-span-2 lg:col-span-3" {...register('permanentAddress.line1')} error={errors.permanentAddress?.line1?.message} />
                                            <Input label="Address line 2" wrapperClassName="sm:col-span-2 lg:col-span-3" {...register('permanentAddress.line2')} error={errors.permanentAddress?.line2?.message} />
                                            <Input label="City" {...register('permanentAddress.city')} error={errors.permanentAddress?.city?.message} />
                                            <Input label="State" {...register('permanentAddress.state')} error={errors.permanentAddress?.state?.message} />
                                            <Input label="PIN code" inputMode="numeric" maxLength={6} {...register('permanentAddress.pincode')} error={errors.permanentAddress?.pincode?.message} />
                                            <Input label="Country" {...register('permanentAddress.country')} error={errors.permanentAddress?.country?.message} />
                                        </FormGrid>
                                    )}
                                </Panel>
                            </>
                        )}

                        {step === 2 &&
                            (education.fields.length === 0 ? (
                                <EmptyBlock icon={<GraduationCap className="size-6" />} title="No education added" hint="Add degrees, diplomas or certifications, starting with the highest." onAdd={() => education.append(EMPTY_EDUCATION)} addLabel="Add education" />
                            ) : (
                                <>
                                    {education.fields.map((f, i) => (
                                        <Panel
                                            key={f.id}
                                            icon={<GraduationCap className="size-4 text-indigo-500" />}
                                            title={`Education ${i + 1}`}
                                            action={
                                                <button type="button" onClick={() => education.remove(i)} aria-label={`Remove education ${i + 1}`} className="inline-flex size-8 items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50">
                                                    <Trash2 className="size-4" />
                                                </button>
                                            }
                                        >
                                            <FormGrid cols={3}>
                                                <Input label="Qualification" placeholder="e.g. B.Sc Visual Communication" {...register(`education.${i}.qualification`)} error={errors.education?.[i]?.qualification?.message} />
                                                <Input label="Institution" placeholder="College / university" {...register(`education.${i}.institution`)} error={errors.education?.[i]?.institution?.message} />
                                                <Input label="Field of study" {...register(`education.${i}.field`)} error={errors.education?.[i]?.field?.message} />
                                                <Input label="Year of passing" inputMode="numeric" maxLength={4} {...register(`education.${i}.year`)} error={errors.education?.[i]?.year?.message} />
                                                <Input label="Grade / percentage" {...register(`education.${i}.grade`)} error={errors.education?.[i]?.grade?.message} />
                                            </FormGrid>
                                        </Panel>
                                    ))}
                                    <Button variant="secondary" icon={<Plus className="size-4" />} onClick={() => education.append(EMPTY_EDUCATION)}>
                                        Add another
                                    </Button>
                                </>
                            ))}

                        {step === 3 &&
                            (experience.fields.length === 0 ? (
                                <EmptyBlock icon={<Briefcase className="size-6" />} title="No experience added" hint="Add previous studios or companies, starting with the most recent. Leave empty for freshers." onAdd={() => experience.append(EMPTY_EXPERIENCE)} addLabel="Add experience" />
                            ) : (
                                <>
                                    {experience.fields.map((f, i) => (
                                        <Panel
                                            key={f.id}
                                            icon={<Briefcase className="size-4 text-orange-500" />}
                                            title={`Experience ${i + 1}`}
                                            action={
                                                <button type="button" onClick={() => experience.remove(i)} aria-label={`Remove experience ${i + 1}`} className="inline-flex size-8 items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50">
                                                    <Trash2 className="size-4" />
                                                </button>
                                            }
                                        >
                                            <FormGrid cols={3}>
                                                <Input label="Company / studio" {...register(`experience.${i}.company`)} error={errors.experience?.[i]?.company?.message} />
                                                <Input label="Role" placeholder="e.g. Candid photographer" {...register(`experience.${i}.role`)} error={errors.experience?.[i]?.role?.message} />
                                                <div className="grid grid-cols-2 gap-3">
                                                    <Input label="From" type="month" {...register(`experience.${i}.from`)} />
                                                    <Input label="To" type="month" disabled={current?.[i]?.current} {...register(`experience.${i}.to`)} error={errors.experience?.[i]?.to?.message} />
                                                </div>
                                                <Textarea label="What they did" rows={3} wrapperClassName="sm:col-span-2" {...register(`experience.${i}.description`)} error={errors.experience?.[i]?.description?.message} />
                                                <div className="flex items-end pb-2">
                                                    <Checkbox label="Currently working here" {...register(`experience.${i}.current`)} />
                                                </div>
                                            </FormGrid>
                                        </Panel>
                                    ))}
                                    <Button variant="secondary" icon={<Plus className="size-4" />} onClick={() => experience.append(EMPTY_EXPERIENCE)}>
                                        Add another
                                    </Button>
                                </>
                            ))}

                        {step === 4 && (
                            <Panel icon={<KeyRound className="size-4 text-sky-500" />} title={isNew ? 'Create password' : 'Change password'}>
                                <FormGrid>
                                    <Input label={isNew ? 'Password' : 'New password'} type="password" autoComplete="new-password" required={isNew} {...register('password')} error={errors.password?.message} hint={isNew ? 'At least 8 characters with a letter and a number.' : 'Leave blank to keep the current password. Setting one signs them out.'} />
                                    <Input label="Confirm password" type="password" autoComplete="new-password" required={isNew} {...register('confirmPassword')} error={errors.confirmPassword?.message} hint="Type the same password again." />
                                </FormGrid>
                            </Panel>
                        )}

                        {step === 5 && (
                            <>
                                <Panel icon={<UserRound className="size-4 text-violet-500" />} title="Role">
                                    <Field label="Role" required error={errors.roles?.message}>
                                        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                                            {STAFF_ROLE_CODES.filter((r) => r !== 'SUPER_ADMIN' && r !== 'STUDIO_OWNER').map((r) => (
                                                <label key={r} className={clsx('flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition-colors', roles.includes(r) ? 'border-accent-400 bg-accent-50 font-semibold text-accent-900' : 'border-stone-200 hover:bg-stone-50')}>
                                                    <input type="radio" className="size-4 accent-[#c9a24b]" checked={roles.includes(r)} onChange={() => selectRole(r)} disabled={self} />
                                                    {ROLE_LABELS[r]}
                                                </label>
                                            ))}
                                        </div>
                                    </Field>
                                </Panel>
                                <Panel icon={<ShieldCheck className="size-4 text-emerald-500" />} title="Access">
                                    <FormGrid cols={3}>
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
                                        {roles.includes('PHOTOGRAPHER') && <Input label="Camera gear" {...register('cameraGear')} error={errors.cameraGear?.message} placeholder="e.g. Sony A7 IV, 24-70mm" />}
                                        {roles.includes('EDITOR_DESIGNER') && <Input label="Software" {...register('software')} error={errors.software?.message} placeholder="e.g. Lightroom, Photoshop" />}
                                        {(roles.includes('PHOTOGRAPHER') || roles.includes('EDITOR_DESIGNER')) && <Input label="Specialties" {...register('specialties')} error={errors.specialties?.message} />}
                                    </FormGrid>
                                </Panel>
                            </>
                        )}

                        {step === 6 && <DocumentsSection userId={typeof id === 'number' ? id : null} pending={pending} onPending={setPending} />}
                    </div>
                </form>
            )}
            {dialog}
        </Drawer>
    );
}

function DocumentsSection({ userId, pending, onPending }: { userId: number | null; pending: PendingDoc[]; onPending: (p: PendingDoc[]) => void }) {
    const toast = useToast();
    const invalidate = useInvalidate();
    const { ask, dialog } = useConfirm();
    const [docType, setDocType] = useState(DOC_TYPES[0].value);
    const docs = useQuery({ queryKey: ['users', 'documents', userId], queryFn: () => api.get<StaffDocument[]>(`/api/users/${userId}/documents`), enabled: userId !== null });
    const upload = useMutation({
        mutationFn: (file: File) => uploadDocument(userId!, docType, file),
        onSuccess: (r) => (toast.success(r.message), invalidate(['users', 'documents'])),
        onError: (e) => toast.error(e),
    });
    const remove = useMutation({
        mutationFn: (docId: number) => api.send('DELETE', `/api/users/${userId}/documents/${docId}`),
        onSuccess: (r) => (toast.success(r.message), invalidate(['users', 'documents'])),
        onError: (e) => toast.error(e),
    });

    const pick = (files: FileList | null) => {
        const accepted: File[] = [];
        for (const f of files ?? []) {
            if (!DOC_ACCEPT.test(f.name)) toast.error(`${f.name} is not a PDF, JPG, PNG or WebP file.`);
            else if (f.size > MAX_DOC_BYTES) toast.error(`${f.name} is larger than 10 MB.`);
            else accepted.push(f);
        }
        if (userId === null) onPending([...pending, ...accepted.map((file) => ({ key: `${file.name}-${file.size}-${Math.random()}`, docType, file }))]);
        else accepted.forEach((f) => upload.mutate(f));
    };

    const rows = userId === null ? pending.map((p) => ({ key: p.key, type: p.docType, name: p.file.name, size: p.file.size, isImage: p.file.type.startsWith('image/'), url: null as string | null, date: null as string | null, onRemove: () => onPending(pending.filter((x) => x.key !== p.key)) })) : (docs.data ?? []).map((d) => ({ key: String(d.id), type: d.doc_type, name: d.file_name, size: d.size_bytes, isImage: d.mime_type.startsWith('image/'), url: d.url, date: d.created_at, onRemove: async () => (await ask({ title: 'Remove this document?', message: `${d.file_name} will be deleted permanently.`, confirmLabel: 'Remove' })) && remove.mutate(d.id) }));
    const uploadedTypes = new Set(rows.map((r) => r.type));

    return (
        <>
            <Panel icon={<Upload className="size-4 text-accent-600" />} title="Upload documents">
                <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
                    <div className="space-y-3">
                        <Select label="Document type" value={docType} onChange={(e) => setDocType(e.target.value)} options={DOC_TYPES} />
                        <div className="flex flex-wrap gap-1.5">
                            {DOC_TYPES.filter((d) => d.value !== 'OTHER').map((d) => (
                                <span key={d.value} className={clsx('inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold', uploadedTypes.has(d.value) ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-500')}>
                                    {uploadedTypes.has(d.value) && <Check className="size-3" />}
                                    {d.label}
                                </span>
                            ))}
                        </div>
                    </div>
                    <label
                        className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-accent-300 bg-accent-50/40 px-4 py-8 text-center transition-colors hover:bg-accent-50"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                            e.preventDefault();
                            pick(e.dataTransfer.files);
                        }}
                    >
                        <span className="flex size-12 items-center justify-center rounded-full bg-ink-900 text-accent-400">
                            <FolderUp className="size-5" />
                        </span>
                        <span className="text-sm font-semibold text-stone-900">{upload.isPending ? 'Uploading…' : `Click or drop files for: ${docLabel(docType)}`}</span>
                        <span className="text-xs text-stone-500">PDF, JPG, PNG or WebP, up to 10 MB each</span>
                        <input
                            type="file"
                            multiple
                            accept=".pdf,.jpg,.jpeg,.png,.webp"
                            className="sr-only"
                            onChange={(e) => {
                                pick(e.target.files);
                                e.target.value = '';
                            }}
                        />
                    </label>
                </div>
                {userId === null && <p className="mt-3 text-xs text-stone-500">Files are uploaded when you create the staff member.</p>}
            </Panel>

            <Panel icon={<FileText className="size-4 text-sky-500" />} title={`Documents (${rows.length})`}>
                {docs.isLoading ? (
                    <p className="py-6 text-center text-sm text-stone-500">Loading…</p>
                ) : rows.length === 0 ? (
                    <p className="py-6 text-center text-sm text-stone-500">No documents yet.</p>
                ) : (
                    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {rows.map((r) => (
                            <li key={r.key} className="flex items-center gap-3 rounded-xl border border-stone-200 p-3">
                                <span className={clsx('flex size-10 shrink-0 items-center justify-center rounded-lg', r.isImage ? 'bg-violet-50 text-violet-600' : 'bg-rose-50 text-rose-600')}>{r.isImage ? <ImageIcon className="size-5" /> : <FileText className="size-5" />}</span>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold text-stone-900">{r.name}</p>
                                    <p className="truncate text-xs text-stone-500">
                                        {docLabel(r.type)} · {formatSize(r.size)}
                                        {r.date ? ` · ${new Date(r.date).toLocaleDateString()}` : ' · Not uploaded yet'}
                                    </p>
                                </div>
                                {r.url && (
                                    <a href={r.url} target="_blank" rel="noreferrer" aria-label={`View ${r.name}`} className="inline-flex size-8 items-center justify-center rounded-lg text-stone-600 hover:bg-stone-100">
                                        <Eye className="size-4" />
                                    </a>
                                )}
                                <button type="button" onClick={r.onRemove} aria-label={`Remove ${r.name}`} className="inline-flex size-8 items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50">
                                    <Trash2 className="size-4" />
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </Panel>
            {dialog}
        </>
    );
}
