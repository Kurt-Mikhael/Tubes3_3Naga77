import { describe, it, expect } from 'vitest';
import { kmpSearch } from './kmp';

describe('Algoritma Knuth-Morris-Pratt (KMP)', () => {

    it('menemukan satu kecocokan kata dengan benar', () => {
        const text = "Awas ada situs maxwin88 di sini";
        const keywords = ["maxwin88"];
        const result = kmpSearch(keywords, text);

        expect(result.length).toBe(1);
        expect(result[0].keyword).toBe("maxwin88");
        expect(result[0].index).toBe(15);
        expect(result[0].count).toBe(1);
        expect(result[0].comparisons).toBeGreaterThan(0);
    });

    it('menemukan beberapa kecocokan (termasuk yang overlapping)', () => {
        const text = "GACORGACOR";
        const keywords = ["GACOR"];
        const result = kmpSearch(keywords, text);

        expect(result.length).toBe(2);
        expect(result[0].index).toBe(0);
        expect(result[1].index).toBe(5);
        expect(result[0].count).toBe(2);
    });

    it('case-insensitive', () => {
        const text = "Website SLoT PaSti JaCkPoT";
        const keywords = ["slot"];
        const result = kmpSearch(keywords, text);

        expect(result.length).toBe(1);
        expect(result[0].index).toBe(8);
    });

    it('mengembalikan array kosong jika keyword tidak ditemukan', () => {
        const text = "Artikel ini berisi tentang teknik informatika ITB";
        const keywords = ["judol", "gacor"];
        const result = kmpSearch(keywords, text);

        expect(result).toEqual([]);
    });

    it('menangani array keywords yang berisi beberapa kata sekaligus', () => {
        const text = "Hari ini main slot pasti maxwin";
        const keywords = ["slot", "maxwin", "poker"];
        const result = kmpSearch(keywords, text);

        expect(result.length).toBe(2);
        const foundKeywords = result.map(r => r.keyword);
        expect(foundKeywords).toContain("slot");
        expect(foundKeywords).toContain("maxwin");
        expect(foundKeywords).not.toContain("poker");
    });

    it('harus menangani string kosong dan array keyword kosong dengan aman', () => {
        expect(kmpSearch([], "Beberapa teks")).toEqual([]);
        expect(kmpSearch(["slot"], "")).toEqual([]);
        expect(kmpSearch([], "")).toEqual([]);
    });
});