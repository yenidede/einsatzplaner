import * as z from "zod"

export interface ActionResponse<T = any> {
  success: boolean
  message: string
  errors?: {
    [K in keyof T]?: string[]
  }
  inputs?: T
}

const requiredText = (label: string) =>
  z.string().trim().min(1, `${label} ist erforderlich`)

const fileListSchema = z.custom<FileList>(
  (value) => typeof FileList !== 'undefined' && value instanceof FileList,
  'Bitte waehlen Sie eine Datei aus'
)

const singleUploadSchema = z.union([
  z.file()
    .mime(["image/png", "image/jpeg", "image/gif", "image/svg+xml"])
    .max(5242880),
  z.string().min(1, "Bitte waehlen Sie eine Datei aus"),
  fileListSchema,
]).optional()

export const formSchema = z.object({
  "orga-name": requiredText('Der Organisationsname'),
  "orga-kuerzel": z.string().optional(),
  "user-vorname": requiredText('Der Vorname'),
  "user-nachname": requiredText('Der Nachname'),
  "user-email": requiredText('Die E-Mail-Adresse').email('Bitte geben Sie eine gueltige E-Mail-Adresse ein'),
  "user-password": requiredText('Das Passwort'),
  "user-passwort-confirm": requiredText('Die Passwortbestaetigung'),
  "otp-e72": requiredText('Der Einmalcode').min(6, 'Bitte geben Sie einen gueltigen Code ein'),
  "orga-logo-gross": singleUploadSchema,
  "orga-logo-klein": singleUploadSchema,
  "orga-helfer-singular": z.string().optional(),
  "orga-helfer-plural": z.string().optional(),
  "orga-einsatz-singular": z.string().optional(),
  "user-phone": z.string().optional(),
  "user-profilbild": singleUploadSchema
});
