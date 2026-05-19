import { describe, it, expect } from 'vitest';
import { regexSearch } from './regex';

describe('Regex Matcher', () => {
    it('should find matches with trailing 2 digits', () => {
        const text = "Coba cek situs judi88";
        const keywords = ["judi"];
        const results = regexSearch(keywords, text);

        expect(results.length).toBe(1);
        expect(results[0].matchedWord).toBe("judi88");
        expect(results[0].keyword).toBe("judi");
        expect(results[0].index).toBe(15);
    });

    it('should find matches with trailing 3 digits', () => {
        const text = "Situs slot999 gacor parah";
        const keywords = ["slot"];
        const results = regexSearch(keywords, text);

        expect(results.length).toBe(1);
        expect(results[0].matchedWord).toBe("slot999");
        expect(results[0].keyword).toBe("slot");
    });

    it('should be case-insensitive', () => {
        const text = "JUDI123";
        const keywords = ["judi"];
        const results = regexSearch(keywords, text);

        expect(results.length).toBe(1);
        expect(results[0].matchedWord).toBe("JUDI123");
    });

    it('should not match keywords with only 1 trailing digit', () => {
        const text = "judi1";
        const keywords = ["judi"];
        const results = regexSearch(keywords, text);

        expect(results.length).toBe(0);
    });

    it('should not match keywords with 4 trailing digits (it matches the first 3)', () => {
        const text = "judi1234";
        const keywords = ["judi"];
        const results = regexSearch(keywords, text);

        expect(results.length).toBe(1);
        expect(results[0].matchedWord).toBe("judi123");
    });

    it('should handle multiple keywords and multiple matches', () => {
        const text = "judi88 slot99 judi123";
        const keywords = ["judi", "slot"];
        const results = regexSearch(keywords, text);

        expect(results.length).toBe(3);
        const matchedWords = results.map(r => r.matchedWord);
        expect(matchedWords).toContain("judi88");
        expect(matchedWords).toContain("slot99");
        expect(matchedWords).toContain("judi123");
    });
});
