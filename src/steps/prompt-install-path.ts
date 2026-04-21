import { text, isCancel } from "@clack/prompts";
import os from "node:os";
import path from "node:path";
import { InstallError, ExitCode } from "../errors.js";

export async function promptInstallPath(): Promise<string> {
  const def = path.join(os.homedir(), "Code", "cascade");
  const value = await text({
    message: "Where should Cascade be installed?",
    placeholder: def,
    initialValue: def,
    validate: (v) => {
      if (!v) return "Path is required";
      return undefined;
    },
  });
  if (isCancel(value)) {
    throw new InstallError(
      "User canceled at install path prompt.",
      ExitCode.USER_CANCELED,
      "Re-run create-cascade when ready."
    );
  }
  return path.resolve(value as string);
}
