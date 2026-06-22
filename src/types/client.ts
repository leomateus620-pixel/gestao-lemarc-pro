export type ClientUnit = {
  id: string;
  client_id: string;
  name: string;
  is_primary: boolean;
  sector: string | null;
  city: string | null;
  state: string | null;
  address: string | null;
  responsible_name: string | null;
  phone: string | null;
  notes: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type ClientFull = {
  id: string;
  name: string;
  cnpj: string | null;
  segment: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  email: string | null;
  responsible_name: string | null;
  notes: string | null;
  active: boolean;
  unit: string | null;
  created_at: string;
  updated_at: string;
};

export type ClientUnitInput = {
  name: string;
  sector?: string | null;
  city?: string | null;
  state?: string | null;
  address?: string | null;
  responsible_name?: string | null;
  phone?: string | null;
  notes?: string | null;
  is_primary?: boolean;
};