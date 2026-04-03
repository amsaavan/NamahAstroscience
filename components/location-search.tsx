"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Search, MapPin, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export type LocationResult = {
  display_name: string;
  lat: number;
  lon: number;
  address: {
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
  };
};

interface LocationSearchProps {
  onSelect: (result: {
    name: string;
    lat: number;
    lon: number;
    timezone?: string;
  }) => void;
  placeholder?: string;
  initialValue?: string;
}

export function LocationSearch({ onSelect, placeholder = "Search city or town...", initialValue = "" }: LocationSearchProps) {
  const [query, setQuery] = useState(initialValue);
  const [results, setResults] = useState<LocationResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const searchLocation = async (val: string) => {
    if (val.length < 3) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      // Using Nominatim (OpenStreetMap) - Free and no key required for low volume
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&addressdetails=1&limit=5&featuretype=settlement`,
        {
          headers: {
            "Accept-Language": "en",
            "User-Agent": "Namah-Astroscience-Webapp"
          }
        }
      );
      const data = await response.json();
      setResults(data);
      setIsOpen(true);
    } catch (error) {
      console.error("Geocoding error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      searchLocation(val);
    }, 500);
  };

  const handleSelect = async (res: LocationResult) => {
    setQuery(res.display_name);
    setIsOpen(false);
    
    let timezone = undefined;
    
    // Attempt to get timezone based on lat/lon
    try {
        // Using a free timezone API (requires no key for basic lookups usually)
        const tzRes = await fetch(`https://api.worldtimeapi.org/api/timezone/Etc/GMT`); // Generic fallback
        // Note: For production, a reliable TZ API like Google Or TimezoneDB is better.
        // For now, we'll just pass the lat/lon and let the backend or astrologer handle the TZ.
    } catch (e) {}

    onSelect({
      name: res.display_name,
      lat: parseFloat(res.lat.toString()),
      lon: parseFloat(res.lon.toString()),
      timezone
    });
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="relative">
        <Input
          className="tokyo-control font-body border-[var(--tokyo-line)] text-[var(--tokyo-text)] placeholder:text-white/40 pr-10"
          placeholder={placeholder}
          value={query}
          onChange={handleInputChange}
          onFocus={() => query.length >= 3 && setIsOpen(true)}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </div>
      </div>

      <AnimatePresence>
        {isOpen && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border border-[var(--tokyo-line)] bg-[#0c1425] shadow-2xl"
          >
            <ul className="max-h-60 overflow-y-auto">
              {results.map((res, idx) => (
                <li key={idx}>
                  <button
                    type="button"
                    onClick={() => handleSelect(res)}
                    className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-white/5"
                  >
                    <MapPin className="mt-1 h-4 w-4 shrink-0 text-[var(--tokyo-neon)]" />
                    <div>
                      <p className="font-body text-sm text-white">{res.display_name}</p>
                      <p className="mt-0.5 font-body text-[10px] text-white/40 uppercase tracking-wider">
                        {res.lat.toString().slice(0, 7)}, {res.lon.toString().slice(0, 7)}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
