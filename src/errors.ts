export enum ExitCode {
  OK = 0,
  PREREQS_MISSING = 1,
  ONEPASSWORD_FAILURE = 2,
  CLONE_FAILURE = 3,
  INSTALL_FAILURE = 4,
  SMOKE_FAILURE = 5,
  USER_CANCELED = 6,
  UNKNOWN = 99,
}

export class InstallError extends Error {
  readonly code: ExitCode;
  readonly remediation: string;

  constructor(message: string, code: ExitCode, remediation: string) {
    super(message);
    this.name = "InstallError";
    this.code = code;
    this.remediation = remediation;
  }
}
