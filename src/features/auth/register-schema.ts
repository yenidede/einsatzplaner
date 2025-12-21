import * as z from "zod";
import parsePhoneNumberFromString, { isValidPhoneNumber, parsePhoneNumber, parsePhoneNumberWithError } from "libphonenumber-js";

export interface ActionResponse<T = any> {
    success: boolean;
    message: string;
    errors?: {
        [K in keyof T]?: string[];
    };
    inputs?: T;
}

export interface ActionResponse<T = any> {
    success: boolean;
    message: string;
    errors?: {
        [K in keyof T]?: string[];
    };
    inputs?: T;
}

export const formSchema = z
    .object({
        email: z
            .email("Bitte geben Sie eine gültige E-Mail-Adresse ein"),
        passwort1: z
            .string()
            .min(8, "Das Passwort muss mindestens 8 Zeichen lang sein")
            .max(128, "Das Passwort darf maximal 128 Zeichen lang sein"),

        passwort2: z
            .string(),
        vorname: z
            .string()
            .trim()
            .min(2, "Der Vorname muss mindestens 2 Zeichen lang sein")
            .max(100, "Der Vorname darf maximal 100 Zeichen lang sein"),
        nachname: z
            .string()
            .trim()
            .min(2, "Der Nachname muss mindestens 2 Zeichen lang sein")
            .max(100, "Der Nachname darf maximal 100 Zeichen lang sein"),
        anredeId: z
            .uuid()
            .optional(),

        telefon: z
            .string()
            .trim()
            .optional()
            .refine(
                (value) => !value || isValidPhoneNumber(value),
                "Bitte geben Sie eine gültige Telefonnummer ein"
            )
            .transform((value) => {
                if (!value) return value;
                return parsePhoneNumberWithError(value).format("E.164");
            }),

        picture: z
            .preprocess((value) => {
                if (Array.isArray(value)) return value[0];
                return value;
            },
                z
                    .custom<File | undefined>(
                        (file) =>
                            !file ||
                            (typeof file === "object" &&
                                typeof (file as File).type === "string" &&
                                typeof (file as File).size === "number"),
                        "Bitte wählen Sie eine Bilddatei aus"
                    )
                    .refine(
                        (file) =>
                            !file ||
                            [
                                "image/png",
                                "image/jpeg",
                                "image/gif",
                                "image/webp",
                                "image/svg+xml",
                                "image/avif",
                                "image/heif",
                            ].includes(file.type),
                        "Ungültiger Dateityp. Bitte Bild auswählen."
                    )
                    .refine(
                        (file) => !file || file.size <= 5_242_880,
                        "Die Datei darf maximal 5 MB groß sein"
                    )
                    .optional()
            ),
    })
    .refine(
        (data) => data.passwort1 === data.passwort2,
        {
            path: ["passwort2"],
            message: "Die Passwörter stimmen nicht überein",
        }
    );