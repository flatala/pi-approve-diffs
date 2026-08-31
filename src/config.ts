import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export type Config = {
	enabled: boolean;
	/** Render approved changes as highlighted result boxes (vendored pi-diff machinery). */
	results: boolean;
};

export function configPath(): string {
	const agentDir = process.env.PI_CODING_AGENT_DIR ?? join(homedir(), ".pi", "agent");
	return join(agentDir, "extensions", "pi-approve-diffs.json");
}

export function loadConfig(): Config {
	try {
		const raw = JSON.parse(readFileSync(configPath(), "utf8")) as Partial<Config>;
		return {
			enabled: raw.enabled !== false,
			results: raw.results !== false,
		};
	} catch {
		return { enabled: true, results: true };
	}
}

export function saveConfig(config: Config): void {
	try {
		mkdirSync(dirname(configPath()), { recursive: true });
		writeFileSync(configPath(), JSON.stringify(config, null, 2) + "\n");
	} catch {
		// best-effort persistence
	}
}
