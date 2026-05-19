import { ExactRes, RegexRes, FuzzyRes, PipelineRes} from "../types/type";
import { loadKeywords, separateWords } from "../utils/keyword-loader";
import { kmpSearch } from '../algorithms/kmp';
import { bmSearch } from '../algorithms/boyer-moore';
import { ahoCorasickSearch } from '../algorithms/aho-corasick';
import { rabinKarpSearch } from '../algorithms/rabin-karp';
import { regexSearch } from '../algorithms/regex';
import { fuzzySearch } from '../algorithms/weighted-levenshtein';

let loadedLines: string[] | null = null
let separatedWords: string[] | null = null

export function clearPipelineCache() {
    loadedLines = null;
    separatedWords = null;
}

export async function runPipeline(text: string): Promise<PipelineRes> {
    if(!loadedLines){
        loadedLines = await loadKeywords();
    }

    if (!separatedWords){
        separatedWords = await separateWords(loadedLines);
    }

    const cachedWords = separatedWords!;

    const t0 = performance.now();
    const kmpResults = kmpSearch(cachedWords, text);
    const kmpTime = performance.now() - t0;

    const t1 = performance.now();
    const bmResults = bmSearch(cachedWords, text);
    const bmTime = performance.now() - t1;

    const t2 = performance.now();
    const acResults = ahoCorasickSearch(cachedWords, text);
    const acTime = performance.now() - t2;

    const t3 = performance.now();
    const rkResults = rabinKarpSearch(cachedWords, text);
    const rkTime = performance.now() - t3;
    
    const foundKeywords = new Set([
        ...kmpResults.map(r => r.keyword.toLowerCase()),
        ...bmResults.map(r => r.keyword.toLowerCase()),
        ...acResults.map(r => r.keyword.toLowerCase()),
        ...rkResults.map(r => r.keyword.toLowerCase()),
    ]);

    const regexToOriginal = new Map<string, string[]>();
    for (const w of cachedWords) {
        const base = w.replace(/\d+$/, '');
        if (base.length > 0) {
            if (!regexToOriginal.has(base)) regexToOriginal.set(base, []);
            regexToOriginal.get(base)!.push(w);
        }
    }
    const regexWords = Array.from(regexToOriginal.keys());

    const t4 = performance.now();
    const regexMatches = regexSearch(regexWords, text);
    const regexTime = performance.now() - t4;
    
    regexMatches.forEach(r => {
        foundKeywords.add(r.keyword.toLowerCase());
        const originals = regexToOriginal.get(r.keyword);
        if (originals) {
            originals.forEach(o => foundKeywords.add(o.toLowerCase()));
        }
    });

    const missedFromExactRegex = cachedWords
        .filter(w => !foundKeywords.has(w.toLowerCase()));

    const t5 = performance.now();
    const fuzzyMatches = fuzzySearch(missedFromExactRegex, text);
    const fuzzyTime = performance.now() - t5;

    return {
        exact: {
            kmp: kmpResults,
            bm: bmResults,
            ahoCorasick: acResults,
            rabinKarp: rkResults,
        },
        regex: regexMatches,
        fuzzy: fuzzyMatches,
        executionTime: {
            kmp: kmpTime,
            bm: bmTime,
            ahoCorasick: acTime,
            rabinKarp: rkTime,
            regex: regexTime,
            fuzzy: fuzzyTime,
        }
    };
}