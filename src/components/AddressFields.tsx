// Developer by: Buildnexdev.in
// Devevloper : Nandhakumar@gmail.com
// Last Edited : 06-10-2026
import type { ChangeEvent } from 'react';
import { FormGrid, Input } from './form';

export interface AddressValue {
    name: string;
    phone: string;
    line1: string;
    line2: string;
    city: string;
    state: string;
    pincode: string;
}

export const emptyAddress: AddressValue = { name: '', phone: '', line1: '', line2: '', city: '', state: '', pincode: '' };

/** Mirrors the server's shipping address rules. */
export function validateAddress(a: AddressValue): Record<string, string> {
    const e: Record<string, string> = {};
    if (a.name.trim().length < 2) e.name = 'Enter the recipient name';
    if (!/^[0-9+\-\s]{8,20}$/.test(a.phone.trim())) e.phone = 'Enter a valid phone number';
    if (a.line1.trim().length < 3) e.line1 = 'Enter the address';
    if (a.city.trim().length < 2) e.city = 'Enter the city';
    if (a.state.trim().length < 2) e.state = 'Enter the state';
    if (!/^\d{6}$/.test(a.pincode.trim())) e.pincode = 'Enter a 6-digit PIN code';
    return e;
}

export const addressPayload = (a: AddressValue) => ({ ...a, line2: a.line2.trim() || null });

export function AddressFields({ value, onChange, errors }: { value: AddressValue; onChange: (v: AddressValue) => void; errors: Record<string, string> }) {
    const bind = (k: keyof AddressValue) => ({
        value: value[k],
        onChange: (e: ChangeEvent<HTMLInputElement>) => onChange({ ...value, [k]: e.target.value }),
        error: errors[k],
    });
    return (
        <FormGrid>
            <Input label="Recipient name" required autoComplete="name" {...bind('name')} />
            <Input label="Phone" required type="tel" autoComplete="tel" {...bind('phone')} />
            <Input label="Address line 1" required autoComplete="address-line1" wrapperClassName="sm:col-span-2" {...bind('line1')} />
            <Input label="Address line 2" autoComplete="address-line2" wrapperClassName="sm:col-span-2" {...bind('line2')} />
            <Input label="City" required autoComplete="address-level2" {...bind('city')} />
            <Input label="State" required autoComplete="address-level1" {...bind('state')} />
            <Input label="PIN code" required inputMode="numeric" maxLength={6} autoComplete="postal-code" {...bind('pincode')} />
        </FormGrid>
    );
}
