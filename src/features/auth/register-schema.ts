import * as z from "zod";
import parsePhoneNumberFromString, { isValidPhoneNumber, parsePhoneNumber, parsePhoneNumberWithError } from "libphonenumber-js";
import { getPublicStorageUrlFromPath } from "@/lib/supabase-client";

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
        userId: z.uuid().optional(),
        invitationId: z.uuid().optional(),
        email: z
            .email("Bitte geben Sie eine gültige E-Mail-Adresse ein"),
        passwort: z
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
        pictureUrl: z.preprocess(
            (value) => {
                if (Array.isArray(value)) {
                    if (value.length === 0) {
                        return undefined;
                    }
                    return getPublicStorageUrlFromPath(value[0], "avatars");
                }

                if (value === "") {
                    return undefined;
                }
                return value;
            },
            z.url().optional(),
        ),
    })
    .refine(
        (data) => data.passwort === data.passwort2,
        {
            path: ["passwort2"],
            message: "Die Passwörter stimmen nicht überein",
        }
    );