import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

serve(async (_req) => {
  const response = {
    ok: true,
    provider: 'mock',
    message: 'This Edge Function is ready for AI provider integration.',
    note: 'Replace this placeholder with a real vision-language API call or model service.',
  }

  return new Response(JSON.stringify(response), {
    headers: { 'Content-Type': 'application/json' },
  })
})
