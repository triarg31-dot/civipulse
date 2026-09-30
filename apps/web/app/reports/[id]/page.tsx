
"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type IssueHistory = {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  note: string | null;
  createdAt: string;
};

type IssueAttachment = {
  id: string;
  fileName: string;
  contentType: string;
  createdAt: string;
};

type Issue = {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  priority: string;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  history: IssueHistory[];
  attachments?: IssueAttachment[];
};

export default function ReportDetailsPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [issue, setIssue] = useState<Issue | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [statusNote, setStatusNote] = useState("");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchIssue() {
      setIsLoading(true);
      setLoadError("");

      try {
        const response = await fetch(`/api/issues/${id}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Could not find this report.");
        }

        const data: Issue = await response.json();
        setIssue(data);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }

        setLoadError(
          err instanceof Error ? err.message : "Something went wrong.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    fetchIssue();

    return () => controller.abort();
  }, [id]);

  async function updateStatus() {
    if (!selectedStatus) {
      setActionError("Please select a status.");
      return;
    }

    setIsUpdatingStatus(true);
    setActionError("");

    try {
      const response = await fetch(`/api/issues/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: selectedStatus,
          note: statusNote,
        }),
      });

      const data: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          typeof data === "object" &&
          data !== null &&
          "message" in data &&
          typeof data.message === "string"
            ? data.message
            : "Could not update the report status.";

        throw new Error(message);
      }

      const updatedIssue = data as Issue;

      setIssue((currentIssue) => {
        if (!currentIssue) {
          return updatedIssue;
        }

        return {
          ...updatedIssue,
          attachments:
            updatedIssue.attachments ?? currentIssue.attachments ?? [],
        };
      });

      setStatusNote("");
      setSelectedStatus("");
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Something went wrong.",
      );
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  if (isLoading) {
    return (
      <main className="mx-auto w-full max-w-3xl px-6 py-12">
        <p className="text-zinc-600">Loading report details...</p>
      </main>
    );
  }

  if (loadError || !issue) {
    return (
      <main className="mx-auto w-full max-w-3xl px-6 py-12">
        <p role="alert" className="text-red-600">
          {loadError || "Report not found."}
        </p>

        <Link
          href="/my-reports"
          className="mt-4 inline-block font-medium text-blue-600 hover:underline"
        >
          Back to My Reports
        </Link>
      </main>
    );
  }

  const attachments = issue.attachments ?? [];

  return (
    <main className="min-h-screen bg-zinc-50">
      <div className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-6 sm:py-12">
        <Link
          href="/my-reports"
          className="text-sm font-medium text-blue-600 hover:underline"
        >
          ← Back to My Reports
        </Link>

        <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
              {issue.title}
            </h1>

            <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium capitalize text-blue-700">
              {issue.status.replaceAll("_", " ").toLowerCase()}
            </span>
          </div>

          <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <h2 className="font-semibold text-zinc-900">
              Update report status
            </h2>

            <label
              htmlFor="status"
              className="mt-3 block text-sm font-medium text-zinc-700"
            >
              New status
            </label>

            <select
              id="status"
              value={selectedStatus}
              onChange={(event) => setSelectedStatus(event.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value="">Choose a status</option>
              <option value="OPEN">Open</option>
              <option value="TRIAGED">Triaged</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>

            <label
              htmlFor="statusNote"
              className="mt-4 block text-sm font-medium text-zinc-700"
            >
              Note (optional)
            </label>

            <textarea
              id="statusNote"
              value={statusNote}
              onChange={(event) => setStatusNote(event.target.value)}
              placeholder="Add a short note about this status change..."
              rows={3}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />

            {actionError && (
              <p role="alert" className="mt-3 text-sm font-medium text-red-600">
                {actionError}
              </p>
            )}

            <button
              type="button"
              onClick={updateStatus}
              disabled={isUpdatingStatus || !selectedStatus}
              className="mt-4 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isUpdatingStatus ? "Updating..." : "Update status"}
            </button>
          </div>

          <div className="mt-6">
            <h2 className="text-lg font-semibold text-zinc-900">
              Description
            </h2>

            <p className="mt-2 whitespace-pre-wrap leading-7 text-zinc-700">
              {issue.description}
            </p>
          </div>

          <div className="mt-8 border-t border-zinc-100 pt-6">
            <h2 className="text-lg font-semibold text-zinc-900">
              Photos
            </h2>

            {attachments.length === 0 ? (
              <p className="mt-3 text-sm text-zinc-500">
                No photos have been attached to this report.
              </p>
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {attachments.map((attachment) => (
                  <figure
                    key={attachment.id}
                    className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50"
                  >
                    <Image
                      src={`/api/issues/${encodeURIComponent(id)}/attachments/${encodeURIComponent(attachment.id)}`}
                      alt={`Photo attached to ${issue.title}`}
                      width={1200}
                      height={900}
                      unoptimized
                      className="h-auto max-h-96 w-full object-contain"
                    />

                    <figcaption className="break-all border-t border-zinc-200 px-3 py-2 text-sm text-zinc-600">
                      {attachment.fileName}
                    </figcaption>
                  </figure>
                ))}
              </div>
            )}
          </div>

          <div className="mt-8 grid gap-4 border-t border-zinc-100 pt-6 sm:grid-cols-2">
            <div>
              <p className="text-sm text-zinc-500">Category</p>
              <p className="mt-1 font-medium capitalize text-zinc-900">
                {issue.category.replaceAll("-", " ")}
              </p>
            </div>

            <div>
              <p className="text-sm text-zinc-500">Priority</p>
              <p className="mt-1 font-medium text-zinc-900">
                {issue.priority}
              </p>
            </div>

            <div>
              <p className="text-sm text-zinc-500">Location</p>
              <p className="mt-1 font-medium text-zinc-900">
                {issue.address || "Not provided"}
              </p>
            </div>

            <div>
              <p className="text-sm text-zinc-500">Reported on</p>
              <p className="mt-1 font-medium text-zinc-900">
                {new Date(issue.createdAt).toLocaleString()}
              </p>
            </div>

            <div>
              <p className="text-sm text-zinc-500">Last updated</p>
              <p className="mt-1 font-medium text-zinc-900">
                {new Date(issue.updatedAt).toLocaleString()}
              </p>
            </div>

            {issue.resolvedAt && (
              <div>
                <p className="text-sm text-zinc-500">Resolved on</p>
                <p className="mt-1 font-medium text-zinc-900">
                  {new Date(issue.resolvedAt).toLocaleString()}
                </p>
              </div>
            )}
          </div>

          {issue.latitude !== null && issue.longitude !== null && (
            <div className="mt-6 border-t border-zinc-100 pt-6">
              <p className="text-sm text-zinc-500">Coordinates</p>
              <p className="mt-1 font-medium text-zinc-900">
                {issue.latitude}, {issue.longitude}
              </p>
            </div>
          )}

          <div className="mt-8 border-t border-zinc-100 pt-6">
            <h2 className="text-lg font-semibold text-zinc-900">
              Status History
            </h2>

            {issue.history.length === 0 ? (
              <p className="mt-3 text-sm text-zinc-500">
                No status history available yet.
              </p>
            ) : (
              <ol className="mt-4 space-y-4">
                {issue.history.map((entry) => (
                  <li
                    key={entry.id}
                    className="border-l-2 border-blue-200 pl-4"
                  >
                    <p className="font-medium capitalize text-zinc-900">
                      {entry.fromStatus
                        ? `${entry.fromStatus.replaceAll("_", " ").toLowerCase()} → ${entry.toStatus.replaceAll("_", " ").toLowerCase()}`
                        : entry.toStatus.replaceAll("_", " ").toLowerCase()}
                    </p>

                    {entry.note && (
                      <p className="mt-1 text-sm text-zinc-600">
                        {entry.note}
                      </p>
                    )}

                    <p className="mt-1 text-xs text-zinc-500">
                      {new Date(entry.createdAt).toLocaleString()}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}