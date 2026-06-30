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

export type ClientLite = { id: string; name: string; unit: string | null; cnpj?: string | null };
export type TechnicianLite = {
  id: string;
  full_name: string;
  role: string | null;
  hourly_rate_cents?: number | null;
  phone?: string | null;
  email?: string | null;
  cpf?: string | null;
  specialty?: string | null;
  active?: boolean | null;
  hourly_rate_50_cents?: number | null;
  hourly_rate_100_cents?: number | null;
  pricing_notes?: string | null;
  internal_notes?: string | null;
  default_availability?: string | null;
  kind?: string | null;
  user_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
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
  cnpj?: string | null;
  distance_km_from_base?: number | null;
  default_displacement_rate_cents?: number | null;
  default_displacement_type?: "km" | "fixed" | "none" | null;
};

export type ServiceOrderSignature = {
  id: string;
  service_order_id: string;
  signed_by_name: string;
  signed_by_role: string | null;
  signature_data_url: string | null;
  signature_path: string | null;
  signed_at: string;
  collected_by: string | null;
  collected_by_name?: string | null;
  signature_hash: string | null;
  user_agent?: string | null;
  geo_lat?: number | null;
  geo_lng?: number | null;
  revoked_at: string | null;
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
  signature?: ServiceOrderSignature | null;
  signature_waiver_reason?: string | null;
  signature_waived_by?: string | null;
  signature_waived_at?: string | null;
};
