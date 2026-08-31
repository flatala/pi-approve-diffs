import { type HashlineApplyError, type HashlineApplyOk, type HashlineEdit } from "../hashline.js";
export type FileHashlineApplyResult = HashlineApplyOk | HashlineApplyError;
export type HashlineEditApplyOptions = {
    dryRun?: boolean;
    /** If set, skip reading filePath (caller already read once). */
    rawUtf8?: string;
};
export type FileHashlineApplyOk = HashlineApplyOk & {
    newContent: string;
    /** Full on-disk text after edit (BOM + EOL restored); same as written when not dryRun. */
    finalRaw: string;
};
export declare function applyHashlineEditsToFile(filePath: string, changes: HashlineEdit[], options?: HashlineEditApplyOptions): Promise<(FileHashlineApplyOk | HashlineApplyError) & {
    newContent?: string;
    finalRaw?: string;
}>;
//# sourceMappingURL=hashline-edit.d.ts.map