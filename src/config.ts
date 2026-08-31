import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export type Config = {
	enabled: boolean;
	defaultView: "auto" | "split" | "unified";
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
			defaultView:
				raw.defaultView === "split" || raw.defaultView === "unified" ? raw.defaultView : "auto",
		};
	} catch {
		return { enabled: true, defaultView: "auto" };
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
