import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100">
      <h1 className="mb-6 text-4xl font-bold">Welcome to Our App</h1>
      <p className="mb-4 text-lg">Please sign up or sign in to continue.</p>
      <div className="flex space-x-4">
        <Link
          href="/signup"
          className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
        >
          Sign Up
        </Link>
        <Link
          href="/signin"
          className="rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600"
        >
          Sign In
        </Link>
      </div>
    </div>
  );
}
