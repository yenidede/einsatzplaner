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

## DB-Access:

1. Prisma-Access nur über DAL
   1.1 Auth in DAL
2. Tanstack Query (Client Side) callt DAL
   2.1 Datenzugriff über Tanstack Query

## Dialog:

Aktionen, die nicht leicht rückgängig gemacht werden sollen zuerst mit einem Dialogfenster bestätigt werden. Dieses ist global in layout.tsx eingebunden. Verwendung:

1. import { useAlertDialog } from "@/contexts/AlertDialogContext";
2. const { showDialog } = useAlertDialog();
3. await showDialog -> Promise<"success"|"cancelled">

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
