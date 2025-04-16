"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Users, Settings, FileText, CheckCircle, AlertCircle, Clock } from "lucide-react";
import MetricsCard from "@/components/dashboard/metrics-card";
import StatusChart from "@/components/dashboard/status-chart";
import RecentActivity from "@/components/dashboard/recent-activity";

export default function AdminDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalUsers: 0,
    totalSubmissions: 0,
    pendingSLA: 0,
    reviewers: 0,
    submitters: 0,
    approvalRate: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    // Check if user is authenticated and is an admin
    if (status === "authenticated") {
      if (session.user.role !== "ADMIN") {
        router.push("/dashboard");
        return;
      }
      
      fetchAdminData();
    } else if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, session, router]);

  const fetchAdminData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch admin dashboard metrics - in a real implementation you would
      // have these endpoints implemented
      const metricsResponse = await fetch("/api/admin/metrics");
      const metricsData = await metricsResponse.json();
      
      // Fetch recent activity
      const activityResponse = await fetch("/api/dashboard/activity");
      const activityData = await activityResponse.json();
      
      setMetrics(metricsData);
      setRecentActivity(activityData);
    } catch (error) {
      console.error("Error fetching admin data:", error);
      // Fallback to dummy data if APIs aren't implemented yet
      setMetrics({
        totalUsers: 24,
        totalSubmissions: 127,
        pendingSLA: 5,
        reviewers: 8,
        submitters: 14,
        approvalRate: 78
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin Dashboard</h1>
      
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <MetricsCard 
          title="Total Users" 
          value={metrics.totalUsers} 
          icon={<Users className="h-6 w-6" />}
        />
        <MetricsCard 
          title="Reviewers" 
          value={metrics.reviewers} 
          icon={<CheckCircle className="h-6 w-6" />}
        />
        <MetricsCard 
          title="Submitters" 
          value={metrics.submitters} 
          icon={<FileText className="h-6 w-6" />}
        />
        <MetricsCard 
          title="Total Submissions" 
          value={metrics.totalSubmissions} 
          icon={<FileText className="h-6 w-6" />}
        />
        <MetricsCard 
          title="Pending SLA" 
          value={metrics.pendingSLA} 
          icon={<Clock className="h-6 w-6" />}
        />
        <MetricsCard 
          title="Approval Rate" 
          value={`${metrics.approvalRate}%`} 
          icon={<CheckCircle className="h-6 w-6" />}
        />
      </div>
      
      {/* Admin Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Link href="/admin/users" className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 mr-4">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-medium">User Management</h3>
              <p className="text-sm text-gray-500">Manage users and roles</p>
            </div>
          </div>
        </Link>
        
        <Link href="/admin/settings" className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 mr-4">
              <Settings className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-medium">System Settings</h3>
              <p className="text-sm text-gray-500">Configure SLA and integrations</p>
            </div>
          </div>
        </Link>
        
        <Link href="/reports" className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100 mr-4">
              <FileText className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h3 className="font-medium">Reports</h3>
              <p className="text-sm text-gray-500">View detailed analytics</p>
            </div>
          </div>
        </Link>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Chart */}
        <div className="lg:col-span-2 bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Submission Status</h2>
          <StatusChart />
        </div>
        
        {/* Recent Activity */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
          <RecentActivity activities={recentActivity} />
        </div>
      </div>
      
      {/* SLA Status */}
      <div className="mt-6 bg-white p-4 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">SLA Status</h2>
          <Link 
            href="/admin/sla" 
            className="text-blue-600 hover:text-blue-800"
          >
            View All
          </Link>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned To</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Link href="/submissions/123" className="text-blue-600 hover:text-blue-800">
                    Enterprise Onboarding Graph
                  </Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                    Under Review
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <AlertCircle className="h-4 w-4 text-red-500 mr-1" />
                    <span className="text-red-500">Overdue (2 days)</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  Jane Smith
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Link href="/submissions/124" className="text-blue-600 hover:text-blue-800">
                    Sales Pipeline Integration
                  </Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                    Partially Approved
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 text-yellow-500 mr-1" />
                    <span className="text-yellow-500">Due in 1 day</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  John Doe
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}