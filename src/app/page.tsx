import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { ROLE_NAME_MAP } from "@/lib/auth/authGuard";
import { authOptions } from "@/lib/auth.config";
import { Button } from "@/components/ui/button";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/signin");
  }

  // Redirect authenticated users based on their role
  const userRoles = session.user.roleIds || [];

  if (
    userRoles.includes(ROLE_NAME_MAP["Superadmin"]) ||
    userRoles.includes(ROLE_NAME_MAP["Einsatzverwaltung"])
  ) {
    redirect("/einsatzverwaltung");
  } else if (userRoles.includes(ROLE_NAME_MAP["Helfer"])) {
    redirect("/helferansicht");
  }

  return (
    <div className="flex flex-col items-center justify-center grow bg-secondary prose">
      <h1 className="text-center max-w-160">
        Maturaprojekt der 5adb zusammen mit dem JMH
      </h1>
      <p className="text-center mb-4">
        mit ❤️ erstellt von{" "}
        <b>
          <Link href="https://davidkathrein.at">David Kathrein</Link>, Ömer
          Yenidede
        </b>{" "}
        und <b>Luca Raffeiner</b>.
      </p>
      <div className="flex gap-2">
        <Button asChild>
          <Link href="/settings">Einstellungen öffnen</Link>
        </Button>
      </div>
    </div>
  );
}
