export interface RegexRes{
    matchedWord: string,
    keyword: string,
    index: number,
    endIndex: number
};

export interface FuzzyRes{
    matchedWord: string,
    keyword: string,
    index: number,
    endIndex: number,
    difDis : number
};

export interface ExactRes {
    keyword: string,
    index: number,
    count: number, // kemunculan keyword
    comparisons: number, // jumlah perbandingan karakter, buat statistik
    algorithm: 'KMP' | 'BM' |'AC' | 'RK'
}


export interface HighlightStats {
    totalHighlights: number;
    uniqueKeywordCount: number;
    algorithmCounts: Record<string, number>;
}

export interface PipelineRes {
    exact: {
        kmp: ExactRes[],
        bm: ExactRes[],
        ahoCorasick: ExactRes[],
        rabinKarp: ExactRes[]
    }
    regex: RegexRes[],
    fuzzy: FuzzyRes[],
    executionTime: {
        kmp: number,
        bm: number,
        ahoCorasick: number,
        rabinKarp: number,
        regex: number,
        fuzzy: number
    },
    highlightStats?: HighlightStats
}