/**
 * Weighted Levenshtein Distance - placeholder
 */

import {tokenizeText} from "../utils/text-utils";
import {FuzzyRes} from "../types/type"
// mapping similar char, cost 0.2 untuk karakter mirip, cost 0.5 untuk huruf sama cuman beda bahasa
const SIMILAR_CHAR: Record<string,{sC: string[], cost: number}[]> = {
        'A': [
            { sC: ['4' , '@' ], cost: 0.2 },
            { sC: ['А', 'а', 'Α', 'α'], cost: 0.1 },
        ],
        'B': [
            { sC: ['8' ], cost: 0.2 },
            { sC: ['В', 'в'], cost: 0.1 },
        ],
        'C': [
            { sC: ['С', 'с', 'Ϲ', 'ϲ'], cost: 0.1 },
        ],
        'E': [
            { sC: ['3' ], cost: 0.2 },
            { sC: ['Е', 'е', 'Ε', 'ε'], cost: 0.1 },
        ],
        'G': [
            { sC: ['9' , '6' ], cost: 0.2 },
        ],
        'H': [
            { sC: ['Н', 'Η'], cost: 0.1 },
        ],
        'I': [
            { sC: ['1' , '!' , 'l' ], cost: 0.2 },
            { sC: ['І', 'і', 'Ι', 'ι'], cost: 0.1 },
        ],
        'J': [
            { sC: ['Ј'], cost: 0.1 },
        ],
        'K': [
            { sC: ['К', 'к', 'Κ', 'κ'], cost: 0.1 },
        ],
        'L': [
            { sC: ['1' , '|' ], cost: 0.2 },
        ],
        'M': [
            { sC: ['М', 'м', 'Μ', 'μ'], cost: 0.1 },
        ],
        'N': [
            { sC: ['Н', 'Ν'], cost: 0.1 },
        ],
        'O': [
            { sC: ['0' ], cost: 0.2 },
            { sC: ['О', 'о', 'Ο', 'ο'], cost: 0.1 },
        ],
        'P': [
            { sC: ['Р', 'р', 'Ρ', 'ρ'], cost: 0.1 },
        ],
        'R': [
            { sC: ['2' ], cost: 0.2 },
        ],
        'S': [
            { sC: ['5' , '$' ], cost: 0.2 },
            { sC: ['Ѕ', 'ѕ'], cost: 0.1 },
        ],
        'T': [
            { sC: ['7' , '+' ], cost: 0.2 },
            { sC: ['Т', 'т', 'Τ', 'τ'], cost: 0.1 },
        ],
        'X': [
            { sC: ['Х', 'х', 'Χ', 'χ'], cost: 0.1 },
        ],
        'Y': [
            { sC: ['У', 'у', 'Υ', 'υ'], cost: 0.1 },
        ],
        'Z': [
            { sC: ['2' ], cost: 0.2 },
            { sC: ['З', 'Ζ'], cost: 0.1 },
        ],
};
/**
 * 
 * Buat kasih cost lebih murah kalau char mirip. c1: kata di keywords.txt, c2: teks di web.
 */
function weightedSimilarity(c1: string, c2: string): number {
    if (c1.toUpperCase() == c2.toUpperCase()) return 0;
    const sim = SIMILAR_CHAR[c1.toUpperCase()];
    if (sim){
        for (const group of sim){
            const sC = group.sC.map(s => s.toUpperCase());
            if(sC.includes(c2.toUpperCase())) return group.cost;
        }
    }
    return 1.0;
};

/**
 * buat tabel cost dan itung minimal
 * @param w1: itu kata di keyword.txt
 * @param w2: itu kata dari text 
 */
function minDistanceLev(w1: string, w2: string): number {
    const m = w1.length, n = w2.length;
    const dp: number[][] = Array.from(
        {length: m+1},
        () => new Array(n + 1).fill(0)
    );

    for (let i = 0; i <= m; i++){
        dp[i][0] = i;
    }
    for (let j = 0; j <= n; j++){
        dp[0][j] = j;
    }

    for (let i = 1; i <= m ; i++){
        for (let j = 1; j <= n; j++){
            const cost = weightedSimilarity(w1[i-1], w2[j-1]);
            dp[i][j] = Math.min(
                dp[i-1][j] + 1, // delete
                dp[i][j-1] + 1, // insert
                dp[i-1][j-1] + cost // replace
            );
        }
    }

    return dp[m][n];
}

export function fuzzySearch(keywords: string[], text: string): FuzzyRes[]{
    const res: FuzzyRes[] = []
    const words = tokenizeText(text);
    for (let i = 0; i < keywords.length; i++){
        for(let j = 0; j < words.length; j++){
            const cost = minDistanceLev(keywords[i], words[j].word);
            const normalize = cost / Math.max(keywords[i].length, words[j].word.length)
            if (normalize <= 0.3){
                res.push({
                    matchedWord: words[j].word, 
                    keyword: keywords[i],
                    index: words[j].index,
                    difDis : normalize
                })
            }
        }
    }

    return res;
}