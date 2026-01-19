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

