// Vercel Serverless Function: proxies chat requests to the configured AI provider
// API key stays on the server, never exposed to the browser
//
// Supported providers (set via AI_PROVIDER env var):
//   gemini   (default) - Google Gemini 2.0 Flash - FREE tier
//   openai              - GPT-4o-mini
//   anthropic           - Claude Sonnet

const PROVIDERS = {
  gemini: {
    async call(apiKey, system, messages, maxTokens) {
      const userMsg = messages.map(m => m.content).join('\n');
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: system }] },
            contents: [{ role: 'user', parts: [{ text: userMsg }] }],
            generationConfig: { maxOutputTokens: maxTokens || 1200, responseMimeType: "application/json" },
          }),
        }
      );
      if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
      const data = await res.json();
      return data.candidates?.[0]?.content?.parts?.map(p => p.text).join('\n') || '';
    },
  },

  openai: {
    async call(apiKey, system, messages, maxTokens) {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          max_tokens: maxTokens || 1200,
          messages: [
            { role: 'system', content: system },
            ...messages,
          ],
        }),
      });
      if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
      const data = await res.json();
      return data.choices?.[0]?.message?.content || '';
    },
  },

  anthropic: {
    async call(apiKey, system, messages, maxTokens) {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: maxTokens || 1200,
          system,
          messages,
        }),
      });
      if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
      const data = await res.json();
      return (data.content || []).map(b => b.text || '').join('\n');
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.AI_API_KEY || '';
  if (!apiKey) {
    return res.status(500).json({ error: 'AI_API_KEY not configured' });
  }

  try {
    const { system, messages, max_tokens } = req.body;
    const userMsg = messages.map(m => m.content).join('\n');

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            { role: 'user', parts: [{ text: system + '\n\n' + userMsg }] }
          ],
          generationConfig: {
            maxOutputTokens: max_tokens || 1200,
            responseMimeType: 'application/json'
          },
        }),
      }
    );

    const raw = await geminiRes.text();

    if (!geminiRes.ok) {
      return res.status(500).json({ error: 'Gemini ' + geminiRes.status + ': ' + raw });
    }

    const data = JSON.parse(raw);
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!text) {
      return res.status(500).json({ error: 'Gemini returned empty. Raw: ' + raw.substring(0, 500) });
    }

    return res.status(200).json({ content: [{ type: 'text', text }] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

