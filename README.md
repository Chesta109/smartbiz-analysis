# SmartBiz Insight

SmartBiz Insight is an Express, EJS, MySQL, and Python business-analysis application.

## Local setup

```powershell
npm install
Copy-Item .env.example .env
mysql -u root -p -e "CREATE DATABASE smartbiz_insight"
Get-Content database\schema.sql | mysql -u root -p smartbiz_insight
npm run db:migrate:email
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r python\requirements.txt
npm start
```

Set `SESSION_SECRET` to a long random value in `.env`. For normal account email verification and password recovery, configure `SMTP_USER`, `SMTP_APP_PASSWORD`, `SMTP_FROM`, `SMTP_HOST`, `SMTP_PORT`, and `SMTP_SECURE`. Gmail supports port 465 with `SMTP_SECURE=true`, or port 587 with `SMTP_SECURE=false`. The app starts without SMTP, but normal registration and password recovery then report a safe configuration error.

## Shared demo workspace

The demo is an isolated tenant. Configure `DEMO_ACCOUNT_EMAIL`, `DEMO_ACCESS_PASSWORD_HASH`, `DEMO_BUSINESS_NAME`, and `DEMO_ACCOUNT_NAME` in `.env`. `DEMO_ACCESS_PASSWORD_HASH` is a bcrypt hash, never the plain password. Generate it locally and paste only the output into `.env`:

```powershell
node -e "require('bcrypt').hash(process.argv[1], 12).then(console.log)" "choose-a-team-demo-password"
```

```powershell
npm run demo:seed
```

Use **Open shared demo** on the sign-in page with the team password. The demo data is shared and editable for products, inventory, customers, sales, reports, and forecasts. It cannot open Settings, and its account has no ordinary usable password.

To recreate initial demo data:

```powershell
npm run demo:reset
```

The reset deletes and recreates records only for the configured demo business (sales/order items, customers, products). It never truncates tables and leaves real users and their data untouched. Do not run it where its configured demo identity may match a real account.

## Safe maintenance and checks

```powershell
npm run email:verify
npm run cleanup:pending
npm test
```

`cleanup:pending` removes only expired, unverified pending registrations and does not run during startup. Back up a production database and review maintenance output before deleting any records.
