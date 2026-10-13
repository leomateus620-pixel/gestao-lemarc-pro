/** E-mail enviado ao login: sem espaços nas pontas e em minúsculas. */
export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

/** Senha com espaço no início ou no fim (nunca é alterada, só avisamos). */
export function hasEdgeWhitespace(password: string): boolean {
  return password.length > 0 && password !== password.trim();
}

/** Senha que começa com letra maiúscula (típico de autocorreção no celular). */
export function startsWithUppercase(password: string): boolean {
  const first = password.charAt(0);
  return first !== "" && first !== first.toLowerCase() && first === first.toUpperCase();
}

/** "lv480251@gmail.com" -> "lv***@gmail.com". Nunca devolve o e-mail completo. */
export function maskEmail(value: string): string | null {
  const email = normalizeEmail(value);
  const at = email.indexOf("@");
  if (at < 1) return email ? `${email.slice(0, 2)}***` : null;
  return `${email.slice(0, Math.min(2, at))}***${email.slice(at)}`.slice(0, 80);
}

/** Navegador resumido, ex.: "iOS Safari", "Android Chrome". */
export function summarizeUserAgent(ua: string): string {
  const os = /iPhone|iPad|iPod/.test(ua)
    ? "iOS"
    : /Android/.test(ua)
      ? "Android"
      : /Windows/.test(ua)
        ? "Windows"
        : /Mac OS X/.test(ua)
          ? "macOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "Outro";
  const browser = /EdgA?\//.test(ua)
    ? "Edge"
    : /SamsungBrowser/.test(ua)
      ? "Samsung"
      : /CriOS|Chrome\//.test(ua)
        ? "Chrome"
        : /FxiOS|Firefox\//.test(ua)
          ? "Firefox"
          : /Safari\//.test(ua)
            ? "Safari"
            : "Outro";
  const standalone = /wv\)|; wv/.test(ua) ? " (app)" : "";
  return `${os} ${browser}${standalone}`;
}

const PASSWORD_ALPHABET_LOWER = "abcdefghjkmnpqrstuvwxyz";
const PASSWORD_ALPHABET = `${PASSWORD_ALPHABET_LOWER}ABCDEFGHJKMNPQRSTUVWXYZ23456789`;

/** Senha forte sem caracteres confusos (0/O, 1/l/I), começando por minúscula. */
export function generateStrongPassword(length = 12, random: (n: number) => Uint32Array = cryptoRandom): string {
  const size = Math.max(10, Math.min(length, 32));
  const values = random(size);
  let out = PASSWORD_ALPHABET_LOWER[values[0] % PASSWORD_ALPHABET_LOWER.length];
  for (let i = 1; i < size; i++) out += PASSWORD_ALPHABET[values[i] % PASSWORD_ALPHABET.length];
  // Garante ao menos um número e uma maiúscula.
  if (!/[0-9]/.test(out)) out = out.slice(0, -1) + "7";
  if (!/[A-Z]/.test(out)) out = out.slice(0, 1) + "K" + out.slice(2);
  return out;
}

function cryptoRandom(n: number): Uint32Array {
  return crypto.getRandomValues(new Uint32Array(n));
}

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;

export function validateNewPassword(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) return `A senha precisa ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`;
  if (password.length > PASSWORD_MAX_LENGTH) return `A senha pode ter no máximo ${PASSWORD_MAX_LENGTH} caracteres.`;
  if (hasEdgeWhitespace(password)) return "A senha não pode ter espaço no início ou no fim.";
  return null;
}
