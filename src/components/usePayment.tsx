import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';
import { ApiError } from '../lib/api';
import { payNow, type PayTarget } from '../lib/payments';
import { Modal } from './overlay';
import { useToast } from './toast';
import { Alert, Button } from './ui';

type Outcome = 'success' | 'failure' | null;

/**
 * Runs the full checkout (server-priced order → gateway → server verification).
 * When the server has no Razorpay keys (development only) it uses the built-in test gateway,
 * and this hook asks which outcome to simulate.
 */
export function usePayment() {
    const toast = useToast();
    const qc = useQueryClient();
    const [busy, setBusy] = useState(false);
    const [asking, setAsking] = useState(false);
    const resolver = useRef<((v: Outcome) => void) | null>(null);

    const answer = (v: Outcome) => {
        resolver.current?.(v);
        resolver.current = null;
        setAsking(false);
    };

    const pay = useCallback(
        async (target: PayTarget): Promise<boolean> => {
            setBusy(true);
            try {
                const r = await payNow(target, () => {
                    setAsking(true);
                    return new Promise<Outcome>((resolve) => {
                        resolver.current = resolve;
                    });
                });
                toast.success(`Payment ${r.payment_no} successful. Thank you!`);
                await qc.invalidateQueries();
                return true;
            } catch (e) {
                if (e instanceof ApiError && e.code === 'CANCELLED') toast.info('Payment cancelled. You can try again any time.');
                else toast.error(e);
                await qc.invalidateQueries({ queryKey: ['payments'] });
                return false;
            } finally {
                setBusy(false);
            }
        },
        [qc, toast],
    );

    const dialog = (
        <Modal
            open={asking}
            onClose={() => answer(null)}
            title="Test payment gateway"
            size="sm"
            footer={
                <>
                    <Button variant="secondary" onClick={() => answer(null)}>
                        Cancel
                    </Button>
                    <Button variant="danger" onClick={() => answer('failure')}>
                        Simulate failure
                    </Button>
                    <Button variant="success" onClick={() => answer('success')}>
                        Simulate success
                    </Button>
                </>
            }
        >
            <Alert tone="warning">The studio server is running without Razorpay keys, so no real money is charged. The payment is still created, signed and verified by the server.</Alert>
        </Modal>
    );

    return { pay, busy, dialog };
}
