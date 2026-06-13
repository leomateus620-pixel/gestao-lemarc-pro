import type { OrderStatus } from "@/components/app/StatusBadge";

export type Ordem = {
  id: string;
  numero: string;
  titulo: string;
  descricao: string;
  cliente: string;
  unidade: string;
  colaborador: string;
  area: "Mecânica" | "Elétrica" | "Automação" | "Montagem" | "Manutenção" | "Instalação";
  prioridade: "baixa" | "media" | "alta";
  status: OrderStatus;
  horario: string;
  data: string;
  distanciaKm: number;
  tempoTrabalhadoMin: number;
  valorHora: number;
  timeline: { etapa: string; hora: string; concluida: boolean }[];
  fotos: number;
};

export const ordens: Ordem[] = [
  {
    id: "o-1042",
    numero: "1042",
    titulo: "Substituição de rolamento da bomba centrífuga",
    descricao: "Bomba apresentando vibração excessiva e ruído anormal. Realizar substituição completa do conjunto de rolamentos e alinhamento.",
    cliente: "Petroquímica Atlas",
    unidade: "Unidade Paulínia",
    colaborador: "Carlos Henrique Silva",
    area: "Mecânica",
    prioridade: "alta",
    status: "running",
    horario: "08:30",
    data: "Hoje",
    distanciaKm: 42,
    tempoTrabalhadoMin: 145,
    valorHora: 180,
    fotos: 4,
    timeline: [
      { etapa: "OS criada pelo gestor", hora: "07:42", concluida: true },
      { etapa: "Saída para o cliente", hora: "08:05", concluida: true },
      { etapa: "Chegada e início do serviço", hora: "08:30", concluida: true },
      { etapa: "Descrição e fotos do serviço", hora: "—", concluida: false },
      { etapa: "Finalização do atendimento", hora: "—", concluida: false },
      { etapa: "Envio para revisão", hora: "—", concluida: false },
    ],
  },
  {
    id: "o-1041",
    numero: "1041",
    titulo: "Instalação de painel CCM linha 3",
    descricao: "Instalação de painel de centro de controle de motores na linha de produção 3.",
    cliente: "Cervejaria Norte Forte",
    unidade: "Unidade Itu",
    colaborador: "Diego Ramos",
    area: "Elétrica",
    prioridade: "media",
    status: "transit",
    horario: "09:15",
    data: "Hoje",
    distanciaKm: 28,
    tempoTrabalhadoMin: 0,
    valorHora: 165,
    fotos: 0,
    timeline: [
      { etapa: "OS criada pelo gestor", hora: "07:10", concluida: true },
      { etapa: "Saída para o cliente", hora: "08:50", concluida: true },
      { etapa: "Chegada e início do serviço", hora: "—", concluida: false },
      { etapa: "Descrição e fotos do serviço", hora: "—", concluida: false },
      { etapa: "Finalização do atendimento", hora: "—", concluida: false },
      { etapa: "Envio para revisão", hora: "—", concluida: false },
    ],
  },
  {
    id: "o-1040",
    numero: "1040",
    titulo: "Programação CLP envasadora",
    descricao: "Reprogramação do CLP Siemens S7-1200 da envasadora 2 conforme novo SOP.",
    cliente: "Indústria Vega Alimentos",
    unidade: "Unidade Vinhedo",
    colaborador: "Felipe Andrade",
    area: "Automação",
    prioridade: "alta",
    status: "pending",
    horario: "13:00",
    data: "Hoje",
    distanciaKm: 55,
    tempoTrabalhadoMin: 0,
    valorHora: 220,
    fotos: 0,
    timeline: [
      { etapa: "OS criada pelo gestor", hora: "10:22", concluida: true },
      { etapa: "Saída para o cliente", hora: "—", concluida: false },
      { etapa: "Chegada e início do serviço", hora: "—", concluida: false },
      { etapa: "Descrição e fotos do serviço", hora: "—", concluida: false },
      { etapa: "Finalização do atendimento", hora: "—", concluida: false },
      { etapa: "Envio para revisão", hora: "—", concluida: false },
    ],
  },
  {
    id: "o-1039",
    numero: "1039",
    titulo: "Montagem de esteira transportadora",
    descricao: "Montagem completa de esteira de 18m incluindo estrutura, redutor e proteções.",
    cliente: "AutoParts Brasil",
    unidade: "Unidade Sorocaba",
    colaborador: "Marcos Vinícius",
    area: "Montagem",
    prioridade: "media",
    status: "review",
    horario: "07:00",
    data: "Hoje",
    distanciaKm: 71,
    tempoTrabalhadoMin: 390,
    valorHora: 155,
    fotos: 12,
    timeline: [
      { etapa: "OS criada pelo gestor", hora: "Ontem", concluida: true },
      { etapa: "Saída para o cliente", hora: "06:20", concluida: true },
      { etapa: "Chegada e início do serviço", hora: "07:00", concluida: true },
      { etapa: "Descrição e fotos do serviço", hora: "13:00", concluida: true },
      { etapa: "Finalização do atendimento", hora: "13:30", concluida: true },
      { etapa: "Envio para revisão", hora: "13:32", concluida: true },
    ],
  },
  {
    id: "o-1038",
    numero: "1038",
    titulo: "Manutenção preventiva compressor parafuso",
    descricao: "Plano de manutenção semestral: troca de óleo, filtros e análise vibracional.",
    cliente: "Metalúrgica São Bento",
    unidade: "Unidade Jundiaí",
    colaborador: "Anderson Pires",
    area: "Manutenção",
    prioridade: "baixa",
    status: "done",
    horario: "Ontem",
    data: "Ontem",
    distanciaKm: 18,
    tempoTrabalhadoMin: 215,
    valorHora: 150,
    fotos: 6,
    timeline: [
      { etapa: "OS criada pelo gestor", hora: "Ontem 06:00", concluida: true },
      { etapa: "Saída para o cliente", hora: "06:45", concluida: true },
      { etapa: "Chegada e início do serviço", hora: "07:20", concluida: true },
      { etapa: "Descrição e fotos do serviço", hora: "10:30", concluida: true },
      { etapa: "Finalização do atendimento", hora: "10:55", concluida: true },
      { etapa: "Aprovada pelo gestor", hora: "14:20", concluida: true },
    ],
  },
  {
    id: "o-1037",
    numero: "1037",
    titulo: "Instalação de sensores de temperatura",
    descricao: "Instalação de 8 sensores PT100 nos fornos de cura.",
    cliente: "Frigorífico Pampa Sul",
    unidade: "Unidade Lins",
    colaborador: "Lucas Bernardes",
    area: "Instalação",
    prioridade: "media",
    status: "done",
    horario: "Ontem",
    data: "Ontem",
    distanciaKm: 220,
    tempoTrabalhadoMin: 305,
    valorHora: 165,
    fotos: 9,
    timeline: [
      { etapa: "OS criada pelo gestor", hora: "Anteontem", concluida: true },
      { etapa: "Saída para o cliente", hora: "Ontem 05:30", concluida: true },
      { etapa: "Chegada e início do serviço", hora: "08:40", concluida: true },
      { etapa: "Descrição e fotos do serviço", hora: "12:10", concluida: true },
      { etapa: "Finalização do atendimento", hora: "13:45", concluida: true },
      { etapa: "Aprovada pelo gestor", hora: "Ontem 16:00", concluida: true },
    ],
  },
];

export function getOrdem(id: string) {
  return ordens.find((o) => o.id === id);
}

export const ordensStats = {
  abertas: ordens.filter((o) => o.status !== "done").length,
  emExecucao: ordens.filter((o) => o.status === "running").length,
  concluidasHoje: ordens.filter((o) => o.status === "done" && o.data === "Hoje").length + 2,
  horasMes: 1284,
};
