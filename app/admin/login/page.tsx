"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type SendResponse = { error?: string };
type VerifyResponse = { error?: string };

export default function AdminLoginPage() {
  const router = useRouter();

  // Step: "send" | "verify"
  const [step, setStep] = useState<"send" | "verify">("send");
  const [otp, setOtp] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  // Resend countdown
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown <= 0) return;
    const id = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [countdown]);

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setSending(true);
    try {
      const res = await fetch("/api/admin/otp/send", { method: "POST" });
      const data = (await res.json()) as SendResponse;
      if (!res.ok) {
        setError(data.error ?? "Failed to send OTP.");
        return;
      }
      setStep("verify");
      setCountdown(60);
      setInfo("A 6-digit code has been sent to the admin email.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setError("");
    setInfo("");
    setSending(true);
    try {
      const res = await fetch("/api/admin/otp/send", { method: "POST" });
      const data = (await res.json()) as SendResponse;
      if (!res.ok) {
        setError(data.error ?? "Failed to resend OTP.");
        return;
      }
      setCountdown(60);
      setInfo("A new code has been sent.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (otp.length !== 6) {
      setError("Please enter the 6-digit code.");
      return;
    }
    setVerifying(true);
    try {
      const res = await fetch("/api/admin/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp }),
      });
      const data = (await res.json()) as VerifyResponse;
      if (!res.ok) {
        setError(data.error ?? "Verification failed.");
        return;
      }
      sessionStorage.setItem("admin_tab_session", "active");
      router.push("/admin/bookings");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#060B1A] px-6 py-12">
      <div className="w-full max-w-sm">
        {/* Card */}
        <div className="rounded-2xl border border-[#1e2a45] bg-[#0d1526] shadow-[0_20px_60px_rgba(0,0,0,0.6)] overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-br from-[#7A0000] to-[#4a0000] px-8 py-8 text-center">
            <p className="text-xs tracking-[4px] text-[#f4c430] uppercase mb-1">
              Admin Access
            </p>
            <h1 className="text-2xl font-bold text-[#f4c430] tracking-wide">
              Namah Astroscience
            </h1>
            <p className="mt-1 text-xs text-[#e2c97e] tracking-[3px] uppercase">
              Vedic Guidance Studio
            </p>
          </div>

          {/* Body */}
          <div className="px-8 py-8">
            {step === "send" ? (
              <>
                <h2 className="text-lg font-semibold text-[#f4c430] mb-1">
                  Sign In
                </h2>
                <p className="text-sm text-[#6b7280] mb-6">
                  Click below to receive a one-time code at the admin email address.
                </p>
                <form onSubmit={handleSend}>
                  {error && (
                    <p className="mb-4 rounded-lg bg-red-900/30 border border-red-700/50 px-4 py-3 text-sm text-red-400">
                      {error}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={sending}
                    className="w-full rounded-xl bg-[#f4c430] px-4 py-3 text-sm font-bold text-[#060B1A] tracking-wide uppercase transition hover:bg-[#e0b020] disabled:opacity-60"
                  >
                    {sending ? "Sending OTP…" : "Send One-Time Code"}
                  </button>
                </form>
              </>
            ) : (
              <>
                <h2 className="text-lg font-semibold text-[#f4c430] mb-1">
                  Enter Your Code
                </h2>
                <p className="text-sm text-[#6b7280] mb-6">
                  {info || "Check your admin email for the 6-digit code."}
                </p>
                <form onSubmit={handleVerify} className="space-y-4">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    placeholder="_ _ _ _ _ _"
                    className="w-full rounded-xl border border-[#1e2a45] bg-[#111a2e] px-4 py-4 text-center text-2xl sm:text-3xl font-bold tracking-[8px] sm:tracking-[12px] text-[#f4c430] placeholder:text-[#2e3a52] outline-none focus:border-[#f4c430]/50 focus:ring-1 focus:ring-[#f4c430]/30 transition"
                    autoFocus
                  />

                  {error && (
                    <p className="rounded-lg bg-red-900/30 border border-red-700/50 px-4 py-3 text-sm text-red-400">
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={verifying || otp.length !== 6}
                    className="w-full rounded-xl bg-[#f4c430] px-4 py-3 text-sm font-bold text-[#060B1A] tracking-wide uppercase transition hover:bg-[#e0b020] disabled:opacity-60"
                  >
                    {verifying ? "Verifying…" : "Verify & Sign In"}
                  </button>

                  {/* Resend */}
                  <div className="text-center">
                    {countdown > 0 ? (
                      <p className="text-xs text-[#4b5563]">
                        Resend in{" "}
                        <span className="text-[#9ca3af] font-medium">{countdown}s</span>
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResend}
                        disabled={sending}
                        className="text-xs text-[#f4c430]/70 underline underline-offset-2 hover:text-[#f4c430] transition disabled:opacity-50"
                      >
                        {sending ? "Sending…" : "Resend code"}
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => { setStep("send"); setOtp(""); setError(""); setInfo(""); }}
                    className="w-full text-xs text-[#4b5563] hover:text-[#9ca3af] transition"
                  >
                    ← Back
                  </button>
                </form>
              </>
            )}
          </div>
        </div>

        {/* Expiry note */}
        <p className="mt-4 text-center text-xs text-[#2e3a52]">
          OTP codes expire after 10 minutes and are single-use.
        </p>
      </div>
    </main>
  );
}
