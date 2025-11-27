import { getServerSession } from "next-auth";
import AuthDebugger from "@/components/AuthDebugger";

export default async function AuthTestPage() {
  const session = await getServerSession();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8">Auth Test & Debug</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-xl font-semibold mb-4">Server Session:</h2>
            <pre className="bg-white p-4 rounded-lg overflow-auto text-sm">
              {JSON.stringify(session, null, 2)}
            </pre>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4">Client Debug:</h2>
            <AuthDebugger />
          </div>
        </div>
      </div>
    </div>
  );
}
