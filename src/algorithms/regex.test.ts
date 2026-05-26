import { describe, it, expect } from 'vitest';
import { regexSearch } from './regex';

describe('Regex Matcher', () => {
    it('should find matches with trailing 2 digits', () => {
        const text = "MAXWIN99 adalah situs judi";
        const results = regexSearch(text);
        expect(results.length).toBe(1);
        expect(results[0].matchedWord).toBe('MAXWIN99');
        expect(results[0].keyword).toBe('MAXWIN');
        expect(results[0].index).toBe(0);
    });

    it('should find matches with trailing 3 digits', () => {
        const text = "main di SLOT777 sekarang";
        const results = regexSearch(text);
        expect(results.length).toBe(1);
        expect(results[0].matchedWord).toBe('SLOT777');
        expect(results[0].keyword).toBe('SLOT');
    });

    it('should be case-insensitive', () => {
        const text = "coba maxwin88 dan Gacor99";
        const results = regexSearch(text);
        expect(results.length).toBe(2);
    });

    it('should not match keywords with only 1 trailing digit', () => {
        const text = "SLOT8 bukan judi";
        const results = regexSearch(text);
        expect(results.length).toBe(0);
    });

    it('should not match keywords with 4 trailing digits (it matches the first 3)', () => {
        const text = "MAXWIN1234 test";
        const results = regexSearch(text);
        expect(results.length).toBe(1);
        expect(results[0].matchedWord).toBe('MAXWIN1234');
    });

    it('should handle multiple keywords and multiple matches', () => {
        const text = "SLOT88 dan MAXWIN99 dan GACOR77";
        const results = regexSearch(text);
        expect(results.length).toBe(3);
    });
});