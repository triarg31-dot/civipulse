
"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

const categories = [
  { value: "roads", label: "Road or pothole" },
  { value: "streetlights", label: "Streetlight" },
  { value: "waste", label: "Garbage or waste" },
  { value: "water", label: "Water or drainage" },
  { value: "public-spaces", label: "Park or public place" },
  { value: "other", label: "Something else" },
];

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

type ApiError = {
  message?: string | string[];
};

export default function ReportPage() {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [image, setImage] = useState<File | null>(null);

  const [isLocating, setIsLocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // If a report is created but its photo upload fails, keep its ID.
  // The next submission can retry the upload without creating a duplicate.
  const [pendingIssueId, setPendingIssueId] = useState<string | null>(null);

  const isRetryingPhoto = pendingIssueId !== null;

  function useMyLocation() {
    setError("");

    if (!navigator.geolocation) {
      setError(
        "Your browser does not support location. You can enter the address instead.",
      );
      return;
    }

    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(String(position.coords.latitude));
        setLongitude(String(position.coords.longitude));
        setAddress("My current location");
        setIsLocating(false);
      },
      () => {
        setError(
          "We could not get your location. You can type the address instead.",
        );
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      },
    );
  }

  function handleImageChange(file: File | null) {
    setError("");
    setSuccess("");

    if (!file) {
      setImage(null);
      return;
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setImage(null);
      setError("Please choose a JPEG, PNG, or WebP image.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setImage(null);
      setError("The photo must be 5 MB or smaller.");
      return;
    }

    setImage(file);
  }

  function resetForm() {
    setTitle("");
    setCategory("");
    setDescription("");
    setAddress("");
    setLatitude("");
    setLongitude("");
    setImage(null);
    setPendingIssueId(null);

    const fileInput = document.getElementById(
      "image",
    ) as HTMLInputElement | null;

    if (fileInput) {
      fileInput.value = "";
    }
  }

  async function readResponse(response: Response) {
    const data: unknown = await response.json().catch(() => ({}));
    return data as Record<string, unknown>;
  }

  function getErrorMessage(data: Record<string, unknown>, fallback: string) {
    const message = (data as ApiError).message;

    if (Array.isArray(message)) {
      return message.join(", ");
    }

    return typeof message === "string" ? message : fallback;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (isRetryingPhoto && !image) {
      setError(
        "Your report has already been created. Please choose a photo to retry the upload.",
      );
      return;
    }

    if (image && !ALLOWED_IMAGE_TYPES.includes(image.type)) {
      setError("Please choose a JPEG, PNG, or WebP image.");
      return;
    }

    if (image && image.size > MAX_FILE_SIZE) {
      setError("The photo must be 5 MB or smaller.");
      return;
    }

    setIsSubmitting(true);

    try {
      let issueId = pendingIssueId;

      // Create the report only if this is not a photo-upload retry.
      if (!issueId) {
        const response = await fetch("/api/issues", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title,
            description,
            category,
            address: address || undefined,
            latitude: latitude ? Number(latitude) : undefined,
            longitude: longitude ? Number(longitude) : undefined,
          }),
        });

        const data = await readResponse(response);

        if (!response.ok) {
          throw new Error(
            getErrorMessage(data, "We could not send your report."),
          );
        }

        if (typeof data.id !== "string" || !data.id) {
          throw new Error(
            "Your report may have been created, but the server did not return its ID. Please check My Reports before trying again.",
          );
        }

        issueId = data.id;
      }

      // Upload the optional photo separately as multipart form data.
      if (image && issueId) {
        const formData = new FormData();
        formData.append("file", image);

        const uploadResponse = await fetch(
          `/api/issues/${issueId}/attachments`,
          {
            method: "POST",
            body: formData,
          },
        );

       await readResponse(uploadResponse);

        if (!uploadResponse.ok) {
          // Preserve the report ID so a later submit retries only the photo.
          setPendingIssueId(issueId);
          throw new Error(
            `Your report was created (ID: ${issueId}), but the photo could not be uploaded. Please try submitting again to retry the photo.`,
          );
        }

        setSuccess("Thank you! Your report and photo were sent successfully.");
      } else {
        setSuccess("Thank you! Your report has been sent successfully.");
      }

      resetForm();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-50">
      <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8 sm:py-12">
        <nav
          className="flex flex-wrap items-center justify-between gap-3"
          aria-label="Main navigation"
        >
          <Link
            href="/"
            className="text-xl font-extrabold tracking-tight text-zinc-950 transition hover:text-blue-700"
          >
            CiviPulse<span className="text-blue-600">.</span>
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/report"
              aria-current="page"
              className="inline-flex min-h-11 items-center rounded-xl bg-blue-50 px-4 text-sm font-semibold text-blue-700"
            >
              Report an Issue
            </Link>

            <Link
              href="/my-reports"
              className="inline-flex min-h-11 items-center rounded-xl px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-950"
            >
              My Reports
            </Link>
          </div>
        </nav>

        <header className="mt-10">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700">
            <span aria-hidden="true">📍</span>
            Make your community better
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight text-zinc-950 sm:text-5xl">
            What needs fixing?
          </h1>

          <p className="mt-4 max-w-2xl text-lg leading-8 text-zinc-600">
            See a problem in your neighbourhood? Report it here. Share a few
            details so the issue can be understood and tracked.
          </p>
        </header>

        {isRetryingPhoto && (
          <div
            role="status"
            className="mt-8 rounded-xl border-2 border-amber-300 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-900"
          >
            Your report has already been created. Choose a photo and submit
            again to retry its upload. Your report details are locked to avoid
            changing the report that was already sent.
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-10 space-y-6">
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-7">
            <label
              htmlFor="title"
              className="text-xl font-bold text-zinc-950"
            >
              1. What is the problem?
            </label>

            <p className="mt-2 text-base text-zinc-600">
              Give it a short name, for example: &quot;Broken streetlight&quot;
              or &quot;Big pothole near school&quot;.
            </p>

            <input
              id="title"
              name="title"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Type the problem here"
              required
              disabled={isRetryingPhoto || isSubmitting}
              className="mt-5 min-h-14 w-full rounded-xl border-2 border-zinc-300 bg-white px-4 text-lg text-zinc-950 outline-none placeholder:text-zinc-500 focus:border-zinc-950 focus:ring-4 focus:ring-zinc-950/10 disabled:bg-zinc-100 disabled:text-zinc-500"
            />
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-7">
            <fieldset disabled={isRetryingPhoto || isSubmitting}>
              <legend className="text-xl font-bold text-zinc-950">
                2. What kind of problem is it?
              </legend>

              <p className="mt-2 text-base text-zinc-600">
                Choose the option that sounds closest.
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {categories.map((item) => (
                  <label
                    key={item.value}
                    className={`flex min-h-14 cursor-pointer items-center rounded-xl border-2 px-4 text-base font-semibold transition ${
                      category === item.value
                        ? "border-zinc-950 bg-zinc-100 text-zinc-950"
                        : "border-zinc-300 bg-white text-zinc-800 hover:border-zinc-500"
                    }`}
                  >
                    <input
                      type="radio"
                      name="category"
                      value={item.value}
                      checked={category === item.value}
                      onChange={(event) => setCategory(event.target.value)}
                      required
                      className="mr-3 h-5 w-5 accent-zinc-950"
                    />
                    {item.label}
                  </label>
                ))}
              </div>
            </fieldset>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-7">
            <label
              htmlFor="description"
              className="text-xl font-bold text-zinc-950"
            >
              3. Tell us a little more
            </label>

            <p className="mt-2 text-base text-zinc-600">
              What happened? Anything you know can help.
            </p>

            <textarea
              id="description"
              name="description"
              rows={6}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="For example: The streetlight has not worked for three days and the road is very dark at night."
              required
              disabled={isRetryingPhoto || isSubmitting}
              className="mt-5 w-full resize-y rounded-xl border-2 border-zinc-300 bg-white px-4 py-3 text-lg leading-7 text-zinc-950 outline-none placeholder:text-zinc-500 focus:border-zinc-950 focus:ring-4 focus:ring-zinc-950/10 disabled:bg-zinc-100 disabled:text-zinc-500"
            />
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-7">
            <h2 className="text-xl font-bold text-zinc-950">
              4. Where is the problem?
            </h2>

            <p className="mt-2 text-base text-zinc-600">
              You can type the address or let us use your current location.
            </p>

            <input
              id="address"
              name="address"
              type="text"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              placeholder="Street, area, landmark, or nearby place"
              disabled={isRetryingPhoto || isSubmitting}
              className="mt-5 min-h-14 w-full rounded-xl border-2 border-zinc-300 bg-white px-4 text-lg text-zinc-950 outline-none placeholder:text-zinc-500 focus:border-zinc-950 focus:ring-4 focus:ring-zinc-950/10 disabled:bg-zinc-100 disabled:text-zinc-500"
            />

            <button
              type="button"
              onClick={useMyLocation}
              disabled={isLocating || isRetryingPhoto || isSubmitting}
              className="mt-4 min-h-12 rounded-xl border-2 border-zinc-900 px-5 text-base font-bold text-zinc-950 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLocating ? "Finding your location..." : "📍 Use my location"}
            </button>

            <p className="mt-3 text-sm text-zinc-500">
              Location is optional. You can also describe where the problem is
              in your own words.
            </p>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-7">
            <h2 className="text-xl font-bold text-zinc-950">
              5. Add a photo <span className="font-normal">(optional)</span>
            </h2>

            <p className="mt-2 text-base text-zinc-600">
              A photo can help us understand the problem. JPEG, PNG, or WebP,
              up to 5 MB.
            </p>

            <label
              htmlFor="image"
              className="mt-5 flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50 px-5 text-center transition hover:border-zinc-500 hover:bg-zinc-100"
            >
              <span className="text-3xl" aria-hidden="true">
                📷
              </span>

              <span className="mt-2 break-all text-base font-bold text-zinc-900">
                {image ? image.name : "Choose a photo"}
              </span>

              <span className="mt-1 text-sm text-zinc-600">
                {image
                  ? `${(image.size / (1024 * 1024)).toFixed(2)} MB`
                  : "You can skip this if you do not have one."}
              </span>

              <input
                id="image"
                name="image"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) =>
                  handleImageChange(event.target.files?.[0] ?? null)
                }
                disabled={isSubmitting}
                className="sr-only"
              />
            </label>

            {image && (
              <button
                type="button"
                onClick={() => {
                  setImage(null);
                  const fileInput = document.getElementById(
                    "image",
                  ) as HTMLInputElement | null;
                  if (fileInput) fileInput.value = "";
                }}
                disabled={isSubmitting}
                className="mt-3 text-sm font-semibold text-zinc-600 underline hover:text-zinc-950 disabled:opacity-50"
              >
                Remove photo
              </button>
            )}
          </section>

          {error && (
            <div
              role="alert"
              className="rounded-xl border-2 border-red-300 bg-red-50 px-5 py-4 text-base font-semibold text-red-800"
            >
              {error}
            </div>
          )}

          {success && (
            <div
              role="status"
              className="rounded-xl border-2 border-emerald-300 bg-emerald-50 px-5 py-4 text-base font-semibold text-emerald-800"
            >
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || isLocating}
            className="min-h-14 w-full rounded-xl bg-zinc-950 px-6 text-lg font-bold text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting
              ? isRetryingPhoto
                ? "Retrying photo upload..."
                : "Sending your report..."
              : isRetryingPhoto
                ? "Retry photo upload"
                : "Send my report"}
          </button>

          <p className="text-center text-sm leading-6 text-zinc-500">
            You can review your report and its progress later.
          </p>
        </form>
      </div>
    </main>
  );
}