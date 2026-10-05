import 'dotenv/config';
import crypto from 'node:crypto';
import express from 'express';
import session from 'express-session';

const {
  LINKEDIN_CLIENT_ID,
  LINKEDIN_CLIENT_SECRET,
  LINKEDIN_REDIRECT_URI = 'http://localhost:3000/auth/linkedin/callback',
  SESSION_SECRET,
  PORT = 3000,
} = process.env;

if (!LINKEDIN_CLIENT_ID || !LINKEDIN_CLIENT_SECRET || !SESSION_SECRET) {
  console.error('Missing LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET or SESSION_SECRET. Copy .env.example to .env and fill it in.');
  process.exit(1);
}

// LinkedIn OpenID Connect endpoints
const AUTHORIZE_URL = 'https://www.linkedin.com/oauth/v2/authorization';
const TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';
const USERINFO_URL = 'https://api.linkedin.com/v2/userinfo';
const SCOPES = 'openid profile email';

const app = express();

app.use(express.static('public'));
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: LINKEDIN_REDIRECT_URI.startsWith('https://'),
      maxAge: 1000 * 60 * 60 * 8,
    },
  })
);

// ---------- Routes ----------

app.get('/', (req, res) => {
  if (req.session.user) return res.redirect('/portfolio');
  res.send(layout('Welcome', homePage(req.query.error)));
});

// Step 1: send the user to LinkedIn's consent screen
app.get('/auth/linkedin', (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  req.session.oauthState = state;

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: LINKEDIN_CLIENT_ID,
    redirect_uri: LINKEDIN_REDIRECT_URI,
    scope: SCOPES,
    state,
  });
  res.redirect(`${AUTHORIZE_URL}?${params}`);
});

// Step 2: LinkedIn redirects back with ?code=...&state=...
app.get('/auth/linkedin/callback', async (req, res) => {
  const { code, state, error, error_description } = req.query;

  if (error) {
    return res.redirect(`/?error=${encodeURIComponent(error_description || error)}`);
  }
  if (!state || state !== req.session.oauthState) {
    return res.redirect('/?error=' + encodeURIComponent('Invalid login state. Please try again.'));
  }
  delete req.session.oauthState;

  try {
    // Step 3: exchange the authorization code for an access token
    const tokenRes = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: LINKEDIN_REDIRECT_URI,
        client_id: LINKEDIN_CLIENT_ID,
        client_secret: LINKEDIN_CLIENT_SECRET,
      }),
    });
    if (!tokenRes.ok) throw new Error(`Token exchange failed: ${tokenRes.status} ${await tokenRes.text()}`);
    const { access_token } = await tokenRes.json();

    // Step 4: fetch the signed-in member's profile
    const userRes = await fetch(USERINFO_URL, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    if (!userRes.ok) throw new Error(`Userinfo failed: ${userRes.status} ${await userRes.text()}`);
    const profile = await userRes.json();

    // Regenerate the session on login to prevent session fixation
    req.session.regenerate((err) => {
      if (err) throw err;
      req.session.user = {
        id: profile.sub,
        name: profile.name,
        givenName: profile.given_name,
        familyName: profile.family_name,
        email: profile.email,
        emailVerified: profile.email_verified,
        picture: profile.picture,
        locale: profile.locale,
      };
      req.session.save(() => res.redirect('/portfolio'));
    });
  } catch (err) {
    console.error(err);
    res.redirect('/?error=' + encodeURIComponent('LinkedIn sign-in failed. Check the server logs.'));
  }
});

app.get('/portfolio', requireLogin, (req, res) => {
  res.send(layout(`${req.session.user.name} · Portfolio`, portfolioPage(req.session.user)));
});

app.get('/api/me', requireLogin, (req, res) => {
  res.json(req.session.user);
});

app.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.redirect('/');
  });
});

function requireLogin(req, res, next) {
  if (!req.session.user) return res.redirect('/');
  next();
}

app.listen(PORT, () => {
  console.log(`WindSliter running at http://localhost:${PORT}`);
});

// ---------- Views ----------

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function layout(title, body) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="/styles.css" />
</head>
<body>
  ${body}
</body>
</html>`;
}

function homePage(error) {
  return `
  <main class="hero">
    <div class="card hero-card">
      <h1>WindSliter</h1>
      <p class="muted">Your professional portfolio, powered by your LinkedIn identity.</p>
      ${error ? `<p class="error">${escapeHtml(error)}</p>` : ''}
      <a class="btn-linkedin" href="/auth/linkedin">
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z"/></svg>
        Sign in with LinkedIn
      </a>
      <p class="fine">We only request your name, profile photo and email.</p>
    </div>
  </main>`;
}

function portfolioPage(user) {
  const initials = `${user.givenName?.[0] ?? ''}${user.familyName?.[0] ?? ''}`;
  const avatar = user.picture
    ? `<img class="avatar" src="${escapeHtml(user.picture)}" alt="${escapeHtml(user.name)}" referrerpolicy="no-referrer" />`
    : `<div class="avatar avatar-fallback">${escapeHtml(initials)}</div>`;

  // Sample content — replace with your own data source
  const projects = [
    { title: 'Project Alpha', desc: 'A full-stack web app built with Node.js and React.', tags: ['Node.js', 'React'] },
    { title: 'Data Dashboard', desc: 'Interactive analytics dashboard for sales metrics.', tags: ['Python', 'D3.js'] },
    { title: 'Mobile Companion', desc: 'Cross-platform mobile app with offline sync.', tags: ['Flutter', 'Firebase'] },
  ];
  const skills = ['JavaScript', 'TypeScript', 'Node.js', 'React', 'SQL', 'Cloud', 'CI/CD'];

  return `
  <header class="topbar">
    <span class="brand">WindSliter</span>
    <form method="post" action="/logout"><button class="btn-ghost" type="submit">Sign out</button></form>
  </header>

  <main class="container">
    <section class="card profile">
      ${avatar}
      <div>
        <h1>${escapeHtml(user.name)}</h1>
        <p class="muted">${escapeHtml(user.email ?? '')}${user.emailVerified ? ' <span class="badge">verified</span>' : ''}</p>
        <p class="muted small">Signed in with LinkedIn${user.locale ? ` · ${escapeHtml(user.locale.language ?? '')}-${escapeHtml(user.locale.country ?? '')}` : ''}</p>
      </div>
    </section>

    <section>
      <h2>About</h2>
      <div class="card">
        <p>Hi, I'm ${escapeHtml(user.givenName ?? user.name)}! This is a sample portfolio page generated from your LinkedIn sign-in. Edit <code>portfolioPage()</code> in <code>server.js</code> to make it your own.</p>
      </div>
    </section>

    <section>
      <h2>Projects</h2>
      <div class="grid">
        ${projects
          .map(
            (p) => `
          <article class="card project">
            <h3>${escapeHtml(p.title)}</h3>
            <p>${escapeHtml(p.desc)}</p>
            <div class="tags">${p.tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>
          </article>`
          )
          .join('')}
      </div>
    </section>

    <section>
      <h2>Skills</h2>
      <div class="card tags">${skills.map((s) => `<span class="tag">${escapeHtml(s)}</span>`).join('')}</div>
    </section>
  </main>`;
}
