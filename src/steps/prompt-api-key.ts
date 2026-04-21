import { password, isCancel } from "@clack/prompts";
import { InstallError, ExitCode } from "../errors.js";

export async function promptApiKey(): Promise<string> {
  const value = await password({
    message: "Paste your Anthropic API key (starts with sk-ant-)",
    mask: "•",
    validate: (v) => {
      if (!v) return "Required";
      if (!v.startsWith("sk-ant-")) {
        return "Expected a key starting with sk-ant-";
      }
      if (v.length < 30) return "That looks too short";
      return undefined;
    },
  });
  if (isCancel(value)) {
    throw new InstallError(
      "User canceled at API key prompt.",
      ExitCode.USER_CANCELED,
      "Re-run create-cascade when ready."
    );
  }
  return value as string;
}
