export declare const PI_DIFF_TOOL_NAMES: readonly ["write", "edit", "apply_patch"];
export type PiDiffToolName = (typeof PI_DIFF_TOOL_NAMES)[number];
/**
 * Full pi-diff.json schema.
 * All fields are optional — missing fields fall through to env → defaults.
 */
export interface PiDiffJson {
    /** pi-diff tools to omit. Disabling write or edit restores Pi's built-in tool. */
    disabledTools?: PiDiffToolName[];
    /** Hunk separator style. */
    sepStyle?: "auto" | "simple" | "gap" | "context" | "metadata";
    /** Show line numbers in gutter. */
    lineNumbers?: boolean;
    /** Diff indicator style on left edge. */
    indicatorStyle?: "bar" | "classic" | "none";
    /** How to render long lines. */
    longLines?: "wrap" | "scroll";
    /** Show file-header with filename and stats. */
    fileHeader?: boolean;
    /** Named diff color preset. */
    theme?: string;
    /** Shiki syntax theme name. */
    shikiTheme?: string;
    /** Per-color hex overrides. */
    colors?: Partial<{
        bgAdd: string;
        bgDel: string;
        bgAddHighlight: string;
        bgDelHighlight: string;
        bgGutterAdd: string;
        bgGutterDel: string;
        bgEmpty: string;
        fgAdd: string;
        fgDel: string;
        fgDim: string;
        fgLnum: string;
        fgRule: string;
        fgStripe: string;
        fgSafeMuted: string;
    }>;
}
/**
 * Load pi-diff.json from project or global paths.
 * Returns {} if neither file exists.
 */
export declare function loadPiDiffConfig(cwd?: string): PiDiffJson;
/**
 * Invalidate the cached config (useful for testing).
 */
export declare function invalidatePiDiffConfig(): void;
export declare function configSepStyle(cwd?: string): PiDiffJson["sepStyle"];
export declare function configLineNumbers(cwd?: string): boolean | undefined;
export declare function configIndicatorStyle(cwd?: string): PiDiffJson["indicatorStyle"];
export declare function configLongLines(cwd?: string): PiDiffJson["longLines"];
export declare function configFileHeader(cwd?: string): boolean | undefined;
export declare function configTheme(cwd?: string): string | undefined;
export declare function configShikiTheme(cwd?: string): string | undefined;
export declare function configColors(cwd?: string): PiDiffJson["colors"];
//# sourceMappingURL=config.d.ts.map