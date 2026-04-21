import { intro, outro, note, log, confirm, isCancel } from "@clack/prompts";
import { detectOS } from "./steps/detect-os.js";
import { checkPrereqs } from "./steps/check-prereqs.js";
import {
  defaultWslConfig,
  writeWslConfig,
  wslConfigPath,
} from "./steps/write-wsl-config.js";
import { promptInstallPath } from "./steps/prompt-install-path.js";
import { cloneRepo } from "./steps/clone-repo.js";
import { installDeps } from "./steps/install-deps.js";
import { ensureOpSignin } from "./steps/ensure-op-signin.js";
import { promptApiKey } from "./steps/prompt-api-key.js";
import {
  ensureCascadeVault,
  bootstrapCascadeRuntimeItem,
} from "./steps/bootstrap-vault.js";
import { writeEnv } from "./steps/write-env.js";
import { installClaudeHooks } from "./steps/install-hooks.js";
import { initDb } from "./steps/init-db.js";
import { smokeTest } from "./steps/smoke-test.js";
import { printSuccess } from "./steps/print-success.js";
import { InstallError, ExitCode } from "./errors.js";

interface CliFlags {
  skipSmoke: boolean;
}

function parseFlags(argv: string[]): CliFlags {
  return {
    skipSmoke: argv.includes("--skip-smoke"),
  };
}

export async function run(argv: string[] = process.argv.slice(2)): Promise<number> {
  const flags = parseFlags(argv);

  intro("create-cascade — Cascade bootstrap");

  try {
    // 1. OS detect
    const host = detectOS();
    log.info(`Detected host: ${host.os}`);

    // 2. Prereqs
    const prereqs = checkPrereqs(host.os);
    const missing = prereqs.filter((p) => !p.installed);
    if (missing.length > 0) {
      note(
        missing
          .map((p) => `  ${p.name}  →  ${p.installHint}`)
          .join("\n"),
        "Missing prerequisites"
      );
      throw new InstallError(
        "Install the missing prerequisites above, then re-run create-cascade.",
        ExitCode.PREREQS_MISSING,
        ""
      );
    }

    // 3. WSL config (opt-in)
    if (host.os === "wsl") {
      const wantWsl = await confirm({
        message:
          "Write safe .wslconfig defaults (raises page file limits, enables autoMemoryReclaim)?",
      });
      if (!isCancel(wantWsl) && wantWsl) {
        const cfg = defaultWslConfig();
        const written = writeWslConfig(cfg, wslConfigPath());
        log.success(
          `Wrote ${written} (memory=${cfg.memoryGb}GB, swap=${cfg.swapGb}GB). Run \`wsl --shutdown\` from PowerShell to apply.`
        );
      }
    }

    // 4. Install path
    const installPath = await promptInstallPath();

    // 5. Clone
    cloneRepo({ targetPath: installPath });
    log.success(`Cloned Cascade to ${installPath}`);

    // 6. Install deps
    installDeps(installPath);
    log.success("Installed deps");

    // 7. 1P ready check
    ensureOpSignin();

    // 8. Ensure vault + API key
    ensureCascadeVault();
    const apiKey = await promptApiKey();
    const ref = bootstrapCascadeRuntimeItem({ anthropic_api_key: apiKey });
    log.success("Stored API key in 1Password (Cascade/Cascade Runtime)");

    // 9. Write .env
    writeEnv(installPath, {
      anthropicKeyRef: ref,
      projectsDir: "~/projects",
    });
    log.success(".env written with op:// references");

    // 10. Hooks + DB
    installClaudeHooks(installPath);
    log.success("Claude Code Stop hook wired to Cascade webhook");
    initDb(installPath);
    log.success("SQLite initialized");

    // 11. Smoke
    if (!flags.skipSmoke) {
      log.step("Running smoke test…");
      await smokeTest({ cascadeDir: installPath });
      log.success("Smoke test passed");
    }

    // 12. Done
    printSuccess({
      url: "http://localhost:3000",
      installPath,
      vaultItem: "Cascade/Cascade Runtime",
    });
    outro("Happy dispatching.");
    return ExitCode.OK;
  } catch (err) {
    if (err instanceof InstallError) {
      log.error(err.message);
      if (err.remediation) log.info(err.remediation);
      outro(`Stopped — exit code ${err.code}.`);
      return err.code;
    }
    const msg = err instanceof Error ? err.message : String(err);
    log.error(`Unexpected error: ${msg}`);
    outro("Stopped — exit code 99.");
    return ExitCode.UNKNOWN;
  }
}

// Direct invocation
if (import.meta.url === `file://${process.argv[1]}`) {
  run().then((code) => process.exit(code));
}
