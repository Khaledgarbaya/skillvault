export function jsonError(error: string, status: number, details?: string): Response {
  const body: { error: string; details?: string } = { error };
  if (details) body.details = details;
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
