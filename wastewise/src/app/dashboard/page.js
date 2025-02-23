// src/app/(dashboard)/dashboard/page.js
'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { StatCard } from '@/components/dashboard/StatCard';
import { ActivityItem } from '@/components/dashboard/ActivityItem';
import { QuickAction } from '@/components/dashboard/QuickAction';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalWaste: 0,
    monthlyAverage: 0,
    reductionRate: 0,
    rank: 0
  });
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Fetch user's business ID
      const { data: userData } = await supabase
        .from('Users')
        .select('businessID')
        .eq('email', user.email)
        .single();

      // Fetch waste logs
      const { data: wasteLogs } = await supabase
        .from('Wastelogs')
        .select('*')
        .eq('businessID', userData.businessID)
        .order('created_at', { ascending: false });

      // Calculate stats
      const totalWaste = wasteLogs.reduce((sum, log) => sum + log.weight, 0);
      const monthlyAverage = totalWaste / (wasteLogs.length || 1);

      setStats({
        totalWaste: totalWaste.toFixed(2),
        monthlyAverage: monthlyAverage.toFixed(2),
        reductionRate: 15.4, // Example value, calculate based on your logic
        rank: 5 // Example value, calculate based on your logic
      });

      // Format activities
      const recentActivities = wasteLogs.slice(0, 5).map(log => ({
        type: 'waste',
        description: `Added ${log.weight}kg of ${log.wasteType}`,
        timestamp: log.created_at,
        user: 'User' // You might want to fetch the actual username
      }));

      setActivities(recentActivities);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-t-2 border-green-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Dashboard</h1>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Waste"
            value={`${stats.totalWaste}kg`}
            icon="📊"
            trend={-5.2}
          />
          <StatCard
            title="Monthly Average"
            value={`${stats.monthlyAverage}kg`}
            icon="📈"
            trend={2.1}
          />
          <StatCard
            title="Reduction Rate"
            value={`${stats.reductionRate}%`}
            icon="📉"
          />
          <StatCard
            title="Global Rank"
            value={`#${stats.rank}`}
            icon="🏆"
          />
        </div>

        {/* Quick Actions */}
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <QuickAction
            title="Add Waste Entry"
            description="Record a new waste collection entry"
            href="/submission"
            icon="➕"
          />
          <QuickAction
            title="View Reports"
            description="Check detailed waste management reports"
            href="/employee-history"
            icon="📊"
          />
          <QuickAction
            title="Leaderboard"
            description="See how you rank against others"
            href="/leaderboard"
            icon="🏆"
          />
        </div>

        {/* Recent Activity */}
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
        <div className="bg-white rounded-xl shadow-sm">
          {activities.length > 0 ? (
            activities.map((activity, index) => (
              <ActivityItem key={index} {...activity} />
            ))
          ) : (
            <div className="p-6 text-center text-gray-500">
              No recent activity to display
            </div>
          )}
        </div>
      </div>
    </div>
  );
}