'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function AuthDebugger() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [logs, setLogs] = useState<string[]>([]);

    const addLog = (message: string) => {
        setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
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
        <div className="max-w-2xl mx-auto p-6 bg-gray-50 rounded-lg">
            <h2 className="text-xl font-bold mb-4">Auth Debug Tool</h2>
            
            <div className="space-y-4">
                <div>
                    <h3 className="font-semibold">Session Status:</h3>
                    <p className="text-sm text-gray-600">{status}</p>
                </div>

                <div>
                    <h3 className="font-semibold">Session Data:</h3>
                    <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
                        {JSON.stringify(session, null, 2)}
                    </pre>
                </div>

                <div className="space-x-2">
                    <button
                        onClick={testRedirect}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                        Test Router Redirect
                    </button>
                    <button
                        onClick={testForceRedirect}
                        className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                    >
                        Test Force Redirect
                    </button>
                </div>

                <div>
                    <h3 className="font-semibold">Debug Logs:</h3>
                    <div className="bg-gray-100 p-2 rounded max-h-40 overflow-auto">
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
