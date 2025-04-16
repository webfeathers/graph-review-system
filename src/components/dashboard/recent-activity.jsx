// src/components/dashboard/recent-activity.jsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Clock, FileText, MessageSquare, Star } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function RecentActivity({ activities = [] }) {
  const [activityData, setActivityData] = useState(activities);
  
  useEffect(() => {
    if (activities.length === 0) {
      fetchRecentActivity();
    }
  }, [activities]);
  
  const fetchRecentActivity = async () => {
    try {
      const response = await fetch("/api/dashboard/activity");
      
      if (response.ok) {
        const data = await response.json();
        setActivityData(data);
      } else {
        // Fallback to dummy data if API is not implemented
        setActivityData([
          {
            id: "1",
            type: "COMMENT_ADDED",
            user: { name: "John Doe" },
            timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 mins ago
            details: { submissionId: "sub1", submissionTitle: "Enterprise Onboarding Framework" }
          },
          {
            id: "2",
            type: "STATUS_CHANGED",
            user: { name: "Jane Smith" },
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
            details: { 
              submissionId: "sub2", 
              submissionTitle: "Customer Success Graph",
              oldStatus: "UNDER_REVIEW",
              newStatus: "PARTIALLY_APPROVED"
            }
          },
          {
            id: "3",
            type: "SUBMISSION_CREATED",
            user: { name: "Alex Johnson" },
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5 hours ago
            details: { submissionId: "sub3", submissionTitle: "Sales Pipeline Integration" }
          },
        ]);
      }
    } catch (error) {
      console.error("Error fetching recent activity:", error);
      // Use empty array as fallback
      setActivityData([]);
    }
  };
  
  const getActivityIcon = (type) => {
    switch (type) {
      case "COMMENT_ADDED":
        return <MessageSquare className="h-5 w-5 text-blue-500" />;
      case "STATUS_CHANGED":
        return <Star className="h-5 w-5 text-yellow-500" />;
      case "SUBMISSION_CREATED":
        return <FileText className="h-5 w-5 text-green-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };
  
  const getActivityText = (activity) => {
    const { type, user, details } = activity;
    
    switch (type) {
      case "COMMENT_ADDED":
        return (
          <>
            <span className="font-medium">{user.name}</span> commented on{" "}
            <Link href={`/submissions/${details.submissionId}`} className="text-blue-600 hover:underline">
              {details.submissionTitle}
            </Link>
          </>
        );
      case "STATUS_CHANGED":
        return (
          <>
            <span className="font-medium">{user.name}</span> changed status of{" "}
            <Link href={`/submissions/${details.submissionId}`} className="text-blue-600 hover:underline">
              {details.submissionTitle}
            </Link>
            {" "}from {details.oldStatus?.replace("_", " ") || "SUBMITTED"} to {details.newStatus.replace("_", " ")}
          </>
        );
      case "SUBMISSION_CREATED":
        return (
          <>
            <span className="font-medium">{user.name}</span> created a new submission:{" "}
            <Link href={`/submissions/${details.submissionId}`} className="text-blue-600 hover:underline">
              {details.submissionTitle}
            </Link>
          </>
        );
      default:
        return <span className="font-medium">{user.name}</span> performed an action;
    }
  };
  
  if (activityData.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500">
        No recent activity to display.
      </div>
    );
  }
  
  return (
    <ul className="space-y-4">
      {activityData.map((activity) => (
        <li key={activity.id} className="flex space-x-3">
          <div className="flex-shrink-0">
            {getActivityIcon(activity.type)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-700">
              {getActivityText(activity)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}