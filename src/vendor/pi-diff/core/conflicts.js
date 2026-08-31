// ---------------------------------------------------------------------------
// Merge conflict parsing and rendering
//
// Detects and renders Git merge conflict markers:
//   <<<<<<< <ref>
//   <current changes>
//   ||||||| <base ref>
//   <base changes>
//   =======
//   <incoming changes>
//   >>>>>>> <ref>
//
// Supports both 2-way (current + incoming) and 3-way (current + base + incoming)
// conflict styles.
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------
const CONFLICT_START_RE = /^<<<<<<<[ \t]*(.*)$/;
const CONFLICT_SEP_RE = /^=======$/;
const CONFLICT_BASE_RE = /^\|\|\|\|\|\|\|[ \t]*(.*)$/;
const CONFLICT_END_RE = /^>>>>>>>[ \t]*(.*)$/;
/**
 * Parse a string of file content for merge conflict markers.
 * Returns all conflict regions found.
 */
export function parseConflicts(content) {
    const lines = content.split("\n");
    const regions = [];
    let i = 0;
    while (i < lines.length) {
        const startMatch = lines[i].match(CONFLICT_START_RE);
        if (!startMatch) {
            i++;
            continue;
        }
        // Found a conflict start
        const startLine = i + 1; // 1-based
        const currentRef = (startMatch[1] ?? "").trim();
        const current = [];
        const base = [];
        const incoming = [];
        let hasBase = false;
        let state = "current";
        let endRef = "";
        i++; // advance past <<<<<<<
        while (i < lines.length) {
            const line = lines[i];
            if (CONFLICT_BASE_RE.test(line)) {
                state = "base";
                hasBase = true;
                i++;
                continue;
            }
            if (CONFLICT_SEP_RE.test(line)) {
                state = "incoming";
                i++;
                continue;
            }
            const endMatch = lines[i].match(CONFLICT_END_RE);
            if (endMatch) {
                endRef = (endMatch[1] ?? "").trim();
                i++;
                break;
            }
            if (state === "current")
                current.push(line);
            else if (state === "base")
                base.push(line);
            else
                incoming.push(line);
            i++;
        }
        regions.push({
            currentRef,
            current,
            base,
            incoming,
            incomingRef: endRef,
            hasBase,
            startLine,
        });
    }
    return { regions, hasConflicts: regions.length > 0 };
}
/**
 * Check if a string contains merge conflict markers.
 * Fast check without full parsing.
 */
export function hasConflictMarkers(content) {
    return /^<<<<<<<[ \t]?/m.test(content);
}
// ---------------------------------------------------------------------------
// Rendering helpers
// ---------------------------------------------------------------------------
/**
 * Build a human-readable summary of a conflict region.
 */
export function formatConflictSummary(region) {
    const currentLabel = region.currentRef || "current";
    const incomingLabel = region.incomingRef || "incoming";
    const currentLines = region.current.length;
    const incomingLines = region.incoming.length;
    if (region.hasBase) {
        return `Conflict: ${currentLabel} (${currentLines} lines) vs ${incomingLabel} (${incomingLines} lines) [3-way]`;
    }
    return `Conflict: ${currentLabel} (${currentLines} lines) vs ${incomingLabel} (${incomingLines} lines)`;
}
//# sourceMappingURL=conflicts.js.map