
export async function loadKeywords(): Promise<string[]> {
    try{
        const url = chrome.runtime.getURL("keywords.txt");
        const res = await fetch(url)
        if(!res.ok){
            throw new Error(`[KEYWORD-LOADER]: Gagal load keywords: ${res.status}`);
        }
        const txt = await res.text();
        const keywords = txt.split('\n').map(k => k.trim()).filter(k => k.length > 0);
        console.log(`[KEYWORD-LOADER]: Loaded ${keywords.length} keywords`);
        return keywords;
    }
    catch (error) {
        console.error(`[KEYWORD-LOADER]: Error loading keywords: `, error);
        return [];
    }
}

