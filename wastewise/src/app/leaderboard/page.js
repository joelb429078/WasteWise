"use client";

import Leaderboard from "@/components/leaderboard/Leaderboard";
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
    <div className="flex flex-col items-center min-h-screen gap-6 bg-white p-6">
        <Leaderboard data={sampleData} />
      <div className="w-full max-w-xl h-[400px]"> {/* ✅ Ensures parent has a height */}
        <Map postcode="BA2 7AY" />
      </div>
    </div>
  );
}