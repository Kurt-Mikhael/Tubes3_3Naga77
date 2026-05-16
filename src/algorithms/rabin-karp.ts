import { ExactRes } from '../types/type';

export function rabinKarpSearch(keywords: string[], text: string): ExactRes[] {
    const results: ExactRes[] = [];
    if (!text || keywords.length === 0) return results;

    const d = 256; // ASCII Count
    const q = 1000000007; // Prime number for hashing

    const lowerText = text.toLowerCase(); 
    const N = text.length;

    for (const keyword of keywords) {
        const M = keyword.length;
        if (M === 0 || M > N) continue;

        let comparisons = 0;
        const lowerKeyword = keyword.toLowerCase();
        const matchIndices: number[] = [];

        let p = 0; // keyword
        let t = 0; // text window
        let h = 1;

        for (let i = 0; i < M - 1; i++) {
            h = (h * d) % q;
        }

        // Calculate hash
        for (let i = 0; i < M; i++) {
            p = (d * p + lowerKeyword.charCodeAt(i)) % q;
            t = (d * t + lowerText.charCodeAt(i)) % q;
        }

        // Sliding Window
        for (let i = 0; i <= N - M; i++) {
            comparisons++;

            if (p === t) {
                // Now char per char
                let match = true;
                for (let j = 0; j < M; j++) {
                    comparisons++;
                    if (lowerText[i + j] !== lowerKeyword[j]) {
                        match = false;
                        break;
                    }
                }
                if (match) {
                    matchIndices.push(i);
                }
            }

            // Next Window Please
            if (i < N - M) {
                t = (d * (t - lowerText.charCodeAt(i) * h) + lowerText.charCodeAt(i + M)) % q;
                
                if (t < 0) {
                    t = t + q;
                }
            }
        }

        // Mapping to ExactRes
        for (const matchIndex of matchIndices) {
            results.push({
                keyword: keyword,
                index: matchIndex,
                count: matchIndices.length,
                comparisons: comparisons,
                algorithm: 'RK'
            });
        }
    }

    return results;
}