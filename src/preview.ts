import { existsSync, readFileSync } from "node:fs";
import { extname } from "node:path";
import { parseDiff, type ParsedDiff } from "./vendor/pi-diff/core/diff.js";

const LANGUAGES: Record<string, string> = {
	".ts": "typescript", ".tsx": "tsx", ".js": "javascript", ".mjs": "javascript",
	".cjs": "javascript", ".jsx": "jsx", ".py": "python", ".rb": "ruby",
	".rs": "rust", ".go": "go", ".java": "java", ".kt": "kotlin",
	".swift": "swift", ".c": "c", ".h": "c", ".cpp": "cpp", ".cc": "cpp",
	".hpp": "cpp", ".cs": "csharp", ".php": "php", ".sh": "bash",
	".bash": "bash", ".zsh": "bash", ".json": "json", ".jsonc": "jsonc",
	".yaml": "yaml", ".yml": "yaml", ".toml": "toml", ".md": "markdown",
	".html": "html", ".css": "css", ".scss": "scss", ".sql": "sql",
	".lua": "lua", ".xml": "xml",
};

export type Section = {
	path: string;
	diff: ParsedDiff | null;
	language?: string;
	note?: string;
};

export type Preview = {
	toolName: string;
	path: string;
	sections: Section[];
	warnings: string[];
	added: number;
	removed: number;
};

type EditInput = { oldText?: string; newText?: string };
type ToolInput = {
	path?: string;
	content?: string;
	edits?: EditInput[];
	oldText?: string;
	newText?: string;
	replaceAll?: boolean;
	changes?: Array<{
		path?: string;
		movePath?: string;
		action?: string;
		content?: string;
		oldText?: string;
		newText?: string;
	}>;
};

function countOccurrences(haystack: string, needle: string): number {
	let count = 0;
	let index = 0;
	while ((index = haystack.indexOf(needle, index)) !== -1) {
		count++;
		index += needle.length;
	}
	return count;
}

function applyEdits(
	text: string,
	edits: EditInput[],
	replaceAll: boolean,
	warnings: string[],
	label: string,
): string {
	let result = text;
	for (const [i, edit] of edits.entries()) {
		const oldText = edit.oldText ?? "";
		if (oldText === "") {
			warnings.push(`${label} edit ${i + 1}: empty oldText — skipped in preview`);
			continue;
		}
		const matches = countOccurrences(result, oldText);
		if (matches === 0) {
			warnings.push(`${label} edit ${i + 1}: oldText not found — nothing to show`);
			continue;
		}
		if (matches > 1 && !replaceAll) {
			warnings.push(`${label} edit ${i + 1}: ${matches} matches — preview shows the first`);
		}
		result =
			matches > 1 && replaceAll
				? result.replaceAll(oldText, edit.newText ?? "")
				: result.replace(oldText, edit.newText ?? "");
	}
	return result;
}

function sectionFor(path: string, oldText: string, newText: string): Section {
	return { path, diff: parseDiff(oldText, newText), language: LANGUAGES[extname(path).toLowerCase()] ?? undefined };
}

export async function buildPreview(toolName: string, input: ToolInput): Promise<Preview | null> {
	const warnings: string[] = [];
	const sections: Section[] = [];

	if (toolName === "write" || toolName === "edit") {
		const path = input.path;
		if (!path) return null;
		const exists = existsSync(path);
		const oldText = exists ? readFileSync(path, "utf8") : "";
		let newText = oldText;

		if (toolName === "write") {
			newText = input.content ?? "";
		} else {
			const edits = input.edits ?? [{ oldText: input.oldText, newText: input.newText }];
			newText = applyEdits(oldText, edits, input.replaceAll === true, warnings, path);
		}
		if (newText === oldText) return null;
		sections.push(sectionFor(path, oldText, newText));
	} else if (toolName === "hashline_edit") {
		const path = input.path;
		if (!path) return null;
		const { applyHashlineEditsToFile } = await import("./vendor/pi-diff/core/hashline-edit.js");
		const result = await applyHashlineEditsToFile(path, (input.changes ?? []) as never, {
			dryRun: true,
		});
		if (result && "newContent" in result && typeof result.newContent === "string") {
			const oldText = existsSync(path) ? readFileSync(path, "utf8") : "";
			if (result.newContent === oldText) return null;
			sections.push(sectionFor(path, oldText, result.newContent));
		} else {
			// ponytail: hashline previews that fail to decode pass through ungated
			return null;
		}
	} else if (toolName === "apply_patch") {
		for (const [i, change] of (input.changes ?? []).entries()) {
			const path = change.path ?? "";
			const label = `change ${i + 1} (${path || "unnamed"})`;
			if (!path) {
				warnings.push(`${label}: no path — cannot preview`);
				continue;
			}
			const action = change.action ?? (existsSync(path) ? "update" : "add");
			if (action === "delete") {
				const oldText = existsSync(path) ? readFileSync(path, "utf8") : "";
				sections.push(sectionFor(path, oldText, ""));
			} else if (action === "move") {
				sections.push({ path: `${path} → ${change.movePath ?? "?"}`, diff: null, note: "move/rename" });
			} else if (action === "add") {
				sections.push(sectionFor(path, "", change.content ?? ""));
			} else {
				const oldText = existsSync(path) ? readFileSync(path, "utf8") : "";
				const newText = applyEdits(
					oldText,
					[{ oldText: change.oldText, newText: change.newText }],
					false,
					warnings,
					label,
				);
				sections.push(sectionFor(path, oldText, newText));
			}
		}
		if (!sections.length) return null;
	} else {
		return null;
	}

	const added = sections.reduce((n, s) => n + (s.diff?.added ?? 0), 0);
	const removed = sections.reduce((n, s) => n + (s.diff?.removed ?? 0), 0);
	return {
		toolName,
		path: sections[0]?.path ?? "",
		sections,
		warnings,
		added,
		removed,
	};
}
