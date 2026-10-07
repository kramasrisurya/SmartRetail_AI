import React, { useState } from "react";
import { MapPin, Navigation, Eye, Layers, Activity } from "lucide-react";

export function SpatialTwinView() {
  const [showHeatmaps, setShowHeatmaps] = useState(true);
  const [showJourneys, setShowJourneys] = useState(true);

  return (
    <div className="space-y-4 font-sans text-[#E7E7E7]">
      {/* Control Dock */}
      <div className="h-14 px-5 rounded-xl bg-[#222829] border border-[#E7E7E7]/10 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-base font-bold tracking-tight text-[#E7E7E7] flex items-center gap-2">
            <Navigation className="w-4 h-4 text-[#517664]" />
            Spatial Store Map & Digital Twin
          </h1>
          <p className="text-xs text-[#E7E7E7]/50">2D vector store layout, trajectory pathing, and dwell hotspots</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowJourneys(!showJourneys)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all duration-300 ${
              showJourneys
                ? "bg-[#517664]/20 border border-[#517664]/60 text-[#E7E7E7]"
                : "bg-[#1B2021] border border-[#E7E7E7]/10 text-[#E7E7E7]/40 hover:text-[#E7E7E7]"
            }`}
          >
            CUSTOMER TRAILS
          </button>
          <button
            type="button"
            onClick={() => setShowHeatmaps(!showHeatmaps)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all duration-300 ${
              showHeatmaps
                ? "bg-[#9D69A3]/20 border border-[#9D69A3]/60 text-[#E7E7E7]"
                : "bg-[#1B2021] border border-[#E7E7E7]/10 text-[#E7E7E7]/40 hover:text-[#E7E7E7]"
            }`}
          >
            DWELL HEATMAP
          </button>
        </div>
      </div>

      {/* 2D Minimalist SVG Digital Twin Floor Plan */}
      <div className="p-6 rounded-xl bg-[#222829] border border-[#E7E7E7]/10 relative overflow-hidden flex items-center justify-center min-h-[520px]">
        <svg
          viewBox="0 0 1000 600"
          className="w-full h-auto max-h-[640px] select-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Trail Gradient: Deep Teal (#517664 - entry) to Vintage Lavender (#816E94 - current) */}
            <linearGradient id="journeyGradient1" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#517664" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#816E94" stopOpacity="1" />
            </linearGradient>

            <linearGradient id="journeyGradient2" x1="0%" y1="100%" x2="80%" y2="50%">
              <stop offset="0%" stopColor="#517664" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#816E94" stopOpacity="1" />
            </linearGradient>

            {/* Vivid Lavender Radial Hotspots */}
            <radialGradient id="hotspotVivid">
              <stop offset="0%" stopColor="#9D69A3" stopOpacity="0.65" />
              <stop offset="50%" stopColor="#9D69A3" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#9D69A3" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Floor boundary in faint Alabaster Grey lines */}
          <rect x="40" y="30" width="920" height="540" rx="16" fill="#1B2021" stroke="#E7E7E7" strokeOpacity="0.15" strokeWidth="1.5" />

          {/* Department Shelves */}
          {/* Aisle 1 - Groceries */}
          <rect x="100" y="80" width="180" height="120" rx="8" fill="#222829" stroke="#E7E7E7" strokeOpacity="0.2" strokeWidth="1" />
          <text x="190" y="145" fill="#E7E7E7" opacity="0.6" fontSize="12" fontFamily="monospace" textAnchor="middle">Aisle 1: Groceries</text>

          {/* Aisle 2 - Dairy */}
          <rect x="340" y="80" width="180" height="120" rx="8" fill="#222829" stroke="#E7E7E7" strokeOpacity="0.2" strokeWidth="1" />
          <text x="430" y="145" fill="#E7E7E7" opacity="0.6" fontSize="12" fontFamily="monospace" textAnchor="middle">Aisle 2: Dairy</text>

          {/* Aisle 3 - Beverages */}
          <rect x="580" y="80" width="180" height="120" rx="8" fill="#222829" stroke="#E7E7E7" strokeOpacity="0.2" strokeWidth="1" />
          <text x="670" y="145" fill="#E7E7E7" opacity="0.6" fontSize="12" fontFamily="monospace" textAnchor="middle">Aisle 3: Beverages</text>

          {/* Aisle 4 - Cosmetics */}
          <rect x="100" y="260" width="280" height="130" rx="8" fill="#222829" stroke="#E7E7E7" strokeOpacity="0.2" strokeWidth="1" />
          <text x="240" y="330" fill="#E7E7E7" opacity="0.6" fontSize="12" fontFamily="monospace" textAnchor="middle">Dept: Cosmetics & Fragrance</text>

          {/* Self-Checkout Zone */}
          <rect x="480" y="360" width="280" height="90" rx="8" fill="#222829" stroke="#517664" strokeOpacity="0.4" strokeWidth="1" />
          <text x="620" y="410" fill="#517664" fontSize="13" fontFamily="monospace" textAnchor="middle" fontWeight="bold">POS Checkout Registers</text>

          {/* Entrance & Exit Gates */}
          <path d="M 120 570 L 260 570" stroke="#517664" strokeWidth="4" strokeLinecap="round" />
          <text x="190" y="555" fill="#517664" fontSize="11" fontFamily="monospace" textAnchor="middle">ENTRANCE GATE</text>

          <path d="M 740 570 L 880 570" stroke="#816E94" strokeWidth="4" strokeLinecap="round" />
          <text x="810" y="555" fill="#816E94" fontSize="11" fontFamily="monospace" textAnchor="middle">EXIT TURNSTILE</text>

          {/* Hotspots Glowing in Vivid Lavender (#9D69A3) */}
          {showHeatmaps && (
            <>
              <circle cx="670" cy="140" r="85" fill="url(#hotspotVivid)" />
              <circle cx="240" cy="325" r="95" fill="url(#hotspotVivid)" />
              <circle cx="620" cy="405" r="75" fill="url(#hotspotVivid)" />
            </>
          )}

          {/* Customer Journey Paths (Deep Teal to Vintage Lavender) */}
          {showJourneys && (
            <>
              {/* Path 1: Shopper #17 */}
              <path
                d="M 190 570 Q 190 420 240 330 T 430 180 T 670 140 T 620 380 T 810 570"
                fill="none"
                stroke="url(#journeyGradient1)"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeDasharray="8 4"
              />
              <circle cx="190" cy="570" r="5" fill="#517664" />
              <circle cx="620" cy="380" r="6" fill="#816E94" className="animate-pulse" />

              {/* Path 2 */}
              <path
                d="M 210 570 Q 220 460 380 430 T 430 140"
                fill="none"
                stroke="url(#journeyGradient2)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray="6 3"
              />
              <circle cx="430" cy="140" r="5" fill="#816E94" />
            </>
          )}
        </svg>

        {/* Legend */}
        <div className="absolute bottom-5 right-6 bg-[#1B2021]/80 backdrop-blur-md border border-[#E7E7E7]/10 rounded-lg p-3 font-mono text-[11px] space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-3 h-1 bg-[#517664] rounded" />
            <span className="text-[#E7E7E7]/70">Entry / Active Path</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-1 bg-[#816E94] rounded" />
            <span className="text-[#E7E7E7]/70">Current Location / Exit</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#9D69A3]" />
            <span className="text-[#E7E7E7]/70">Vivid Dwell Hotspot</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SpatialTwinView;
