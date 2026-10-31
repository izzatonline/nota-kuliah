type Patch = Record<string, unknown>
const isRecord = (v: unknown): v is Patch => typeof v === 'object' && v !== null && !Array.isArray(v)

/** Lays a translation over the notes: objects merge by key, arrays of `{id}` items merge by id, anything else is replaced. */
export function overlay<T>(base: T, patch: unknown): T {
  if (Array.isArray(base) && Array.isArray(patch)) {
    if (!base.every((x) => isRecord(x) && 'id' in x)) return patch as T
    const byId = new Map((patch as Patch[]).map((p) => [p.id, p]))
    return base.map((b) => (byId.has((b as Patch).id) ? overlay(b, byId.get((b as Patch).id)) : b)) as T
  }
  if (isRecord(base) && isRecord(patch)) {
    return Object.fromEntries(Object.entries(base).map(([k, v]) => [k, k in patch ? overlay(v, patch[k]) : v])) as T
  }
  return (patch ?? base) as T
}
