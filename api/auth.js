export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action, inviteCode } = req.body || {};

  if (action === 'verify-invite') {
    const expectedCode = process.env.INVITATION_CODE || '';
    if (!expectedCode) {
      return res.status(500).json({ error: 'INVITE_CODE non configure sur le serveur' });
    }
    if (!inviteCode || inviteCode.trim() !== expectedCode.trim()) {
      return res.status(403).json({ ok: false, error: 'invite_invalid' });
    }
    return res.status(200).json({ ok: true });
  }

  return res.status(400).json({ error: 'Action inconnue' });
}
