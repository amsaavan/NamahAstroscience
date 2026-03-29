"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CalendarDays, Star, Phone, Mail, MessageCircle, AlertTriangle, CheckCircle2 } from "lucide-react";

const DAILY_SLOTS = (() => {
  const slots: string[] = [];
  for (let minutes = 9 * 60; minutes <= 18 * 60; minutes += 60) {
    const hh = String(Math.floor(minutes / 60)).padStart(2, "0");
    const mm = String(minutes % 60).padStart(2, "0");
    slots.push(`${hh}:${mm}`);
  }
  return slots;
})();

type AvailabilityResponse = {
  bookedSlots?: string[];
};

type BookingResponse = {
  error?: string;
  emailSent?: boolean;
  emailReason?: string | null;
};

const BACKGROUND_STARS = [
  { left: "4%", top: "6%", size: "h-1 w-1", opacity: "opacity-80", delay: "0s" },
  { left: "12%", top: "18%", size: "h-1.5 w-1.5", opacity: "opacity-70", delay: "0.8s" },
  { left: "21%", top: "10%", size: "h-1 w-1", opacity: "opacity-60", delay: "1.2s" },
  { left: "30%", top: "24%", size: "h-1 w-1", opacity: "opacity-75", delay: "0.4s" },
  { left: "39%", top: "8%", size: "h-1.5 w-1.5", opacity: "opacity-65", delay: "1.8s" },
  { left: "48%", top: "16%", size: "h-1 w-1", opacity: "opacity-80", delay: "2.2s" },
  { left: "58%", top: "6%", size: "h-1 w-1", opacity: "opacity-70", delay: "1.5s" },
  { left: "67%", top: "20%", size: "h-1.5 w-1.5", opacity: "opacity-75", delay: "0.6s" },
  { left: "76%", top: "12%", size: "h-1 w-1", opacity: "opacity-60", delay: "2s" },
  { left: "88%", top: "8%", size: "h-1 w-1", opacity: "opacity-80", delay: "1.1s" },
  { left: "8%", top: "34%", size: "h-1 w-1", opacity: "opacity-70", delay: "1.7s" },
  { left: "18%", top: "46%", size: "h-1.5 w-1.5", opacity: "opacity-65", delay: "0.9s" },
  { left: "27%", top: "38%", size: "h-1 w-1", opacity: "opacity-80", delay: "2.4s" },
  { left: "37%", top: "52%", size: "h-1 w-1", opacity: "opacity-75", delay: "0.3s" },
  { left: "46%", top: "40%", size: "h-1.5 w-1.5", opacity: "opacity-60", delay: "1.3s" },
  { left: "56%", top: "48%", size: "h-1 w-1", opacity: "opacity-70", delay: "2.1s" },
  { left: "66%", top: "36%", size: "h-1 w-1", opacity: "opacity-80", delay: "1.9s" },
  { left: "78%", top: "50%", size: "h-1.5 w-1.5", opacity: "opacity-65", delay: "0.5s" },
  { left: "87%", top: "42%", size: "h-1 w-1", opacity: "opacity-75", delay: "2.5s" },
  { left: "6%", top: "66%", size: "h-1.5 w-1.5", opacity: "opacity-70", delay: "1s" },
  { left: "17%", top: "78%", size: "h-1 w-1", opacity: "opacity-80", delay: "2.3s" },
  { left: "29%", top: "70%", size: "h-1 w-1", opacity: "opacity-65", delay: "0.7s" },
  { left: "41%", top: "84%", size: "h-1.5 w-1.5", opacity: "opacity-75", delay: "1.6s" },
  { left: "53%", top: "74%", size: "h-1 w-1", opacity: "opacity-60", delay: "2.6s" },
  { left: "64%", top: "88%", size: "h-1 w-1", opacity: "opacity-80", delay: "1.4s" },
  { left: "75%", top: "72%", size: "h-1.5 w-1.5", opacity: "opacity-70", delay: "0.2s" },
  { left: "86%", top: "82%", size: "h-1 w-1", opacity: "opacity-75", delay: "1.2s" },
  { left: "93%", top: "94%", size: "h-1 w-1", opacity: "opacity-60", delay: "2.2s" },
] as const;

type ReviewRecord = {
  id: string;
  name: string;
  location: string;
  rating: number;
  review: string;
  createdAt: string;
};

type ReviewsApiResponse = { reviews: ReviewRecord[] };
type ReviewPostResponse = { review?: ReviewRecord; error?: string };

function StarPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className="text-2xl transition-transform hover:scale-110 focus:outline-none"
        >
          <span
            style={{
              color: star <= (hovered || value) ? "#f4c430" : "#374151",
            }}
          >
            ★
          </span>
        </button>
      ))}
    </div>
  );
}

function ReviewCard({ review }: { review: ReviewRecord }) {
  return (
    <div className="w-[320px] md:w-[400px] flex-shrink-0 px-3">
      <Card className="h-full rounded-2xl border border-[var(--tokyo-line)] bg-[var(--tokyo-panel)] shadow-none">
        <CardContent className="flex h-full flex-col justify-between space-y-4 p-6">
          <div className="flex gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <span
                key={i}
                className="text-base"
                style={{ color: i < review.rating ? "#f4c430" : "#374151" }}
              >
                ★
              </span>
            ))}
          </div>
          <p className="font-body flex-1 text-sm leading-relaxed text-white">
            &ldquo;{review.review}&rdquo;
          </p>
          <div className="flex items-center gap-3 border-t border-[var(--tokyo-line)] pt-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--tokyo-neon)]/15 text-sm font-bold text-[var(--tokyo-neon)]">
              {review.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-body text-sm font-semibold text-[var(--tokyo-text)]">
                {review.name}
              </p>
              {review.location && (
                <p className="font-body text-xs text-white">
                  {review.location}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ReviewsSection() {
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form state
  const [rName, setRName] = useState("");
  const [rLocation, setRLocation] = useState("");
  const [rRating, setRRating] = useState(5);
  const [rText, setRText] = useState("");
  const [rStatus, setRStatus] = useState("");
  const [rSubmitting, setRSubmitting] = useState(false);
  const [rSuccess, setRSuccess] = useState(false);

  useEffect(() => {
    fetch("/api/reviews")
      .then((r) => r.json())
      .then((data: ReviewsApiResponse) => setReviews(data.reviews ?? []))
      .catch(() => setReviews([]))
      .finally(() => setIsLoading(false));
  }, []);

  const handleSubmit = async () => {
    setRStatus("");
    if (!rName.trim()) { setRStatus("Please enter your name."); return; }
    if (!rText.trim()) { setRStatus("Please write your review."); return; }
    if (rRating < 1) { setRStatus("Please select a star rating."); return; }

    setRSubmitting(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: rName, location: rLocation, rating: rRating, review: rText }),
      });
      const data = (await res.json()) as ReviewPostResponse;
      if (!res.ok) { setRStatus(data.error ?? "Failed to submit review."); return; }
      if (data.review) setReviews((prev) => [data.review!, ...prev]);
      setRName(""); setRLocation(""); setRRating(5); setRText("");
      setRSuccess(true);
      setTimeout(() => setRSuccess(false), 4000);
    } catch {
      setRStatus("Network error. Please try again.");
    } finally {
      setRSubmitting(false);
    }
  };

  return (
    <section className="relative z-10 border-t border-[var(--tokyo-line)] bg-[#090f1d] px-6 py-16">
      <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <h2 className="font-display text-center text-6xl text-[var(--tokyo-neon)] md:text-7xl">Reviews</h2>
        <div className="mt-4 flex flex-col items-center justify-center gap-2">
          <p className="font-body text-center text-sm uppercase tracking-[0.14em] text-white">
            What our clients say
          </p>
          {reviews.length > 0 && (
            <div className="flex items-center gap-2 rounded-full border border-[var(--tokyo-line)] bg-[var(--tokyo-bg)]/50 px-4 py-1">
              <span className="flex items-center gap-1 text-xs font-bold text-[#f4c430]">
                ★ { (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1) }
              </span>
              <span className="h-3 w-px bg-[var(--tokyo-line)]" />
              <span className="font-body text-[10px] uppercase tracking-[0.1em] text-white">
                {reviews.length} Total Reviews
              </span>
            </div>
          )}
        </div>

        {/* Submit Form */}
        <div className="mx-auto mt-10 max-w-2xl">
          <Card className="rounded-2xl border border-[var(--tokyo-line)] bg-[var(--tokyo-panel)]">
            <CardContent className="space-y-4 p-6 md:p-8">
              <h3 className="font-display text-3xl text-[var(--tokyo-neon)]">Leave a Review</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  className="tokyo-control font-body border-[var(--tokyo-line)] text-[var(--tokyo-text)] placeholder:text-white"
                  placeholder="Your Name"
                  value={rName}
                  onChange={(e) => setRName(e.target.value)}
                />
                <Input
                  className="tokyo-control font-body border-[var(--tokyo-line)] text-[var(--tokyo-text)] placeholder:text-white"
                  placeholder="City / Location (optional)"
                  value={rLocation}
                  onChange={(e) => setRLocation(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="font-body block text-xs uppercase tracking-[0.14em] text-white">
                  Your Rating
                </label>
                <StarPicker value={rRating} onChange={setRRating} />
              </div>
              <Textarea
                className="tokyo-control font-body border-[var(--tokyo-line)] text-[var(--tokyo-text)] placeholder:text-white"
                placeholder="Share your experience..."
                rows={4}
                value={rText}
                onChange={(e) => setRText(e.target.value)}
              />
              {rStatus && <p className="font-body text-sm text-red-400">{rStatus}</p>}
              {rSuccess && <p className="font-body text-sm text-[var(--tokyo-neon)]">✓ Thank you! Your review has been posted.</p>}
              <Button
                className="neo-btn font-body w-full !rounded-2xl !border !border-[var(--tokyo-neon)] py-5 text-sm font-semibold uppercase tracking-[0.18em]"
                disabled={rSubmitting}
                onClick={handleSubmit}
              >
                <span>{rSubmitting ? "Posting..." : "Post Review"}</span>
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="relative mt-12 w-full overflow-hidden">
          {isLoading ? (
            <p className="font-body text-center text-sm text-white">Loading reviews…</p>
          ) : reviews.length === 0 ? (
            <p className="font-body text-center text-sm text-white">
              No reviews yet — be the first to share your experience!
            </p>
          ) : reviews.length <= 3 ? (
            /* Static Grid for 3 or fewer reviews */
            <div className="mx-auto max-w-6xl grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {reviews.map((r) => (
                <ReviewCard key={r.id} review={r} />
              ))}
            </div>
          ) : (
            /* Sliding Carousel for more than 3 reviews */
            <>
              {/* Side Gradients for fading effect */}
              <div className="absolute left-0 top-0 z-20 h-full w-20 bg-gradient-to-r from-[#090f1d] to-transparent pointer-events-none" />
              <div className="absolute right-0 top-0 z-20 h-full w-20 bg-gradient-to-l from-[#090f1d] to-transparent pointer-events-none" />

              <div className="flex">
                <motion.div
                  className="flex"
                  animate={{
                    x: ["0%", "-33.333%"],
                  }}
                  transition={{
                    x: {
                      repeat: Infinity,
                      repeatType: "loop",
                      duration: reviews.length * 15,
                      ease: "linear",
                    },
                  }}
                  style={{ width: "fit-content" }}
                  whileHover={{ animationPlayState: "paused" }}
                >
                  {/* Triple the array to ensure seamless looping without gaps */}
                  {[...reviews, ...reviews, ...reviews].map((r, idx) => (
                    <ReviewCard key={`${r.id}-${idx}`} review={r} />
                  ))}
                </motion.div>
              </div>
            </>
          )}
        </div>

      </motion.div>
    </section>
  );
}

export default function AstrologerWebsite() {

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [whatsapp, setWhatsapp] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dateError, setDateError] = useState<string>("");

  // Birth details — optional, for Kundali
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [birthCity, setBirthCity] = useState("");
  const [birthState, setBirthState] = useState("");
  const [birthCountry, setBirthCountry] = useState("");

  const today = useMemo(() => {
    const now = new Date();
    const yyyy = String(now.getFullYear());
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }, []);




  const maxDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    const yyyy = String(d.getFullYear());
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const scrollToBooking = () => {
    const section = document.getElementById("booking-section");
    if (section) {
      section.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[var(--tokyo-bg)] text-[var(--tokyo-text)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_36%,#7A0000_0%,#5A0000_36%,#060B1A_78%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:linear-gradient(to_right,var(--tokyo-line)_1px,transparent_1px),linear-gradient(to_bottom,var(--tokyo-line)_1px,transparent_1px)] [background-size:44px_44px]" />
      <div className="pointer-events-none absolute inset-0">
        {BACKGROUND_STARS.map((star, idx) => (
          <span
            key={`${star.left}-${star.top}-${idx}`}
            className={`absolute rounded-full bg-white ${star.size} ${star.opacity} animate-[twinkle_3.8s_ease-in-out_infinite]`}
            style={{ left: star.left, top: star.top, animationDelay: star.delay }}
          />
        ))}
      </div>

      <header className="relative border-b border-[var(--tokyo-line)] bg-[#070b1a]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-5">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.jpeg"
              alt="Namah Astroscience Logo"
              width={54}
              height={54}
              className="rounded-md border border-[var(--tokyo-line)]"
            />
            <div>
              <p className="font-display text-3xl leading-none text-[var(--tokyo-neon)]">
                Namah Astroscience
              </p>
              <p className="font-body text-xs uppercase tracking-[0.22em] text-white">
                Vedic Guidance Studio
              </p>
            </div>
          </div>


        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-20 pt-24">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="relative"
        >

          <div className="pointer-events-none absolute left-4 top-16 hidden text-3xl text-[var(--star-white)]/85 drop-shadow-[0_0_10px_rgba(255,255,255,0.45)] md:block">
            ✧
          </div>
          <div className="pointer-events-none absolute right-24 top-24 hidden text-2xl text-[var(--star-dim)]/95 drop-shadow-[0_0_10px_rgba(255,255,255,0.35)] md:block">
            ✶
          </div>
          <div className="pointer-events-none absolute right-4 top-3 hidden text-5xl text-[var(--star-white)]/90 drop-shadow-[0_0_10px_rgba(255,255,255,0.55)] md:block">
            ✶
          </div>
          <div className="pointer-events-none absolute right-40 bottom-20 hidden h-9 w-9 overflow-hidden rounded-full md:block">
            <span className="absolute -left-[28%] inset-y-0 h-full w-[120%] rounded-full bg-[radial-gradient(circle_at_30%_35%,#FFE7A6_0%,#F4C430_46%,#8C5C00_100%)]" />
            <span className="absolute -inset-1 rounded-full bg-[radial-gradient(circle,#F4C430_0%,transparent_68%)] opacity-35 blur-[2px]" />
          </div>
          <div className="pointer-events-none absolute left-16 bottom-12 hidden h-7 w-7 overflow-hidden rounded-full md:block">
            <span className="absolute -left-[26%] inset-y-0 h-full w-[118%] rounded-full bg-[radial-gradient(circle_at_32%_36%,#FFE7A6_0%,#F4C430_45%,#8C5C00_100%)]" />
            <span className="absolute -inset-1 rounded-full bg-[radial-gradient(circle,#F4C430_0%,transparent_70%)] opacity-30 blur-[2px]" />
          </div>
          <h2 className="font-display text-5xl sm:text-7xl md:text-8xl lg:text-[clamp(4rem,12vw,8.2rem)] leading-[1.1] sm:leading-[0.9] tracking-[0.05em] sm:tracking-[0.07em] text-[var(--tokyo-neon)] drop-shadow-[0_0_16px_rgba(244,196,48,0.45)]">
            <span className="block">Namah</span>
            <span className="mt-1 sm:mt-2 block">Astroscience</span>
          </h2>
          <p className="font-body mt-6 max-w-xl text-sm sm:text-base uppercase tracking-[0.12em] text-white/90 md:text-lg">
            Cosmic timing, high clarity, and direct life strategy. A modern
            consultation flow with classic Vedic depth.
          </p>
          <div className="mt-8 flex justify-center">
            <Button
              onClick={scrollToBooking}
              className="neo-btn font-body !rounded-2xl !border !border-[var(--tokyo-neon)] px-10 py-6 text-sm font-bold uppercase tracking-[0.22em] shadow-[0_0_18px_rgba(244,196,48,0.28)]"
            >
              <span>Book Consultation</span>
            </Button>
          </div>
        </motion.div>
      </section>

      {/* Services Section */}
      <section className="relative z-10 border-y border-[var(--tokyo-line)] bg-[#090f1d] px-6 py-16">
        <h2 className="font-display text-center text-4xl sm:text-6xl text-[var(--tokyo-neon)] md:text-7xl">
          Services
        </h2>
        <p className="font-body mt-4 text-center text-xs sm:text-sm uppercase tracking-[0.14em] text-white/80">Areas of astrological guidance offered</p>
        {(() => {
          const services = [
            { title: "Health Issues", desc: "Early detection through planetary insight and chart analysis." },
            { title: "Business & Job", desc: "Timing and strategy for career moves and business decisions." },
            { title: "Study Guidance", desc: "Choosing the right stream and education path for success." },
            { title: "Income & Investment", desc: "Planning and timing investments based on your horoscope." },
            { title: "Marriage & Social", desc: "Match-making guidance and relationship compatibility." },
            { title: "Abroad Study & Job", desc: "Planetary factors for overseas education and employment." },
            { title: "Gemstone Suggestion", desc: "Personalised gemstone recommendations to strengthen planets." },
          ];
          return (
            <div className="mx-auto mt-10 max-w-6xl flex flex-wrap justify-center gap-6">
              {services.map((s, i) => (
                <div 
                  key={i} 
                  className="w-full sm:w-[calc(50%-12px)] lg:w-[calc(33.33%-16px)] xl:w-[calc(25%-18px)] flex"
                >
                  <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: i * 0.07 }}
                    whileHover={{ y: -4, transition: { duration: 0.2 } }}
                    className="w-full"
                  >
                    <Card className="h-full rounded-2xl border border-[var(--tokyo-line)] bg-[var(--tokyo-panel)] shadow-none transition-all hover:border-[var(--tokyo-neon)]/40 hover:shadow-[0_8px_30px_rgba(244,196,48,0.12)]">
                      <CardContent className="space-y-3 p-6 sm:p-8 flex flex-col h-full">
                        <Star className="h-5 w-5 text-[var(--tokyo-neon)] shrink-0" />
                        <h3 className="font-display text-2xl leading-tight text-[var(--tokyo-neon)]">
                          {s.title}
                        </h3>
                        <p className="font-body text-sm leading-relaxed text-white/90 flex-1">
                          {s.desc}
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>
              ))}
            </div>
          );
        })()}
      </section>

      {/* About / Preface Section */}
      <section className="relative z-10 px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="font-display text-center text-4xl sm:text-5xl text-[var(--tokyo-neon)] md:text-6xl mb-10">About</h2>
            <Card className="rounded-2xl border border-[var(--tokyo-line)] bg-[var(--tokyo-panel)]">
              <CardContent className="p-8 md:p-12 space-y-6">
                <div>
                  <h3 className="font-display text-3xl text-[var(--tokyo-neon)] mb-3">Preface</h3>
                  <p className="font-body text-base leading-relaxed text-white">
                    I have been endowed with astrological knowledge by the grace of Almighty God. Astrology is{" "}
                    <span className="text-red-400 font-semibold">not a miracle</span> but merely providing{" "}
                    <span className="text-[var(--tokyo-neon)] font-semibold">clear guidance</span> and a way of living life. Each and{" "}
                    <span className="text-red-400 font-semibold">every planet</span> has its own functions and is{" "}
                    <span className="text-red-400 font-semibold">associated with human bodies</span>. Based on planetary positions, one can act accordingly — it is said to be{" "}
                    <span className="text-[var(--tokyo-neon)] font-semibold">connected with science.</span>
                  </p>
                </div>
                <div>
                  <h3 className="font-display text-3xl text-[var(--tokyo-neon)] mb-4">With Horoscope Reading</h3>
                  <ul className="space-y-3">
                    {[
                      "I can provide guidance on specific health precautions aligned with individual risk patterns, enabling early identification of potential issues before they develop into serious conditions. This includes recognizing vulnerable organs, monitoring emerging symptoms, and maintaining awareness of periods when the body is more susceptible, so that timely action and preventive attention can reduce long-term impact.",
                      "I suggest business ideas, according to your horoscope. Therefore, you can avert major losses of time, money and futile efforts.",
                      "I can suggest about better career and choosing the desired stream in education.",
                      "Providing suitable suggestions related to match making and marriage life.",
                    ].map((point, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--tokyo-neon)]" />
                        <p className="font-body text-base leading-relaxed text-white">{point}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      <section id="booking-section" className="relative z-10 px-6 py-20">
        <h2 className="font-display text-center text-4xl sm:text-6xl text-[var(--tokyo-neon)] md:text-7xl">
          Schedule Session
        </h2>
        <div className="mx-auto mt-10 max-w-3xl">
          <Card className="rounded-2xl border border-[var(--tokyo-line)] bg-[var(--tokyo-panel)] shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
            <CardContent className="space-y-6 p-8 md:p-10">
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  className="tokyo-control font-body border-[var(--tokyo-line)] text-[var(--tokyo-text)] placeholder:text-white"
                  placeholder="Full Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
                <Input
                  className="tokyo-control font-body border-[var(--tokyo-line)] text-[var(--tokyo-text)] placeholder:text-white"
                  placeholder="Email Address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <select
                  className="tokyo-control tokyo-select font-body shrink-0 rounded-xl border border-[var(--tokyo-line)] px-3 py-3 text-sm outline-none w-full sm:w-[110px]"
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                >
                  <option value="+91">🇮🇳 +91</option>
                  <option value="+1">🇺🇸 +1</option>
                  <option value="+44">🇬🇧 +44</option>
                  <option value="+971">🇦🇪 +971</option>
                  <option value="+61">🇦🇺 +61</option>
                  <option value="+1-CA">🇨🇦 +1</option>
                  <option value="+65">🇸🇬 +65</option>
                  <option value="+60">🇲🇾 +60</option>
                  <option value="+64">🇳🇿 +64</option>
                  <option value="+27">🇿🇦 +27</option>
                  <option value="+49">🇩🇪 +49</option>
                  <option value="+33">🇫🇷 +33</option>
                  <option value="+81">🇯🇵 +81</option>
                  <option value="+86">🇨🇳 +86</option>
                  <option value="+92">🇵🇰 +92</option>
                  <option value="+880">🇧🇩 +880</option>
                  <option value="+94">🇱🇰 +94</option>
                  <option value="+977">🇳🇵 +977</option>
                </select>
                <Input
                  className="tokyo-control font-body flex-1 border-[var(--tokyo-line)] text-[var(--tokyo-text)] placeholder:text-white/60"
                  placeholder="WhatsApp Number"
                  inputMode="tel"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, ""))}
                />
              </div>

              <div className="space-y-2">
                <label className="font-body block text-xs uppercase tracking-[0.16em] text-white">
                  Choose a Date
                </label>
                <Input
                  className={`tokyo-control font-body border-[var(--tokyo-line)] transition-colors ${dateError ? "border-red-500 shadow-[0_0_0_2px_rgba(239,68,68,0.35)]" : ""
                    }`}
                  type="date"
                  min={today}
                  max={maxDate}
                  value={selectedDate}
                  onChange={(e) => {
                    setStatusMessage("");
                    const nextDate = e.target.value;
                    if (nextDate && nextDate < today) {
                      setSelectedDate("");
                      setDateError("Past dates are not allowed. Please select today or a future date.");
                      return;
                    }
                    if (nextDate && nextDate > maxDate) {
                      setSelectedDate("");
                      setDateError("Bookings are only accepted up to 7 days in advance.");
                      return;
                    }
                    setDateError("");
                    setSelectedDate(nextDate);
                  }}
                />
                {dateError && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2"
                  >
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                    <p className="font-body text-xs text-red-400">{dateError}</p>
                  </motion.div>
                )}
              </div>



              {/* Birth Details Section */}
              <div className="rounded-xl border border-[var(--tokyo-line)] p-5 space-y-4" style={{ background: 'rgba(244,196,48,0.04)' }}>
                <div>
                  <p className="font-body text-xs uppercase tracking-[0.16em] text-[var(--tokyo-neon)] mb-1">🔮 Birth Details <span className="normal-case text-white tracking-normal">(Optional — for Kundali chart)</span></p>
                  <p className="font-body text-xs text-white">Share your birth details to allow a personalised Kundali reading.</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="font-body block text-xs uppercase tracking-[0.14em] text-white">Date of Birth</label>
                    <Input
                      className="tokyo-control font-body border-[var(--tokyo-line)] text-[var(--tokyo-text)] placeholder:text-[var(--tokyo-muted)]"
                      type="date"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-body block text-xs uppercase tracking-[0.14em] text-white">Time of Birth</label>
                    <Input
                      className="tokyo-control font-body border-[var(--tokyo-line)] text-[var(--tokyo-text)] placeholder:text-[var(--tokyo-muted)]"
                      type="time"
                      value={birthTime}
                      onChange={(e) => setBirthTime(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-1">
                    <label className="font-body block text-xs uppercase tracking-[0.14em] text-white/90">City</label>
                    <Input
                      className="tokyo-control font-body border-[var(--tokyo-line)] text-[var(--tokyo-text)] placeholder:text-white/40"
                      placeholder="e.g. Talala"
                      value={birthCity}
                      onChange={(e) => setBirthCity(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-body block text-xs uppercase tracking-[0.14em] text-white/90">State</label>
                    <Input
                      className="tokyo-control font-body border-[var(--tokyo-line)] text-[var(--tokyo-text)] placeholder:text-white/40"
                      placeholder="e.g. Gujarat"
                      value={birthState}
                      onChange={(e) => setBirthState(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-body block text-xs uppercase tracking-[0.14em] text-white/90">Country</label>
                    <Input
                      className="tokyo-control font-body border-[var(--tokyo-line)] text-[var(--tokyo-text)] placeholder:text-white/40"
                      placeholder="e.g. India"
                      value={birthCountry}
                      onChange={(e) => setBirthCountry(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <Textarea
                className="tokyo-control font-body border-[var(--tokyo-line)] text-[var(--tokyo-text)] placeholder:text-white"
                placeholder="Your Question / Notes (Optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />

              {statusMessage ? (
                <p className="font-body text-sm text-[var(--tokyo-neon)]">
                  {statusMessage}
                </p>
              ) : null}

              <Button
                className="neo-btn font-body w-full !rounded-2xl !border !border-[var(--tokyo-neon)] py-6 text-sm font-semibold uppercase tracking-[0.18em]"
                disabled={isSubmitting}
                onClick={async () => {
                  setStatusMessage("");

                  if (!fullName.trim() || !email.trim() || !whatsapp.trim()) {
                    setStatusMessage(
                      "Please enter your name, email, and WhatsApp number."
                    );
                    return;
                  }
                  if (!selectedDate) {
                    setStatusMessage(
                      "Please choose a date to see available slots."
                    );
                    return;
                  }
                  if (selectedDate < today) {
                    setStatusMessage(
                      "Past dates are not allowed. Please select today or a future date."
                    );
                    return;
                  }


                  setIsSubmitting(true);

                  try {
                    const response = await fetch("/api/bookings", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        fullName,
                        email,
                        whatsapp: `${countryCode.replace("-CA", "")} ${whatsapp}`.trim(),
                        notes,
                        date: selectedDate,
                        slot: "Standard",

                        birthDate: birthDate || undefined,
                        birthTime: birthTime || undefined,
                        birthPlace: [birthCity, birthState, birthCountry].filter(Boolean).join(" | "),
                      }),
                    });

                    const data = (await response.json()) as BookingResponse;

                    if (response.status === 409) {
                      setStatusMessage(
                        data.error ??
                        "That date is no longer available. Please select another."
                      );
                      setIsSubmitting(false);
                      return;
                    }

                    if (!response.ok) {
                      setStatusMessage(data.error ?? "Booking failed.");
                      return;
                    }

                    const emailMessage = data.emailSent
                      ? "A confirmation email has been sent to your email address."
                      : "Booking saved! A confirmation email will be sent to you shortly.";

                    setStatusMessage(
                      `Consultation requested for ${selectedDate}. ${emailMessage}`
                    );

                  } catch {
                    setStatusMessage("Booking failed due to a network error.");
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
              >
                <span>{isSubmitting ? "Booking..." : "Confirm Appointment"}</span>
              </Button>

              <div className="mt-4 border-t border-[var(--tokyo-line)] pt-4 space-y-4">
                <div className="flex items-center justify-center gap-2">
                  <CalendarDays className="h-3.5 w-3.5 text-[var(--tokyo-neon)]" />
                  <p className="font-body text-[10px] uppercase tracking-[0.14em] text-[var(--tokyo-muted)] font-bold">Consultation Hours</p>
                </div>
                <div className="flex flex-col sm:flex-row items-center sm:items-start justify-center gap-4 sm:gap-8">
                  <div className="text-center sm:text-right">
                    <p className="text-[12px] uppercase tracking-[0.15em] text-[var(--tokyo-neon)] font-bold mb-1">🇮🇳 India (IST)</p>
                    <p className="text-[15px] text-white/90 leading-relaxed font-body">Mon – Fri: <span className="font-bold text-white">1:30 PM – 3:30 PM</span></p>
                    <p className="text-[15px] text-white/90 leading-relaxed font-body">Sat – Sun: <span className="font-bold text-white">4:00 PM – 8:00 PM</span></p>
                  </div>
                  <div className="hidden sm:block w-px h-10 bg-[var(--tokyo-line)] self-center" />
                  <div className="text-center sm:text-left">
                    <p className="text-[12px] uppercase tracking-[0.15em] text-[var(--tokyo-neon)] font-bold mb-1">🇨🇦 Canada (Local)</p>
                    <p className="text-[15px] text-white/90 leading-relaxed font-body">Mon – Fri: <span className="font-bold text-white">6:00 PM – 8:00 PM</span></p>
                    <p className="text-[15px] text-white/90 leading-relaxed font-body">Sat: <span className="font-bold text-white">2:00 PM – 6:00 PM</span></p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Reviews Section */}
      <ReviewsSection />


      <section className="relative z-10 border-t border-[var(--tokyo-line)] bg-[#0b1220] px-6 py-14 text-center">
        <h2 className="font-display mb-2 text-4xl sm:text-5xl text-[var(--tokyo-neon)]">
          Contact
        </h2>
        <p className="font-body mb-8 text-xs sm:text-sm uppercase tracking-[0.14em] text-[var(--tokyo-muted)]">Feel free to reach out on any of the below</p>
        <p className="font-display text-3xl text-[var(--tokyo-neon)] mb-6">Jinesh Shah</p>
        <div className="mx-auto flex max-w-4xl flex-col flex-wrap justify-center gap-4 md:flex-row">
          <div
            className="font-body flex items-center justify-center gap-3 rounded-xl border px-5 py-4 text-sm uppercase tracking-[0.1em]"
            style={{ borderColor: "#f4c430", backgroundColor: "#111a2e", color: "#f8fafc" }}
          >
            <Phone className="h-5 w-5 shrink-0" style={{ color: "#f4c430" }} />
            <a
              href="tel:+19025782770"
              style={{ color: "#f4c430", textDecoration: "underline", textUnderlineOffset: "4px", fontWeight: 600 }}
            >
              +1 902-578-2770
            </a>
          </div>
          <div
            className="font-body flex items-center justify-center gap-3 rounded-xl border px-5 py-4 text-sm uppercase tracking-[0.1em]"
            style={{ borderColor: "#f4c430", backgroundColor: "#111a2e", color: "#f8fafc" }}
          >
            <MessageCircle className="h-5 w-5 shrink-0" style={{ color: "#25D366" }} />
            <a
              href="https://wa.me/917984960585"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#25D366", textDecoration: "underline", textUnderlineOffset: "4px", fontWeight: 600 }}
            >
              +91 79849 60585
            </a>
          </div>
          <div
            className="font-body flex items-center justify-center gap-3 rounded-xl border px-5 py-4 text-sm uppercase tracking-[0.1em]"
            style={{ borderColor: "#f4c430", backgroundColor: "#111a2e", color: "#f8fafc" }}
          >
            <Mail className="h-5 w-5 shrink-0" style={{ color: "#f4c430" }} />
            <a
              href="mailto:namahastroscience@gmail.com"
              style={{ color: "#f4c430", textDecoration: "underline", textUnderlineOffset: "4px", fontWeight: 600, fontSize: "0.75rem" }}
            >
              namahastroscience@gmail.com
            </a>
          </div>
        </div>
      </section>

      <footer className="relative z-10 font-body border-t border-[var(--tokyo-line)] bg-[var(--tokyo-bg)] py-7 text-center text-xs uppercase tracking-[0.2em] text-[#9CA3AF]">
        (c) 2026 Namah Astroscience. All rights reserved.
      </footer>
    </div>
  );
}
