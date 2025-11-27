import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export default async function EinsaetzePage() {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/signin");
  }

  return <div className="min-h-screen bg-gray-50"></div>;
}
