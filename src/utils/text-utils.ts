export interface Token {
    word: string;
    index: number;
    endIndex: number;
}

const ZERO_WIDTH_CHARS = new Set([
    0x200B, // ZWSP
    0x200C, // ZWNJ
    0x200D, // ZWJ
    0xFEFF, // BOM
    0x00AD, // Soft hyphen
    0x2060, // Word joiner
]);

function isZeroWidthChar(code: number): boolean {
    return ZERO_WIDTH_CHARS.has(code);
}

function normalizeChar(ch: string): string {
    const code = ch.charCodeAt(0);
    if (code >= 0xFF01 && code <= 0xFF5E) {
        return String.fromCharCode(code - 0xFEE0);
    }
    return ch;
}

export function tokenizeText(text: string): Token[] {
    const tokens: Token[] = [];

    let cleaned = '';
    const indexMap: number[] = [];
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        const code = ch.charCodeAt(0);
        if (isZeroWidthChar(code)) {
            continue;
        }
        cleaned += normalizeChar(ch);
        indexMap.push(i);
    }

    const regex = /[\p{L}\p{N}\p{Sc}]+/gu;
    const matches = cleaned.matchAll(regex);
    for (const match of matches) {
        const word = match[0];
        const cleanedIndex = match.index!;
        const endCleanedIndex = cleanedIndex + word.length - 1;
        tokens.push({
            word,
            index: indexMap[cleanedIndex],
            endIndex: indexMap[endCleanedIndex] + 1,
        });
    }

    return tokens;
}