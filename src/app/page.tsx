import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h1 className="text-4xl font-bold mb-6">Welcome to Our App</h1>
      <p className="text-lg mb-4">Please sign up or sign in to continue.</p>
      <div className="flex space-x-4">
        <Link href="/signup" className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
          Sign Up
        </Link>
        <Link href="/signin" className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
          Sign In
        </Link>
      </div>
    </div>
  );
}
