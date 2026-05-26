import { RegexRes } from "../types/type"

export function regexSearch(text: string): RegexRes[] {
    const res: RegexRes[] = [];
    
    const pattern = new RegExp('\\b[A-Za-z]{2,}\\d{2,}\\b', 'gi');
    const matches = text.matchAll(pattern);

    for (const match of matches) {
        const full = match[0];
        
        const wordPart = full.replace(/\d+$/, '');
        res.push({
            matchedWord: full,
            keyword: wordPart,
            index: match.index
        });
    }
    return res;
}