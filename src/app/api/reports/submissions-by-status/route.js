// src/app/api/reports/submissions-by-status/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db";
import { subDays } from "date-fns";
export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Get time range from query params
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get("timeRange") || "last30days";
    
    // Calculate date range based on timeRange
    let startDate;
    const now = new Date();
    
    switch (timeRange) {
      case "last7days":
        startDate = subDays(now, 7);
        break;
      case "last30days":
        startDate = subDays(now, 30);
        break;
      case "last90days":
        startDate = subDays(now, 90);
        break;
      case "thisYear":
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case "allTime":
        startDate = new Date(0); // Beginning of time
        break;
      default:
        startDate = subDays(now, 30);
    }
    
    // Query to get counts by status
    const submissionsByStatus = await prisma.$queryRaw`
      SELECT status, COUNT(*) as count
      FROM Submission
      WHERE createdAt >= ${startDate}
      GROUP BY status
      ORDER BY status
    `;
    
    return NextResponse.json(submissionsByStatus);
  } catch (error) {
    console.error("Error fetching submissions by status:", error);
    return NextResponse.json(
      { error: "Failed to fetch report data" },
      { status: 500 }
    );
  }
}