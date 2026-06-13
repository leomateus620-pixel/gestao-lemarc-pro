export type Cliente = {
  id: string;
  nome: string;
  segmento: string;
  unidades: string[];
  contato: string;
  telefone: string;
  cidade: string;
  osAtivas: number;
};

export const clientes: Cliente[] = [
  { id: "c1", nome: "Metalúrgica São Bento", segmento: "Usinagem pesada", unidades: ["Jundiaí", "Campinas"], contato: "Eng. Paulo Mendes", telefone: "(11) 98421-3382", cidade: "Jundiaí/SP", osAtivas: 3 },
  { id: "c2", nome: "Indústria Vega Alimentos", segmento: "Alimentício", unidades: ["Vinhedo"], contato: "Ana Cordeiro", telefone: "(19) 99711-0021", cidade: "Vinhedo/SP", osAtivas: 1 },
  { id: "c3", nome: "Petroquímica Atlas", segmento: "Petroquímico", unidades: ["Paulínia", "Cubatão"], contato: "Eng. Rafael Souza", telefone: "(13) 99230-1845", cidade: "Paulínia/SP", osAtivas: 5 },
  { id: "c4", nome: "Cervejaria Norte Forte", segmento: "Bebidas", unidades: ["Itu"], contato: "Marcos Lemos", telefone: "(11) 97123-9988", cidade: "Itu/SP", osAtivas: 2 },
  { id: "c5", nome: "AutoParts Brasil", segmento: "Automotivo", unidades: ["Sorocaba", "Indaiatuba"], contato: "Patrícia Lima", telefone: "(15) 98230-4421", cidade: "Sorocaba/SP", osAtivas: 4 },
  { id: "c6", nome: "Frigorífico Pampa Sul", segmento: "Frigorífico", unidades: ["Lins"], contato: "Eng. José Tavares", telefone: "(14) 99812-3344", cidade: "Lins/SP", osAtivas: 1 },
  { id: "c7", nome: "Cimentos Andrade", segmento: "Construção", unidades: ["Mogi das Cruzes"], contato: "Sandra Reis", telefone: "(11) 96612-7788", cidade: "Mogi/SP", osAtivas: 2 },
  { id: "c8", nome: "Têxtil Aurora", segmento: "Têxtil", unidades: ["Americana"], contato: "Bruno Tavares", telefone: "(19) 98821-5577", cidade: "Americana/SP", osAtivas: 0 },
];
