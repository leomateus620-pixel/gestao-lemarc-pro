/* eslint-disable react-refresh/only-export-components -- fixture isolada para validação responsiva */
import { createRoot, type Root } from "react-dom/client";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarClock,
  Check,
  ClipboardCheck,
  Clock,
  HardHat,
  Home,
  LogOut,
  MapPin,
  Search,
  UserRound,
} from "lucide-react";
import "./nova-os-responsive.css";

declare global {
  interface Window {
    __novaOsFixtureRoot?: Root;
  }
}

const steps = [
  "Dados iniciais",
  "Cliente e unidade",
  "Solicitante e técnicos",
  "Serviço e prioridade",
  "Revisão final",
];

function Header({ detail = false }: { detail?: boolean }) {
  return (
    <header className="lemarc-app-header fixed inset-x-0 top-0 px-3 pt-[calc(env(safe-area-inset-top)+0.5rem)] sm:px-6 lg:px-8">
      <div className={detail ? "mx-auto w-full max-w-7xl" : "mx-auto w-full max-w-5xl"}>
        <div className="lemarc-form-topbar rounded-[1.15rem] px-2.5 py-2 sm:rounded-2xl sm:px-3 sm:py-2.5">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button
              className="grid size-11 shrink-0 place-items-center rounded-xl border border-white/15 bg-white/[0.08]"
              aria-label="Voltar"
            >
              <ArrowLeft size={18} />
            </button>
            <p className="min-w-0 flex-1 truncate font-display text-sm font-bold text-white">
              {detail ? "Ordem de serviço" : "Nova ordem de serviço"}
            </p>
            <span className="grid size-8 shrink-0 place-items-center rounded-full border border-primary/45 bg-primary/18 text-[10px] font-bold text-primary">
              LM
            </span>
            <button
              className="grid size-11 shrink-0 place-items-center rounded-xl border border-white/12 bg-white/[0.07] text-slate-300"
              aria-label="Sair"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

function Stepper() {
  return (
    <nav aria-label="Etapas da criação da ordem de serviço" className="lemarc-wizard-stepper">
      <div className="lemarc-wizard-progress" aria-hidden="true">
        <span style={{ width: "25%" }} />
      </div>
      <ol className="grid grid-cols-5 gap-1 sm:gap-2">
        {steps.map((label, index) => (
          <li className="relative min-w-0" key={label}>
            <button
              className="lemarc-wizard-step"
              data-state={index === 0 ? "complete" : index === 1 ? "current" : "future"}
              disabled={index > 1}
              aria-current={index === 1 ? "step" : undefined}
            >
              <span className="lemarc-wizard-step-index">
                {index === 0 ? <Check size={15} /> : index + 1}
              </span>
              <span className="lemarc-wizard-step-copy">
                <span className="sm:hidden">
                  {["Dados", "Cliente", "Equipe", "Serviço", "Revisão"][index]}
                </span>
                <span className="hidden sm:inline">{label}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>
      <p className="mt-2 text-center text-xs font-semibold text-slate-200 sm:hidden">
        Etapa 2 de 5 · Cliente e unidade
      </p>
    </nav>
  );
}

function WizardFixture() {
  return (
    <div className="lemarc-app-bg min-h-[100dvh] overflow-x-hidden">
      <Header />
      <main className="lemarc-shell-main lemarc-shell-main--form mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="lemarc-os-wizard mx-auto mt-1 w-full max-w-5xl space-y-4 sm:space-y-5">
          <Stepper />
          <section className="lemarc-os-wizard-surface space-y-5 p-4 sm:p-6 lg:p-7">
            <div>
              <p className="lemarc-context-label">Etapa 2 · Cliente</p>
              <h1 className="mt-1 font-display text-xl font-bold text-white sm:text-2xl">
                Para quem é esta ordem?
              </h1>
              <p className="lemarc-form-help mt-1.5 text-sm">
                Selecione um cliente existente ou cadastre um novo sem sair do fluxo.
              </p>
            </div>
            <div className="lemarc-selected-summary flex items-start gap-3 rounded-xl px-3.5 py-3">
              <Check className="mt-0.5 shrink-0 text-emerald-300" size={18} />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-emerald-200">Cliente selecionado</p>
                <p className="break-words text-sm font-semibold text-white">
                  Indústria Brasileira de Equipamentos e Manutenção Preventiva Ltda.
                </p>
                <p className="text-xs text-slate-300">
                  Unidade Industrial Norte · 12.345.678/0001-90
                </p>
              </div>
            </div>
            <div className="relative">
              <Search
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300"
                size={15}
              />
              <input
                className="lemarc-form-control h-12 w-full rounded-xl pl-10 text-base"
                placeholder="Buscar cliente ou unidade…"
              />
            </div>
            <div className="flex justify-between text-xs text-slate-300">
              <span>3 resultados</span>
              <button className="min-h-11 px-2 font-semibold text-primary">Limpar busca</button>
            </div>
            <div className="lemarc-selection-list space-y-1.5">
              {[
                "Indústria Brasileira de Equipamentos e Manutenção Preventiva Ltda.",
                "Metalúrgica Horizonte",
                "Compressores São Paulo",
              ].map((name, index) => (
                <button
                  key={name}
                  className={`lemarc-selection-row flex w-full items-center justify-between gap-3 rounded-lg border px-3.5 py-3 text-left ${index === 0 ? "lemarc-choice-card-active" : "lemarc-choice-card"}`}
                >
                  <span className="min-w-0">
                    <span className="block break-words text-sm font-semibold text-white">
                      {name}
                    </span>
                    <span className="block text-xs text-slate-300">Unidade {index + 1}</span>
                  </span>
                  {index === 0 && (
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
                      <Check size={14} />
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div className="border-t border-white/10 pt-5">
              <p className="text-sm font-semibold text-white">Unidade do cliente</p>
              <p className="mt-0.5 text-xs text-slate-300">
                Vinculada ao cliente selecionado acima.
              </p>
              <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
                <button className="lemarc-selection-row min-h-11 rounded-lg border px-3 text-left text-xs font-semibold lemarc-choice-card">
                  Sem unidade específica
                </button>
                <button className="lemarc-selection-row min-h-11 rounded-lg border px-3 text-left text-xs font-semibold lemarc-choice-card-active">
                  Unidade Industrial Norte
                </button>
              </div>
            </div>
          </section>
          <div className="lemarc-form-flow-actions pointer-events-none fixed inset-x-0 bottom-0 z-40 pt-3 md:static md:z-auto">
            <div className="pointer-events-auto border-t border-white/10 bg-[oklch(0.13_0.034_252)]">
              <div className="mx-auto flex max-w-5xl gap-2 px-4 pb-[calc(env(safe-area-inset-bottom)+0.625rem)] pt-2.5">
                <button className="lemarc-secondary-action flex h-12 items-center gap-2 rounded-xl px-5 font-semibold">
                  <ArrowLeft size={16} /> Voltar
                </button>
                <button className="lemarc-primary-action flex h-12 flex-1 items-center justify-center gap-2 rounded-xl px-5 font-semibold">
                  <ArrowRight size={17} /> Continuar
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function DetailField({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Building2;
  label: string;
  children: string;
}) {
  return (
    <div className="lemarc-os-summary-field">
      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon size={13} className="text-primary" />
        {label}
      </dt>
      <dd className="mt-1 break-words text-sm font-semibold text-foreground">{children}</dd>
    </div>
  );
}

function DetailFixture() {
  return (
    <div className="lemarc-app-bg min-h-[100dvh] overflow-x-hidden">
      <Header detail />
      <main className="lemarc-shell-main lemarc-shell-main--nav mx-auto w-full px-4 sm:px-6 lg:px-8">
        <div className="lemarc-os-detail mx-auto max-w-7xl">
          <div className="lemarc-os-detail-primary mt-1 lg:grid-cols-[1fr_20rem]">
            <section className="lemarc-os-detail-summary">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-primary">Manutenção mecânica</p>
                  <h1 className="mt-1 break-words font-display text-xl font-bold text-foreground sm:text-2xl">
                    <span className="tabular-nums">OS #1842</span> · Manutenção preventiva do
                    compressor principal
                  </h1>
                </div>
                <span className="lemarc-status-chip lemarc-status-chip--running">Em execução</span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="lemarc-detail-chip">
                  Prioridade <strong>Alta</strong>
                </span>
                <span className="lemarc-detail-chip">Aberta 11/07/2026 14:30</span>
              </div>
              <dl className="lemarc-os-summary-grid mt-4">
                <DetailField icon={Building2} label="Cliente">
                  Indústria Brasileira de Equipamentos Ltda.
                </DetailField>
                <DetailField icon={Building2} label="Unidade">
                  Unidade Industrial Norte · Campinas/SP
                </DetailField>
                <DetailField icon={HardHat} label="Técnico responsável">
                  Carlos Alberto de Souza e Mariana Oliveira
                </DetailField>
                <DetailField icon={UserRound} label="Solicitante">
                  Fernanda Almeida
                </DetailField>
                <DetailField icon={Clock} label="Previsão de início">
                  11/07/2026, 15:00
                </DetailField>
                <DetailField icon={MapPin} label="Local / setor">
                  Casa de máquinas — linha de produção 4
                </DetailField>
              </dl>
            </section>
            <aside className="lemarc-os-next-action">
              <p className="text-xs font-semibold text-primary">Próxima ação</p>
              <h2 className="mt-1 font-display text-lg font-bold text-foreground">
                Finalizar serviço
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Avance a OS para a próxima etapa operacional.
              </p>
              <button className="lemarc-primary-action mt-4 flex min-h-14 w-full items-center justify-center gap-2 rounded-xl font-semibold">
                <ClipboardCheck size={18} /> Finalizar serviço
              </button>
            </aside>
          </div>
          <section className="lemarc-os-time-control glass-card mt-4 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-primary">Controle de tempo da OS</p>
                <h2 className="mt-1 font-display text-lg font-bold text-foreground tabular-nums">
                  Total trabalhado: 03:42
                </h2>
              </div>
              <span className="lemarc-status-chip lemarc-status-chip--running">Em execução</span>
            </div>
            <div className="mt-4 rounded-xl border border-primary/40 bg-primary/5 p-3">
              <p className="text-sm font-semibold text-foreground">Carlos Alberto de Souza</p>
              <p className="text-xs text-muted-foreground">
                <Clock size={11} className="inline" /> Trabalhadas: 02:18 · Iniciada às 14:30
              </p>
              <button className="lemarc-secondary-action mt-3 min-h-11 rounded-xl px-4 font-semibold">
                Pausar serviço
              </button>
            </div>
          </section>
        </div>
      </main>
      <nav className="lemarc-bottom-nav fixed inset-x-0 bottom-0 flex justify-center">
        <div className="lemarc-bottom-nav-shell mx-auto mb-2 grid w-full max-w-lg grid-cols-4 gap-0.5 p-1">
          {[
            [Home, "Início"],
            [ClipboardCheck, "Ordens"],
            [Building2, "Clientes"],
            [HardHat, "Equipe"],
          ].map(([Icon, label]) => {
            const I = Icon as typeof Home;
            return (
              <button className="lemarc-bottom-nav-item" key={String(label)}>
                <I className="lemarc-bottom-nav-icon" />
                <span className="lemarc-bottom-nav-label lemarc-bottom-nav-label--mobile">
                  {String(label)}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

const screen = new URLSearchParams(window.location.search).get("screen");
const root = window.__novaOsFixtureRoot ?? createRoot(document.getElementById("root")!);
window.__novaOsFixtureRoot = root;
root.render(screen === "detail" ? <DetailFixture /> : <WizardFixture />);
