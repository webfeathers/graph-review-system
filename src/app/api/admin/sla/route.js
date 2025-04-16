// src/app/api/admin/sla/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db";

// GET - Get all SLA configurations
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const slaConfigs = await prisma.sLAConfig.findMany({
      orderBy: [
        { statusFrom: "asc" },
        { statusTo: "asc" }
      ]
    });
    
    return NextResponse.json(slaConfigs);
  } catch (error) {
    console.error("Error fetching SLA configs:", error);
    return NextResponse.json(
      { error: "Failed to fetch SLA configurations" },
      { status: 500 }
    );
  }
}

// POST - Create or update SLA configurations
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { slaConfigs } = await request.json();
    
    if (!Array.isArray(slaConfigs)) {
      return NextResponse.json(
        { error: "Invalid request format" },
        { status: 400 }
      );
    }
    
    // Clear existing SLA configs and create new ones
    await prisma.$transaction([
      prisma.sLAConfig.deleteMany({}),
      ...slaConfigs.map(config => {
        const { id, ...configData } = config;
        
        // Ensure duration is a number
        configData.durationHours = parseInt(configData.durationHours, 10);
        
        return prisma.sLAConfig.create({
          data: configData
        });
      })
    ]);
    
    // Log the action
    await prisma.auditLog.create({
      data: {
        action: "SLA_UPDATED",
        entityType: "SLA_CONFIG",
        entityId: "all",
        details: JSON.stringify({ count: slaConfigs.length }),
        performedBy: {
          connect: { id: session.user.id }
        }
      }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating SLA configs:", error);
    return NextResponse.json(
      { error: "Failed to update SLA configurations" },
      { status: 500 }
    );
  }
}