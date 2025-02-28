import LeaderboardDashboard from "@/components/leaderboard/LeaderboardDashboard";

export default function SomePage() {
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

  return (
    <div className="w-1/2 h-screen">
      <LeaderboardDashboard
        data={sampleData}
        rank="112"
        previousRank="218"
        totalRecycled="12000kg"
        postcode="BA2 7AY"
      />
    </div>
  );
}