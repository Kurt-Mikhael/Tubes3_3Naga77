import { ExactRes } from '../types/type';

// Helper Last Occurence Table
function buildLastOccurrenceTable(pattern: string): Map<string, number> {
    const last = new Map<string, number>();
    const m = pattern.length;
    
    for (let i = 0; i < m; i++) {
        last.set(pattern[i].toLowerCase(), i);
    }
    
    return last;
}

// Main Search Function
export function bmSearch(keywords: string[], text: string): ExactRes[] {
    const results: ExactRes[] = [];
    
    if (!text || keywords.length === 0) return results;

    const n = text.length;

    for (const keyword of keywords) {
        const m = keyword.length;
        if (m === 0) continue;

        let comparisons = 0;
        const lastOccurTable = buildLastOccurrenceTable(keyword);
        const matchIndices: number[] = [];

        let i = 0;

        while (i <= n - m) {
            let j = m - 1;

            // Right to Left fyi btw
            while (j >= 0) {
                comparisons++;
                if (keyword[j].toLowerCase() !== text[i + j].toLowerCase()) {
                    break;
                }
                j--;
            }

            if (j < 0) { // if Match
                matchIndices.push(i);
                i += 1;
            } else {
                // Shifting Process
                const badChar = text[i + j].toLowerCase();
                const badCharLastIndex = lastOccurTable.has(badChar) ? lastOccurTable.get(badChar)! : -1;
                i += Math.max(1, j - badCharLastIndex);
            }
        }

        // Mapping to ExactRes
        for (const matchIndex of matchIndices) {
            results.push({
                keyword: keyword,
                index: matchIndex,
                count: matchIndices.length,
                comparisons: comparisons,
                algorithm: 'BM'
            });
        }
    }

    return results;
}