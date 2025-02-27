"use client";

import Leaderboard from "@/components/leaderboard/Leaderboard";
import BusinessOverview from "@/components/leaderboard/BusinessOverview";
import dynamic from "next/dynamic";

const testNum = 30;

const sampleData = {
  week: Array.from({ length: testNum }, (_, i) => ({
    rank: i + 1,
    name: `User ${i + 1}`,
    weight: (testNum - i) * 10,
  })),
  season: Array.from({ length: testNum }, (_, i) => ({
    rank: i + 1,
    name: `User ${i + 1}`,
    weight: (testNum - i) * 40,
  })),
  userWeek: { rank: 512, name: "You", weight: 100 },
  userSeason: { rank: 342, name: "You", weight: 1200 },
};

const postcodes = {
    current: "BA2 7AY",
    others: {
        "BA1 1AA": "Bath",
    }
}

const Map = dynamic(() => import("@/components/leaderboard/Map"), { ssr: false });

export default function LeaderboardPagex() {
    return (
        <div className="grid grid-cols-2 gap-4 w-full h-[600px] p-4">
            {/* Leaderboard: Takes half the width and full height */}
            <div className="col-span-1 h-300px">
            <Leaderboard data={sampleData} />
            </div>

            {/* Right Side: Business Overview and Map */}
            <div className="col-span-1 grid grid-rows-2 gap-4 h-full">
            <div className="row-span-1">
                <BusinessOverview rank="112" previousRank="218" totalRecycled="12000kg" />
            </div>
            <div className="row-span-1">
                <Map postcode="BA2 7AY" />
            </div>
            </div>
        </div>
        );
};