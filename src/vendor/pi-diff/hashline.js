/**
 * Hashline engine — content-anchored line IDs for robust edits.
 *
 * Hash format: 3-char URL-safe base64 from xxHash32, 18 bits entropy.
 * Display:    `HASH│content` (U+2502 box drawings light vertical).
 * Collisions:  resolved with `:R{n}` suffix (perfect hashing per file).
 * Canonical:   CR stripped, trailing whitespace stripped before hashing.
 *
 * Design: edit-pro style (strict, no fuzzy fallback). The conservative
 * `replaceForPatch` path remains available for apply_patch mutations.
 */
import xxhashWasm from "xxhash-wasm";
const DICT = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const HASH_LEN = 3;
const HASH_MOD = 64 ** 3; // 262144
const SEP = "\u2502"; // │
let h32Fn = null;
let initPromise = null;
export function initHashline() {
    if (!initPromise) {
        initPromise = xxhashWasm().then((xxh) => {
            h32Fn = xxh.h32;
        });
    }
    return initPromise;
}
function ensureReady() {
    if (!h32Fn)
        throw new Error("[E_NOT_INITIALIZED] hashline: initHashline() not called before use");
    return h32Fn;
}
function canonicalize(line) {
    if (line.endsWith("\r"))
        line = line.slice(0, -1);
    return line.replace(/[ \t]+$/, "");
}
function toDict(n) {
    let s = "";
    for (let i = 0; i < HASH_LEN; i++) {
        s = DICT[n & 63] + s;
        n >>>= 6;
    }
    return s;
}
function rawHash(canonical, seed = 0) {
    return ensureReady()(canonical, seed) >>> 0;
}
const hashCache = new Map();
export function hashLines(content) {
    const cached = hashCache.get(content);
    if (cached)
        return cached;
    content = content.replace(/\r\n/g, "\n");
    const lines = content.split("\n");
    const hashes = [];
    const seen = new Map();
    for (const line of lines) {
        const canon = canonicalize(line);
        let hash = toDict(rawHash(canon) % HASH_MOD);
        const count = seen.get(hash) ?? 0;
        if (count > 0) {
            let resolved = null;
            for (let retry = 1; retry < 1000; retry++) {
                const candidate = `${toDict(rawHash(canon, retry) % HASH_MOD)}:R${retry}`;
                if (!seen.has(candidate)) {
                    resolved = candidate;
                    break;
                }
            }
            if (resolved)
                hash = resolved;
            else
                throw new Error(`[E_HASH_COLLISION] cannot resolve collision for line: ${canon.slice(0, 80)}`);
        }
        seen.set(hash, 1);
        hashes.push(hash);
    }
    hashCache.set(content, hashes);
    return hashes;
}
export function parseAnchor(ref) {
    if (typeof ref !== "string")
        return "";
    // Strip the "│content" or " content" suffix. Anchor format is
    // either 3-char base64 or 3-char base64 with :R{n} collision suffix.
    const idx = ref.indexOf(SEP);
    if (idx >= 0)
        ref = ref.slice(0, idx);
    return ref.trim();
}
function formatAnchorFailureMessage(role, refRaw, fail, filePath) {
    const reason = fail.error === "ambiguous"
        ? "ambiguous (multiple lines share this anchor)"
        : fail.error === "empty"
            ? "empty anchor"
            : "not found (file changed since hashline_read)";
    let msg = `[E_STALE_ANCHOR] ${role} anchor ${JSON.stringify(refRaw)} — ${reason}.`;
    if (fail.suggestions?.length) {
        const hints = fail.suggestions.map((s) => `line ${s.line + 1} ref ${s.ref}`).join("; ");
        msg += ` Nearby: ${hints}.`;
    }
    const rereadStart = fail.suggestions?.length
        ? Math.max(1, Math.min(...fail.suggestions.map((s) => s.line + 1)) - 2)
        : 1;
    const rereadEnd = fail.suggestions?.length ? Math.max(...fail.suggestions.map((s) => s.line + 1)) + 2 : "";
    msg += ` Next: hashline_read path=${JSON.stringify(filePath)} startLine=${rereadStart}${rereadEnd ? ` endLine=${rereadEnd}` : ""}.`;
    return msg;
}
export function resolveAnchor(ref, fileHashes) {
    if (ref === "")
        return { ok: false, error: "empty", ref };
    const matches = [];
    for (let i = 0; i < fileHashes.length; i++) {
        if (fileHashes[i] === ref)
            matches.push(i);
    }
    if (matches.length === 1)
        return { ok: true, line: matches[0], ref };
    if (matches.length === 0) {
        const suggestions = [];
        for (let i = 0; i < fileHashes.length; i++) {
            if (suggestions.length >= 5)
                break;
            const h = fileHashes[i];
            if (h.length >= 3 && (h.startsWith(ref) || ref.startsWith(h.slice(0, 3)))) {
                suggestions.push({ line: i, ref: h });
            }
        }
        return { ok: false, error: "not_found", ref, suggestions };
    }
    return { ok: false, error: "ambiguous", ref };
}
function emptyToBoundary(content, idx, side) {
    const lines = content.split("\n");
    if (side === "prev" && idx > 0)
        return lines[idx - 1];
    if (side === "next" && idx < lines.length - 1)
        return lines[idx + 1];
    return null;
}
export function applyHashlineEdits(fileContent, changes, filePathForErrors = "") {
    if (changes.length === 0) {
        return { ok: true, newContent: fileContent, changedRange: [0, -1], boundaryWarnings: [] };
    }
    let hashes;
    try {
        hashes = hashLines(fileContent);
    }
    catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.startsWith("[E_NOT_INITIALIZED]")) {
            return { ok: false, error: msg, code: "E_NOT_INITIALIZED" };
        }
        throw e;
    }
    const resolved = [];
    for (const change of changes) {
        const [startRefRaw, endRefRaw] = change.hash_range_inclusive;
        const startRef = parseAnchor(startRefRaw);
        const endRef = parseAnchor(endRefRaw);
        const s = resolveAnchor(startRef, hashes);
        if (!s.ok) {
            return {
                ok: false,
                error: formatAnchorFailureMessage("start", startRefRaw, s, filePathForErrors),
                code: "E_STALE_ANCHOR",
                ref: startRefRaw,
                suggestions: s.suggestions,
            };
        }
        const e = resolveAnchor(endRef, hashes);
        if (!e.ok) {
            return {
                ok: false,
                error: formatAnchorFailureMessage("end", endRefRaw, e, filePathForErrors),
                code: "E_STALE_ANCHOR",
                ref: endRefRaw,
                suggestions: e.suggestions,
            };
        }
        if (e.line < s.line) {
            return {
                ok: false,
                error: `[E_BAD_RANGE] end anchor "${endRefRaw}" (line ${e.line + 1}) is before start anchor "${startRefRaw}" (line ${s.line + 1}).`,
                code: "E_BAD_RANGE",
            };
        }
        resolved.push({ startLine: s.line, endLine: e.line, change });
    }
    resolved.sort((a, b) => b.startLine - a.startLine);
    for (let i = 1; i < resolved.length; i++) {
        const prev = resolved[i - 1];
        const curr = resolved[i];
        if (curr.endLine >= prev.startLine) {
            return {
                ok: false,
                error: `[E_OVERLAP] edit ranges overlap. After sorting, range ${i} (lines ${curr.startLine + 1}-${curr.endLine + 1}) overlaps range ${i - 1} (lines ${prev.startLine + 1}-${prev.endLine + 1}). Each 'changes' entry must affect a disjoint line range.`,
                code: "E_OVERLAP",
            };
        }
    }
    const workingLines = fileContent.split("\n");
    let minChangedLine = workingLines.length;
    let maxChangedLine = -1;
    for (const r of resolved) {
        const { startLine, endLine, change } = r;
        const newLines = change.content_lines;
        if (newLines.length > 0) {
            const prev = emptyToBoundary(workingLines.join("\n"), startLine, "prev");
            if (prev !== null && prev === newLines[0]) {
                return {
                    ok: false,
                    error: `[E_BOUNDARY_DUP] first replacement line duplicates the line just before the range (line ${startLine}). Remove line ${JSON.stringify(newLines[0])} from the start of content_lines.`,
                    code: "E_BOUNDARY_DUP",
                };
            }
            const next = emptyToBoundary(workingLines.join("\n"), endLine, "next");
            if (next !== null && next === newLines[newLines.length - 1]) {
                return {
                    ok: false,
                    error: `[E_BOUNDARY_DUP] last replacement line duplicates the line just after the range (line ${endLine + 2}). Remove line ${JSON.stringify(newLines[newLines.length - 1])} from the end of content_lines.`,
                    code: "E_BOUNDARY_DUP",
                };
            }
        }
        workingLines.splice(startLine, endLine - startLine + 1, ...newLines);
        minChangedLine = Math.min(minChangedLine, startLine);
        maxChangedLine = Math.max(maxChangedLine, startLine + newLines.length - 1);
    }
    return {
        ok: true,
        newContent: workingLines.join("\n"),
        changedRange: [minChangedLine, maxChangedLine],
        boundaryWarnings: [],
    };
}
const READ_LINE_PAD = 6;
function formatReadLine(lineNo1, hash, line) {
    const n = String(lineNo1);
    const pad = n.length >= READ_LINE_PAD ? "" : " ".repeat(READ_LINE_PAD - n.length);
    return `${pad}${n}${SEP}${hash}${SEP}${line}`;
}
export function formatHashlineReadLines(fileContent, startLine = 1, endLine = Infinity) {
    const lines = fileContent.split("\n");
    const hashes = hashLines(fileContent);
    const startIdx = Math.max(0, startLine - 1);
    const endIdx = Math.min(lines.length, Number.isFinite(endLine) ? endLine : lines.length);
    const out = [];
    for (let i = startIdx; i < endIdx; i++) {
        out.push(formatReadLine(i + 1, hashes[i], lines[i]));
    }
    return { text: out.join("\n"), lineCount: out.length, startLine, endLine: endIdx };
}
/** @deprecated Use formatHashlineReadLines */
export function formatHashlineReadView(fileContent) {
    return formatHashlineReadLines(fileContent).text;
}
export function clearHashlineCache() {
    hashCache.clear();
}
//# sourceMappingURL=hashline.js.map