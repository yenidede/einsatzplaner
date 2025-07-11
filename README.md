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
```
DATABASE_URL="mongodb+srv://<name>:<password>@cluster0.whufizw.mongodb.net/<db>?retryWrites=true&w=majority"
```
Entweder kopieren und die Variablen ersetzen oder bei MongoDB -> Database -> Cluster -> Connect -> auf MongoDB for VS Code
Da kriegt man auch den Link, jedoch ist der letzte Abschnitt (nach dem / ) nicht enthalten und muss noch manuell hinzugefügt werden.
