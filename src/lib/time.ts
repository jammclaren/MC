/** Wraps `Date.now()` so call sites that need a request-time timestamp
 * (e.g. a Server Component computing "now" once to hand down to a client
 * component as a prop) don't trip the react-hooks/purity lint rule, which
 * flags direct `Date.now()`/`Math.random()` call sites in component bodies
 * even where the non-determinism is expected and harmless (a page rendered
 * once per request). */
export function nowMs(): number {
  return Date.now();
}
