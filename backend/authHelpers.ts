import { QueryCtx, MutationCtx } from "./_generated/server";

export type Role =
  | "citizen"
  | "authority"
  | "rescue_team"
  | "medical_team"
  | "administrator"
  | "responder"
  | "authority_command"
  | "resource_manager";

/**
 * Validates backend role authorization.
 * Ensures clients cannot perform unauthorized administrative/operational mutations.
 */
export function validateRole(
  role: string | undefined | null,
  allowedRoles: Role[]
): void {
  if (!role) {
    throw new Error("UNAUTHORIZED: User role must be specified for this operational mutation.");
  }

  // Normalize role aliases (frontend uses authority_command/responder/resource_manager)
  const normalizedRole = role.toLowerCase();
  const isAllowed = allowedRoles.some((allowed) => {
    const a = allowed.toLowerCase();
    if (a === normalizedRole) return true;
    if (a === "authority" && (normalizedRole === "authority_command" || normalizedRole === "administrator")) return true;
    if (a === "rescue_team" && (normalizedRole === "responder" || normalizedRole === "rescue_team")) return true;
    if (a === "administrator" && normalizedRole === "administrator") return true;
    return false;
  });

  if (!isAllowed) {
    throw new Error(
      `FORBIDDEN: Role '${role}' is not authorized to perform this operation. Allowed: ${allowedRoles.join(", ")}`
    );
  }
}

/**
 * Check if role is authority or admin
 */
export function isAuthorityOrAdmin(role: string | undefined | null): boolean {
  if (!role) return false;
  const r = role.toLowerCase();
  return r === "authority" || r === "authority_command" || r === "administrator" || r === "resource_manager";
}

/**
 * Check if role is responder or rescue team
 */
export function isResponder(role: string | undefined | null): boolean {
  if (!role) return false;
  const r = role.toLowerCase();
  return r === "responder" || r === "rescue_team" || r === "medical_team" || r === "authority_command" || r === "administrator";
}
