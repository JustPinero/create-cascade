import fs from "node:fs";
import path from "node:path";

export interface EnvEntries {
  anthropicKeyRef: string;
  projectsDir: string;
  knowledgeDir?: string;
  databaseUrl?: string;
}

/**
 * Build the .env content for a Cascade install.
 * Secrets are referenced by op:// URIs; literals stay as literals.
 */
export function buildEnvContent(entries: EnvEntries): string {
  const lines = [
    `ANTHROPIC_API_KEY=${entries.anthropicKeyRef}`,
    `PROJECTS_DIR=${entries.projectsDir}`,
    `CASCADE_KNOWLEDGE_DIR=${entries.knowledgeDir ?? "./knowledge"}`,
    `DATABASE_URL="${entries.databaseUrl ?? "file:./dev.db"}"`,
  ];
  return lines.join("\n") + "\n";
}

/**
 * Write the .env file inside a cloned Cascade directory.
 * Returns the absolute path written.
 */
export function writeEnv(cascadeDir: string, entries: EnvEntries): string {
  const target = path.join(cascadeDir, ".env");
  fs.writeFileSync(target, buildEnvContent(entries), "utf-8");
  return target;
}
