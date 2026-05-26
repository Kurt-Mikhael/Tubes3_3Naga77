import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runPipeline, clearPipelineCache } from './pipeline';
import * as keywordLoader from '../utils/keyword-loader';

// Mock performance.now
if (typeof performance === 'undefined') {
    (globalThis as any).performance = { now: vi.fn(() => Date.now()) };
}

vi.mock('../utils/keyword-loader', () => ({
    loadKeywords: vi.fn()
}));

describe('Pipeline', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        clearPipelineCache();
    });

    it('should run all algorithms and return results', async () => {
        (keywordLoader.loadKeywords as any).mockResolvedValue(['slot gacor88', 'judionline']);
        
        const text = "Ayo main slot gacor88 di situs judionline";
        const result = await runPipeline(text);

        expect(result.exact.kmp.length).toBeGreaterThan(0);
        expect(result.exact.bm.length).toBeGreaterThan(0);
        expect(result.exact.ahoCorasick.length).toBeGreaterThan(0);
        expect(result.exact.rabinKarp.length).toBeGreaterThan(0);
        
        expect(result.regex.length).toBeGreaterThan(0);
        
        expect(result.executionTime).toBeDefined();
    });

    it('should find fuzzy matches for missed keywords', async () => {
        (keywordLoader.loadKeywords as any).mockResolvedValue(['maxwin']);
        
        const text = "Dapatkan m4xwin sekarang";
        const result = await runPipeline(text);

        expect(result.exact.kmp.length).toBe(0);
        expect(result.fuzzy.length).toBe(1);
        expect(result.fuzzy[0].matchedWord).toBe("m4xwin");
        expect(result.fuzzy[0].keyword).toBe("maxwin");
    });
    
    it('should handle empty text', async () => {
        (keywordLoader.loadKeywords as any).mockResolvedValue(['slot']);
        const result = await runPipeline("");
        expect(result.exact.kmp.length).toBe(0);
        expect(result.regex.length).toBe(0);
        expect(result.fuzzy.length).toBe(0);
    });
});
