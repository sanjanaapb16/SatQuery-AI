import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

serve(async (_req) => {
  const response = {
    ok: true,
    mode: 'demo',
    message: 'This Edge Function is a placeholder for change-detection processing.',
  }

  return new Response(JSON.stringify(response), {
    headers: { 'Content-Type': 'application/json' },
  })
})
