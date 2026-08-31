import { Key, matchesKey, truncateToWidth, type Component, type ThemeLike } from "@earendil-works/pi-tui";
import { __testing } from "./vendor/pi-diff/index.js";
const { renderSplit, renderUnified } = __testing;
import type { Preview } from "./preview.js";

export type Decision =
	| { action: "approve" }
	| { action: "yolo" }
	| { action: "decline" }
	| { action: "steer" };

type TuiLike = { terminal: { rows: number; columns: number } };

class ApprovalScreen implements Component {
	private view: "split" | "unified";
	private splitLines: string[];
	private unifiedLines: string[];
	private offset = 0;
	private tui: TuiLike;
	private theme: ThemeLike;
	private preview: Preview;
	private done: (decision: Decision) => void;

	constructor(opts: {
		tui: TuiLike;
		theme: ThemeLike;
		preview: Preview;
		splitLines: string[];
		unifiedLines: string[];
		initialView: "split" | "unified";
		done: (decision: Decision) => void;
	}) {
		this.tui = opts.tui;
		this.theme = opts.theme;
		this.preview = opts.preview;
		this.splitLines = opts.splitLines;
		this.unifiedLines = opts.unifiedLines;
		this.view = opts.initialView;
		this.done = opts.done;
	}

	private get lines(): string[] {
		return this.view === "split" ? this.splitLines : this.unifiedLines;
	}

	private scroll(delta: number): void {
		const max = Math.max(0, this.lines.length - this.bodyRows());
		this.offset = Math.min(max, Math.max(0, this.offset + delta));
	}

	private bodyRows(): number {
		// header (~4) + footer (~1) + padding
		return Math.max(3, this.tui.terminal.rows - 6);
	}

	handleInput(data: string): void {
		if (matchesKey(data, Key.enter) || data === "y") this.done({ action: "approve" });
		else if (data === "a") this.done({ action: "yolo" });
		else if (matchesKey(data, Key.escape) || data === "n" || data === "q")
			this.done({ action: "decline" });
		else if (data === "s") this.done({ action: "steer" });
		else if (matchesKey(data, Key.tab))
			this.view = this.view === "split" ? "unified" : "split";
		else if (matchesKey(data, Key.up) || data === "k") this.scroll(-1);
		else if (matchesKey(data, Key.down) || data === "j") this.scroll(1);
		else if (data === "b" || matchesKey(data, "pageup")) this.scroll(-this.bodyRows());
		else if (data === " " || matchesKey(data, "pagedown")) this.scroll(this.bodyRows());
		else if (matchesKey(data, Key.home)) this.offset = 0;
		else if (matchesKey(data, Key.end)) this.scroll(this.lines.length);
	}

	render(width: number): string[] {
		const p = this.preview;
		const rows = this.bodyRows();
		const max = Math.max(0, this.lines.length - rows);
		this.offset = Math.min(this.offset, max);

		const stats = this.theme.fg(
			"dim",
			` +${p.diff.added} -${p.diff.removed} · ${p.toolName} · ${p.path}`,
		);
		const header = [
			this.theme.bold(this.theme.fg("accent", `approve-diffs — ${p.toolName}`)) + stats,
			...p.warnings.map((w) => this.theme.fg("warning", ` ⚠ ${w}`)),
		];

		const window_ = this.lines.slice(this.offset, this.offset + rows).map((l) => truncateToWidth(l, width));
		const scrolled = this.offset > 0 || this.offset < max ? ` (${this.offset + 1}–${Math.min(this.lines.length, this.offset + rows)}/${this.lines.length})` : "";
		const footer = this.theme.fg(
			"dim",
			` enter approve · a always (session) · n decline · s steer · tab ${this.view === "split" ? "unified" : "split"}${scrolled}`,
		);

		return [...header, "", ...window_, "", footer].map((l) => truncateToWidth(l, width));
	}

	invalidate(): void {}
}

async function renderView(preview: Preview, view: "split" | "unified"): Promise<string[]> {
	const render = view === "split" ? renderSplit : renderUnified;
	const text = await render(preview.diff, preview.language as never);
	return text.split("\n");
}

export async function showApproval(
	ctx: {
		ui: {
			custom<T>(
				factory: (tui: TuiLike, theme: ThemeLike, kb: unknown, done: (value: T) => void) => Component,
				options?: unknown,
			): Promise<T>;
		};
	},
	preview: Preview,
	initialView: "split" | "unified",
): Promise<Decision> {
	const [splitLines, unifiedLines] = await Promise.all([
		renderView(preview, "split"),
		renderView(preview, "unified"),
	]);

	return ctx.ui.custom<Decision>(
		(tui, theme, _kb, done) =>
			new ApprovalScreen({ tui, theme, preview, splitLines, unifiedLines, initialView, done }),
		{ overlay: true, overlayOptions: { width: "100%", maxHeight: "100%" } },
	);
}
