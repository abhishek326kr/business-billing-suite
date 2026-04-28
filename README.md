# Invoice Management Web App

Next.js 14 invoice management app with App Router, Prisma/PostgreSQL, NextAuth credentials login, Puppeteer PDF generation, SMTP email delivery, file uploads, and a fintech-style admin UI.

## Setup

1. Install dependencies.
2. Review `.env` or copy `.env.example` to `.env` and adjust the values.
3. Run Prisma generate and migrations.
4. Seed the owner account.
5. Start the dev server.

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

## Environment Variables

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
APP_ENCRYPTION_KEY=
OWNER_EMAIL=
OWNER_PASSWORD=
UPLOAD_DIR=/var/www/sarvanu/uploads
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
R2_PUBLIC_URL=
```

## Deployment

Set `DATABASE_URL` in the deployment environment to your PostgreSQL connection string, then run migrations with:

```bash
npm run prisma:migrate:deploy
```

## Notes

- Uploaded files use Cloudflare R2 when `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, and `R2_PUBLIC_URL` are set.
- Without R2, uploaded files fall back to `UPLOAD_DIR` or `public/uploads`; `npm run uploads:init` creates the fallback folders automatically.
- The app uses PostgreSQL through Prisma. `DATABASE_URL` must start with `postgresql://` or `postgres://`.
- SMTP passwords are encrypted before storing in the database.
- Email sending is rate-limited in-memory per invoice route.
- Invoice numbers follow `INV-YYYYMMDD-0001` and increment per day.
- Puppeteer routes use the Node.js runtime.
