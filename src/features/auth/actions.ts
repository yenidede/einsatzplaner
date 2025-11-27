"use server";

import { hash } from "bcryptjs";
import { z } from "zod";
import {
  getUserWithValidResetToken,
  resetUserPassword,
} from "@/DataAccessLayer/user";

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token ist erforderlich"),
  newPassword: z.string().min(8, "Passwort muss mindestens 8 Zeichen haben"),
});

export async function resetPasswordAction(data: {
  token: string;
  newPassword: string;
}) {
  try {
    const validated = resetPasswordSchema.parse(data);

    const user = await getUserWithValidResetToken(validated.token);

    if (!user) {
      return {
        success: false,
        error: "Ungültiger oder abgelaufener Token",
      };
    }

    const hashedPassword = await hash(validated.newPassword, 12);

    await resetUserPassword(user, hashedPassword);

    return {
      success: true,
      message: "Passwort erfolgreich zurückgesetzt",
    };
  } catch (error) {
    console.error("Reset password error:", error);

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: "Fehler beim Zurücksetzen des Passworts",
    };
  }
}
