import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Copy, KeyRound, Loader2, LogOut, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminManageTechnicianAccess } from "@/lib/api/adminUsers.functions";
import { generateStrongPassword, validateNewPassword } from "@/lib/auth/loginInput";

type Mode = "reset" | "revoke";

export function TechnicianAccessDialog({
  technicianId,
  technicianName,
  open,
  mode,
  onOpenChange,
}: {
  technicianId: string;
  technicianName: string;
  open: boolean;
  mode: Mode;
  onOpenChange: (open: boolean) => void;
}) {
  const manageFn = useServerFn(adminManageTechnicianAccess);
  const [password, setPassword] = useState("");
  const [revokeSessions, setRevokeSessions] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [doneMessage, setDoneMessage] = useState<string | null>(null);

  const reset = () => {
    setPassword("");
    setRevokeSessions(true);
    setConfirming(false);
    setDoneMessage(null);
  };

  const mutation = useMutation({
    mutationFn: () =>
      manageFn({
        data: {
          technicianId,
          password: mode === "reset" ? password : undefined,
          revokeSessions: mode === "revoke" ? true : revokeSessions,
        },
      }),
    onSuccess: () => {
      const message =
        mode === "revoke"
          ? `${technicianName} foi desconectado de todos os aparelhos.`
          : revokeSessions
            ? `Senha redefinida e aparelhos de ${technicianName} desconectados.`
            : `Senha de ${technicianName} redefinida.`;
      toast.success(message);
      setDoneMessage(message);
      setConfirming(false);
    },
    onError: (error: unknown) => {
      setConfirming(false);
      toast.error(error instanceof Error ? error.message : "Não foi possível concluir.");
    },
  });

  const passwordError = mode === "reset" && password ? validateNewPassword(password) : null;
  const canSubmit = mode === "revoke" || (password.length > 0 && !passwordError);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "reset" ? "Redefinir senha" : "Desconectar aparelhos"}</DialogTitle>
          <DialogDescription>
            {mode === "reset"
              ? `Defina uma nova senha de login para ${technicianName}.`
              : `Encerra o login de ${technicianName} em todos os aparelhos. Ele precisará entrar de novo.`}
          </DialogDescription>
        </DialogHeader>

        {mode === "reset" ? (
          <div className="space-y-3">
            <Label htmlFor="new-tech-password">Nova senha</Label>
            <div className="flex gap-2">
              <Input
                id="new-tech-password"
                type="text"
                autoComplete="new-password"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                value={password}
                disabled={mutation.isPending || Boolean(doneMessage)}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                className="font-mono"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                title="Copiar senha"
                aria-label="Copiar senha"
                disabled={!password}
                onClick={() => {
                  void navigator.clipboard?.writeText(password).then(
                    () => toast.success("Senha copiada"),
                    () => toast.error("Não foi possível copiar"),
                  );
                }}
              >
                <Copy className="size-4" />
              </Button>
            </div>
            {passwordError ? <p className="text-sm text-destructive">{passwordError}</p> : null}
            <Button
              type="button"
              variant="outline"
              disabled={mutation.isPending || Boolean(doneMessage)}
              onClick={() => setPassword(generateStrongPassword(12))}
            >
              <Wand2 className="size-4" /> Gerar senha forte
            </Button>
            <label className="flex items-start gap-2 text-sm">
              <Checkbox
                checked={revokeSessions}
                disabled={mutation.isPending || Boolean(doneMessage)}
                onCheckedChange={(v) => setRevokeSessions(v === true)}
                className="mt-0.5"
              />
              Também desconectar os aparelhos do técnico
            </label>
            <p className="text-xs text-muted-foreground">
              A senha não fica salva no sistema. Copie e passe ao técnico agora.
            </p>
          </div>
        ) : null}

        {doneMessage ? <p className="text-sm font-semibold">{doneMessage}</p> : null}
        {confirming && !doneMessage ? (
          <p className="text-sm font-semibold" role="alert">
            {mode === "reset"
              ? `Confirmar a nova senha de ${technicianName}?`
              : `Confirmar a desconexão de ${technicianName}?`}
          </p>
        ) : null}

        <DialogFooter>
          {doneMessage ? (
            <Button type="button" onClick={() => { reset(); onOpenChange(false); }}>Fechar</Button>
          ) : confirming ? (
            <>
              <Button type="button" variant="outline" disabled={mutation.isPending} onClick={() => setConfirming(false)}>Voltar</Button>
              <Button type="button" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
                {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : mode === "reset" ? <KeyRound className="size-4" /> : <LogOut className="size-4" />}
                Confirmar
              </Button>
            </>
          ) : (
            <Button type="button" disabled={!canSubmit} onClick={() => setConfirming(true)}>
              {mode === "reset" ? "Redefinir senha" : "Desconectar"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
