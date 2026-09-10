const { onRequest } = require('firebase-functions/v2/https')
const logger = require('firebase-functions/logger')

const taskFromQuery = (query, mode) => {
  if (mode === 'Change' || /change|before|after|increased|decreased/i.test(query)) return 'change_detection'
  if (mode === 'Optical + SAR' || /sar|optical|radar/i.test(query)) return 'optical_sar'
  if (/highlight|building|road|field|where/i.test(query)) return 'grounding'
  if (/land cover|vegetation|water|forest|agriculture/i.test(query)) return 'land_cover'
  if (/describe|caption|scene/i.test(query)) return 'captioning'
  return 'vqa'
}

exports.analyze = onRequest({ cors: true, timeoutSeconds: 300, memory: '1GiB' }, async (request, response) => {
  if (request.method !== 'POST') return response.status(405).json({ error: 'POST required' })
  const { query = '', mode = 'General', files = [] } = request.body || {}
  const task = taskFromQuery(query, mode)
  const backend = process.env.AI_BACKEND_URL
  if (!backend) {
    logger.warn('AI_BACKEND_URL is not configured', { task, files: files.length })
    return response.status(503).json({ error: 'The specialist model service is not configured.', task, confidence: 0, reliability: 'LOW' })
  }
  try {
    const result = await fetch(`${backend}/v1/analyze`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query, mode, files, task }) })
    response.status(result.status).json(await result.json())
  } catch (error) {
    logger.error('Model service unavailable', error)
    response.status(502).json({ error: 'Specialist model service unavailable.', task })
  }
})
