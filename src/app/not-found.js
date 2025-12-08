export const dynamic = 'force-dynamic';

import Link from 'next/link';

export default function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
            <h2 className="text-4xl font-bold mb-4">404 - Not Found</h2>
            <p className="text-gray-400 mb-8">Could not find requested resource</p>
            <Link
                href="/"
                className="bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-3 rounded-lg transition-colors"
            >
                Return Home
            </Link>
        </div>
    );
}
