# Gmail password-reset setup

## Mandatory registration verification

Apply [002_email_verification.sql](../database/migrations/002_email_verification.sql) once before using verified registration. It preserves existing users as verified, creates database-backed OTP records, and lets pending users exist without a business workspace. A workspace is created only after a correct email code.

On this project, `npm run db:migrate:email` is the preferred idempotent migration command. It is equivalent to the SQL migration and does not require the MySQL command-line client.

Pending accounts are intentionally retained when delivery fails so the same email can request a fresh code. Do not run `npm run cleanup:pending` as part of registration recovery. If your deployment later needs a retention policy, schedule it only after choosing a retention period that suits your users; it only targets unverified accounts and their OTP records.

After setting the SMTP variables below, run `npm run email:verify` to test the SMTP connection without sending an application email.

SmartBiz Insight sends password-reset verification codes from the server only. It uses Gmail SMTP through Nodemailer; credentials must never be placed in browser code or committed to Git.

1. Create or choose a dedicated Gmail sender account.
2. In that Google account, enable **2-Step Verification**.
3. In Google Account security settings, create an **App Password** for Mail (availability varies by account and organisation). Copy it once and store it securely.
4. Copy `.env.example` to `.env` locally and set these placeholders to real local values:

   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=465
   SMTP_SECURE=true
   SMTP_USER=your_sender_email@gmail.com
   SMTP_APP_PASSWORD=your_16_character_google_app_password
   SMTP_FROM="SmartBiz Insight <your_sender_email@gmail.com>"
   ```

5. Restart the application. For an existing unverified account, open `/verify-registration`, enter its email in the resend field, and request a fresh code. The app only reports success after SMTP accepts the submission.
6. For deployment, add the same values in the hosting provider's secret/environment-variable panel; do not upload `.env`.

Gmail can rate-limit or block SMTP from new locations and some managed Google Workspace accounts disable App Passwords. If sending fails, the application shows an error and does not create a usable OTP. Verify the account's security policy and deployment egress settings before a demonstration.

The reset flow stores only an SHA-256 hash of the one-time code in the session. Codes expire in 10 minutes, accept at most five incorrect attempts, allow one resend per minute, and allow at most three requests per session.

## Database and delete behaviour

No database migration is required for password recovery: the session-bound reset state is intentionally short-lived. Products referenced by `order_items` are protected by the existing `ON DELETE RESTRICT` foreign key. The application now reports that condition cleanly instead of deleting business history. Unreferenced products are physically deleted.
