import { describe, it, expect } from 'vitest';
import { fuzzySearch } from './weighted-levenshtein';

describe('Weighted Levenshtein (Fuzzy Search)', () => {
    it('should find exact matches (cost 0)', () => {
        const text = "Jangan main slot";
        const keywords = ["slot"];
        const results = fuzzySearch(keywords, text);

        expect(results.length).toBe(1);
        expect(results[0].keyword).toBe("slot");
        expect(results[0].difDis).toBe(0);
    });

    it('should find similar characters with lower cost (e.g., A and 4)', () => {
        const text = "sl0t g4cor";
        const keywords = ["gacor"];
        const results = fuzzySearch(keywords, text);

        expect(results.length).toBe(1);
        expect(results[0].matchedWord).toBe("g4cor");
        expect(results[0].difDis).toBeCloseTo(0.04);
    });

    it('should find similar characters with lower cost (e.g., O and 0)', () => {
        const text = "m4xw1n l0g1n";
        const keywords = ["login"];
        const results = fuzzySearch(keywords, text);

        expect(results.length).toBe(1);
        expect(results[0].matchedWord).toBe("l0g1n");
        expect(results[0].difDis).toBeCloseTo(0.08);
    });

    it('should handle different scripts (e.g., Cyrillic A)', () => {
        const text = "mаxwin"; // Cyrillic 'а'
        const keywords = ["maxwin"];
        const results = fuzzySearch(keywords, text);

        expect(results.length).toBe(1);
        expect(results[0].difDis).toBeCloseTo(0.0166, 3);
    });

    it('should reject if distance is too high (> 0.3)', () => {
        const text = "abcde";
        const keywords = ["xyz"];
        const results = fuzzySearch(keywords, text);

        expect(results.length).toBe(0);
    });

    it('should find matches with one character difference (standard Levenshtein behavior)', () => {
        const text = "situs jud1 online";
        const keywords = ["judi"];
        const results = fuzzySearch(keywords, text);

        expect(results.length).toBe(1);
        expect(results[0].matchedWord).toBe("jud1");
        expect(results[0].difDis).toBeCloseTo(0.2 / 4);
    });

    it('should handle multiple tokens and multiple keywords', () => {
        const text = "m4xwin g4cor sl0t";
        const keywords = ["maxwin", "gacor"];
        const results = fuzzySearch(keywords, text);

        expect(results.length).toBe(2);
    });
});
