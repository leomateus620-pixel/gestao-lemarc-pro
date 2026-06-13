export type Colaborador = {
  id: string;
  nome: string;
  funcao: "Mecânico Industrial" | "Eletricista Industrial" | "Técnico em Automação" | "Montador" | "Supervisor de Campo";
  status: "Disponível" | "Em campo" | "Em deslocamento" | "Folga";
  osHoje: number;
  horasMes: number;
  matricula: string;
};

export const colaboradores: Colaborador[] = [
  { id: "u1", nome: "Carlos Henrique Silva", funcao: "Mecânico Industrial", status: "Em campo", osHoje: 2, horasMes: 168, matricula: "LM-0142" },
  { id: "u2", nome: "Diego Ramos", funcao: "Eletricista Industrial", status: "Disponível", osHoje: 0, horasMes: 152, matricula: "LM-0188" },
  { id: "u3", nome: "Felipe Andrade", funcao: "Técnico em Automação", status: "Em deslocamento", osHoje: 1, horasMes: 174, matricula: "LM-0203" },
  { id: "u4", nome: "Marcos Vinícius", funcao: "Montador", status: "Em campo", osHoje: 3, horasMes: 192, matricula: "LM-0099" },
  { id: "u5", nome: "Anderson Pires", funcao: "Supervisor de Campo", status: "Disponível", osHoje: 1, horasMes: 144, matricula: "LM-0231" },
  { id: "u6", nome: "Rodrigo Tavares", funcao: "Supervisor de Campo", status: "Folga", osHoje: 0, horasMes: 138, matricula: "LM-0177" },
  { id: "u7", nome: "Lucas Bernardes", funcao: "Eletricista Industrial", status: "Em campo", osHoje: 2, horasMes: 161, matricula: "LM-0244" },
];
