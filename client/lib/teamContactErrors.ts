/**
 * Typed error for the team-contact / linking API. Lives apart from
 * teamContactsApi.ts so `instanceof` still works in modules whose tests mock
 * that API module wholesale.
 */
export type TeamContactErrorCode =
  | "SELF_LINK"
  | "DUPLICATE_LINK"
  | "NO_IDENTIFIER_MATCH"
  | "CONTACT_ALREADY_LINKED"
  | "LINKED_IDENTIFIERS_LOCKED"
  | "INVITE_COOLDOWN";

export class TeamContactApiError extends Error {
  readonly status: number;
  readonly code?: TeamContactErrorCode;
  readonly conflictingContactId?: string;
  readonly conflictingDisplayName?: string;
  readonly lockedFields?: string[];

  constructor(
    message: string,
    status: number,
    body?: {
      code?: string;
      conflictingContactId?: string;
      conflictingDisplayName?: string;
      lockedFields?: string[];
    },
  ) {
    super(message);
    this.name = "TeamContactApiError";
    this.status = status;
    this.code = body?.code as TeamContactErrorCode | undefined;
    this.conflictingContactId = body?.conflictingContactId;
    this.conflictingDisplayName = body?.conflictingDisplayName;
    this.lockedFields = body?.lockedFields;
  }
}

/** Build a TeamContactApiError from a non-OK fetch Response. */
export async function teamContactErrorFromResponse(
  res: Response,
  fallback: string,
): Promise<TeamContactApiError> {
  const body = (await res.json().catch(() => ({}))) as {
    error?: string;
    code?: string;
    conflictingContactId?: string;
    conflictingDisplayName?: string;
    lockedFields?: string[];
  };
  return new TeamContactApiError(body.error || fallback, res.status, body);
}
