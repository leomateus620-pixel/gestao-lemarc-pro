export type DisplacementType = "none" | "per_km" | "fixed";

export const displacementTypeLabel: Record<DisplacementType, string> = {
  none: "Sem deslocamento",
  per_km: "Por quilometragem",
  fixed: "Valor fixo",
};

export type LaborEntry = {
  id: string;
  service_order_id: string;
  technician_id: string | null;
  role: string | null;
  work_date: string; // YYYY-MM-DD
  start_time: string; // HH:mm or HH:mm:ss
  end_time: string;
  duration_minutes: number;
  hourly_rate_cents: number;
  subtotal_cents: number;
  description: string | null;
  technician?: { id: string; full_name: string; role: string | null } | null;
};

export type OrderFinancials = {
  service_order_id: string;
  total_labor_minutes: number;
  total_labor_cents: number;
  displacement_type: DisplacementType;
  displacement_count: number;
  displacement_km_total: number;
  displacement_rate_cents: number;
  displacement_total_cents: number;
  displacement_notes: string | null;
  materials_total_cents: number;
  grand_total_cents: number;
  notes: string | null;
  finalized_at: string | null;
  finalized_by: string | null;
  labor_entries_adjusted_at: string | null;
  labor_entries_adjusted_by: string | null;
};

export type LaborEntryInput = {
  id?: string;
  technician_id: string;
  role?: string | null;
  work_date: string;
  start_time: string;
  end_time: string;
  hourly_rate_cents: number;
  description?: string | null;
};

export type DisplacementInput = {
  type: DisplacementType;
  count: number;
  km_total: number;
  rate_cents: number;
  fixed_total_cents: number;
  notes?: string | null;
};

export type FinalizeOrderInput = {
  order_id: string;
  entries: LaborEntryInput[];
  displacement: DisplacementInput;
  materials_total_cents: number;
  notes?: string | null;
};