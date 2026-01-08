'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function AuthDebugger() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs((prev) => [
      ...prev,
      `${new Date().toLocaleTimeString()}: ${message}`,
    ]);
  };

  useEffect(() => {
    addLog(`Session status: ${status}`);
    if (session) {
      addLog(`User: ${session.user?.email}`);
      addLog(`Session expires: ${session.expires}`);
    }
  }, [session, status]);

  const testRedirect = () => {
    addLog('Testing redirect to dashboard...');
    router.push('/helferansicht');
  };

  const testForceRedirect = () => {
    addLog('Testing force redirect to dashboard...');
    window.location.href = '/helferansicht';
  };

  return (
    <div className="mx-auto max-w-2xl rounded-lg bg-gray-50 p-6">
      <h2 className="mb-4 text-xl font-bold">Auth Debug Tool</h2>

      <div className="space-y-4">
        <div>
          <h3 className="font-semibold">Session Status:</h3>
          <p className="text-sm text-gray-600">{status}</p>
        </div>

        <div>
          <h3 className="font-semibold">Session Data:</h3>
          <pre className="overflow-auto rounded bg-gray-100 p-2 text-xs">
            {JSON.stringify(session, null, 2)}
          </pre>
        </div>

        <div className="space-x-2">
          <button
            onClick={testRedirect}
            className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
          >
            Test Router Redirect
          </button>
          <button
            onClick={testForceRedirect}
            className="rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600"
          >
            Test Force Redirect
          </button>
        </div>

        <div>
          <h3 className="font-semibold">Debug Logs:</h3>
          <div className="max-h-40 overflow-auto rounded bg-gray-100 p-2">
            {logs.map((log, index) => (
              <div key={index} className="text-xs text-gray-700">
                {log}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
