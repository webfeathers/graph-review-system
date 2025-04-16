import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db";
import { calculateSLADeadline } from "@/lib/utils";

// GET - Fetch all submissions
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    let submissions;
    
    // Filter submissions based on user role
    if (session.user.role === "ADMIN" || session.user.role === "REVIEWER") {
      // Admins and reviewers can see all submissions
      submissions = await prisma.submission.findMany({
        include: {
          submittedBy: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
      });
    } else if (session.user.role === "SUBMITTER") {
      // Submitters can only see their own submissions
      submissions = await prisma.submission.findMany({
        where: {
          submittedById: session.user.id,
        },
        include: {
          submittedBy: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
      });
    } else {
      // Viewers see submissions but can't modify them
      submissions = await prisma.submission.findMany({
        include: {
          submittedBy: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
      });
    }
    
    return NextResponse.json(submissions);
  } catch (error) {
    console.error("Error fetching submissions:", error);
    return NextResponse.json(
      { error: "Failed to fetch submissions" },
      { status: 500 }
    );
  }
}

// POST - Create a new submission
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Only ADMIN and SUBMITTER roles can create submissions
    if (session.user.role !== "ADMIN" && session.user.role !== "SUBMITTER") {
      return NextResponse.json(
        { error: "You do not have permission to create submissions" },
        { status: 403 }
      );
    }
    
    const data = await request.json();
    
    // Validate required fields
    if (!data.title || !data.customerName || !data.orgId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }
    
    // Create the submission
    const submission = await prisma.submission.create({
      data: {
        title: data.title,
        customerName: data.customerName,
        orgId: data.orgId,
        submittedBy: {
          connect: { id: session.user.id },
        },
      },
    });
    
    // Create initial status history entry
    await prisma.statusHistory.create({
      data: {
        submission: {
          connect: { id: submission.id },
        },
        newStatus: "SUBMITTED",
      },
    });
    
    // Calculate SLA deadline based on configured SLA rules
    const slaDeadline = await calculateSLADeadline(
      "SUBMITTED", 
      "UNDER_REVIEW", 
      new Date()
    );
    
    // Update submission with SLA deadline
    if (slaDeadline) {
      await prisma.submission.update({
        where: { id: submission.id },
        data: { slaDeadline },
      });
    }
    
    // Log action in audit trail
    await prisma.auditLog.create({
      data: {
        action: "SUBMISSION_CREATED",
        entityType: "SUBMISSION",
        entityId: submission.id,
        details: JSON.stringify(data),
        performedBy: {
          connect: { id: session.user.id },
        },
      },
    });
    
    return NextResponse.json(submission);
  } catch (error) {
    console.error("Error creating submission:", error);
    return NextResponse.json(
      { error: "Failed to create submission" },
      { status: 500 }
    );
  }
}