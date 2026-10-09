// Kamelo-feedback: ontvangt het antwoord van kamelo.eu/goodbye ("Why did you remove Kamelo?").
// Bewaart alleen de gekozen reden en een optioneel bericht, met datum. Geen IP-adres, geen cookies, geen browsergegevens.
// Opslag: Workers KV (binding FEEDBACK), automatisch weg na een jaar.
// Uitlezen: node feedback-worker/list.mjs   ·   Uitrollen: node feedback-worker/deploy.mjs
const ORIGINS = ['https://kamelo.eu', 'https://www.kamelo.eu'];
const REASONS = ['site', 'too-much', 'missed', 'slow', 'trust', 'not-using', 'other'];
const YEAR = 365 * 24 * 3600;

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || '';
    const cors = {
      'Access-Control-Allow-Origin': ORIGINS.includes(origin) ? origin : ORIGINS[0],
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
      Vary: 'Origin',
    };
    const url = new URL(req.url);
    if (url.pathname !== '/goodbye') return new Response('Not found', { status: 404 });
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: cors });
    if (!ORIGINS.includes(origin)) return new Response('Forbidden', { status: 403, headers: cors });

    const raw = await req.text();
    if (raw.length > 4000) return new Response('Too large', { status: 413, headers: cors });
    let body;
    try { body = JSON.parse(raw); } catch { return new Response('Bad request', { status: 400, headers: cors }); }
    const reason = REASONS.includes(body.reason) ? body.reason : null;
    const message = typeof body.message === 'string' ? body.message.trim().slice(0, 1000) : '';
    if (!reason && !message) return new Response('Bad request', { status: 400, headers: cors });

    const at = new Date().toISOString();
    const key = `${at}-${crypto.randomUUID().slice(0, 8)}`;
    await env.FEEDBACK.put(key, JSON.stringify({ at, reason, message }), { expirationTtl: YEAR });
    return new Response(null, { status: 204, headers: cors });
  },
};
