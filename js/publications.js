// Shared publications module - BibTeX parsing and utilities

export const HIGHLIGHT_AUTHOR = 'Jannik Brinkmann';
export const MONTHS = {jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12};

const PREPRINT_TYPES = ['misc', 'unpublished'];
const TYPE_MAP = { article: 'journal', inproceedings: 'conference', conference: 'conference' };

// Simple YAML parser for our metadata format
function parseYaml(yaml) {
    const result = {};
    let currentKey = null;
    let currentObj = null;
    let inArray = false;
    let arrayKey = null;
    let arrayItem = null;

    for (const line of yaml.split('\n')) {
        if (!line.trim() || line.trim().startsWith('#')) continue;

        const indent = line.search(/\S/);

        // Top-level key (citation key)
        if (indent === 0 && line.includes(':')) {
            // Finalize any pending array item from previous entry
            if (arrayItem && arrayKey && currentObj) {
                currentObj[arrayKey].push(arrayItem);
                arrayItem = null;
            }
            const key = line.split(':')[0].trim();
            result[key] = {};
            currentKey = key;
            currentObj = result[key];
            inArray = false;
            arrayKey = null;
        }
        // Property or array
        else if (indent > 0 && currentObj) {
            const trimmed = line.trim();

            // Array item start
            if (trimmed.startsWith('- ')) {
                if (arrayItem && arrayKey) {
                    currentObj[arrayKey].push(arrayItem);
                }
                arrayItem = {};
                const content = trimmed.slice(2);
                if (content.includes(':')) {
                    const [k, v] = content.split(':').map(s => s.trim());
                    arrayItem[k] = parseValue(v);
                }
            }
            // Array item continuation
            else if (inArray && indent >= 6 && trimmed.includes(':')) {
                const [k, v] = trimmed.split(':').map(s => s.trim());
                if (arrayItem) arrayItem[k] = parseValue(v);
            }
            // Property
            else if (trimmed.includes(':')) {
                const colonIdx = trimmed.indexOf(':');
                const key = trimmed.slice(0, colonIdx).trim();
                const value = trimmed.slice(colonIdx + 1).trim();

                if (value === '') {
                    // Start of array
                    currentObj[key] = [];
                    arrayKey = key;
                    inArray = true;
                    arrayItem = null;
                } else {
                    if (arrayItem && arrayKey) {
                        currentObj[arrayKey].push(arrayItem);
                        arrayItem = null;
                    }
                    inArray = false;
                    currentObj[key] = parseValue(value);
                }
            }
        }
    }

    // Push last array item
    if (arrayItem && arrayKey && currentObj) {
        currentObj[arrayKey].push(arrayItem);
    }

    return result;
}

function parseValue(v) {
    if (v === 'true') return true;
    if (v === 'false') return false;
    if (!isNaN(v) && v !== '') return Number(v);
    return v;
}

export function parseBibtex(bib) {
    const entries = [];
    const entryRegex = /@(\w+)\s*\{\s*([^,]*)\s*,([^@]*)\}/g;
    let match;
    let index = 0;
    while ((match = entryRegex.exec(bib)) !== null) {
        const [, entryType, key, content] = match;
        const fields = { _type: entryType.toLowerCase(), _key: key.trim(), _index: index++ };
        const fieldRegex = /(\w+)\s*=\s*\{([^}]*)\}|(\w+)\s*=\s*"([^"]*)"|(\w+)\s*=\s*(\d+)/g;
        let fieldMatch;
        while ((fieldMatch = fieldRegex.exec(content)) !== null) {
            const name = (fieldMatch[1] || fieldMatch[3] || fieldMatch[5]).toLowerCase();
            const value = fieldMatch[2] ?? fieldMatch[4] ?? fieldMatch[6];
            fields[name] = value.trim();
        }
        entries.push(fields);
    }
    return entries;
}

export function parseAuthors(authorStr) {
    if (!authorStr) return [];
    return authorStr.split(/\s+and\s+/).map(a => {
        const parts = a.split(',').map(p => p.trim());
        const name = parts.length > 1 ? `${parts[1]} ${parts[0]}` : a.trim();
        return { name };
    });
}

function transformEntry(entry, meta = {}) {
    // Start with BibTeX url as primary link
    const links = [];
    if (entry.url) links.push({ type: 'Paper', url: entry.url });

    // Add extra links from meta (arXiv, Code, Website, etc.)
    if (meta.links) links.push(...meta.links);

    return {
        title: entry.title || '',
        authors: parseAuthors(entry.author),
        venue: entry.journal || entry.booktitle || 'arXiv preprint',
        venueAbbrev: meta.venueAbbrev || '',
        year: entry.year || '',
        month: entry.month || '',
        type: meta.type || TYPE_MAP[entry._type] || 'conference',
        links,
        featured: meta.featured || false,
        _index: entry._index
    };
}

export function transformBibtex(entries, metadata = {}) {
    const preprints = [], conference_publications = [];
    for (const entry of entries) {
        const meta = metadata[entry._key] || {};
        const pub = transformEntry(entry, meta);
        (PREPRINT_TYPES.includes(entry._type) ? preprints : conference_publications).push(pub);
    }
    return { preprints, conference_publications };
}

export async function loadPublications() {
    const [bib, metaYaml] = await Promise.all([
        fetch('data/publications.bib').then(r => r.text()),
        fetch('data/publications-meta.yaml').then(r => r.text()).catch(() => '')
    ]);
    const meta = metaYaml ? parseYaml(metaYaml) : {};
    return transformBibtex(parseBibtex(bib), meta);
}

export function getMonthValue(month) {
    return month ? MONTHS[String(month).slice(0,3).toLowerCase()] || 0 : 0;
}

export function sortByDate(pubs) {
    return [...pubs].sort((a, b) =>
        (b.year - a.year) || (getMonthValue(b.month) - getMonthValue(a.month)) || (a._index - b._index)
    );
}
