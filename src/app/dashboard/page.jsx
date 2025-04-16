"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import MetricsCard from "@/components/dashboard/metrics-card";
import StatusChart from "@/components/dashboard/status-chart";
import RecentActivity from "@/components/dashboard/recent-activity";

export default function Dashboard() {
  const { data: session, status } = useSession();
  const [metrics, setMetrics] = useState({
    totalSubmissions: 0,
    underReview: 0,
    approved: 0,
    pending: 0,
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === "authenticated") {
      fetchDashboardData();
    }
  }, [status]);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch dashboard metrics
      const metricsResponse = await fetch("/api/dashboard/metrics");
      const metricsData = await metricsResponse.json();
      
      // Fetch recent activity
      const activityResponse = await fetch("/api/dashboard/activity");
      const activityData = await activityResponse.json();
      
      setMetrics(metricsData);
      setRecentActivity(activityData);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        
        {(session?.user?.role === "ADMIN" || session?.user?.role === "SUBMITTER") && (
          <Link 
            href="/submissions/create" 
            className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md"
          >
            New Submission
          </Link>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricsCard 
          title="Total Submissions" 
          value={metrics.totalSubmissions} 
          icon="📊"
        />
        <MetricsCard 
          title="Under Review" 
          value={metrics.underReview} 
          icon="👀"
        />
        <MetricsCard 
          title="Approved" 
          value={metrics.approved} 
          icon="✅"
        />
        <MetricsCard 
          title="Waiting on Action" 
          value={metrics.pending} 
          icon="⏳"
        />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Submission Status</h2>
          <StatusChart />
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
          <RecentActivity activities={recentActivity} />
        </div>
      </div>
      
      <div className="mt-6 bg-white p-4 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Your Submissions</h2>
          <Link 
            href="/submissions" 
            className="text-blue-600 hover:text-blue-800"
          >
            View All
          </Link>
        </div>
        
        {/* Submissions table would go here */}
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {/* Table rows would be populated here */}
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Loading submissions...</td>
                <td></td>
                <td></td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}