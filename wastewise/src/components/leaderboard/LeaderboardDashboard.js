
import React from 'react';
import BusinessOverview from './BusinessOverview';
import Leaderboard from './Leaderboard';
import Map from './Map';

const LeaderboardDashboard = ({ data, rank, previousRank, totalRecycled, postcode }) => {
    return (
      <div className="grid grid-cols-2 gap-4 w-full h-full p-4">
        {/* Leaderboard */}
        <div className="col-span-1 h-full overflow-y-auto">
          <Leaderboard data={data} />
        </div>
  
        {/* Right Side: Business Overview and Map */}
        <div className="col-span-1 flex flex-col gap-4 h-full">
          {/* Business Overview */}
          <div className="flex-1">
            <BusinessOverview rank={rank} previousRank={previousRank} totalRecycled={totalRecycled} />
          </div>
  
          {/* Map */}
          <div className="flex-1">
            <Map postcode={postcode} />
          </div>
        </div>
      </div>
    );
  };
  
  export default LeaderboardDashboard;