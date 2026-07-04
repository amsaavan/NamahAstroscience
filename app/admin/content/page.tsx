"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AdminInactivityGuard from "@/components/admin-inactivity-guard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import type { SiteContent, SiteService } from "@/lib/content-store-local";
import defaultData from "@/data/content.json";

export default function AdminContentPage() {
  const router = useRouter();
  const [content, setContent] = useState<SiteContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const [initialColor, setInitialColor] = useState<string>("#f4c430");

  useEffect(() => {
    fetch("/api/content")
      .then((res) => res.json())
      .then((data) => {
        if (data.content) {
          setContent(data.content);
          setInitialColor(data.content.themeColor || "#f4c430");
        } else {
          setContent(defaultData as SiteContent);
          setInitialColor(defaultData.themeColor || "#f4c430");
        }
        setIsLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setStatus("Failed to load content.");
        setIsLoading(false);
      });
  }, []);

  const handleSave = async () => {
    if (!content) return;
    setIsSaving(true);
    setStatus("");
    try {
      const res = await fetch("/api/admin/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(content),
      });
      if (!res.ok) {
        if (res.status === 401) {
          router.push("/admin/login");
          return;
        }
        throw new Error("Failed to save content");
      }
      setStatus("Content saved successfully.");
      setTimeout(() => setStatus(""), 3000);
    } catch (err: any) {
      console.error(err);
      setStatus("Error saving content.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleServiceChange = (index: number, field: keyof SiteService, value: string) => {
    if (!content) return;
    const newServices = [...content.services];
    newServices[index] = { ...newServices[index], [field]: value };
    setContent({ ...content, services: newServices });
  };

  const handleAddService = () => {
    if (!content) return;
    setContent({
      ...content,
      services: [...content.services, { title: "New Service", desc: "" }],
    });
  };

  const handleRemoveService = (index: number) => {
    if (!content) return;
    const newServices = [...content.services];
    newServices.splice(index, 1);
    setContent({ ...content, services: newServices });
  };

  const handlePointChange = (index: number, value: string) => {
    if (!content) return;
    const newPoints = [...content.aboutPoints];
    newPoints[index] = value;
    setContent({ ...content, aboutPoints: newPoints });
  };

  const handleAddPoint = () => {
    if (!content) return;
    setContent({
      ...content,
      aboutPoints: [...content.aboutPoints, "New point"],
    });
  };

  const handleRemovePoint = (index: number) => {
    if (!content) return;
    const newPoints = [...content.aboutPoints];
    newPoints.splice(index, 1);
    setContent({ ...content, aboutPoints: newPoints });
  };

  const handleAddRange = () => {
    if (!content) return;
    const newRanges = [...(content.slotRanges || []), { start: "09:00", end: "18:00" }];
    setContent({ ...content, slotRanges: newRanges });
  };

  const handleRemoveRange = (index: number) => {
    if (!content) return;
    const newRanges = [...(content.slotRanges || [])];
    newRanges.splice(index, 1);
    setContent({ ...content, slotRanges: newRanges });
  };

  const handleRangeChange = (index: number, field: "start" | "end", value: string) => {
    if (!content) return;
    const newRanges = [...(content.slotRanges || [])];
    newRanges[index] = { ...newRanges[index], [field]: value };
    setContent({ ...content, slotRanges: newRanges });
  };

  if (isLoading) return <p className="text-white">Loading content...</p>;
  if (!content) return <p className="text-red-400">Failed to load content.</p>;

  return (
    <main className="min-h-screen bg-[#f5efe6] px-6 py-12 text-[#5a1e1e]">
      <AdminInactivityGuard />
      <div className="mx-auto max-w-4xl space-y-8">
        
        {/* Header matching other dashboards */}
        <div className="flex items-start justify-between gap-4">
          <div>
              <h1 className="text-3xl font-semibold text-[#7a1c1c]">Admin — Site Content</h1>
              <p className="mt-2 text-sm text-[#6b4c3b]">
                  Edit the landing page text and services.
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
                  Bookings
              </button>
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

        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-[#7a1c1c]">Edit Landing Page</h2>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-md bg-[#7a1c1c] px-6 py-2 text-white hover:bg-[#5a1414] disabled:opacity-70 transition-colors"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>

        {status && (
          <div className="rounded-lg border border-green-500/50 bg-green-50 p-3 text-green-700">
            {status}
          </div>
        )}

        <Card className="rounded-2xl border border-[#d6c7b2] bg-white shadow-sm">
          <CardContent className="space-y-4 p-6 text-[#2b1b12]">
            <h3 className="text-xl font-bold text-[#7a1c1c]">Hero Section</h3>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[#6b4c3b] uppercase">Theme Color</label>
              <div className="flex gap-3 items-center">
                <input
                  type="color"
                  className="h-10 w-20 rounded border border-[#d6c7b2] cursor-pointer"
                  value={content.themeColor || "#f4c430"}
                  onChange={(e) => setContent({ ...content, themeColor: e.target.value })}
                />
                <Input
                  className="w-32 rounded border border-[#d6c7b2] p-2 bg-white focus:border-[#7a1c1c] outline-none font-mono"
                  value={content.themeColor || "#f4c430"}
                  onChange={(e) => setContent({ ...content, themeColor: e.target.value })}
                />
                {content.themeColor !== initialColor && (
                  <button
                    type="button"
                    onClick={() => setContent({ ...content, themeColor: initialColor })}
                    className="text-xs text-[#7a1c1c] underline hover:text-[#5a1414] ml-2"
                  >
                    Reset to Original
                  </button>
                )}
                {content.themeColor !== "#f4c430" && (
                  <button
                    type="button"
                    onClick={() => setContent({ ...content, themeColor: "#f4c430" })}
                    className="text-xs text-[#6b4c3b] underline hover:text-[#2b1b12] ml-2"
                  >
                    Default Gold
                  </button>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[#6b4c3b] uppercase">Title</label>
              <Input
                className="w-full rounded border border-[#d6c7b2] p-2 bg-white focus:border-[#7a1c1c] outline-none"
                value={content.heroTitle}
                onChange={(e) => setContent({ ...content, heroTitle: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[#6b4c3b] uppercase">Subtitle</label>
              <Textarea
                className="w-full rounded border border-[#d6c7b2] p-2 bg-white focus:border-[#7a1c1c] outline-none"
                rows={2}
                value={content.heroSubtitle}
                onChange={(e) => setContent({ ...content, heroSubtitle: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-[#d6c7b2] bg-white shadow-sm">
          <CardContent className="space-y-6 p-6 text-[#2b1b12]">
            <h3 className="text-xl font-bold text-[#7a1c1c]">Booking Form Settings</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between border border-[#d6c7b2] p-3 rounded-lg bg-gray-50/50">
                  <div>
                    <label className="block text-sm font-semibold text-[#6b4c3b] uppercase">Enable Date Selection</label>
                    <p className="text-xs text-gray-500">Allow users to select a booking date.</p>
                  </div>
                  <input 
                    type="checkbox" 
                    className="h-5 w-5 accent-[#7a1c1c] cursor-pointer"
                    checked={content.enableBookingDate ?? true}
                    onChange={(e) => setContent({ ...content, enableBookingDate: e.target.checked })}
                  />
                </div>

                <div className="flex items-center justify-between border border-[#d6c7b2] p-3 rounded-lg bg-gray-50/50">
                  <div>
                    <label className="block text-sm font-semibold text-[#6b4c3b] uppercase">Enable Slot Selection</label>
                    <p className="text-xs text-gray-500">Allow users to select time slots.</p>
                  </div>
                  <input 
                    type="checkbox" 
                    className="h-5 w-5 accent-[#7a1c1c] cursor-pointer"
                    checked={content.enableBookingSlot ?? false}
                    onChange={(e) => setContent({ ...content, enableBookingSlot: e.target.checked })}
                  />
                </div>
              </div>

              {content.enableBookingSlot && (
                <div className="space-y-4 border border-[#d6c7b2] p-4 rounded-lg bg-gray-50/50">
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-[#6b4c3b] uppercase">Slot Interval (Minutes)</label>
                    <select
                      className="w-full rounded border border-[#d6c7b2] p-2 bg-white focus:border-[#7a1c1c] outline-none"
                      value={content.slotInterval ?? 60}
                      onChange={(e) => setContent({ ...content, slotInterval: parseInt(e.target.value) })}
                    >
                      <option value={15}>15 Minutes</option>
                      <option value={30}>30 Minutes</option>
                      <option value={45}>45 Minutes</option>
                      <option value={60}>60 Minutes (1 Hour)</option>
                      <option value={90}>90 Minutes (1.5 Hours)</option>
                      <option value={120}>120 Minutes (2 Hours)</option>
                    </select>
                  </div>
                  
                  <div className="space-y-4 pt-2 border-t border-[#d6c7b2]/50 mt-2">
                    <label className="block text-xs font-semibold text-[#6b4c3b] uppercase">Time Ranges</label>
                    {(!content.slotRanges || content.slotRanges.length === 0) && (
                      <p className="text-xs text-gray-500 italic">No time ranges defined. Users won't see any slots.</p>
                    )}
                    {(content.slotRanges || []).map((range, index) => (
                      <div key={index} className="flex items-center gap-3 bg-white p-3 rounded border border-[#d6c7b2]">
                        <div className="flex-1 space-y-1">
                          <label className="block text-[10px] font-semibold text-gray-500 uppercase">Start Time</label>
                          <Input
                            type="time"
                            className="w-full rounded border border-[#d6c7b2] p-1.5 h-8 text-sm focus:border-[#7a1c1c] outline-none"
                            value={range.start}
                            onChange={(e) => handleRangeChange(index, "start", e.target.value)}
                          />
                        </div>
                        <div className="flex-1 space-y-1">
                          <label className="block text-[10px] font-semibold text-gray-500 uppercase">End Time</label>
                          <Input
                            type="time"
                            className="w-full rounded border border-[#d6c7b2] p-1.5 h-8 text-sm focus:border-[#7a1c1c] outline-none"
                            value={range.end}
                            onChange={(e) => handleRangeChange(index, "end", e.target.value)}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveRange(index)}
                          className="mt-4 text-xs font-semibold text-red-500 hover:text-red-700 px-2 py-1"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <button 
                      type="button"
                      onClick={handleAddRange} 
                      className="w-full rounded border border-[#d6c7b2] py-2 text-xs font-semibold text-[#6b4c3b] hover:bg-white transition-colors"
                    >
                      + Add Time Range
                    </button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-[#d6c7b2] bg-white shadow-sm">
          <CardContent className="space-y-6 p-6 text-[#2b1b12]">
            <h3 className="text-xl font-bold text-[#7a1c1c]">About Section</h3>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[#6b4c3b] uppercase">Preface (Supports basic HTML like &lt;span&gt;)</label>
              <Textarea
                className="w-full rounded border border-[#d6c7b2] p-2 bg-white focus:border-[#7a1c1c] outline-none"
                rows={5}
                value={content.aboutPreface}
                onChange={(e) => setContent({ ...content, aboutPreface: e.target.value })}
              />
            </div>
            <div className="space-y-4">
              <label className="block text-sm font-semibold text-[#6b4c3b] uppercase">Key Points</label>
              {content.aboutPoints.map((point, index) => (
                <div key={index} className="flex gap-2">
                  <Textarea
                    className="flex-1 rounded border border-[#d6c7b2] p-2 bg-white focus:border-[#7a1c1c] outline-none"
                    rows={2}
                    value={point}
                    onChange={(e) => handlePointChange(index, e.target.value)}
                  />
                  <button className="rounded bg-red-100 text-red-600 px-3 py-1 hover:bg-red-200" onClick={() => handleRemovePoint(index)}>Remove</button>
                </div>
              ))}
              <button onClick={handleAddPoint} className="w-full rounded border border-[#d6c7b2] py-2 text-[#6b4c3b] hover:bg-gray-50 transition-colors">Add Point</button>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-[#d6c7b2] bg-white shadow-sm">
          <CardContent className="space-y-6 p-6 text-[#2b1b12]">
            <h3 className="text-xl font-bold text-[#7a1c1c]">Services Section</h3>
            <div className="space-y-6">
              {content.services.map((service, index) => (
                <div key={index} className="space-y-2 border border-[#d6c7b2] p-4 rounded-lg relative bg-gray-50/50">
                  <button 
                    onClick={() => handleRemoveService(index)}
                    className="absolute top-2 right-2 text-red-500 hover:text-red-700 text-xs font-semibold"
                  >
                    Remove
                  </button>
                  <label className="block text-sm font-semibold text-[#6b4c3b] uppercase">Service {index + 1} Title</label>
                  <Input
                    className="w-full rounded border border-[#d6c7b2] p-2 bg-white focus:border-[#7a1c1c] outline-none"
                    value={service.title}
                    onChange={(e) => handleServiceChange(index, "title", e.target.value)}
                  />
                  <label className="block text-sm font-semibold text-[#6b4c3b] uppercase mt-2">Service {index + 1} Description</label>
                  <Textarea
                    className="w-full rounded border border-[#d6c7b2] p-2 bg-white focus:border-[#7a1c1c] outline-none"
                    rows={2}
                    value={service.desc}
                    onChange={(e) => handleServiceChange(index, "desc", e.target.value)}
                  />
                </div>
              ))}
              <button onClick={handleAddService} className="w-full rounded border border-[#d6c7b2] py-2 text-[#6b4c3b] hover:bg-gray-50 transition-colors">Add Service</button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
