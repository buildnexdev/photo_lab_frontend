import type { FieldErrors, UseFormRegister, UseFormWatch } from 'react-hook-form';
import { money, todayYmd } from '../lib/format';
import type { Package, Service } from '../lib/site';
import { EVENT_TYPES, type BookingDetailsForm } from '../lib/validation';
import { FormGrid, Input, Select, Textarea } from './form';

/** Event detail fields shared by the public booking page, the customer portal and the admin booking form. */
export function BookingFields<T extends BookingDetailsForm>({
    register,
    errors,
    watch,
    services,
    packages,
}: {
    register: UseFormRegister<T>;
    errors: FieldErrors<T>;
    watch: UseFormWatch<T>;
    services: Service[];
    packages: Package[];
}) {
    const reg = register as unknown as UseFormRegister<BookingDetailsForm>;
    const err = errors as FieldErrors<BookingDetailsForm>;
    const serviceId = (watch as unknown as UseFormWatch<BookingDetailsForm>)('serviceId');
    const pkgOptions = packages.filter((p) => !serviceId || !p.service_id || String(p.service_id) === serviceId);
    return (
        <FormGrid>
            <Select label="Service" {...reg('serviceId')} placeholder="Not sure yet" options={services.map((s) => ({ value: s.id, label: s.name }))} error={err.serviceId?.message} />
            <Select label="Package" {...reg('packageId')} placeholder="Custom / need a quotation" options={pkgOptions.map((p) => ({ value: p.id, label: `${p.name} · ${money(p.price, true)}` }))} error={err.packageId?.message} />
            <div>
                <Input label="Event type" required list="event-types" {...reg('eventType')} error={err.eventType?.message} placeholder="e.g. Wedding" />
                <datalist id="event-types">
                    {EVENT_TYPES.map((t) => (
                        <option key={t} value={t} />
                    ))}
                </datalist>
            </div>
            <Input label="Event date" type="date" required min={todayYmd()} {...reg('eventDate')} error={err.eventDate?.message} />
            <Input label="Start time" type="time" {...reg('startTime')} error={err.startTime?.message} />
            <Input label="End time" type="time" {...reg('endTime')} error={err.endTime?.message} />
            <Input label="Venue" {...reg('venue')} error={err.venue?.message} placeholder="Venue name and city" />
            <Input label="Expected guests" inputMode="numeric" {...reg('guests')} error={err.guests?.message} />
            <Textarea label="Anything else we should know?" wrapperClassName="sm:col-span-2" {...reg('message')} error={err.message?.message} placeholder="Schedule, rituals, must-have shots, special requests…" />
        </FormGrid>
    );
}
