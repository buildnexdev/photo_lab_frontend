import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2 } from 'lucide-react';
import { useEffect } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';
import { api, applyFieldErrors } from '../lib/api';
import { addDaysYmd, money, toPaise, toRupees, todayYmd } from '../lib/format';
import type { Quotation } from '../lib/types';
import { rupees } from '../lib/validation';
import { TotalsRow } from './domain';
import { FormGrid, Input, Textarea } from './form';
import { Modal } from './overlay';
import { useToast } from './toast';
import { Button } from './ui';

const schema = z
    .object({
        items: z
            .array(
                z.object({
                    description: z.string().trim().min(2, 'Describe the item').max(255),
                    quantity: z.string().regex(/^\d+$/, 'Whole number').refine((v) => Number(v) >= 1 && Number(v) <= 1000, '1–1000'),
                    unitPrice: rupees({ min: 0 }),
                }),
            )
            .min(1, 'Add at least one line'),
        discount: rupees({ required: false }),
        taxPercent: z.string().refine((v) => /^\d+(\.\d{1,2})?$/.test(v) && Number(v) <= 40, '0–40'),
        advanceMode: z.enum(['percent', 'amount']),
        advancePercent: z.string(),
        advanceAmount: z.string(),
        validUntil: z.string().refine((v) => !v || v >= todayYmd(), 'Cannot be in the past'),
        notes: z.string().max(3000),
        terms: z.string().max(5000),
        couponCode: z.string().trim().max(40),
    })
    .superRefine((v, ctx) => {
        if (v.advanceMode === 'percent' && !(/^\d+(\.\d+)?$/.test(v.advancePercent) && Number(v.advancePercent) <= 100)) ctx.addIssue({ code: 'custom', path: ['advancePercent'], message: '0–100' });
        if (v.advanceMode === 'amount' && !/^\d+(\.\d{1,2})?$/.test(v.advanceAmount)) ctx.addIssue({ code: 'custom', path: ['advanceAmount'], message: 'Enter an amount' });
    });
type Form = z.infer<typeof schema>;

const DEFAULT_TERMS = 'Advance is non-refundable within 15 days of the event. Balance is payable on delivery. Travel and stay outside city limits are charged at actuals.';

/** Create or edit a draft quotation. Totals mirror the server's maths (tax added on top of the discounted subtotal). */
export function QuotationBuilder({ bookingId, quotation, defaults, open, onClose, onSaved }: { bookingId: number; quotation: Quotation | null; defaults?: { description: string; amount: number } | null; open: boolean; onClose: () => void; onSaved: () => void }) {
    const toast = useToast();
    const {
        register,
        control,
        handleSubmit,
        reset,
        watch,
        setError,
        formState: { errors, isSubmitting },
    } = useForm<Form>({ resolver: zodResolver(schema) });
    const { fields, append, remove } = useFieldArray({ control, name: 'items' });

    useEffect(() => {
        if (!open) return;
        if (quotation) {
            reset({
                items: quotation.items.map((i) => ({ description: i.description, quantity: String(i.quantity), unitPrice: toRupees(i.unit_price) })),
                discount: quotation.discount ? toRupees(quotation.discount) : '',
                taxPercent: String(Number(quotation.tax_percent)),
                advanceMode: 'amount',
                advancePercent: '30',
                advanceAmount: toRupees(quotation.advance_amount),
                validUntil: quotation.valid_until ?? '',
                notes: quotation.notes ?? '',
                terms: quotation.terms ?? '',
                couponCode: '',
            });
        } else {
            reset({
                items: [{ description: defaults?.description ?? '', quantity: '1', unitPrice: defaults ? toRupees(defaults.amount) : '' }],
                discount: '',
                taxPercent: '18',
                advanceMode: 'percent',
                advancePercent: '30',
                advanceAmount: '',
                validUntil: addDaysYmd(todayYmd(), 14),
                notes: '',
                terms: DEFAULT_TERMS,
                couponCode: '',
            });
        }
    }, [open, quotation, defaults, reset]);

    const v = watch();
    const subtotal = (v.items ?? []).reduce((s, i) => s + (Number(i.quantity) || 0) * toPaise(Number(i.unitPrice) || 0), 0);
    const discount = Math.min(toPaise(Number(v.discount) || 0), subtotal);
    const tax = Math.round(((subtotal - discount) * (Number(v.taxPercent) || 0)) / 100);
    const total = subtotal - discount + tax;
    const advance = v.advanceMode === 'amount' ? toPaise(Number(v.advanceAmount) || 0) : Math.round((total * (Number(v.advancePercent) || 0)) / 100);

    const submit = handleSubmit(async (f) => {
        const body = {
            items: f.items.map((i) => ({ description: i.description, quantity: Number(i.quantity), unitPrice: toPaise(i.unitPrice) })),
            discount: f.discount ? toPaise(f.discount) : 0,
            taxPercent: Number(f.taxPercent),
            advanceAmount: f.advanceMode === 'amount' ? toPaise(f.advanceAmount) : null,
            advancePercent: f.advanceMode === 'percent' ? Number(f.advancePercent) : null,
            validUntil: f.validUntil || null,
            notes: f.notes.trim() || null,
            terms: f.terms.trim() || null,
            couponCode: f.couponCode || null,
        };
        try {
            const r = quotation ? await api.send('PUT', `/api/bookings/quotations/${quotation.id}`, body) : await api.send('POST', `/api/bookings/${bookingId}/quotations`, body);
            toast.success(r.message);
            onSaved();
        } catch (e) {
            if (!applyFieldErrors(e, setError as never)) toast.error(e);
            else toast.error('Please fix the highlighted fields.');
        }
    });

    return (
        <Modal
            open={open}
            onClose={onClose}
            title={quotation ? `Edit quotation ${quotation.quotation_no}` : 'New quotation'}
            size="xl"
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button loading={isSubmitting} onClick={submit}>
                        Save draft
                    </Button>
                </>
            }
        >
            <form onSubmit={submit} noValidate className="space-y-5">
                <div className="space-y-2">
                    {fields.map((f, i) => (
                        <div key={f.id} className="grid grid-cols-12 items-start gap-2">
                            <Input wrapperClassName="col-span-12 sm:col-span-6" label={i === 0 ? 'Description' : undefined} aria-label="Description" {...register(`items.${i}.description`)} error={errors.items?.[i]?.description?.message} />
                            <Input wrapperClassName="col-span-3 sm:col-span-2" label={i === 0 ? 'Qty' : undefined} aria-label="Quantity" inputMode="numeric" {...register(`items.${i}.quantity`)} error={errors.items?.[i]?.quantity?.message} />
                            <Input wrapperClassName="col-span-7 sm:col-span-3" label={i === 0 ? 'Rate' : undefined} aria-label="Rate" prefix="₹" inputMode="decimal" {...register(`items.${i}.unitPrice`)} error={errors.items?.[i]?.unitPrice?.message} />
                            <div className={`col-span-2 flex sm:col-span-1 ${i === 0 ? 'pt-6' : ''}`}>
                                <button type="button" onClick={() => remove(i)} disabled={fields.length === 1} className="rounded-lg p-2.5 text-stone-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-30" aria-label="Remove line">
                                    <Trash2 className="size-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                    {errors.items?.message && <p className="text-xs text-red-600">{errors.items.message}</p>}
                    <Button size="sm" variant="ghost" icon={<Plus className="size-4" />} onClick={() => append({ description: '', quantity: '1', unitPrice: '' })}>
                        Add line
                    </Button>
                </div>
                <FormGrid cols={3}>
                    <Input label="Discount" prefix="₹" inputMode="decimal" {...register('discount')} error={errors.discount?.message} />
                    <Input label="GST %" inputMode="decimal" {...register('taxPercent')} error={errors.taxPercent?.message} />
                    <Input label="Coupon code" {...register('couponCode')} error={errors.couponCode?.message} hint="Applied by the server, added to the discount." />
                    <div>
                        <label className="mb-1 block text-sm font-medium text-stone-700">Advance</label>
                        <div className="flex gap-2">
                            <select {...register('advanceMode')} className="h-10 rounded-lg border border-stone-300 px-2 text-sm">
                                <option value="percent">% of total</option>
                                <option value="amount">Fixed ₹</option>
                            </select>
                            {v.advanceMode === 'amount' ? (
                                <Input wrapperClassName="flex-1" aria-label="Advance amount" inputMode="decimal" {...register('advanceAmount')} error={errors.advanceAmount?.message} />
                            ) : (
                                <Input wrapperClassName="flex-1" aria-label="Advance percent" inputMode="decimal" {...register('advancePercent')} error={errors.advancePercent?.message} />
                            )}
                        </div>
                    </div>
                    <Input label="Valid until" type="date" min={todayYmd()} {...register('validUntil')} error={errors.validUntil?.message} />
                </FormGrid>
                <FormGrid>
                    <Textarea label="Notes for the customer" rows={3} {...register('notes')} error={errors.notes?.message} />
                    <Textarea label="Terms" rows={3} {...register('terms')} error={errors.terms?.message} />
                </FormGrid>
                <div className="ml-auto max-w-xs space-y-1 rounded-lg bg-stone-50 p-3 text-sm">
                    <TotalsRow label="Subtotal" value={money(subtotal)} />
                    {discount > 0 && <TotalsRow label="Discount" value={`− ${money(discount)}`} />}
                    <TotalsRow label={`GST (${Number(v.taxPercent) || 0}%)`} value={money(tax)} />
                    <TotalsRow label="Total" value={money(total)} strong className="border-t border-stone-200 pt-1" />
                    <TotalsRow label="Advance" value={money(advance)} />
                    {advance > total && <p className="text-xs text-red-600">Advance cannot exceed the total.</p>}
                </div>
            </form>
        </Modal>
    );
}
