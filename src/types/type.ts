export interface RegexRes{
    matchedWord: string, 
    keyword: string,
    index: number
};

export interface FuzzyRes{
    matchedWord: string, 
    keyword: string,
    index: number,
    difDis : number
};

export interface ExactRes {
    keyword: string,
    index: number,
    count: number, // kemunculan keyword
    comparisons: number, // jumlah perbandingan karakter, buat statistik
    algorithm: 'KMP' | 'BM' |'AC' | 'RK'
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
    }
}