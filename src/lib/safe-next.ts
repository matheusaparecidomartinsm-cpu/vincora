/** Só aceita destinos internos (evita redirecionamento aberto). */
export function safeNext(raw: string | null | undefined) {
  return raw && raw.startsWith("/") && !raw.startsWith("//") && !raw.startsWith("/\\") ? raw : "/";
}
