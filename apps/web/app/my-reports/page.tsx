
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Issue = {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  createdAt: string;
  address: string | null;
};

const categoryNames: Record<string, string> = {
  roads: "Road or pothole",
  streetlights: "Streetlight",
  waste: "Garbage or waste",
  water: "Water or drainage",
  "public-spaces": "Park or public place",
  other: "Something else",
};

const statusStyles: Record<string, string> = {
  OPEN: "bg-amber-100 text-amber-800",
  TRIAGED: "bg-blue-100 text-blue-800",
  ASSIGNED: "bg-indigo-100 text-indigo-800",
  IN_PROGRESS: "bg-violet-100 text-violet-800",
  RESOLVED: "bg-emerald-100 text-emerald-800",
  CLOSED: "bg-zinc-200 text-zinc-700",
};

export default function MyReportsPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadReports() {
      try {
        const response = await fetch("/api/issues");

        if (!response.ok) {
          throw new Error("Could not load reports");
        }

        const data: Issue[] = await response.json();
        setIssues(data);
      } catch {
        setError("Could not load reports. Please check your connection and try again.");
      } finally {
        setIsLoading(false);
      }
    }

    loadReports();
  }, []);

  return (
    <main className="min-h-screen bg-zinc-50">
      <div className="mx-auto max-w-4xl px-5 py-8 sm:px-8 sm:py-12">
        <Link
          href="/"
          className="text-base font-medium text-zinc-600 underline underline-offset-4 hover:text-zinc-950"
        >
          ← Back to CiviPulse
        </Link>

        <header className="mt-8">
          <p className="font-semibold text-zinc-600">Your activity</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-zinc-950">
            My Reports
          </h1>
          <p className="mt-4 text-lg leading-8 text-zinc-700">
            Check the reports submitted through CiviPulse and follow their progress.
          </p>
        </header>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <p className="font-semibold text-zinc-700">
            {isLoading
              ? "Loading reports..."
              : `${issues.length} ${issues.length === 1 ? "report" : "reports"} found`}
          </p>

          <Link
            href="/report"
            className="inline-flex min-h-12 items-center justify-center rounded-xl bg-zinc-950 px-5 font-bold text-white hover:bg-zinc-800"
          >
            + Report an issue
          </Link>
        </div>

        {isLoading && (
          <p className="mt-6 rounded-xl bg-white p-6 text-zinc-600">
            Loading your reports...
          </p>
        )}

        {error && (
          <p role="alert" className="mt-6 rounded-xl bg-red-50 p-6 text-red-800">
            {error}
          </p>
        )}

        {!isLoading && !error && issues.length === 0 && (
          <div className="mt-6 rounded-xl bg-white p-8 text-center shadow-sm">
            <h2 className="text-xl font-bold text-zinc-950">No reports yet</h2>
            <p className="mt-2 text-zinc-600">
              Your submitted civic reports will appear here.
            </p>
            <Link href="/report" className="mt-5 inline-block font-bold underline">
              Report a problem
            </Link>
          </div>
        )}

        {!isLoading && !error && issues.length > 0 && (
          <div className="mt-6 space-y-4">
            {issues.map((issue) => (
  <Link
    key={issue.id}
    href={`/reports/${issue.id}`}
    className="block"
  >
    <article
      className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md sm:p-6"
    >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-zinc-500">
                      {categoryNames[issue.category] ?? issue.category}
                    </p>
                    <h2 className="mt-2 text-xl font-bold text-zinc-950">
                      {issue.title}
                    </h2>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1.5 text-sm font-bold ${
                      statusStyles[issue.status] ?? "bg-zinc-100 text-zinc-800"
                    }`}
                  >
                    {issue.status.replaceAll("_", " ")}
                  </span>
                </div>

                <p className="mt-3 leading-7 text-zinc-700">
                  {issue.description}
                </p>

                {issue.address && (
                  <p className="mt-3 text-sm text-zinc-600">
                    📍 {issue.address}
                  </p>
                )}

                <div className="mt-5 border-t border-zinc-100 pt-4">
                  <p className="text-sm text-zinc-500">
                    Reported on {new Date(issue.createdAt).toLocaleDateString()}
                  </p>
                  <p className="mt-1 break-all text-xs text-zinc-400">
                    Report ID: {issue.id}
                  </p>
                </div>
                          </article>
            </Link>
            ))}
          </div>
        )}

        <p className="mt-8 text-center text-sm text-zinc-500">
          Development view: all reports are currently shown. Sign-in and
          personal report filtering will be added later.
        </p>
      </div>
    </main>
  );
}
