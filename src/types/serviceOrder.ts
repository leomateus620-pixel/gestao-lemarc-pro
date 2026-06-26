export type ServiceOrderStatus =
  | "pending"
  | "dispatched"
  | "transit"
  | "running"
  | "finished"
  | "review"
  | "approved"
  | "cancelled";

export type ServicePriority = "baixa" | "media" | "alta" | "urgente";

export type ServiceType =
  | "mecanica"
  | "eletrica"
  | "automacao"
  | "montagem"
  | "instalacao"
  | "visita"
  | "emergencia"
  | "outro";

export const serviceTypeLabel: Record<ServiceType, string> = {
  mecanica: "Manutenção Mecânica",
  eletrica: "Manutenção Elétrica",
  automacao: "Automação Industrial",
  montagem: "Montagem Industrial",
  instalacao: "Instalação",
  visita: "Visita Técnica",
  emergencia: "Emergência",
  outro: "Outro",
};

export const priorityLabel: Record<ServicePriority, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  urgente: "Urgente",
};

export const statusLabel: Record<ServiceOrderStatus, string> = {
  pending: "Pendente",
  dispatched: "Despachada",
  transit: "Em deslocamento",
  running: "Em execução",
  finished: "Finalizada",
  review: "Aguardando revisão",
  approved: "Aprovada",
  cancelled: "Cancelada",
};

export type ClientLite = { id: string; name: string; unit: string | null };
export type TechnicianLite = {
  id: string;
  full_name: string;
  role: string | null;
  hourly_rate_cents?: number | null;
};
export type AssignedTechnician = TechnicianLite & {
  is_primary: boolean;
  /** Função do técnico nesta OS (técnico, auxiliar, responsável…). */
  assignment_role?: string | null;
};
export type ClientUnitLite = {
  id: string;
  name: string;
  sector: string | null;
  city: string | null;
  state: string | null;
};

export type ServiceOrder = {
  id: string;
  number: number;
  title: string;
  description: string | null;
  client_id: string | null;
  client_unit_id: string | null;
  technician_id: string | null;
  service_type: ServiceType | null;
  service_type_other: string | null;
  priority: ServicePriority | null;
  status: ServiceOrderStatus;
  location: string | null;
  requester_name: string | null;
  scheduled_for: string | null;
  opened_at: string;
  started_at: string | null;
  finished_at: string | null;
  approved_at: string | null;
  closed_at: string | null;
  hour_rate: number | null;
  worked_minutes: number | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  client: ClientLite | null;
  technician: TechnicianLite | null;
  /**
   * Many-to-many list of technicians assigned to the order. The legacy
   * `technician` field is kept for back-compat — when this array is empty
   * but `technician` exists, treat that single record as the primary
   * technician (see `getOrderTechnicians`).
   */
  technicians: AssignedTechnician[];
  client_unit: ClientUnitLite | null;
};