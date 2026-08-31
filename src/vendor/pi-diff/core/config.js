// ---------------------------------------------------------------------------
// pi-diff.json config loader
//
// Config priority (highest first):
//   1. Environment variables (PI_DIFF_*) — for runtime/tool overrides
//   2. Project-level pi-diff.json (<cwd>/pi-diff.json)
//   3. Project-level .pi/pi-diff.json (pi-standard hidden config dir)
//   4. Global-level pi-diff.json (~/.pi/agent/pi-diff.json)
//   5. Global-level pi-diff.json (~/.pi/pi-diff.json)
//   6. Hardcoded defaults
//
// The env vars are read by the individual resolvers in diff.ts;
// this module handles file-based config only.
// ---------------------------------------------------------------------------
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export const PI_DIFF_TOOL_NAMES = ["write", "edit", "apply_patch"];
// ---------------------------------------------------------------------------
// Module state — singleton cache
// ---------------------------------------------------------------------------
let _cachedConfig; // null = not loaded, undefined = attempted/no-file
/**
 * Load pi-diff.json from project or global paths.
 * Returns {} if neither file exists.
 */
export function loadPiDiffConfig(cwd) {
    if (_cachedConfig !== undefined)
        return _cachedConfig ?? {};
    // When a specific cwd is provided (e.g. for testing), only search that path.
    // When omitted, search project root then global.
    const searchPaths = cwd
        ? [join(cwd, ".pi", "pi-diff.json"), join(cwd, "pi-diff.json")]
        : [
            join(homedir(), ".pi", "pi-diff.json"),
            join(homedir(), ".pi", "agent", "pi-diff.json"),
            join(process.cwd(), ".pi", "pi-diff.json"),
            join(process.cwd(), "pi-diff.json"),
        ];
    // Deduplicate by resolving to absolute paths
    const seen = new Set();
    const uniquePaths = [];
    for (const p of searchPaths) {
        const abs = p.startsWith("/") ? p : join(process.cwd(), p);
        if (!seen.has(abs)) {
            seen.add(abs);
            uniquePaths.push(abs);
        }
    }
    // Paths are ordered lowest-to-highest priority; later files override earlier ones.
    let merged = {};
    for (const filePath of uniquePaths) {
        try {
            if (!existsSync(filePath))
                continue;
            const raw = JSON.parse(readFileSync(filePath, "utf-8"));
            if (Array.isArray(raw.disabledTools)) {
                raw.disabledTools = raw.disabledTools.filter((tool) => typeof tool === "string" && PI_DIFF_TOOL_NAMES.includes(tool));
            }
            else {
                delete raw.disabledTools;
            }
            merged = deepMerge(merged, raw);
        }
        catch {
            // Skip invalid files silently
        }
    }
    _cachedConfig = Object.keys(merged).length > 0 ? merged : null;
    return merged;
}
/**
 * Invalidate the cached config (useful for testing).
 */
export function invalidatePiDiffConfig() {
    _cachedConfig = undefined;
}
/**
 * Deep-merge two PiDiffJson objects. Later values win.
 */
function deepMerge(a, b) {
    const result = { ...a };
    for (const key of Object.keys(b)) {
        const bVal = b[key];
        if (bVal === undefined)
            continue;
        if (key === "colors" && typeof bVal === "object" && bVal !== null) {
            result.colors = { ...(a.colors || {}), ...bVal };
        }
        else {
            result[key] = bVal;
        }
    }
    return result;
}
// ---------------------------------------------------------------------------
// Config value extractors — return the config value or undefined
// ---------------------------------------------------------------------------
export function configSepStyle(cwd) {
    return loadPiDiffConfig(cwd).sepStyle;
}
export function configLineNumbers(cwd) {
    return loadPiDiffConfig(cwd).lineNumbers;
}
export function configIndicatorStyle(cwd) {
    return loadPiDiffConfig(cwd).indicatorStyle;
}
export function configLongLines(cwd) {
    return loadPiDiffConfig(cwd).longLines;
}
export function configFileHeader(cwd) {
    return loadPiDiffConfig(cwd).fileHeader;
}
export function configTheme(cwd) {
    return loadPiDiffConfig(cwd).theme;
}
export function configShikiTheme(cwd) {
    return loadPiDiffConfig(cwd).shikiTheme;
}
export function configColors(cwd) {
    return loadPiDiffConfig(cwd).colors;
}
//# sourceMappingURL=config.js.map