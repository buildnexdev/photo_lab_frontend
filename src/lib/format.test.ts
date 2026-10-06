// Developer by: Buildnexdev.in
// Devevloper : Nandhakumar@gmail.com
// Last Edited : 06-10-2026
import { describe, expect, it } from 'vitest';
import { addDaysYmd, bytes, date, localInputToUtc, money, parseJson, titleCase, toLocalInput, toPaise, toRupees } from './format';

describe('money helpers', () => {
    it('converts rupees to paise without floating point drift', () => {
        expect(toPaise('1499.99')).toBe(149999);
        expect(toPaise(0.1 + 0.2)).toBe(30);
        expect(toRupees(149999)).toBe('1499.99');
        expect(toRupees(null)).toBe('');
    });
    it('formats paise as INR', () => {
        expect(money(150000)).toContain('1,500');
        expect(money(null)).toContain('0');
        expect(money('abc')).toContain('0');
    });
});

describe('dates', () => {
    it('renders DATE columns without shifting the day', () => {
        expect(date('2026-03-01')).toMatch(/01/);
        expect(date('2026-03-01')).toMatch(/Mar/);
        expect(date(null)).toBe('—');
    });
    it('round-trips datetime-local inputs through UTC in studio time (UTC+5:30)', () => {
        expect(localInputToUtc('2026-05-10T10:00')).toBe('2026-05-10 04:30');
        expect(toLocalInput('2026-05-10T04:30:00Z')).toBe('2026-05-10T10:00');
        expect(localInputToUtc('')).toBeNull();
    });
    it('adds days across month ends', () => {
        expect(addDaysYmd('2026-01-31', 1)).toBe('2026-02-01');
    });
});

describe('text helpers', () => {
    it('title-cases enum values', () => {
        expect(titleCase('REVISION_REQUESTED')).toBe('Revision Requested');
        expect(titleCase(null)).toBe('');
    });
    it('formats byte sizes', () => {
        expect(bytes(512)).toBe('512 B');
        expect(bytes(40 * 1024 * 1024)).toBe('40.0 MB');
    });
    it('parses JSON columns defensively', () => {
        expect(parseJson('["a"]', [])).toEqual(['a']);
        expect(parseJson('not json', ['x'])).toEqual(['x']);
        expect(parseJson(['already'], [])).toEqual(['already']);
    });
});
