// Developer by: Buildnexdev.in
// Devevloper : Nandhakumar@gmail.com
// Last Edited : 06-10-2026
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import {
    Briefcase,
    Building2,
    Camera,
    Check,
    ChevronLeft,
    ClipboardList,
    FileUp,
    GraduationCap,
    HeartPulse,
    Home,
    IdCard,
    KeyRound,
    MapPin,
    Pencil,
    Plus,
    ShieldCheck,
    Trash2,
    UserCircle2,
    UserRound,
} from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useFieldArray, useForm, type FieldErrors } from 'react-hook-form';
import { z } from 'zod';
import { api, applyFieldErrors, errorMessage } from '../../services/api';
import { ROLE_LABELS, useAuth, type Role } from '../../hooks/useAuth';
import { useInvalidate } from '../../hooks';
import { digitsOnly10, emailRule, passwordRule, phoneRule } from '../../helpers/validation';
import { Checkbox, Field, FormGrid, Input, PasswordInput, Select, Textarea } from '../ui/Form';
import { Drawer, useConfirm } from '../ui/Overlay';
import { useToast } from '../ui/Toast';
import { Button } from '../ui';
import { ASSIGNABLE_STAFF_ROLES, Avatar, STAFF_DOC_TYPES, type StaffDocument, type StaffProfile, type UserDetail } from './staffCommon';

const PHOTO_ACCEPT = /^image\/(jpeg|png|webp)$/i;
const DOC_ACCEPT = /^image\/(jpeg|png|webp)|application\/pdf$/i;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const MAX_DOC_BYTES = 10 * 1024 * 1024;

const uploadStaffPhoto = (userId: number, file: File) => {
    const form = new FormData();
    form.append('docType', 'PHOTO');
    form.append('file', file);
    return api.send<{ id: number; url: string }[]>('POST', `/api/users/${userId}/documents`, form);
};

const uploadStaffDocument = (userId: number, docType: string, file: File) => {
    const form = new FormData();
    form.append('docType', docType);
    form.append('file', file);
    return api.send<StaffDocument[]>('POST', `/api/users/${userId}/documents`, form);
};

const text = (max: number) => z.string().trim().max(max, `Use at most ${max} characters`);
const optionalPattern = (re: RegExp, message: string) => z.string().trim().refine((v) => !v || re.test(v), message);
const address = z.object({ line1: text(160), line2: text(160), city: text(80), state: text(80), pincode: optionalPattern(/^\d{6}$/, 'Enter a 6-digit PIN code'), country: text(60) });

const requiredText = (max: number, message = 'Required') => z.string().trim().min(1, message).max(max, `Use at most ${max} characters`);

const schema = (isNew: boolean) =>
    z
        .object({
            name: z.string().trim().min(2, 'Enter a name').max(120),
            email: emailRule,
            phone: phoneRule,
            password: isNew ? passwordRule : z.union([z.literal(''), passwordRule]),
            confirmPassword: z.string(),
            roles: z.array(z.string()).min(1, 'Choose at least one role'),
            status: z.enum(['ACTIVE', 'INACTIVE', 'LOCKED']),
            designation: text(80),
            department: text(80),
            cameraGear: text(255),
            specialties: text(255),
            software: text(255),
            personal: z.object({
                dob: z.string().min(1, 'Date of birth is required'),
                gender: z.string().min(1, 'Select gender'),
                bloodGroup: z.string().min(1, 'Select blood group'),
                joinedOn: z.string(),
                emergencyName: requiredText(120, 'Emergency contact name is required'),
                emergencyPhone: phoneRule,
                emergencyPhone2: phoneRule,
                photoUrl: z.string().optional(),
            }),
            address,
            permanentAddress: address.extend({ same: z.boolean() }),
            education: z.array(z.object({ qualification: text(120), institution: text(160), field: text(120), year: optionalPattern(/^(19|20)\d{2}$/, 'Enter a year like 2018'), grade: text(20) })),
            experience: z.array(z.object({ company: text(160), role: text(120), from: z.string(), to: z.string(), current: z.boolean(), description: text(1000) })),
            kyc: z.object({
                aadhaarNumber: optionalPattern(/^\d{12}$/, 'Enter a 12-digit Aadhaar number'),
                aadhaarName: text(120),
                panNumber: optionalPattern(/^[A-Z]{5}[0-9]{4}[A-Z]$/i, 'Enter a valid PAN (e.g. ABCDE1234F)'),
                panName: text(120),
                bankAccountName: text(120),
                bankAccountNumber: optionalPattern(/^\d{9,18}$/, 'Enter a valid account number'),
                bankIfsc: optionalPattern(/^[A-Z]{4}0[A-Z0-9]{6}$/i, 'Enter a valid IFSC'),
                bankName: text(120),
                bankBranch: text(120),
            }),
            office: z.object({
                phone: z.union([z.literal(''), phoneRule]),
                email: z.union([z.literal(''), emailRule]),
                loginUsername: text(120),
            }),
        })
        .superRefine((v, ctx) => {
            if (v.password && v.password !== v.confirmPassword) ctx.addIssue({ code: 'custom', path: ['confirmPassword'], message: 'Passwords do not match' });
            if (v.personal.emergencyPhone && v.personal.emergencyPhone2 && v.personal.emergencyPhone === v.personal.emergencyPhone2) {
                ctx.addIssue({ code: 'custom', path: ['personal', 'emergencyPhone2'], message: 'Use a different second number' });
            }
            v.experience.forEach((e, i) => {
                if (e.from && !e.current && e.to && e.to < e.from) ctx.addIssue({ code: 'custom', path: ['experience', i, 'to'], message: 'Ends before it starts' });
            });
        });
type Form = z.infer<ReturnType<typeof schema>>;

const EMPTY_ADDRESS = { line1: '', line2: '', city: '', state: '', pincode: '', country: 'India' };
const EMPTY_EDUCATION = { qualification: '', institution: '', field: '', year: '', grade: '' };
const EMPTY_EXPERIENCE = { company: '', role: '', from: '', to: '', current: false, description: '' };
const EMPTY_KYC = {
    aadhaarNumber: '',
    aadhaarName: '',
    panNumber: '',
    panName: '',
    bankAccountName: '',
    bankAccountNumber: '',
    bankIfsc: '',
    bankName: '',
    bankBranch: '',
};
const EMPTY_OFFICE = { phone: '', email: '', loginUsername: '' };

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
        personal: { dob: '', gender: '', bloodGroup: '', joinedOn: '', emergencyName: '', emergencyPhone: '', emergencyPhone2: '', photoUrl: '', ...p.personal },
        address: { ...EMPTY_ADDRESS, ...p.address },
        permanentAddress: { ...EMPTY_ADDRESS, same: true, ...p.permanentAddress },
        education: (p.education ?? []).map((e) => ({ ...EMPTY_EDUCATION, ...e })),
        experience: (p.experience ?? []).map((e) => ({ ...EMPTY_EXPERIENCE, ...e })),
        kyc: { ...EMPTY_KYC, ...p.kyc, panNumber: (p.kyc?.panNumber ?? '').toUpperCase(), bankIfsc: (p.kyc?.bankIfsc ?? '').toUpperCase() },
        office: { ...EMPTY_OFFICE, ...p.office },
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
        kyc: compact({
            ...v.kyc,
            panNumber: v.kyc.panNumber.toUpperCase(),
            bankIfsc: v.kyc.bankIfsc.toUpperCase(),
        }),
        office: compact(v.office),
    };
}

const SECTIONS = [
    { title: 'Account details', hint: 'Basic and personal details', icon: ClipboardList, fields: ['name', 'email', 'phone', 'designation', 'department', 'personal'] },
    { title: 'Address', hint: 'Current and permanent address', icon: MapPin, fields: ['address', 'permanentAddress'] },
    { title: 'KYC details', hint: 'Aadhaar, PAN and bank', icon: IdCard, fields: ['kyc'] },
    { title: 'Documents', hint: 'Upload ID and proofs', icon: FileUp, fields: [] },
    { title: 'Education', hint: 'Degrees and courses', icon: GraduationCap, fields: ['education'] },
    { title: 'Experience', hint: 'Previous jobs', icon: Briefcase, fields: ['experience'] },
    { title: 'Office details', hint: 'Office contact and login', icon: Building2, fields: ['office', 'password', 'confirmPassword'] },
    { title: 'Role & access', hint: 'Role and account status', icon: ShieldCheck, fields: ['roles', 'status', 'cameraGear', 'specialties', 'software'] },
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
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [docType, setDocType] = useState<string>('AADHAAR');
    const detail = useQuery({ queryKey: ['users', 'detail', id], queryFn: () => api.get<UserDetail>(`/api/users/${id}`), enabled: typeof id === 'number' });
    const docs = useQuery({
        queryKey: ['users', 'documents', id],
        queryFn: () => api.get<StaffDocument[]>(`/api/users/${id}/documents`),
        enabled: typeof id === 'number',
    });
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
        setPhotoFile(null);
        setDocType('AADHAAR');
    }, [id]);
    useEffect(() => {
        if (isNew) reset(toForm(null, defaultRole));
        else if (detail.data) reset(toForm(detail.data));
    }, [isNew, detail.data, defaultRole, reset]);

    const roles = watch('roles') ?? [];
    const name = watch('name') ?? '';
    const photoUrl = watch('personal.photoUrl') || '';
    const sameAddress = watch('permanentAddress.same');
    const current = watch('experience');
    const self = typeof id === 'number' && id === user?.id;
    const selectRole = (r: Role) => setValue('roles', [r], { shouldValidate: true });
    const photoPreview = useMemo(() => (photoFile ? URL.createObjectURL(photoFile) : photoUrl || null), [photoFile, photoUrl]);
    useEffect(() => () => {
        if (photoPreview && photoFile) URL.revokeObjectURL(photoPreview);
    }, [photoPreview, photoFile]);

    const pickPhoto = (file: File | undefined) => {
        if (!file) return;
        if (!PHOTO_ACCEPT.test(file.type) && !/\.(jpe?g|png|webp)$/i.test(file.name)) {
            toast.error('Use a JPG, PNG or WebP image.');
            return;
        }
        if (file.size > MAX_PHOTO_BYTES) {
            toast.error('Photo must be 5 MB or smaller.');
            return;
        }
        setPhotoFile(file);
    };

    const uploadDoc = useMutation({
        mutationFn: ({ file, type }: { file: File; type: string }) => uploadStaffDocument(id as number, type, file),
        onSuccess: (r) => {
            toast.success(r.message || 'Document uploaded');
            invalidate(['users', 'documents', id], ['users']);
            docs.refetch();
        },
        onError: (e) => toast.error(errorMessage(e)),
    });

    const removeDoc = useMutation({
        mutationFn: (docId: number) => api.send('DELETE', `/api/users/${id}/documents/${docId}`),
        onSuccess: (r) => {
            toast.success(r.message || 'Document removed');
            invalidate(['users', 'documents', id], ['users']);
            docs.refetch();
        },
        onError: (e) => toast.error(errorMessage(e)),
    });

    const pickDocument = (file: File | undefined) => {
        if (!file || typeof id !== 'number') return;
        if (!DOC_ACCEPT.test(file.type) && !/\.(jpe?g|png|webp|pdf)$/i.test(file.name)) {
            toast.error('Use a JPG, PNG, WebP or PDF file.');
            return;
        }
        if (file.size > MAX_DOC_BYTES) {
            toast.error('Document must be 10 MB or smaller.');
            return;
        }
        uploadDoc.mutate({ file, type: docType });
    };

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
        const { confirmPassword: _, personal: _1, address: _2, permanentAddress: _3, education: _4, experience: _5, kyc: _6, office: _7, ...core } = v;
        void _; void _1; void _2; void _3; void _4; void _5; void _6; void _7;
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
            const userId = r.data.id;
            if (photoFile) {
                try {
                    const docs = await uploadStaffPhoto(userId, photoFile);
                    const photo = Array.isArray(docs.data) ? docs.data.find((d) => d.url) : null;
                    if (photo?.url) {
                        await api.send('PUT', `/api/users/${userId}`, {
                            ...body,
                            profile: { ...toProfile(v), personal: { ...toProfile(v).personal, photoUrl: photo.url } },
                        });
                    }
                } catch {
                    toast.error('Staff saved, but the profile photo did not upload.');
                }
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
                                    <Avatar name={name || 'New staff'} src={photoPreview} className="size-20 rounded-full text-2xl" />
                                    <div className="min-w-0 flex-1">
                                        <p className="font-semibold text-stone-900">{name || 'New staff member'}</p>
                                        <p className="text-sm text-stone-500">Upload a profile photo, or initials are used until one is added.</p>
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50">
                                                <Camera className="size-3.5" />
                                                Upload photo
                                                <input
                                                    type="file"
                                                    accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                                                    className="sr-only"
                                                    onChange={(e) => {
                                                        pickPhoto(e.target.files?.[0]);
                                                        e.target.value = '';
                                                    }}
                                                />
                                            </label>
                                            {(photoFile || photoUrl) && (
                                                <button
                                                    type="button"
                                                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                                                    onClick={() => {
                                                        setPhotoFile(null);
                                                        setValue('personal.photoUrl', '');
                                                    }}
                                                >
                                                    <Trash2 className="size-3.5" /> Remove
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <Panel icon={<Pencil className="size-4 text-amber-500" />} title="Personal information">
                                    <FormGrid cols={3}>
                                        <Input label="Full name" required {...register('name')} error={errors.name?.message} />
                                        <Input label="Email" type="email" required autoComplete="off" {...register('email')} error={errors.email?.message} />
                                        <Input
                                            label="Phone number"
                                            type="tel"
                                            inputMode="numeric"
                                            maxLength={10}
                                            required
                                            {...register('phone', {
                                                onChange: (e) => setValue('phone', digitsOnly10(e.target.value), { shouldValidate: true }),
                                            })}
                                            error={errors.phone?.message}
                                            hint="Exactly 10 digits"
                                        />
                                        <Input label="Date of birth" type="date" required {...register('personal.dob')} error={errors.personal?.dob?.message} />
                                        <Select label="Gender" required placeholder="Select" {...register('personal.gender')} error={errors.personal?.gender?.message} options={['Male', 'Female', 'Other'].map((g) => ({ value: g, label: g }))} />
                                        <Select label="Blood group" required placeholder="Select" {...register('personal.bloodGroup')} error={errors.personal?.bloodGroup?.message} options={['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((g) => ({ value: g, label: g }))} />
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
                                    <FormGrid cols={3}>
                                        <Input label="Contact name" required {...register('personal.emergencyName')} error={errors.personal?.emergencyName?.message} />
                                        <Input
                                            label="Emergency phone 1"
                                            type="tel"
                                            inputMode="numeric"
                                            maxLength={10}
                                            required
                                            {...register('personal.emergencyPhone', {
                                                onChange: (e) => setValue('personal.emergencyPhone', digitsOnly10(e.target.value), { shouldValidate: true }),
                                            })}
                                            error={errors.personal?.emergencyPhone?.message}
                                            hint="10 digits"
                                        />
                                        <Input
                                            label="Emergency phone 2"
                                            type="tel"
                                            inputMode="numeric"
                                            maxLength={10}
                                            required
                                            {...register('personal.emergencyPhone2', {
                                                onChange: (e) => setValue('personal.emergencyPhone2', digitsOnly10(e.target.value), { shouldValidate: true }),
                                            })}
                                            error={errors.personal?.emergencyPhone2?.message}
                                            hint="10 digits · second number"
                                        />
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

                        {step === 2 && (
                            <>
                                <Panel icon={<IdCard className="size-4 text-amber-500" />} title="Aadhaar">
                                    <FormGrid cols={2}>
                                        <Input
                                            label="Aadhaar number"
                                            inputMode="numeric"
                                            maxLength={12}
                                            {...register('kyc.aadhaarNumber', {
                                                onChange: (e) => setValue('kyc.aadhaarNumber', String(e.target.value).replace(/\D/g, '').slice(0, 12), { shouldValidate: true }),
                                            })}
                                            error={errors.kyc?.aadhaarNumber?.message}
                                            hint="12 digits"
                                        />
                                        <Input label="Name as on Aadhaar" {...register('kyc.aadhaarName')} error={errors.kyc?.aadhaarName?.message} />
                                    </FormGrid>
                                </Panel>
                                <Panel icon={<IdCard className="size-4 text-sky-500" />} title="PAN">
                                    <FormGrid cols={2}>
                                        <Input
                                            label="PAN number"
                                            maxLength={10}
                                            {...register('kyc.panNumber', {
                                                onChange: (e) => setValue('kyc.panNumber', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10), { shouldValidate: true }),
                                            })}
                                            error={errors.kyc?.panNumber?.message}
                                            hint="e.g. ABCDE1234F"
                                        />
                                        <Input label="Name as on PAN" {...register('kyc.panName')} error={errors.kyc?.panName?.message} />
                                    </FormGrid>
                                </Panel>
                                <Panel icon={<Building2 className="size-4 text-emerald-500" />} title="Bank details">
                                    <FormGrid cols={3}>
                                        <Input label="Account holder name" {...register('kyc.bankAccountName')} error={errors.kyc?.bankAccountName?.message} />
                                        <Input label="Account number" inputMode="numeric" {...register('kyc.bankAccountNumber')} error={errors.kyc?.bankAccountNumber?.message} />
                                        <Input
                                            label="IFSC"
                                            maxLength={11}
                                            {...register('kyc.bankIfsc', {
                                                onChange: (e) => setValue('kyc.bankIfsc', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11), { shouldValidate: true }),
                                            })}
                                            error={errors.kyc?.bankIfsc?.message}
                                        />
                                        <Input label="Bank name" {...register('kyc.bankName')} error={errors.kyc?.bankName?.message} />
                                        <Input label="Branch" {...register('kyc.bankBranch')} error={errors.kyc?.bankBranch?.message} />
                                    </FormGrid>
                                </Panel>
                            </>
                        )}

                        {step === 3 && (
                            <>
                                {isNew ? (
                                    <EmptyBlock
                                        icon={<FileUp className="size-6" />}
                                        title="Save staff first"
                                        hint="Create the staff member, then reopen to upload Aadhaar, PAN, bank proof and other documents."
                                        onAdd={() => setStep(SECTIONS.length - 1)}
                                        addLabel="Continue to role"
                                    />
                                ) : (
                                    <>
                                        <Panel icon={<FileUp className="size-4 text-violet-500" />} title="Upload documents">
                                            <FormGrid cols={3}>
                                                <Select label="Document type" value={docType} onChange={(e) => setDocType(e.target.value)} options={STAFF_DOC_TYPES.map((d) => ({ value: d.value, label: d.label }))} />
                                                <div className="sm:col-span-2 flex items-end">
                                                    <label className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-stone-300 bg-stone-50 px-4 py-3 text-sm font-semibold text-stone-700 hover:bg-white">
                                                        <Plus className="size-4" />
                                                        {uploadDoc.isPending ? 'Uploading…' : 'Choose file (PDF / JPG / PNG)'}
                                                        <input
                                                            type="file"
                                                            accept="image/jpeg,image/png,image/webp,application/pdf,.jpg,.jpeg,.png,.webp,.pdf"
                                                            className="sr-only"
                                                            disabled={uploadDoc.isPending}
                                                            onChange={(e) => {
                                                                pickDocument(e.target.files?.[0]);
                                                                e.target.value = '';
                                                            }}
                                                        />
                                                    </label>
                                                </div>
                                            </FormGrid>
                                            <p className="mt-2 text-xs text-stone-500">Max 10 MB each. You can upload multiple documents of any type.</p>
                                        </Panel>
                                        <Panel icon={<ClipboardList className="size-4 text-stone-500" />} title={`Uploaded files (${docs.data?.length ?? 0})`}>
                                            {docs.isLoading ? (
                                                <p className="text-sm text-stone-500">Loading documents…</p>
                                            ) : (docs.data?.length ?? 0) === 0 ? (
                                                <p className="text-sm text-stone-500">No documents uploaded yet.</p>
                                            ) : (
                                                <ul className="divide-y divide-stone-100">
                                                    {(docs.data ?? []).map((d) => (
                                                        <li key={d.id} className="flex flex-wrap items-center gap-3 py-3">
                                                            <div className="min-w-0 flex-1">
                                                                <p className="truncate text-sm font-semibold text-stone-900">{d.file_name}</p>
                                                                <p className="text-xs text-stone-500">
                                                                    {STAFF_DOC_TYPES.find((t) => t.value === d.doc_type)?.label ?? d.doc_type}
                                                                    {' · '}
                                                                    {(d.size_bytes / 1024).toFixed(0)} KB
                                                                </p>
                                                            </div>
                                                            <a href={d.url} target="_blank" rel="noreferrer" className="rounded-lg px-3 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-50">
                                                                View
                                                            </a>
                                                            <button
                                                                type="button"
                                                                className="inline-flex size-8 items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50"
                                                                disabled={removeDoc.isPending}
                                                                onClick={async () => {
                                                                    if (await ask({ title: 'Remove document?', message: `${d.file_name} will be deleted.`, confirmLabel: 'Remove' })) {
                                                                        removeDoc.mutate(d.id);
                                                                    }
                                                                }}
                                                                aria-label={`Remove ${d.file_name}`}
                                                            >
                                                                <Trash2 className="size-4" />
                                                            </button>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </Panel>
                                    </>
                                )}
                            </>
                        )}

                        {step === 4 &&
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

                        {step === 5 &&
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

                        {step === 6 && (
                            <>
                                <Panel icon={<Building2 className="size-4 text-amber-500" />} title="Office contact">
                                    <FormGrid cols={3}>
                                        <Input
                                            label="Office phone number"
                                            type="tel"
                                            inputMode="numeric"
                                            maxLength={10}
                                            {...register('office.phone', {
                                                onChange: (e) => setValue('office.phone', digitsOnly10(e.target.value), { shouldValidate: true }),
                                            })}
                                            error={errors.office?.phone?.message}
                                            hint="10 digits"
                                        />
                                        <Input label="Office email" type="email" {...register('office.email')} error={errors.office?.email?.message} placeholder="name@studio.com" />
                                        <Input label="Login username" {...register('office.loginUsername')} error={errors.office?.loginUsername?.message} hint="Optional studio login ID" placeholder="e.g. photographer01" />
                                    </FormGrid>
                                </Panel>
                                <Panel icon={<KeyRound className="size-4 text-sky-500" />} title={isNew ? 'Login password' : 'Change login password'}>
                                    <FormGrid>
                                        <PasswordInput label={isNew ? 'Password' : 'New password'} autoComplete="new-password" required={isNew} {...register('password')} error={errors.password?.message} hint={isNew ? 'At least 8 characters with a letter and a number.' : 'Leave blank to keep the current password. Setting one signs them out.'} />
                                        <PasswordInput label="Confirm password" autoComplete="new-password" required={isNew} {...register('confirmPassword')} error={errors.confirmPassword?.message} hint="Type the same password again." />
                                    </FormGrid>
                                </Panel>
                            </>
                        )}

                        {step === 7 && (
                            <>
                                <Panel icon={<UserRound className="size-4 text-violet-500" />} title="Role">
                                    <Field label="Role" required error={errors.roles?.message}>
                                        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                                            {(roles.includes('COMPANY_ADMIN') ? (['COMPANY_ADMIN', ...ASSIGNABLE_STAFF_ROLES] as Role[]) : ASSIGNABLE_STAFF_ROLES).map((r) => (
                                                <label key={r} className={clsx('flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition-colors', roles.includes(r) ? 'border-accent-400 bg-accent-50 font-semibold text-accent-900' : 'border-stone-200 hover:bg-stone-50')}>
                                                    <input type="radio" className="size-4 accent-[#c9a24b]" checked={roles.includes(r)} onChange={() => selectRole(r)} disabled={self || r === 'COMPANY_ADMIN'} />
                                                    {ROLE_LABELS[r]}
                                                    {r === 'COMPANY_ADMIN' ? <span className="text-[10px] font-normal text-stone-500">(legacy)</span> : null}
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
                    </div>
                </form>
            )}
            {dialog}
        </Drawer>
    );
}
