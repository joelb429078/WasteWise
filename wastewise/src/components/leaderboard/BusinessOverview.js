// Last season rank, Change in rank from last season and Total waste recycled,

"use client";

import React from "react";
import { ArrowUp, ArrowDown } from "lucide-react";

const BusinessOverview = ({ rank, previousRank, totalRecycled }) => {
  const rankChange = previousRank - rank;
  const isImproving = rankChange > 0;

  return (
    <div className="w-full max-w-lg p-6 bg-white rounded-lg shadow-md border border-gray-200">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Business Overview</h2>

      <div className="flex flex-col gap-4">
        {/* Rank */}
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Current Rank:</span>
          <span className="text-lg font-bold text-gray-900">#{rank}</span>
        </div>

        {/* Rank Change */}
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Rank Change:</span>
          <div className="flex items-center">
            {rankChange !== 0 ? (
              <>
                <span className={`text-lg font-semibold ${isImproving ? "text-green-600" : "text-red-600"}`}>
                  {Math.abs(rankChange)}
                </span>
                {isImproving ? (
                  <ArrowUp className="text-green-600 w-5 h-5 ml-1" />
                ) : (
                  <ArrowDown className="text-red-600 w-5 h-5 ml-1" />
                )}
              </>
            ) : (
              <span className="text-gray-500 text-lg">No Change</span>
            )}
          </div>
        </div>

        {/* Total Waste Recycled */}
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Total Recycled:</span>
          <span className="text-lg font-bold text-green-700">
            {totalRecycled.toLocaleString()} kg ♻️
          </span>
        </div>
      </div>
    </div>
  );
};

export default BusinessOverview;