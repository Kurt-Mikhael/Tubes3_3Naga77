/**
 * Regex Matcher - placeholder
 */
import {RegexRes} from "../types/type"
/**
 * 
 * @param keywords ini words hasil dari seperateWords yang dari utils/keyword-loader.ts 
 * @param text ini yang mau dicari ngandung patternya
 */
export function regexSearch(keywords: string[], text: string): RegexRes[] {
    const res = [];
    for(const word of keywords){
        // formatnya itu (string, flag)
        const pattern = new RegExp(word + '\\d{2,3}', 'gi');
        const matches = text.matchAll(pattern);

        for(const match of matches){
            res.push({
                matchedWord: match[0],
                keyword: word,
                index: match.index
            })
        }
    }
    return res;
}
