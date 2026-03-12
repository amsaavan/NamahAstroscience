"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AdminInactivityGuard from "@/components/admin-inactivity-guard";

type ReviewRecord = {
    id: string;
    name: string;
    location: string;
    rating: number;
    review: string;
    createdAt: string;
};

type ReviewsResponse = { reviews?: ReviewRecord[]; error?: string };
type DeleteResponse = { error?: string };

export default function AdminReviewsPage() {
    const router = useRouter();
    const [reviews, setReviews] = useState<ReviewRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [deletingId, setDeletingId] = useState("");
    const [loggingOut, setLoggingOut] = useState(false);

    const loadReviews = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await fetch("/api/reviews");
            if (!res.ok) throw new Error("fetch_failed");
            const data = (await res.json()) as ReviewsResponse;
            setReviews(data.reviews ?? []);
        } catch {
            setError("Could not load reviews.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadReviews(); }, []);

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this review? This cannot be undone.")) return;
        setDeletingId(id);
        setError("");
        try {
            const res = await fetch("/api/reviews", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id }),
            });
            const data = (await res.json()) as DeleteResponse;
            if (!res.ok) { setError(data.error ?? "Delete failed."); return; }
            setReviews((prev) => prev.filter((r) => r.id !== id));
        } catch {
            setError("Delete failed due to a network error.");
        } finally {
            setDeletingId("");
        }
    };

    return (
        <main className="min-h-screen bg-[#f5efe6] px-6 py-12 text-[#5a1e1e]">
            <AdminInactivityGuard />
            <div className="mx-auto max-w-6xl">

                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-semibold text-[#7a1c1c]">Admin — Reviews</h1>
                        <p className="mt-2 text-sm text-[#6b4c3b]">
                            View and delete customer reviews.
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <Link
                            href="/"
                            className="rounded-lg border border-[#7a1c1c] px-4 py-2 text-sm text-[#7a1c1c] transition hover:-translate-y-0.5 hover:bg-[#7a1c1c] hover:text-[#f5efe6]"
                        >
                            🏠 Home
                        </Link>
                        <button
                            type="button"
                            onClick={() => router.push("/admin/bookings")}
                            className="rounded-lg border border-[#7a1c1c] px-4 py-2 text-sm text-[#7a1c1c] transition hover:-translate-y-0.5 hover:bg-[#7a1c1c] hover:text-[#f5efe6]"
                        >
                            ← Bookings
                        </button>
                        <button
                            type="button"
                            disabled={loggingOut}
                            onClick={async () => {
                                setLoggingOut(true);
                                try {
                                    await fetch("/api/admin/logout", { method: "POST" });
                                } finally {
                                    router.push("/admin/login");
                                    router.refresh();
                                }
                            }}
                            className="rounded-lg bg-[#7a1c1c] px-4 py-2 text-sm text-[#f5efe6] transition hover:-translate-y-0.5 hover:bg-[#5a1414] disabled:opacity-70"
                        >
                            {loggingOut ? "Signing out..." : "Sign Out"}
                        </button>
                    </div>
                </div>

                {/* Stats bar */}
                <div className="mt-6 flex flex-wrap items-center gap-4 rounded-xl border border-[#d6c7b2] bg-white p-4">
                    <span className="text-sm text-[#6b4c3b]">
                        {loading ? "Loading..." : `${reviews.length} review(s)`}
                    </span>
                    <button
                        type="button"
                        onClick={loadReviews}
                        className="rounded-lg bg-[#7a1c1c] px-4 py-2 text-sm text-[#f5efe6] transition hover:-translate-y-0.5 hover:bg-[#5a1414]"
                    >
                        Refresh
                    </button>
                </div>

                {error && <p className="mt-4 text-sm text-red-700">{error}</p>}

                {/* Reviews table */}
                <div className="mt-6 overflow-x-auto rounded-xl border border-[#d6c7b2] bg-white">
                    <table className="min-w-full text-left text-sm text-[#2b1b12]">
                        <thead className="bg-[#efe4d6] text-[#3b2417]">
                            <tr>
                                <th className="px-4 py-3">Reviewer</th>
                                <th className="px-4 py-3">Location</th>
                                <th className="px-4 py-3">Rating</th>
                                <th className="px-4 py-3">Review</th>
                                <th className="px-4 py-3">Date</th>
                                <th className="px-4 py-3">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reviews.length === 0 ? (
                                <tr>
                                    <td className="px-4 py-6 text-[#6b4c3b]" colSpan={6}>
                                        {loading ? "Loading reviews..." : "No reviews yet."}
                                    </td>
                                </tr>
                            ) : (
                                reviews.map((review) => (
                                    <tr key={review.id} className="border-t border-[#efe4d6]">
                                        <td className="px-4 py-3 font-medium text-[#2b1b12] whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#7a1c1c]/10 text-sm font-bold text-[#7a1c1c]">
                                                    {review.name.charAt(0).toUpperCase()}
                                                </span>
                                                {review.name}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-[#6b4c3b]">
                                            {review.location || "—"}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <span className="text-amber-500">
                                                {"★".repeat(review.rating)}
                                            </span>
                                            <span className="text-gray-300">
                                                {"★".repeat(5 - review.rating)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 max-w-xs">
                                            <p className="line-clamp-3 text-[#2b1b12]">{review.review}</p>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-[#6b4c3b]">
                                            {new Date(review.createdAt).toLocaleDateString("en-IN", {
                                                day: "2-digit", month: "short", year: "numeric",
                                            })}
                                        </td>
                                        <td className="px-4 py-3">
                                            <button
                                                type="button"
                                                disabled={deletingId === review.id}
                                                onClick={() => handleDelete(review.id)}
                                                className="rounded-md bg-[#7a1c1c] px-3 py-1 text-xs text-[#f5efe6] transition hover:-translate-y-0.5 hover:bg-[#5a1414] disabled:opacity-70"
                                            >
                                                {deletingId === review.id ? "Deleting..." : "Delete"}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </main>
    );
}
