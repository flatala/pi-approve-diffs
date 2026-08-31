import { Key, matchesKey, truncateToWidth, visibleWidth, type Component, type ThemeLike } from "@earendil-works/pi-tui";
import { __testing } from "./vendor/pi-diff/index.js";
import type { Preview } from "./preview.js";

const { renderSplit, renderUnified, shouldUseSplit } = __testing;

export type Decision =
	| { action: "approve" }
	| { action: "yolo" }
	| { action: "decline" }
	| { action: "steer"; message?: string };

type TuiLike = { terminal: { rows: number; columns: number } };

/** Apply pi's theme to the vendored renderer so diff backgrounds match the UI. */
export function applyPiTheme(theme: unknown): void {
	if (theme) __testing.resolveDiffColors(theme);
}

const printable = (data: string) => data.length > 0 && ![...data].some((ch) => ch < " ");

class ApprovalScreen implements Component {
	private view: "split" | "unified";
	private splitLines: string[];
	private unifiedLines: string[];
	private offset = 0;
	private mode: "view" | "steer" = "view";
	private steerBuffer = "";
	private splitTooWide: boolean | undefined;
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
		if (this.view === "split" && !this.splitTooWide) return this.splitLines;
		return this.unifiedLines;
	}

	private effectiveView(): string {
		return this.lines === this.splitLines ? "split" : "unified";
	}

	private scroll(delta: number): void {
		const max = Math.max(0, this.lines.length - this.bodyRows());
		this.offset = Math.min(max, Math.max(0, this.offset + delta));
	}

	private bodyRows(): number {
		// docked in the editor slot: cap the diff window at ~60% of the terminal
		const capped = Math.floor(this.tui.terminal.rows * 0.6);
		return Math.max(5, Math.min(capped, 40)) - 3 - this.preview.warnings.length;
	}

	handleInput(data: string): void {
		if (this.mode === "steer") {
			if (matchesKey(data, Key.enter)) {
				this.done({ action: "steer", message: this.steerBuffer.trim() });
			} else if (matchesKey(data, Key.escape)) {
				this.mode = "view";
				this.steerBuffer = "";
			} else if (matchesKey(data, Key.backspace)) {
				this.steerBuffer = this.steerBuffer.slice(0, -1);
			} else if (printable(data)) {
				this.steerBuffer += data;
			}
			return;
		}

		if (matchesKey(data, Key.enter) || data === "y") this.done({ action: "approve" });
		else if (data === "a") this.done({ action: "yolo" });
		else if (matchesKey(data, Key.escape) || data === "n" || data === "q")
			this.done({ action: "decline" });
		else if (data === "s") this.mode = "steer";
		else if (matchesKey(data, Key.tab)) this.view = this.effectiveView() === "split" ? "unified" : "split";
		else if (matchesKey(data, Key.up) || data === "k") this.scroll(-1);
		else if (matchesKey(data, Key.down) || data === "j") this.scroll(1);
		else if (matchesKey(data, Key.pageUp)) this.scroll(-this.bodyRows());
		else if (matchesKey(data, Key.pageDown) || data === " ") this.scroll(this.bodyRows());
		else if (matchesKey(data, Key.home)) this.offset = 0;
		else if (matchesKey(data, Key.end)) this.scroll(this.lines.length);
	}

	render(width: number): string[] {
		const p = this.preview;
		if (this.splitTooWide === undefined) {
			// split only when every line fits the terminal — otherwise stacked unified
			this.splitTooWide = this.splitLines.some((l) => visibleWidth(l) > width);
		}
		if (this.effectiveView() === "split" && this.splitTooWide) this.offset = 0;
		const rows = this.bodyRows();
		const max = Math.max(0, this.lines.length - rows);
		this.offset = Math.min(this.offset, max);

		const stats = this.theme.fg(
			"dim",
			` +${p.diff.added} -${p.diff.removed} · ${p.toolName} · ${p.path}`,
		);
		const header = [
			this.theme.bold(this.theme.fg("accent", "approve-diffs")) + stats,
			...p.warnings.map((w) => this.theme.fg("warning", ` ⚠ ${w}`)),
		];

		const window_ = this.lines.slice(this.offset, this.offset + rows).map((l) => truncateToWidth(l, width));
		const shown = `(${this.offset + 1}–${Math.min(this.lines.length, this.offset + rows)}/${this.lines.length})`;
		const scrolled = this.lines.length > rows ? ` ${shown}` : "";

		let footer: string;
		if (this.mode === "steer") {
			footer =
				this.theme.fg("accent", ` steer > ${this.steerBuffer}█`) +
				this.theme.fg("dim", "  (enter send · esc cancel)");
		} else {
			footer = this.theme.fg(
				"dim",
				` enter approve · a always (session) · n decline · s steer · tab ${this.effectiveView() === "split" ? "unified" : "split"}${scrolled}`,
			);
		}

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
): Promise<Decision> {
	const [splitLines, unifiedLines] = await Promise.all([
		renderView(preview, "split"),
		renderView(preview, "unified"),
	]);

	// width/balance-aware default, mirroring pi-diff's own wrapper
	const initialView: "split" | "unified" =
		shouldUseSplit(preview.diff, process.stdout.columns ?? 120) && !splitLines.some((l) => l.length === 0)
			? "split"
			: "unified";

	return ctx.ui.custom<Decision>(
		(tui, theme, _kb, done) =>
			new ApprovalScreen({ tui, theme, preview, splitLines, unifiedLines, initialView, done }),
		// no overlay: pi docks the component into the editor slot at the bottom of the screen
	);
}
