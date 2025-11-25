/**
 * Utility functions for Next.js App Router
 */

/**
 * Resolve Next.js route params that can be either Promise or direct object
 * Handles Next.js 14/15 compatibility
 */
export async function resolveParams<T extends Record<string, string>>(
  params: Promise<T> | T
): Promise<T> {
  return params instanceof Promise ? await params : params;
}

