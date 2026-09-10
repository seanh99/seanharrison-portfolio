// Server-side access gate. Blocks every page except the login page and
// static assets until the visitor has a valid "sh_auth" cookie, issued by
// /api/login after checking the password against the SITE_PASSWORD
// environment variable (never shipped to the client). This closes the
// previous client-side gate, whose password was readable in main.js and
// did nothing to stop someone opening a project page URL directly.
export const config = {
  matcher: ['/((?!api/|assets/|gate.html|styles.css|main.js|projects.js|favicon.ico|favicon-16.png|favicon-32.png|favicon-192.png|favicon-512.png|apple-touch-icon.png|robots.txt).*)'],
};

export default function middleware(request) {
  const cookie = request.headers.get('cookie') || '';
  const authed = /(?:^|;\s*)sh_auth=1(?:;|$)/.test(cookie);
  if (authed) return;

  const url = new URL(request.url);
  const gateUrl = new URL('/gate.html', url);
  gateUrl.searchParams.set('next', url.pathname + url.search);
  return Response.redirect(gateUrl, 307);
}
