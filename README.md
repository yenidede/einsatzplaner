# Einsatzplaner

## Die Projektstruktur

```
──src
    ├───app
    ├───components
    ├───config
    ├───constants
    ├───context
    ├───features
    ├───hooks
    ├───lib
    ├───styles
    ├───tests
    ├───types
    └───utils
```

## .env Datei

### Email Configuration
SMTP_USER als auch SMTP_From sind beides die Email Adresse
Besuche diesen Link um ein App-Passwort von Google zu kriegen und setze sie dann bei SMTP_PASS ein
https://myaccount.google.com/apppasswords
```
# .env.local (einzige Datei)
# ==============================================
# Environment Configuration
# ==============================================

# Environment (ändere nur diesen Wert!)
NODE_ENV=production

NEXT_PUBLIC_SUPABASE_URL="https://fgxvzejucaxteqvnhojt.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZneHZ6ZWp1Y2F4dGVxdm5ob2p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2MjQyNjcsImV4cCI6MjA2ODIwMDI2N30.GUCMJEc0YwQ766Xdr4wk8gj2VM6lfFv-xODJ-_I4Nds"

# Database Configuration
# DATABASE_URL="postgresql://postgres.fgxvzejucaxteqvnhojt:1SgIUIbf7oki6qT6@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"
# DATABASE_URL="postgresql://postgres:1SgIUIbf7oki6qT6@db.fgxvzejucaxteqvnhojt.supabase.co:5432/postgres"
# Connect to Supabase via connection pooling
DATABASE_URL="postgresql://postgres.fgxvzejucaxteqvnhojt:1SgIUIbf7oki6qT6@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Direct connection to the database. Used for migrations
DIRECT_URL="postgresql://postgres.fgxvzejucaxteqvnhojt:1SgIUIbf7oki6qT6@aws-0-eu-central-1.pooler.supabase.com:5432/postgres"
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET="lKKpo4oYOQZgS3aZdV1SM815HqB63OiVLid9g5Q3b8"

# Debug Settings
DEBUG=true
LOG_LEVEL=debug

# Email Configuration (aktiviert für Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=oemer.yenidede066@gmail.com
SMTP_FROM=oemer.yenidede066@gmail.com
SMTP_PASS=

# Cron Job Security
CRON_SECRET=your-secret-cron-token-here

# Invitation Settings
INVITATION_EXPIRY_DAYS=7
INVITATION_REMINDER_DAYS=3
INVITATION_MAX_REMINDERS=2
INVITATION_ANONYMIZE_AFTER_DAYS=365


```

