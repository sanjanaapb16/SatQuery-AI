import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

serve(async (_req) => {
  const response = {
    ok: true,
    mode: 'demo',
    message: 'This Edge Function can generate PDF or HTML reports when linked to storage and report generation logic.',
  }

  return new Response(JSON.stringify(response), {
    headers: { 'Content-Type': 'application/json' },
  })
})
