"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { School } from "lucide-react";

export default function SchoolLoginPage() {
  const params = useParams();
  const slug = params.slug as string;

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
          <School className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white capitalize mb-2">
          {slug.replace(/-/g, " ")}
        </h1>
        <p className="text-gray-400 mb-8">School Admin Panel</p>

        <Link
          href={`/school/${slug}/dashboard`}
          className="inline-flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-all"
        >
          Enter Admin Panel
        </Link>
      </div>
    </div>
  );
}