import { describe, expect, it } from 'vitest';
import { EVENT_ACTIONS, UPLOADABLE } from './events';

const allowed = (action: string) => EVENT_ACTIONS.find((a) => a.action === action)?.from;

describe('event state machine (mirrors the server)', () => {
    it('offers the same transitions as the API', () => {
        expect(allowed('start')).toEqual(['UPCOMING', 'UPLOADING']);
        expect(allowed('stop')).toEqual(['LIVE']);
        expect(allowed('process')).toEqual(['LIVE', 'UPLOADING']);
        expect(allowed('complete')).toEqual(['LIVE', 'UPLOADING', 'PROCESSING']);
        expect(allowed('cancel')).toEqual(['UPCOMING', 'LIVE', 'UPLOADING', 'PROCESSING']);
        expect(allowed('reopen')).toEqual(['COMPLETED']);
    });
    it('only allows photographer uploads while the event is running', () => {
        expect(UPLOADABLE).toEqual(['LIVE', 'UPLOADING', 'PROCESSING']);
    });
});
