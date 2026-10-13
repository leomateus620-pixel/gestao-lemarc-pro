/** Presentation only: never grants administrator access or starts OAuth. */
export function isAdminAccessOpen(admin: unknown, explicitlyOpened = false): boolean {
  return admin === "1" || explicitlyOpened;
}