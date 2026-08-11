// OpenRouter proxy. Runs as Vite dev middleware and as a serverless function
// (api/chat.js). The API key stays here — it is never shipped to the browser.

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions'
const DEFAULT_MODEL = 'meta-llama/llama-3.3-70b-instruct:free'

const MAX_TURNS = 12
const MAX_CHARS = 1200

const SYSTEM = `You are the CareCompass assistant on a medical appointment platform. You are warm and human: someone writing to you is usually worried, tired, or in pain.

What the product does: patients search clinicians by symptom, specialty or name; filter by insurance, distance, language, availability and video vs in person; book from a live calendar with instant confirmation; and manage visits in "My Care Home", where they can reschedule or cancel free up to 2 hours before. A guided symptom check lives at /assistant. Privacy and security answers live at /trust.

How to write:
- Open by acknowledging what they are dealing with, in one short, specific sentence. No scripted sympathy, no "I understand how you feel", no repeating their words back.
- Then give the one next step that actually helps. End with a question or an offer only when it moves them forward.
- At most 70 words. Plain 8th-grade English, contractions welcome, no markdown, no lists, no emoji, no clinical jargon.

Rules you must follow:
- Never diagnose, never name a condition as fact, never suggest medication or doses. Suggest the type of clinician to start with and how soon to be seen.
- Never discourage someone from seeking care. If in doubt, say a clinician should decide.
- If the message describes chest pain, trouble breathing, stroke signs, heavy bleeding, fainting, a sudden worst-ever headache, or thoughts of self-harm, tell them to call their local emergency number (911 in the US) or 988 for self-harm, and stop there.
- Offer a human specialist for billing, records, or anything you cannot answer.
- Only discuss health navigation, this product, and booking. Briefly redirect anything else.`

/**
 * One line of directory context the client may attach — a clinician it has
 * already suggested, so the reply can name them. Nothing about the patient
 * goes in here, so the promise on /trust stays true.
 */
function cleanContext(context) {
  if (typeof context !== 'string') return ''
  const line = context.replace(/\s+/g, ' ').trim().slice(0, 200)
  return /^[\w .,'’()·&/-]*$/.test(line) ? line : ''
}

function clean(messages) {
  if (!Array.isArray(messages)) return null
  const out = []
  for (const m of messages.slice(-MAX_TURNS)) {
    if (!m || typeof m.content !== 'string') return null
    const content = m.content.trim().slice(0, MAX_CHARS)
    if (!content) continue
    if (m.role !== 'user' && m.role !== 'assistant') return null
    out.push({ role: m.role, content })
  }
  return out.length && out[out.length - 1].role === 'user' ? out : null
}

export default async function handler(req, res) {
  const send = (status, body) => {
    res.statusCode = status
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(body))
  }

  if (req.method !== 'POST') return send(405, { error: 'method_not_allowed' })

  const key = process.env.OPENROUTER_API_KEY
  // Not configured is not an error the user should see: the client falls back
  // to its built-in rule-based replies.
  if (!key) return send(503, { error: 'openrouter_not_configured' })

  const body = typeof req.body === 'string' ? safeParse(req.body) : req.body
  const messages = clean(body?.messages)
  if (!messages) return send(400, { error: 'invalid_messages' })
  const context = cleanContext(body?.context)

  try {
    const upstream = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        // OpenRouter uses these for attribution on free models.
        'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'http://localhost:5173',
        'X-Title': 'CareCompass AI',
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || DEFAULT_MODEL,
        max_tokens: 260,
        temperature: 0.5,
        // Streamed: on a free model the full reply takes 10s or more, but the
        // first words arrive in about one, which is what the wait feels like.
        stream: true,
        messages: [{ role: 'system', content: context ? `${SYSTEM}\n\n${context}` : SYSTEM }, ...messages],
      }),
    })

    if (!upstream.ok || !upstream.body) {
      // Log upstream detail server-side only; the client gets a safe code.
      const detail = await upstream.text().catch(() => '')
      console.error('[chat] openrouter', upstream.status, detail.slice(0, 300))
      return send(502, { error: 'upstream_failed' })
    }

    // Plain text out, not SSE: the deltas are unwrapped here so the browser
    // can append whatever it reads straight into the bubble.
    res.statusCode = 200
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('X-Accel-Buffering', 'no')
    await pipeDeltas(upstream.body, res)
    return res.end()
  } catch (err) {
    console.error('[chat]', err.message)
    if (res.headersSent) return res.end()
    return send(502, { error: 'upstream_failed' })
  }
}

/** Unwrap OpenRouter's SSE frames and write each content delta to `res`. */
async function pipeDeltas(stream, res) {
  const decoder = new TextDecoder()
  let buffer = ''

  for await (const chunk of stream) {
    buffer += decoder.decode(chunk, { stream: true })
    const lines = buffer.split('\n')
    // The last piece may be half a frame, so it waits for the next chunk.
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.startsWith('data:')) continue
      const payload = line.slice(5).trim()
      if (!payload || payload === '[DONE]') continue
      const delta = safeParse(payload)?.choices?.[0]?.delta?.content
      if (delta) res.write(delta)
    }
  }
}

function safeParse(text) {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}
