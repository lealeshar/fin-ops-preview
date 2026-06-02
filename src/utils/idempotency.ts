// Uses Web Crypto API — available natively in modern browsers and Node 19+.

export function generateIdempotencyKey(prefix: string): string {
  return `${prefix}_${Date.now()}_${crypto.randomUUID()}`;
}

export function generateCorrelationId(): string {
  return `corr_${crypto.randomUUID()}`;
}
