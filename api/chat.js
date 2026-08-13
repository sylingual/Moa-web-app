export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const provider = (process.env.AI_PROVIDER || 'gemini').toLowerCase();
  const apiKey = process.env.AI_API_KEY || '';

  if (!apiKey) {
    return res.status(500).json({ error: 'AI_API_KEY not configured' });
  }

  try {
    const { system, messages, max_tokens } = req.body;
    const userMsg = messages.map(m => m.content).join('\n');
    let text = '';

    if (provider === 'gemini') {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: system + '\n\nIMPORTANT: Your entire response must be valid JSON only. No text before or after.\n\n' + userMsg }] }],
            generationConfig: { maxOutputTokens: max_tokens || 1200 },
          }),
        }
      );
      const raw = await r.text();
      if (!r.ok) return res.status(500).json({ error: 'Gemini ' + r.status + ': ' + raw.substring(0, 500) });
      const data = JSON.parse(raw);
      text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (!text) return res.status(500).json({ error: 'Empty Gemini response. Full: ' + raw.substring(0, 500) });

      text = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      const start = text.search(/[\[{]/);
      const lastB = text.lastIndexOf(']');
      const lastC = text.lastIndexOf('}');
      const end = Math.max(lastB, lastC);
      if (start >= 0 && end > start) {
        text = text.substring(start, end + 1);
      }
      try {
        JSON.parse(text);
      } catch (e) {
        return res.status(500).json({ error: 'Gemini response is not valid JSON. Got: ' + text.substring(0, 500) });
      }

    } else if (provider === 'openai') {
      const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          max_tokens: max_tokens || 1200,
          messages: [{ role: 'system', content: system }, ...messages],
        }),
      });
      if (!r.ok) throw new Error('OpenAI ' + r.status + ': ' + await r.text());
      const data = await r.json();
      text = data.choices?.[0]?.message?.content || '';

    } else if (provider === 'anthropic') {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: max_tokens || 1200, system, messages }),
      });
      if (!r.ok) throw new Error('Anthropic ' + r.status + ': ' + await r.text());
      const data = await r.json();
      text = (data.content || []).map(b => b.text || '').join('\n');

    } else {
      return res.status(500).json({ error: 'Unknown provider: ' + provider });
    }

    return res.status(200).json({ content: [{ type: 'text', text }] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
