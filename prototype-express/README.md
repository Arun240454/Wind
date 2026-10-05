# WindSliter: LinkedIn SSO Portfolio

This is a small Node.js and Express app. Anyone can sign in with their LinkedIn account and see a portfolio page built from their LinkedIn name, photo and email.

It uses LinkedIn's **"Sign In with LinkedIn using OpenID Connect"** product with the OAuth 2.0 authorization code flow.

## How it works

```
Browser ──► /auth/linkedin ──► LinkedIn consent screen
                                    │
Browser ◄── /portfolio ◄── /auth/linkedin/callback?code=…&state=…
                               │  1. check the state value (CSRF protection)
                               │  2. POST code → /oauth/v2/accessToken
                               │  3. GET /v2/userinfo with the access token
                               └─ 4. store the profile in the session
```

## 1. Create a LinkedIn app

1. Go to <https://www.linkedin.com/developers/apps> and click **Create app**. LinkedIn requires you to link a LinkedIn Page; any page you admin will work.
2. On the **Products** tab, request **Sign In with LinkedIn using OpenID Connect**. It's usually approved right away.
3. On the **Auth** tab:
   - Copy the **Client ID** and **Primary Client Secret**.
   - Under **Authorized redirect URLs**, add `http://localhost:3000/auth/linkedin/callback`.

## 2. Configure and run

```bash
npm install
cp .env.example .env      # on Windows PowerShell: Copy-Item .env.example .env
# edit .env and paste your Client ID, Client Secret and a random SESSION_SECRET
npm start
```

Open <http://localhost:3000> and click **Sign in with LinkedIn**.

## Routes

| Route | Description |
| --- | --- |
| `GET /` | Landing page with the sign-in button |
| `GET /auth/linkedin` | Sends the user to LinkedIn's consent screen |
| `GET /auth/linkedin/callback` | Handles LinkedIn's response and creates the session |
| `GET /portfolio` | Portfolio page; requires sign-in |
| `GET /api/me` | Signed-in user's profile as JSON |
| `POST /logout` | Ends the session |

## Customizing

- Edit `portfolioPage()` in `server.js` to change the About, Projects and Skills sections. They currently hold sample data.
- Styles are in `public/styles.css`.

## Deploying

- Use an HTTPS redirect URL, such as `https://your-domain.com/auth/linkedin/callback`. Add it in the LinkedIn app's Auth tab and set it as `LINKEDIN_REDIRECT_URI`. When that URL uses HTTPS, the session cookie is automatically set to `secure`.
- The default in-memory session store is only meant for development. In production, use a persistent store such as `connect-redis`.
- If the app runs behind a proxy (Render, Heroku and similar hosts), add `app.set('trust proxy', 1)` so secure cookies work.

## Limitations

The OpenID Connect product only shares basic identity information: name, photo, email and locale. LinkedIn does not give general apps access to headline, positions, skills or connections. That's why the portfolio sections use sample data.
