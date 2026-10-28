// Developer by: Buildnexdev.in
// Devevloper : Nandhakumar@gmail.com
// Last Edited : 06-10-2026
import clsx from 'clsx';
import type { Role } from '../../hooks/useAuth';

export interface UserRow {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    status: 'ACTIVE' | 'INACTIVE' | 'LOCKED';
    last_login_at: string | null;
    roles: Role[];
    designation: string | null;
    department: string | null;
    camera_gear: string | null;
    photographer_specialties: string | null;
    software: string | null;
    joined_on?: string | null;
    city?: string | null;
    documents?: number;
    custom_pages?: number;
}

export interface StaffAddress {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;
}

export interface StaffProfile {
    personal?: {
        dob?: string;
        gender?: string;
        bloodGroup?: string;
        joinedOn?: string;
        emergencyName?: string;
        emergencyPhone?: string;
        emergencyPhone2?: string;
        photoUrl?: string;
    };
    address?: StaffAddress;
    permanentAddress?: StaffAddress & { same?: boolean };
    education?: { qualification?: string; institution?: string; field?: string; year?: string; grade?: string }[];
    experience?: { company?: string; role?: string; from?: string; to?: string; current?: boolean; description?: string }[];
}

export interface UserDetail extends UserRow {
    editor_specialties: string | null;
    profile?: StaffProfile;
}

export const STAFF_ROLE_CODES: Role[] = ['SUPER_ADMIN', 'STUDIO_OWNER', 'COMPANY_ADMIN', 'MANAGER', 'PHOTOGRAPHER', 'EDITOR_DESIGNER', 'STAFF', 'PRINTER_DELIVERY_STAFF', 'REPORT_MANAGER', 'FINANCE'];
/** Roles shown when creating / editing staff (Company Admin removed). */
export const ASSIGNABLE_STAFF_ROLES: Role[] = ['MANAGER', 'PHOTOGRAPHER', 'EDITOR_DESIGNER', 'STAFF', 'PRINTER_DELIVERY_STAFF', 'REPORT_MANAGER', 'FINANCE'];

const AVATAR_TONES = ['bg-violet-100 text-violet-700', 'bg-amber-100 text-amber-700', 'bg-rose-100 text-rose-700', 'bg-sky-100 text-sky-700', 'bg-emerald-100 text-emerald-700', 'bg-orange-100 text-orange-700', 'bg-teal-100 text-teal-700', 'bg-fuchsia-100 text-fuchsia-700'];

const toneFor = (name: string) => AVATAR_TONES[[...name].reduce((s, c) => s + c.charCodeAt(0), 0) % AVATAR_TONES.length];
const initialsOf = (name: string) =>
    name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase())
        .join('') || '?';

export function Avatar({ name, className, dot, src }: { name: string; className?: string; dot?: boolean; src?: string | null }) {
    if (src) {
        return (
            <span className={clsx('relative inline-flex shrink-0 overflow-hidden bg-stone-100', className)}>
                <img src={src} alt="" className="size-full object-cover" />
                {dot !== undefined && <span className={clsx('absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full border-2 border-white', dot ? 'bg-emerald-500' : 'bg-stone-300')} />}
            </span>
        );
    }
    return (
        <span className={clsx('relative inline-flex shrink-0 items-center justify-center font-bold', toneFor(name), className)}>
            {initialsOf(name)}
            {dot !== undefined && <span className={clsx('absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full border-2 border-white', dot ? 'bg-emerald-500' : 'bg-stone-300')} />}
        </span>
    );
}
