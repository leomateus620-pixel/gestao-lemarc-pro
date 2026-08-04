import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { wireTrayKeys } from "@/hooks/useWireTray";
import { createCompany } from "@/lib/api/clients.functions";

type QuickClientDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (clientId: string) => void | Promise<void>;
};

const emptyForm = {
  name: "",
  cnpj: "",
  city: "",
  state: "",
  address: "",
  phone: "",
  responsible_name: "",
};

export function QuickClientDialog({ open, onOpenChange, onCreated }: QuickClientDialogProps) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const create = useServerFn(createCompany);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const name = form.name.trim();
      if (name.length < 2) throw new Error("Informe o nome da empresa (mínimo 2 caracteres).");
      return create({
        data: {
          name,
          cnpj: form.cnpj.trim() || null,
          city: form.city.trim() || null,
          state: form.state.trim() || null,
          address: form.address.trim() || null,
          phone: form.phone.trim() || null,
          responsible_name: form.responsible_name.trim() || null,
        },
      });
    },
    onSuccess: async (row) => {
      await queryClient.invalidateQueries({ queryKey: wireTrayKeys.orderOptions });
      queryClient.invalidateQueries({ queryKey: ["clients", "full"] });
      toast.success("Empresa cadastrada e selecionada no pedido.");
      setForm(emptyForm);
      setError(null);
      onOpenChange(false);
      await onCreated(row.id);
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Não foi possível cadastrar a empresa.");
    },
  });

  function update(key: keyof typeof emptyForm, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setError(null);
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova empresa</DialogTitle>
          <DialogDescription>
            Cadastro rápido. A empresa passa a ficar disponível também nas ordens de serviço.
          </DialogDescription>
        </DialogHeader>

        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            mutation.mutate();
          }}
        >
          {error ? (
            <div
              className="flex gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800"
              role="alert"
            >
              <AlertTriangle size={17} className="mt-0.5 shrink-0" />
              {error}
            </div>
          ) : null}

          <label className="wire-field">
            <span className="wire-label">Nome da empresa *</span>
            <input
              className="wire-input text-base font-semibold"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="Razão social ou nome fantasia"
              autoFocus
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="wire-field">
              <span className="wire-label">CNPJ</span>
              <input
                className="wire-input"
                value={form.cnpj}
                onChange={(e) => update("cnpj", e.target.value)}
                placeholder="Opcional"
                inputMode="numeric"
              />
            </label>
            <label className="wire-field">
              <span className="wire-label">Telefone</span>
              <input
                className="wire-input"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                placeholder="Opcional"
              />
            </label>
            <label className="wire-field">
              <span className="wire-label">Cidade</span>
              <input
                className="wire-input"
                value={form.city}
                onChange={(e) => update("city", e.target.value)}
              />
            </label>
            <label className="wire-field">
              <span className="wire-label">Estado (UF)</span>
              <input
                className="wire-input"
                value={form.state}
                onChange={(e) => update("state", e.target.value.toUpperCase().slice(0, 2))}
                maxLength={2}
              />
            </label>
          </div>

          <label className="wire-field">
            <span className="wire-label">Endereço</span>
            <input
              className="wire-input"
              value={form.address}
              onChange={(e) => update("address", e.target.value)}
            />
          </label>

          <label className="wire-field">
            <span className="wire-label">Responsável</span>
            <input
              className="wire-input"
              value={form.responsible_name}
              onChange={(e) => update("responsible_name", e.target.value)}
            />
          </label>

          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <button
              type="button"
              className="wire-button-secondary"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              Cancelar
            </button>
            <button type="submit" className="wire-button-primary" disabled={mutation.isPending}>
              {mutation.isPending ? <Loader2 size={16} className="animate-spin" /> : null}
              {mutation.isPending ? "Salvando..." : "Cadastrar e selecionar"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
