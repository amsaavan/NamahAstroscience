"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const INACTIVE_MS = 900_000;      // 15 minutes before logout
const WARNING_MS = 15_000;      // show warning 15s before logout

const ACTIVITY_EVENTS = [
    "mousemove", "mousedown", "keydown", "touchstart", "scroll", "click",
] as const;

export default function AdminInactivityGuard() {
    const router = useRouter();
    const [showWarning, setShowWarning] = useState(false);
    const [secondsLeft, setSecondsLeft] = useState(0);

    const logoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const warningTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const lastActivity = useRef(Date.now());

    const doLogout = useCallback(async () => {
        await fetch("/api/admin/logout", { method: "POST" });
        router.push("/admin/login");
        router.refresh();
    }, [router]);

    const clearAllTimers = () => {
        if (logoutTimer.current) clearTimeout(logoutTimer.current);
        if (warningTimer.current) clearTimeout(warningTimer.current);
        if (countdownRef.current) clearInterval(countdownRef.current);
    };

    const resetTimers = useCallback(() => {
        lastActivity.current = Date.now();
        clearAllTimers();
        setShowWarning(false);

        warningTimer.current = setTimeout(() => {
            setShowWarning(true);
            setSecondsLeft(Math.round(WARNING_MS / 1000));
            countdownRef.current = setInterval(() => {
                setSecondsLeft((s) => {
                    if (s <= 1) {
                        if (countdownRef.current) clearInterval(countdownRef.current);
                        return 0;
                    }
                    return s - 1;
                });
            }, 1000);
        }, INACTIVE_MS - WARNING_MS);

        logoutTimer.current = setTimeout(() => {
            doLogout();
        }, INACTIVE_MS);
    }, [doLogout]);

    // Start timers and bind activity listeners
    useEffect(() => {
        resetTimers();

        const handler = () => resetTimers();
        ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, handler, { passive: true }));

        return () => {
            clearAllTimers();
            ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, handler));
        };
    }, [resetTimers]);

    if (!showWarning) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="mx-4 w-full max-w-sm rounded-2xl border border-[#1e2a45] bg-[#0d1526] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.7)] text-center">
                {/* Icon */}
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/30">
                    <svg className="h-7 w-7 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    </svg>
                </div>

                <h2 className="text-lg font-bold text-[#f4c430] mb-1">Session Expiring</h2>
                <p className="text-sm text-[#6b7280] mb-5">
                    No activity detected. You will be logged out in
                </p>

                {/* Countdown */}
                <div className="text-5xl font-extrabold text-amber-400 tabular-nums mb-6">
                    {secondsLeft}s
                </div>

                <button
                    type="button"
                    onClick={resetTimers}
                    className="w-full rounded-xl bg-[#f4c430] py-3 text-sm font-bold text-[#060B1A] tracking-wide uppercase transition hover:bg-[#e0b020]"
                >
                    Stay Signed In
                </button>

                <button
                    type="button"
                    onClick={doLogout}
                    className="mt-3 w-full rounded-xl border border-[#1e2a45] py-3 text-sm text-[#4b5563] transition hover:text-[#9ca3af]"
                >
                    Sign Out Now
                </button>
            </div>
        </div>
    );
}
