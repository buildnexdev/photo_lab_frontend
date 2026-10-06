// Developer by: Buildnexdev.in
// Devevloper : Nandhakumar@gmail.com
// Last Edited : 06-10-2026
import { useEffect, useState } from 'react';
import { api, applyFieldErrors, errorMessage } from '../lib/api';
import { money, toPaise, toRupees } from '../lib/format';
import { Input, Select } from './form';
import { Modal } from './overlay';
import { useToast } from './toast';
import { Alert, Button } from './ui';

const METHODS = [
    { value: 'cash', label: 'Cash' },
    { value: 'upi', label: 'UPI' },
    { value: 'bank_transfer', label: 'Bank transfer' },
    { value: 'card', label: 'Card (POS)' },
    { value: 'cheque', label: 'Cheque' },
];

/** Record a payment received outside the gateway. The server checks the amount against what is due. */
export function OfflinePaymentModal({ target, due, onClose, onSaved }: { target: { bookingId: number } | { orderId: number } | null; due: number; onClose: () => void; onSaved: () => void }) {
    const toast = useToast();
    const [amount, setAmount] = useState('');
    const [method, setMethod] = useState('cash');
    const [reference, setReference] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (target) {
            setAmount(toRupees(due));
            setMethod('cash');
            setReference('');
            setErrors({});
            setError('');
        }
    }, [target, due]);

    const submit = async () => {
        const e: Record<string, string> = {};
        if (!/^\d+(\.\d{1,2})?$/.test(amount) || Number(amount) <= 0) e.amount = 'Enter an amount greater than zero';
        else if (toPaise(amount) > due) e.amount = `Cannot exceed the amount due (${money(due)})`;
        if (method !== 'cash' && !reference.trim()) e.reference = 'Enter the transaction / cheque reference';
        setErrors(e);
        if (Object.keys(e).length) return;
        setSaving(true);
        setError('');
        try {
            const r = await api.send('POST', '/api/payments/offline', { ...target, amount: toPaise(amount), method, reference: reference.trim() || null });
            toast.success(r.message);
            onSaved();
        } catch (err) {
            if (!applyFieldErrors(err, ((f: string, v: { message: string }) => setErrors((x) => ({ ...x, [f]: v.message }))) as never)) setError(errorMessage(err));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            open={!!target}
            onClose={onClose}
            title="Record offline payment"
            size="sm"
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button loading={saving} onClick={submit}>
                        Record payment
                    </Button>
                </>
            }
        >
            <div className="space-y-4">
                {error && <Alert tone="error">{error}</Alert>}
                <p className="text-sm text-stone-600">Amount due: {money(due)}</p>
                <Input label="Amount received" required prefix="₹" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} error={errors.amount} />
                <Select label="Method" value={method} onChange={(e) => setMethod(e.target.value)} options={METHODS} />
                <Input label="Reference" value={reference} onChange={(e) => setReference(e.target.value)} maxLength={80} error={errors.reference} hint="UPI ref, cheque number or bank UTR." />
            </div>
        </Modal>
    );
}
