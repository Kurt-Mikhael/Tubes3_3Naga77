import { describe, it, expect } from 'vitest';
import { bmSearch } from './boyer-moore';

describe('Algoritma Boyer-Moore (BM)', () => {

    it('menemukan satu kecocokan kata dengan benar', () => {
        const text = "Awas ada situs maxwin88 di sini";
        const keywords = ["maxwin88"];
        const result = bmSearch(keywords, text);

        expect(result.length).toBe(1);
        expect(result[0].keyword).toBe("maxwin88");
        expect(result[0].index).toBe(15);
        expect(result[0].count).toBe(1);
        expect(result[0].comparisons).toBeGreaterThan(0);
    });

    it('menemukan beberapa kecocokan (termasuk yang overlapping)', () => {
        const text = "GACORGACOR";
        const keywords = ["GACOR"];
        const result = bmSearch(keywords, text);

        expect(result.length).toBe(2);
        expect(result[0].index).toBe(0);
        expect(result[1].index).toBe(5);
        expect(result[0].count).toBe(2);
    });

    it('case-insensitive', () => {
        const text = "Website SLoT PaSti JaCkPoT";
        const keywords = ["slot"];
        const result = bmSearch(keywords, text);

        expect(result.length).toBe(1);
        expect(result[0].index).toBe(8);
    });

    it('mengembalikan array kosong jika keyword tidak ditemukan', () => {
        const text = "Artikel ini berisi tentang teknik informatika ITB";
        const keywords = ["judol", "gacor"];
        const result = bmSearch(keywords, text);

        expect(result).toEqual([]);
    });

    it('menangani array keywords yang berisi beberapa kata sekaligus', () => {
        const text = "Hari ini main slot pasti maxwin";
        const keywords = ["slot", "maxwin", "poker"];
        const result = bmSearch(keywords, text);

        expect(result.length).toBe(2);
        const foundKeywords = result.map(r => r.keyword);
        expect(foundKeywords).toContain("slot");
        expect(foundKeywords).toContain("maxwin");
        expect(foundKeywords).not.toContain("poker");
    });

    it('menangani string kosong dan array keyword kosong dengan aman', () => {
        expect(bmSearch([], "Beberapa teks")).toEqual([]);
        expect(bmSearch(["slot"], "")).toEqual([]);
        expect(bmSearch([], "")).toEqual([]);
    });

    it('mengembalikan array kosong jika keyword lebih panjang dari teks', () => {
        const text = "SLOT";
        const keywords = ["SLOTGACOR99"];
        const result = bmSearch(keywords, text);

        expect(result.length).toBe(0);
    });

    it('menangani teks dan pola dengan karakter berulang', () => {
        const text = "AAAAA";
        const keywords = ["AA"];
        const result = bmSearch(keywords, text);

        expect(result.length).toBe(4);
        expect(result.map(r => r.index)).toEqual([0, 1, 2, 3]);
    });

    it('aman dari partial match yang gagal di karakter terakhir', () => {
        const text = "MAXWIN MAXWIM MAXWIX";
        const keywords = ["MAXWIM"];
        const result = bmSearch(keywords, text);

        expect(result.length).toBe(1);
        expect(result[0].index).toBe(7);
    });

    it('dapat mencocokkan pola dengan karakter spesial dan angka', () => {
        const text = "Ayo main di situs sl0t_g4c0r!!! hari ini";
        const keywords = ["sl0t_g4c0r!!!"];
        const result = bmSearch(keywords, text);

        expect(result.length).toBe(1);
        expect(result[0].index).toBe(18);
    });
});