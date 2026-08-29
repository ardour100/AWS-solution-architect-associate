/**
 * Shared path-parameter guards. PostgreSQL raises 22P02 when a uuid column
 * is compared with a non-uuid literal, so validate before querying and
 * surface a clean 404 instead of a 500.
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}
