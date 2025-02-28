"use client";

import React, { useState } from "react";

const Leaderboard = ({ data, maxHeight = "max-h-auto", width = "max-w-auto" }) => {
  const [timeframe, setTimeframe] = useState("week");

  const filteredData = {
    week: data.week,
    userSeason: data.userSeason,
    userWeek: data.userWeek,
    season: data.season,
  };

  const specificUserData = timeframe === "week" ? data.userWeek : data.userSeason;

  return (
    <div className={`w-auto ${maxHeight} mx-auto p-4 bg-brand-100 rounded-lg shadow-md text-black`}>
      {/* Dropdown */}
      <div className="mb-4 flex justify-left">
        <select
          className="p-2 border rounded bg-white cursor-pointer"
          value={timeframe}
          onChange={(e) => setTimeframe(e.target.value)}
        >
          <option value="week">Week</option>
          <option value="season">Season</option>
        </select>
      </div>

      {/* Scrollable Table */}
      <div className={` ${width}`}>
        <table className="w-full border-collapse">
          <thead className="sticky top-0 bg-white shadow">
            <tr className="border-b text-left">
              <th className="p-2">Rank</th>
              <th className="p-2">User</th>
              <th className="p-2">Weight (kg)</th>
            </tr>
          </thead>
          <tbody>
            {filteredData[timeframe].map(({ rank, name, weight }) => (
              <tr
                key={rank}
                className={`border-b ${
                  rank === 1
                    ? "bg-brand-600"
                    : rank === 2
                    ? "bg-brand-400"
                    : rank === 3
                    ? "bg-brand-200"
                    : "bg-white"
                }`}
              >
                <td className="p-2 font-semibold">{rank}</td>
                <td className="p-2">{name}</td>
                <td className="p-2">{weight} kg</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="sticky bottom-0 bg-accent-200">
            <tr className="border-t">
              <td className="p-2 font-semibold">{specificUserData.rank}</td>
              <td className="p-2">{specificUserData.name}</td>
              <td className="p-2">{specificUserData.weight} kg</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default Leaderboard;