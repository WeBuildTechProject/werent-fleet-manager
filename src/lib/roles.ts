import type { AppRole } from "@/lib/gestionale";

/**
 * Gerarchia dei ruoli, dal privilegio più alto al più basso.
 * Serve sia per il badge in AdminShell (mostra il ruolo più alto, non il primo
 * restituito dalla query) sia per risolvere i permessi.
 */
export const rolePriority: AppRole[] = [
  "super_admin",
  "admin",
  "responsabile_sede",
  "contabilita",
  "front_desk",
  "manutentore",
];

export function highestRole(roles: AppRole[] | undefined | null): AppRole | null {
  if (!roles || roles.length === 0) return null;
  for (const role of rolePriority) if (roles.includes(role)) return role;
  return roles[0] ?? null;
}

/** Sezioni del gestionale soggette a controllo di accesso. */
export type Section =
  | "dashboard"
  | "analytics"
  | "calendario"
  | "prenotazioni"
  | "veicoli"
  | "partner"
  | "clienti"
  | "fatture"
  | "tariffe"
  | "cargos"
  | "documenti_legali"
  | "utenti"
  | "verbali";

/** Capacità di scrittura/azione, indipendenti dalla visibilità della sezione. */
export type Capability =
  | "write_reservations"
  | "manage_blacklist"
  | "manage_roles"
  | "manage_pricing"
  | "manage_legal"
  | "view_sensitive_docs"
  | "manage_fleet";

const sectionAccess: Record<AppRole, Section[]> = {
  super_admin: [
    "dashboard",
    "analytics",
    "calendario",
    "prenotazioni",
    "veicoli",
    "partner",
    "clienti",
    "fatture",
    "tariffe",
    "cargos",
    "documenti_legali",
    "utenti",
    "verbali",
  ],
  admin: [
    "dashboard",
    "analytics",
    "calendario",
    "prenotazioni",
    "veicoli",
    "partner",
    "clienti",
    "fatture",
    "tariffe",
    "cargos",
    "documenti_legali",
    "utenti",
    "verbali",
  ],
  responsabile_sede: [
    "dashboard",
    "analytics",
    "calendario",
    "prenotazioni",
    "veicoli",
    "partner",
    "clienti",
    "fatture",
    "tariffe",
  ],
  front_desk: ["dashboard", "calendario", "prenotazioni", "veicoli", "clienti"],
  contabilita: ["dashboard", "analytics", "prenotazioni", "fatture", "clienti"],
  manutentore: ["veicoli"],
};

const capabilityAccess: Record<AppRole, Capability[]> = {
  super_admin: [
    "write_reservations",
    "manage_blacklist",
    "manage_roles",
    "manage_pricing",
    "manage_legal",
    "view_sensitive_docs",
    "manage_fleet",
  ],
  admin: ["write_reservations", "manage_blacklist", "manage_roles", "manage_pricing", "manage_legal", "view_sensitive_docs", "manage_fleet"],
  responsabile_sede: ["write_reservations", "manage_blacklist", "view_sensitive_docs", "manage_fleet"],
  front_desk: ["write_reservations", "view_sensitive_docs"],
  // Contabilità vede le prenotazioni in sola lettura.
  contabilita: [],
  manutentore: ["manage_fleet"],
};

export function canAccess(roles: AppRole[] | undefined | null, section: Section) {
  return (roles ?? []).some((role) => sectionAccess[role]?.includes(section));
}

export function hasCapability(roles: AppRole[] | undefined | null, capability: Capability) {
  return (roles ?? []).some((role) => capabilityAccess[role]?.includes(capability));
}

/** Prima sezione accessibile: usata per reindirizzare chi non può stare qui. */
export function landingSection(roles: AppRole[] | undefined | null): Section | null {
  const order: Section[] = [
    "dashboard",
    "analytics",
    "prenotazioni",
    "veicoli",
    "fatture",
    "clienti",
    "calendario",
    "partner",
    "tariffe",
    "cargos",
    "documenti_legali",
    "utenti",
    "verbali",
  ];
  return order.find((s) => canAccess(roles, s)) ?? null;
}
