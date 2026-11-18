// Funzione Netlify: collega l'app a Google Gemini (stessa logica di api/chat.js per Vercel).
// Imposta GEMINI_API_KEY in Netlify → Site configuration → Environment variables.
const BASE = 'https://generativelanguage.googleapis.com/v1beta/models/';
const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  const key = (globalThis.Netlify && Netlify.env.get('GEMINI_API_KEY')) || process.env.GEMINI_API_KEY;
  if (!key) return json({ error: 'missing_key', message: 'Manca GEMINI_API_KEY nelle impostazioni del sito.' }, 500);
  const model = (globalThis.Netlify && Netlify.env.get('GEMINI_MODEL')) || process.env.GEMINI_MODEL || 'gemini-flash-latest';

  let body = {};
  try { body = await req.json(); } catch {}
  const { messages = [], images = [], json: wantJson = false, stream = false } = body;
  if (!Array.isArray(messages) || !messages.length) return json({ error: 'no_messages' }, 400);

  const contents = [];
  for (const m of messages.slice(-24)) {
    const role = m.role === 'assistant' ? 'model' : 'user';
    const text = String(m.content || '').slice(0, 60000);
    const last = contents[contents.length - 1];
    if (last && last.role === role) last.parts[0].text += '\n\n' + text;
    else contents.push({ role, parts: [{ text }] });
  }
  while (contents.length && contents[0].role !== 'user') contents.shift();
  const lastUser = [...contents].reverse().find(c => c.role === 'user');
  if (lastUser && Array.isArray(images)) for (const img of images.slice(0, 4)) if (img && img.data) lastUser.parts.push({ inline_data: { mime_type: img.mime || 'image/jpeg', data: img.data } });

  const payload = { contents, generationConfig: { temperature: wantJson ? 0.6 : 0.8 } };
  if (wantJson) payload.generationConfig.responseMimeType = 'application/json';
  const url = BASE + encodeURIComponent(model) + (stream ? ':streamGenerateContent?alt=sse' : ':generateContent');

  let r;
  try { r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key }, body: JSON.stringify(payload) }); }
  catch (e) { return json({ error: 'network', message: String(e) }, 502); }
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    return json({ error: r.status === 429 ? 'rate_limited' : 'gemini_error', status: r.status, message: t.slice(0, 600) }, r.status === 429 ? 429 : 502);
  }
  const pick = j => ((j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts) || []).map(p => p.text || '').join('');
  if (!stream) return json({ text: pick(await r.json()) });

  const enc = new TextEncoder(), dec = new TextDecoder();
  const out = new ReadableStream({
    async start(ctrl) {
      const reader = r.body.getReader(); let buf = '';
      try {
        for (;;) {
          const { done, value } = await reader.read(); if (done) break;
          buf += dec.decode(value, { stream: true }); let i;
          while ((i = buf.indexOf('\n')) >= 0) {
            const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
            if (!line.startsWith('data:')) continue;
            const data = line.slice(5).trim(); if (!data || data === '[DONE]') continue;
            try { const t = pick(JSON.parse(data)); if (t) ctrl.enqueue(enc.encode(t)); } catch {}
          }
        }
      } catch {}
      ctrl.close();
    }
  });
  return new Response(out, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' } });
};

export const config = { path: '/api/chat' };
