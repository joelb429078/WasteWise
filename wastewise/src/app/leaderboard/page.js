"use client";

import Leaderboard from "@components/leaderboard/Leaderboard.js";
import Map from "@components/leaderboard/Map";


/*
const sampleData = [
  { rank: 1, name: "Alice", weight: 120 },
  { rank: 2, name: "Bob", weight: 100 },
  { rank: 3, name: "Charlie", weight: 80 },
  { rank: 4, name: "Dave", weight: 60 },
];
*/

const testNum = 30;

const sampleData = {
  week: Array.from({ length: testNum }, (_, i) => ({
    rank: i + 1,
    name: `User ${i + 1}`,
    weight: (testNum - i ) * 10,
  })),
  season: Array.from({ length: testNum }, (_, i) => ({
    rank: i + 1,
    name: `User ${i + 1}`,
    weight: (testNum - i ) * 40,
  })),
  userWeek: { rank: 512, name: "You", weight: 100 },
  userSeason: { rank: 342, name: "You", weight: 1200 },
};

export default function LeaderboardPagex() {
  return (
    <div className="flex justify-center items-center min-h-screen bg-white">
      <Leaderboard data={sampleData} maxHeight="max-h-[400px]" width="max-w-xl" />
        <Map postcode="BA2 7AY"/>
    </div>
  );
}