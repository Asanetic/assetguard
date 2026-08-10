# atc-app-admin — Auth (Login)

First slice of the AssetGuard admin app. Next.js App Router, PostgreSQL + JWT.
Only the **login** flow is wired end-to-end; the folders are laid out so the
rest (register, status, mainapp modules, mediaroom) drop straight in.

## Structure

```
app/
├── api/                              # backend
│   ├── apiUtils/
│   │   ├── s_env/
│   │   │   └── db.js                 # PostgreSQL pool + query/transaction helpers
│   │   ├── dataControl/
│   │   │   ├── crud.js               # generic findOne/findMany/insert/update
│   │   │   └── users.js              # user lookups (by email OR phone)
│   │   └── authUtils/
│   │       ├── password.js           # bcrypt hash/verify
│   │       └── jwt.js                # sign/verify + cookie options
│   ├── auth/
│   │   └── login/
│   │       └── route.js              # POST /api/auth/login
│   ├── mainapp/                      # (backend app routes go here)
│   └── mediaroom/                    # (media routes go here)
│
└── mainapp/                          # frontend
    └── login/
        ├── page.jsx                  # /mainapp/login
        └── components/
            ├── LoginForm.jsx
            └── login.module.css
db/
├── schema.sql                        # users table
└── seed.js                           # creates a test admin
```

## Run it

```bash
npm install
cp .env.example .env.local            # fill in DATABASE_URL + JWT_SECRET
psql "$DATABASE_URL" -f db/schema.sql # create the users table
npm run db:seed                       # optional: seed admin@assetguard.co.ke / Admin1234
npm run dev
```

Open `/mainapp/login`.

## How login works

1. Form posts `{ identity, password }` to `POST /api/auth/login`.
   `identity` is an email **or** a phone number — same as the prototype.
2. Route looks up the user, checks status (Suspended / Pending are rejected),
   and verifies the bcrypt hash.
3. On success it signs a JWT and sets it as an **httpOnly** cookie (`atc_token`),
   then returns the safe user object. Wrong identity and wrong password return
   the same generic message so valid accounts aren't revealed.

## Next slices

Follow the same pattern to add:

- `app/api/auth/register/route.js` + `app/mainapp/register/`
- `app/api/auth/status/route.js` + `app/mainapp/status/` (pending approval)
- a `middleware.js` that reads `atc_token` to guard `/mainapp/*`
```
