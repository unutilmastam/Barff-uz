/** B2B lead holatlari (CLAUDE.md §9). */
export const LEAD_STATUSES = [
  'NEW',
  'CONTACTED',
  'QUALIFIED',
  'NEGOTIATION',
  'CONVERTED',
  'REJECTED',
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_STATUS_TRANSITIONS = {
  NEW: ['CONTACTED', 'REJECTED'],
  CONTACTED: ['QUALIFIED', 'REJECTED'],
  QUALIFIED: ['NEGOTIATION', 'REJECTED'],
  NEGOTIATION: ['CONVERTED', 'REJECTED'],
  CONVERTED: [],
  REJECTED: [],
} as const satisfies Record<LeadStatus, readonly LeadStatus[]>;

export function canTransitionLead(from: LeadStatus, to: LeadStatus): boolean {
  return (LEAD_STATUS_TRANSITIONS[from] as readonly LeadStatus[]).includes(to);
}
