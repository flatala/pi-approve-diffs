// Minimal type shims so `tsc --noEmit` works without installing pi's heavy
// packages locally. At runtime pi injects the real modules for these peers.

declare module "@earendil-works/pi-coding-agent" {
	export interface ExtensionUI {
		custom<T>(factory: (tui: unknown, theme: unknown, keybindings: unknown, done: (value: T) => void) => unknown, options?: unknown): Promise<T>;
		input(title: string, placeholder?: string): Promise<string | undefined>;
		notify(message: string, level?: "info" | "warning" | "error"): void;
		confirm(title: string, message: string): Promise<boolean>;
	}

	export interface ExtensionContext {
		hasUI: boolean;
		ui: ExtensionUI;
		[key: string]: unknown;
	}

	export interface ToolCallEvent {
		toolName: string;
		toolCallId: string;
		input: Record<string, unknown>;
		[key: string]: unknown;
	}

	export interface ExtensionAPI {
		on(event: "tool_call", handler: (event: ToolCallEvent, ctx: ExtensionContext) => Promise<{ block: boolean; reason?: string } | void>): void;
		on(event: string, handler: (event: unknown, ctx: ExtensionContext) => unknown): void;
		registerCommand(name: string, options: { description?: string; handler: (args: string | undefined, ctx: ExtensionContext) => void | Promise<void> }): void;
		[key: string]: unknown;
	}
}

declare module "@earendil-works/pi-tui" {
	export interface Component {
		render(width: number): string[];
		handleInput?(data: string): void;
		invalidate(): void;
	}

	export interface ThemeLike {
		fg(name: string, text: string): string;
		bold(text: string): string;
		bg?(name: string, text: string): string;
	}

	export const Key: Record<string, string>;
	export function matchesKey(data: string, key: string): boolean;
	export function truncateToWidth(text: string, width: number, ellipsis?: string): string;
	export function visibleWidth(text: string): number;
}
