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

const Map = dynamic(() => import("@/components/leaderboard/Map"), { ssr: false });

export default function LeaderboardPagex() {
  return (
    <div className="min-h-screen bg-white p-6 flex justify-center">
      <div className="grid grid-cols-2 gap-6 w-full max-w-6xl h-[600px]"> {/* Defined region */}
        {/* Leaderboard takes full height on the left */}
        <div className="h-full">
          <Leaderboard data={sampleData} />
        </div>
        {/* Right column: Business Overview (top) and Map (bottom) */}
        <div className="flex flex-col gap-6 h-full">
          <div className="h-1/2">
            <BusinessOverview rank={342} previousRank={512} totalRecycled={1200} />
          </div>
          <div className="h-1/2">
            <Map postcode="BA2 7AY" />
          </div>
        </div>
      </div>
    </div>
  );
}