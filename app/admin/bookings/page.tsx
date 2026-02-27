"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type BookingRecord = {
  fullName: string;
  email: string;
  whatsapp: string;
  notes: string;
  date: string;
  slot: string;
  createdAt: string;
  feesPaid: boolean;
};

type BookingsResponse = {
  bookings?: BookingRecord[];
  error?: string;
};

export default function AdminBookingsPage() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState("");
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const [cancellingKey, setCancellingKey] = useState("");
  const [togglingKey, setTogglingKey] = useState("");

  const endpoint = useMemo(() => {
    if (!selectedDate) return "/api/bookings";
    return `/api/bookings?date=${encodeURIComponent(selectedDate)}`;
  }, [selectedDate]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(endpoint, { signal: controller.signal });
        if (!response.ok) {
          throw new Error("failed_bookings_fetch");
        }
        const data = (await response.json()) as BookingsResponse;
        if (active) {
          setBookings(data.bookings ?? []);
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        if (active) {
          setBookings([]);
          setError("Could not load bookings.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      active = false;
      controller.abort();
    };
  }, [endpoint]);

  return (
    <main className="min-h-screen bg-[#f5efe6] px-6 py-12 text-[#5a1e1e]">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-[#7a1c1c]">
              Admin Bookings Dashboard
            </h1>
            <p className="mt-2 text-sm text-[#6b4c3b]">
              View all booked slots and customer details.
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
              onClick={() => router.push("/admin/reviews")}
              className="rounded-lg border border-[#7a1c1c] px-4 py-2 text-sm text-[#7a1c1c] transition hover:-translate-y-0.5 hover:bg-[#7a1c1c] hover:text-[#f5efe6]"
            >
              Reviews
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

        <div className="mt-6 flex flex-wrap items-end gap-4 rounded-xl border border-[#d6c7b2] bg-white p-4">
          <div>
            <label className="mb-2 block text-sm text-[#6b4c3b]">
              Filter by date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-lg border border-[#d6c7b2] bg-[#f9f4ec] px-3 py-2"
            />
          </div>
          <button
            type="button"
            onClick={() => setSelectedDate("")}
            className="rounded-lg bg-[#7a1c1c] px-4 py-2 text-sm text-[#f5efe6] transition hover:-translate-y-0.5 hover:bg-[#5a1414]"
          >
            Clear Filter
          </button>
          <span className="text-sm text-[#6b4c3b]">
            {loading ? "Loading..." : `${bookings.length} booking(s)`}
          </span>
        </div>

        {error ? (
          <p className="mt-4 text-sm text-red-700">{error}</p>
        ) : null}

        <div className="mt-6 overflow-x-auto rounded-xl border border-[#d6c7b2] bg-white">
          <table className="min-w-full text-left text-sm text-[#2b1b12]">
            <thead className="bg-[#efe4d6] text-[#3b2417]">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">WhatsApp</th>
                <th className="px-4 py-3">Notes</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Fees</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="text-[#2b1b12]">
              {bookings.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-[#6b4c3b]" colSpan={9}>
                    No bookings found.
                  </td>
                </tr>
              ) : (
                bookings.map((booking) => {
                  const rowKey = `${booking.date}|${booking.slot}`;
                  return (
                    <tr
                      key={`${booking.date}-${booking.slot}-${booking.createdAt}`}
                      className="border-t border-[#efe4d6]"
                    >
                      <td className="px-4 py-3">{booking.date}</td>
                      <td className="px-4 py-3">{booking.slot}</td>
                      <td className="px-4 py-3 font-medium text-[#2b1b12]">
                        {booking.fullName}
                      </td>
                      <td className="px-4 py-3 font-medium text-[#2b1b12]">
                        {booking.email}
                      </td>
                      <td className="px-4 py-3 font-medium text-[#2b1b12]">
                        <a
                          href={`https://wa.me/${booking.whatsapp.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-700 underline hover:text-green-900"
                        >
                          {booking.whatsapp}
                        </a>
                      </td>
                      <td className="px-4 py-3">{booking.notes || "-"}</td>
                      <td className="px-4 py-3">
                        {new Date(booking.createdAt).toLocaleString()}
                      </td>

                      {/* Fees Paid toggle */}
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          disabled={togglingKey === rowKey}
                          onClick={async () => {
                            setTogglingKey(rowKey);
                            setError("");
                            try {
                              const response = await fetch("/api/bookings", {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  date: booking.date,
                                  slot: booking.slot,
                                  feesPaid: !booking.feesPaid,
                                }),
                              });
                              if (!response.ok) {
                                const data = (await response.json()) as BookingsResponse;
                                setError(data.error ?? "Update failed.");
                                return;
                              }
                              setBookings((prev) =>
                                prev.map((item) =>
                                  item.date === booking.date && item.slot === booking.slot
                                    ? { ...item, feesPaid: !booking.feesPaid }
                                    : item
                                )
                              );
                            } catch {
                              setError("Update failed due to a network error.");
                            } finally {
                              setTogglingKey("");
                            }
                          }}
                          className={`rounded-md px-3 py-1 text-xs font-semibold transition hover:-translate-y-0.5 disabled:opacity-70 ${booking.feesPaid
                            ? "bg-green-600 text-white hover:bg-green-800"
                            : "bg-amber-100 text-amber-800 ring-1 ring-amber-400 hover:bg-amber-200"
                            }`}
                        >
                          {togglingKey === rowKey
                            ? "..."
                            : booking.feesPaid
                              ? "✓ Paid"
                              : "Unpaid"}
                        </button>
                      </td>

                      {/* Cancel */}
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          disabled={cancellingKey === rowKey}
                          onClick={async () => {
                            setError("");
                            setCancellingKey(rowKey);
                            try {
                              const response = await fetch("/api/bookings", {
                                method: "DELETE",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  date: booking.date,
                                  slot: booking.slot,
                                }),
                              });
                              const data =
                                (await response.json()) as BookingsResponse;
                              if (!response.ok) {
                                setError(data.error ?? "Cancel failed.");
                                return;
                              }
                              setBookings((prev) =>
                                prev.filter(
                                  (item) =>
                                    !(
                                      item.date === booking.date &&
                                      item.slot === booking.slot
                                    )
                                )
                              );
                            } catch {
                              setError("Cancel failed due to a network error.");
                            } finally {
                              setCancellingKey("");
                            }
                          }}
                          className="rounded-md bg-[#7a1c1c] px-3 py-1 text-xs text-[#f5efe6] transition hover:-translate-y-0.5 hover:bg-[#5a1414] disabled:opacity-70"
                        >
                          {cancellingKey === rowKey ? "Cancelling..." : "Cancel"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
