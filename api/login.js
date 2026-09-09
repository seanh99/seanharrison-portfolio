// Checks the submitted password against SITE_PASSWORD (set as a Vercel
// environment variable — never exposed to the client) and, if correct,
// issues an httpOnly cookie that middleware.js checks on every request.
export default function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const expected = process.env.SITE_PASSWORD;
  if (!expected) {
    console.error('SITE_PASSWORD environment variable is not set');
    res.status(500).json({ error: 'Not configured' });
    return;
  }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  body = body || {};

  const submitted = typeof body.password === 'string' ? body.password.trim().toLowerCase() : '';
  if (submitted && submitted === expected.trim().toLowerCase()) {
    const maxAge = 60 * 60 * 24 * 30; // 30 days
    res.setHeader('Set-Cookie', `sh_auth=1; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`);
    const next = typeof body.next === 'string' && body.next.startsWith('/') ? body.next : '/';
    res.status(200).json({ ok: true, next });
  } else {
    res.status(401).json({ error: 'Incorrect password' });
  }
}
