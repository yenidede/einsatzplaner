import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config";
import prisma from "@/lib/prisma";

export async function validatePdfAccess(einsatzId: string) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { authorized: false, error: "Unauthorized", status: 401 };
  }

  const einsatz = await prisma.einsatz.findUnique({
    where: { id: einsatzId },
    select: { org_id: true },
  });

  if (!einsatz) {
    return { authorized: false, error: "Einsatz not found", status: 404 };
  }

  const userOrg = await prisma.user_organization_role.findFirst({
    where: { user_id: session.user.id, org_id: einsatz.org_id },
  });

  if (!userOrg) {
    return { authorized: false, error: "Forbidden", status: 403 };
  }

  return { authorized: true, userId: session.user.id };
}
