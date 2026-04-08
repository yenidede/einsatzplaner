import * as z from "zod"

  export interface ActionResponse<T = any> {
      success: boolean
      message: string
      errors?: {
          [K in keyof T]?: string[]
      }
      inputs?: T
  }
  export const formSchema = z.object({
"orga-name": z.string({ error: 'Dieses Feld ist erforderlich' }),
"orga-kuerzel": z.string().optional(),
"user-vorname": z.string({ error: 'Dieses Feld ist erforderlich' }),
"user-nachname": z.string({ error: 'Dieses Feld ist erforderlich' }),
"user-email": z.email('Bitte geben Sie eine gueltige E-Mail-Adresse ein'),
"user-password": z.string({ error: 'Dieses Feld ist erforderlich' }),
"user-passwort-confirm": z.string({ error: 'Dieses Feld ist erforderlich' }),
"otp-e72": z.string().min(6, 'Bitte geben Sie einen gueltigen Code ein').optional(),
"orga-logo-gross": z.union([
          z.file()
           .mime(["image/png","image/jpeg","image/gif","svg/xml"])
           .max(5242880),
          z.array(
            z.file()
             .mime(["image/png","image/jpeg","image/gif","svg/xml"])
             .max(5242880)
          ).nonempty({ message: "Bitte waehlen Sie eine Datei aus" }),
          z.string().min(1, "Bitte waehlen Sie eine Datei aus"),
          z.instanceof(FileList),
        ]).optional(),
"orga-logo-klein": z.union([
          z.file()
           .mime(["image/png","image/jpeg","image/gif"])
           .max(5242880),
          z.array(
            z.file()
             .mime(["image/png","image/jpeg","image/gif"])
             .max(5242880)
          ).nonempty({ message: "Bitte waehlen Sie eine Datei aus" }),
          z.string().min(1, "Bitte waehlen Sie eine Datei aus"),
          z.instanceof(FileList),
        ]).optional(),
"orga-helfer-singular": z.string().optional(),
"orga-helfer-plural": z.string().optional(),
"orga-einsatz-singular": z.string().optional(),
"user-phone": z.string().optional(),
"user-profilbild": z.union([
          z.file()
           .mime(["image/png","image/jpeg","image/gif"])
           .max(5242880),
          z.array(
            z.file()
             .mime(["image/png","image/jpeg","image/gif"])
             .max(5242880)
          ).nonempty({ message: "Bitte waehlen Sie eine Datei aus" }),
          z.string().min(1, "Bitte waehlen Sie eine Datei aus"),
          z.instanceof(FileList),
        ]).optional()
});
