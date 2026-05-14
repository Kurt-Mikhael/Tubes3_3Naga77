export interface Token{
    word: string,
    index: number
};


export function tokenizeText(text: string): Token[]{
    const tokens: Token[] = [];
    const matches = text.matchAll(/\S+/g);
    for (const match of matches){
        tokens.push({
            word: match[0],
            index: match.index
        })
    }
    return tokens;
}