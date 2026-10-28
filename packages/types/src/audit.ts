/**
 * Audit jurnali qatori (CLAUDE.md §23, S38).
 *
 * `before`/`after` — YOZISH paytida `redact` dan o'tgan qiymatlar;
 * parol, token va xeshlar bu yerga hech qachon tushmaydi.
 */
export interface AuditLogEntry {
  id: string;
  createdAt: string;
  action: string;
  entity: string;
  entityId: string | null;
  actorId: string | null;
  actorEmail: string | null;
  before: unknown;
  after: unknown;
  ip: string | null;
  userAgent: string | null;
  requestId: string | null;
}

export interface AuditFacets {
  actions: string[];
  entities: string[];
}
