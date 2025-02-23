'use client';

export const StatCard = ({ title, value, icon, trend }) => {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {trend && (
            <div className={`flex items-center mt-2 text-sm ${
              trend > 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}% from last month
            </div>
          )}
        </div>
        <div className="text-green-500">{icon}</div>
      </div>
    </div>
  );
};