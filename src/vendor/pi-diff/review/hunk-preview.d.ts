import { codeToANSI } from "@shikijs/cli";
import { type ParsedDiff } from "../core/diff.js";
import type { ReviewHunk } from "./git.js";
type BundledLanguage = Parameters<typeof codeToANSI>[1];
export interface ReviewHunkPreviewInput {
    hunk: ReviewHunk;
    filePath: string;
    theme?: any;
    width: number;
    maxLines?: number;
}
export type ReviewHunkPreviewRenderer = (input: ReviewHunkPreviewInput) => Promise<string>;
interface DiffColors {
    fgAdd: string;
    fgDel: string;
    fgCtx: string;
}
interface DiffRenderOptions {
    compactGutter?: boolean;
}
export declare function renderReviewHunkPreview(input: ReviewHunkPreviewInput): Promise<string>;
export declare function applyDiffPalette(): void;
export declare function themeCacheKey(theme?: any): string;
export declare function resolveDiffColors(theme?: any): DiffColors;
export declare function lang(filePath: string): BundledLanguage | undefined;
export declare function renderUnified(diff: ParsedDiff, language: BundledLanguage | undefined, maxLines: number, colors: DiffColors, width: number, options?: DiffRenderOptions): Promise<string>;
export declare function renderSplit(diff: ParsedDiff, language: BundledLanguage | undefined, maxLines: number, colors: DiffColors, width: number, options?: DiffRenderOptions): Promise<string>;
export {};
//# sourceMappingURL=hunk-preview.d.ts.map