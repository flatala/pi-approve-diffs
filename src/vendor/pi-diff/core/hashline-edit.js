import * as fs from "node:fs";
import * as path from "node:path";
import { applyHashlineEdits } from "../hashline.js";
import { finalizeHashlineWriteContent, prepareTextForHashlineEdit } from "./text-encoding.js";
async function atomicWriteFile(filePath, content) {
    const dir = path.dirname(filePath);
    const tmp = path.join(dir, `.${path.basename(filePath)}.pi-hashline.${process.pid}.tmp`);
    await fs.promises.writeFile(tmp, content, "utf8");
    await fs.promises.rename(tmp, filePath);
}
export async function applyHashlineEditsToFile(filePath, changes, options) {
    const dryRun = options?.dryRun === true;
    let raw;
    if (options?.rawUtf8 !== undefined) {
        raw = options.rawUtf8;
    }
    else {
        try {
            raw = await fs.promises.readFile(filePath, "utf8");
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            return { ok: false, error: `[E_READ_FAILED] cannot read ${filePath}: ${msg}`, code: "E_READ_FAILED" };
        }
    }
    const { bom, ending, normalized } = prepareTextForHashlineEdit(raw);
    const result = applyHashlineEdits(normalized, changes, filePath);
    if (!result.ok)
        return result;
    const finalRaw = finalizeHashlineWriteContent(bom, ending, result.newContent);
    if (!dryRun) {
        try {
            await atomicWriteFile(filePath, finalRaw);
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            return { ok: false, error: `[E_WRITE_FAILED] cannot write ${filePath}: ${msg}`, code: "E_WRITE_FAILED" };
        }
    }
    return { ...result, newContent: result.newContent, finalRaw };
}
//# sourceMappingURL=hashline-edit.js.map