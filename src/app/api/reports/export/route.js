// src/app/api/reports/export/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db";
import { generateCSV } from "@/lib/utils";
import { subDays } from "date-fns";

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Get export type and time range from query params
    const { searchParams } = new URL(request.url);
    const exportType = searchParams.get("type") || "status";
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
    
    // Export data based on type
    let data;
    let headers;
    let filename;
    
    switch (exportType) {
      case "status":
        data = await prisma.submission.findMany({
          where: {
            createdAt: { gte: startDate }
          },
          select: {
            title: true,
            customerName: true,
            orgId: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            submittedBy: {
              select: {
                name: true,
                email: true
              }
            }
          },
          orderBy: {
            createdAt: "desc"
          }
        });
        
        // Transform data for CSV
        data = data.map(item => ({
          title: item.title,
          customerName: item.customerName,
          orgId: item.orgId,
          status: item.status.replace("_", " "),
          submittedBy: item.submittedBy.name,
          submitterEmail: item.submittedBy.email,
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt.toISOString()
        }));
        
        headers = [
          { key: "title", label: "Title" },
          { key: "customerName", label: "Customer Name" },
          { key: "orgId", label: "Organization ID" },
          { key: "status", label: "Status" },
          { key: "submittedBy", label: "Submitted By" },
          { key: "submitterEmail", label: "Submitter Email" },
          { key: "createdAt", label: "Created At" },
          { key: "updatedAt", label: "Last Updated" }
        ];
        
        filename = `submissions-by-status-${timeRange}.csv`;
        break;
        
      // Add other export types as needed
      
      default:
        return NextResponse.json(
          { error: "Invalid export type" },
          { status: 400 }
        );
    }
    
    // Generate CSV
    const csvContent = generateCSV(data, headers);
    
    // Log export activity
    await prisma.auditLog.create({
      data: {
        action: "REPORT_EXPORTED",
        entityType: "REPORT",
        entityId: exportType,
        details: JSON.stringify({
          type: exportType,
          timeRange,
          rowCount: data.length
        }),
        performedBy: {
          connect: { id: session.user.id }
        }
      }
    });
    
    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}"`
      }
    });
  } catch (error) {
    console.error("Error exporting report:", error);
    return NextResponse.json(
      { error: "Failed to export report" },
      { status: 500 }
    );
  }
}