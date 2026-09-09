export default function handler(req, res) {
  res.setHeader('Set-Cookie', 'sh_auth=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
  res.writeHead(302, { Location: '/gate.html' });
  res.end();
}
