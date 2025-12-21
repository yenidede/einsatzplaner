import * as z from "zod";

export interface ActionResponse<T = any> {
    success: boolean;
    message: string;
    errors?: {
        [K in keyof T]?: string[];
    };
    inputs?: T;
}
export const formSchema = z.object({
    email: z.email({ error: "Please enter a valid email" }),
    passwort1: z.string({ error: "This field is required" }),
    passwort2: z.string({ error: "This field is required" }),
    vorname: z.string({ error: "This field is required" }).optional(),
    nachname: z.string({ error: "This field is required" }).optional(),
    anrede: z.string().min(1, "Please select an item").optional(),
    telefon: z.coerce
        .number({ error: "Please enter a valid phone number" })
        .optional(),
    picture: z
        .union([
            z.file().mime(["image/png", "image/jpeg", "image/gif"]).max(5242880),
            z
                .array(
                    z.file().mime(["image/png", "image/jpeg", "image/gif"]).max(5242880),
                )
                .nonempty({ message: "Please select a file" }),
            z.string().min(1, "Please select a file"),
            z.instanceof(FileList),
        ])
        .optional(),
});
