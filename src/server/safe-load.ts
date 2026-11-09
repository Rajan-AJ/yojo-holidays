import "server-only";

/**
 * Runs a data load for a streamed section. On failure it logs the real error
 * on the server and returns null, so the section can render a friendly
 * message instead of breaking the page or exposing database details.
 */
export async function safeLoad<T>(label: string, load: () => Promise<T>): Promise<T | null> {
  try {
    return await load();
  } catch (error) {
    console.error(`[data] ${label} failed`, error);
    return null;
  }
}
