import { ExactRes } from '../types/type';

// Helper untuk hitung array LPS -> Border Function
function computeBorderArray(pattern: string): { lps: number[], comparisons: number } {
    const m = pattern.length;
    const lps = new Array(m).fill(0);
    let len = 0;
    let i = 1;
    let comparisons = 0;

    while (i < m) {
        comparisons++;
        if (pattern[i].toLowerCase() === pattern[len].toLowerCase()) {
            len++;
            lps[i] = len;
            i++;
        } else {
            if (len !== 0) {
                len = lps[len - 1];
            } else {
                lps[i] = 0;
                i++;
            }
        }
    }
    return { lps, comparisons };
}

// Main Search Function
export function kmpSearch(keywords: string[], text: string): ExactRes[] {
    const results: ExactRes[] = [];
    
    if (!text || keywords.length === 0) return results;

    const n = text.length;

    for (const keyword of keywords) {
        const m = keyword.length;
        if (m === 0) continue;

        const { lps, comparisons: lpsComps } = computeBorderArray(keyword);
        
        let i = 0; // text
        let j = 0; // keyword
        let comparisons = lpsComps;
        const matchIndices: number[] = [];

        while (i < n) {
            comparisons++;
            if (keyword[j].toLowerCase() === text[i].toLowerCase()) {
                i++;
                j++;
                
                if (j === m) {
                    matchIndices.push(i - j);
                    j = lps[j - 1];
                }
            } else {
                if (j !== 0) {
                    j = lps[j - 1];
                } else {
                    i++;
                }
            }
        }

        // Mapping index to ExactRes
        for (const matchIndex of matchIndices) {
            results.push({
                keyword: keyword,
                index: matchIndex,
                count: matchIndices.length, 
                comparisons: comparisons,
                algorithm: 'KMP'
            });
        }
    }

    return results;
}