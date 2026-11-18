// Funzione serverless Vercel: fa da ponte tra l'app e Google Gemini.
// La chiave resta nascosta qui (variabile d'ambiente GEMINI_API_KEY su Vercel).
// Facoltativo: GEMINI_MODEL per scegliere il modello (predefinito: gemini-flash-latest).

const BASE = 'https://generativelanguage.googleapis.com/v1beta/models/';

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'method_not_allowed' }); return; }
  const key = process.env.GEMINI_API_KEY;
  if (!key) { res.status(500).json({ error: 'missing_key', message: 'Manca GEMINI_API_KEY nelle impostazioni di Vercel.' }); return; }
  const model = process.env.GEMINI_MODEL || 'gemini-flash-latest';

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const { messages = [], images = [], json = false, stream = false } = body || {};
  if (!Array.isArray(messages) || !messages.length) { res.status(400).json({ error: 'no_messages' }); return; }

  // Converte i messaggi nel formato Gemini (user / model) e unisce ruoli consecutivi uguali.
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
  if (lastUser && Array.isArray(images)) {
    for (const img of images.slice(0, 4)) {
      if (img && img.data) lastUser.parts.push({ inline_data: { mime_type: img.mime || 'image/jpeg', data: img.data } });
    }
  }

  const payload = { contents, generationConfig: { temperature: json ? 0.6 : 0.8 } };
  if (json) payload.generationConfig.responseMimeType = 'application/json';

  const url = BASE + encodeURIComponent(model) + (stream ? ':streamGenerateContent?alt=sse' : ':generateContent');
  let r;
  try {
    r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key }, body: JSON.stringify(payload) });
  } catch (e) {
    res.status(502).json({ error: 'network', message: String(e) }); return;
  }
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    res.status(r.status === 429 ? 429 : 502).json({ error: r.status === 429 ? 'rate_limited' : 'gemini_error', status: r.status, message: t.slice(0, 600) });
    return;
  }

  const pick = j => ((j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts) || []).map(p => p.text || '').join('');

  if (!stream) {
    const j = await r.json();
    res.status(200).json({ text: pick(j) });
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', 'X-Accel-Buffering': 'no' });
  const reader = r.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
        if (!line.startsWith('data:')) continue;
        const data = line.slice(5).trim();
        if (!data || data === '[DONE]') continue;
        try { const t = pick(JSON.parse(data)); if (t) res.write(t); } catch {}
      }
    }
  } catch {}
  res.end();
};
