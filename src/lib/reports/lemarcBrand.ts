export const LEMARC_COMPANY = {
  legalName: "LEMARC INST. E MANUT. ELÉTRICA LTDA.",
  shortName: "Lemarc",
  address: "Rua Arnaldo Gassen, 70 — Bairro Glória",
  city: "Santa Rosa-RS",
  phone: "55-99991 5017 (MÁRCIO)",
  phoneShort: "55-99991 5017",
  email: "lemarc@lemarc.ind.br",
  cnpj: "19.056.094/0001-49",
} as const;

export const LEMARC_COLORS = {
  navy: [11, 37, 69] as [number, number, number],
  navyDark: [7, 25, 47] as [number, number, number],
  orange: [234, 88, 12] as [number, number, number],
  orangeSoft: [254, 215, 170] as [number, number, number],
  slate: [71, 85, 105] as [number, number, number],
  slateSoft: [100, 116, 139] as [number, number, number],
  border: [203, 213, 225] as [number, number, number],
  borderSoft: [226, 232, 240] as [number, number, number],
  bgSoft: [241, 245, 249] as [number, number, number],
  zebra: [248, 250, 252] as [number, number, number],
  green: [16, 122, 87] as [number, number, number],
  amber: [180, 83, 9] as [number, number, number],
  purple: [109, 40, 217] as [number, number, number],
  red: [185, 28, 28] as [number, number, number],
  ink: [15, 23, 42] as [number, number, number],
} as const;

import lemarcLogoAsset from "@/assets/lemarc-logo.png.asset.json";

export const LEMARC_LOGO_URL = lemarcLogoAsset.url;
// Aspect ratio width / height of the official horizontal logo (~5.25:1).
export const LEMARC_LOGO_ASPECT = 1600 / 305;
