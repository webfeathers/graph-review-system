// src/app/api/users/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db";

// GET - Fetch all users
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Only admins can get full user list with role info
    const isAdmin = session.user.role === "ADMIN";
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: isAdmin, // Only include email if admin
        image: true,
        role: isAdmin, // Only include role if admin
        createdAt: isAdmin // Only include createdAt if admin
      },
      orderBy: {
        name: "asc"
      }
    });
    
    return NextResponse.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

// Only Admin can update user roles
export async function PATCH(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const data = await request.json();
    
    if (!data.userId || !data.role) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }
    
    // Validate role
    const validRoles = ["ADMIN", "REVIEWER", "SUBMITTER", "VIEWER"];
    if (!validRoles.includes(data.role)) {
      return NextResponse.json(
        { error: "Invalid role" },
        { status: 400 }
      );
    }
    
    // Update user role
    const updatedUser = await prisma.user.update({
      where: { id: data.userId },
      data: { role: data.role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    });
    
    // Log the action
    await prisma.auditLog.create({
      data: {
        action: "USER_ROLE_CHANGED",
        entityType: "USER",
        entityId: data.userId,
        details: JSON.stringify({
          newRole: data.role
        }),
        performedBy: {
          connect: { id: session.user.id }
        }
      }
    });
    
    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Error updating user role:", error);
    return NextResponse.json(
      { error: "Failed to update user role" },
      { status: 500 }
    );
  }
}