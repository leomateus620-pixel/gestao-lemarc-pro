import type { OrderStatus } from "@/components/app/StatusBadge";
import type { Priority } from "@/components/app/PriorityBadge";

export type ServiceType = "Manutenção Mecânica" | "Manutenção Elétrica" | "Automação Industrial" | "Montagem Industrial" | "Instalação" | "Visita Técnica" | "Emergência";
export type Ordem = { id:string; numero:string; titulo:string; descricao:string; cliente:string; unidade:string; local:string; colaborador:string; equipe:string[]; area:ServiceType; prioridade:Priority; status:OrderStatus; horario:string; data:string; distanciaKm:number; tempoTrabalhadoMin:number; valorHora:number; materiais:string[]; timeline:{etapa:string;hora:string;concluida:boolean}[]; fotos:number };

const baseTimeline = (step: number) => [
  { etapa: "OS criada pelo gestor", hora: "07:42", concluida: step >= 0 },
  { etapa: "Deslocamento iniciado", hora: step >= 1 ? "08:05" : "—", concluida: step >= 1 },
  { etapa: "Serviço iniciado no local", hora: step >= 2 ? "08:30" : "—", concluida: step >= 2 },
  { etapa: "Serviço finalizado pelo técnico", hora: step >= 3 ? "11:40" : "—", concluida: step >= 3 },
  { etapa: "Enviado para revisão", hora: step >= 4 ? "11:45" : "—", concluida: step >= 4 },
  { etapa: "Aprovada para cobrança", hora: step >= 5 ? "14:20" : "—", concluida: step >= 5 },
];

export const ordens: Ordem[] = [
 { id:"o-1042", numero:"1042", titulo:"Substituição de rolamento da bomba centrífuga", descricao:"Bomba com vibração excessiva. Substituir rolamentos, conferir acoplamento, executar alinhamento a laser e testar operação assistida.", cliente:"Metalúrgica São Bento", unidade:"Unidade Fabril Centro", local:"Casa de Máquinas", colaborador:"Carlos Henrique Silva", equipe:["Mecânico Industrial"], area:"Manutenção Mecânica", prioridade:"alta", status:"running", horario:"08:30", data:"Hoje", distanciaKm:18, tempoTrabalhadoMin:145, valorHora:180, materiais:["Rolamento 6308", "Graxa alta temperatura", "Calços inox"], fotos:4, timeline:baseTimeline(2)},
 { id:"o-1041", numero:"1041", titulo:"Instalação de painel elétrico principal", descricao:"Instalar e comissionar painel CCM da Linha de Produção 02, com testes de intertravamento e partida assistida.", cliente:"Cooperativa Noroeste", unidade:"Unidade de Secagem", local:"Painel Elétrico Principal", colaborador:"Diego Ramos", equipe:["Eletricista Industrial", "Supervisor de Campo"], area:"Manutenção Elétrica", prioridade:"media", status:"transit", horario:"09:15", data:"Hoje", distanciaKm:28, tempoTrabalhadoMin:0, valorHora:165, materiais:["Disjuntor tripolar", "Bornes", "Canaleta 50x50"], fotos:0, timeline:baseTimeline(1)},
 { id:"o-1040", numero:"1040", titulo:"Programação CLP da envasadora", descricao:"Ajustar lógica do CLP Siemens S7-1200 conforme novo ciclo de envase e validar sensores de segurança.", cliente:"Agroindustrial Santa Rosa", unidade:"Linha de Produção 02", local:"Sala de Automação", colaborador:"Felipe Andrade", equipe:["Técnico em Automação"], area:"Automação Industrial", prioridade:"alta", status:"pending", horario:"13:00", data:"Hoje", distanciaKm:55, tempoTrabalhadoMin:0, valorHora:220, materiais:["Backup CLP", "Cabo Profinet"], fotos:0, timeline:baseTimeline(0)},
 { id:"o-1039", numero:"1039", titulo:"Montagem de esteira transportadora", descricao:"Montagem mecânica de esteira de 18m, redutor, proteções NR-12 e teste com carga.", cliente:"Indústria Mecânica Horizonte", unidade:"Unidade Fabril Centro", local:"Expedição", colaborador:"Marcos Vinícius", equipe:["Montador", "Mecânico Industrial"], area:"Montagem Industrial", prioridade:"media", status:"review", horario:"07:00", data:"Hoje", distanciaKm:71, tempoTrabalhadoMin:390, valorHora:155, materiais:["Chumbadores", "Correia modular", "Proteções laterais"], fotos:12, timeline:baseTimeline(4)},
 { id:"o-1038", numero:"1038", titulo:"Preventiva do compressor parafuso", descricao:"Troca de óleo, filtros, reaperto elétrico e análise vibracional semestral.", cliente:"Metalúrgica São Bento", unidade:"Casa de Máquinas", local:"Compressor 02", colaborador:"Anderson Pires", equipe:["Supervisor de Campo"], area:"Visita Técnica", prioridade:"baixa", status:"approved", horario:"Ontem", data:"Ontem", distanciaKm:18, tempoTrabalhadoMin:215, valorHora:150, materiais:["Óleo ISO 46", "Filtro separador", "Filtro de ar"], fotos:6, timeline:baseTimeline(5)},
];

export function getOrdem(id: string) { return ordens.find((o) => o.id === id); }
export const ordensStats = { abertas: ordens.filter((o) => o.status !== "approved").length, emExecucao: ordens.filter((o) => o.status === "running").length, aguardandoRevisao: ordens.filter((o) => o.status === "review").length, concluidasHoje: 3, horasMes: 1284, valorEstimado: 218400 };
