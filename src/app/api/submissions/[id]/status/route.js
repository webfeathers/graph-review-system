import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db";
import { calculateSLADeadline } from "@/lib/utils";
import { sendEmail, sendSlackNotification } from "@/lib/notifications";
import { syncStatusToSalesforce } from "@/lib/salesforce";

// PATCH - Update submission status
export async function PATCH(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { id } = params;
    
    // Verify submission exists
    const submission = await prisma.submission.findUnique({
      where: { id },
      include: {
        submittedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
    
    if (!submission) {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 }
      );
    }
    
    // Check permissions
    if (
      session.user.role !== "ADMIN" &&
      session.user.role !== "REVIEWER" &&
      // Submitters can only update their own submissions to "SUBMITTED"
      (session.user.role === "SUBMITTER" &&
        (submission.submittedById !== session.user.id))
    ) {
      return NextResponse.json(
        { error: "You do not have permission to update this submission's status" },
        { status: 403 }
      );
    }
    
    const data = await request.json();
    
    if (!data.status) {
      return NextResponse.json(
        { error: "Status is required" },
        { status: 400 }
      );
    }
    
    // Validate status
    const validStatuses = ["SUBMITTED", "UNDER_REVIEW", "PARTIALLY_APPROVED", "APPROVED"];
    if (!validStatuses.includes(data.status)) {
      return NextResponse.json(
        { error: "Invalid status" },
        { status: 400 }
      );
    }
    
    // Check if status is actually changing
    if (submission.status === data.status) {
      return NextResponse.json({ message: "Status unchanged" });
    }
    
    // Create status history entry
    await prisma.statusHistory.create({
      data: {
        submission: {
          connect: { id },
        },
        oldStatus: submission.status,
        newStatus: data.status,
      },
    });
    
    // Calculate new SLA deadline if applicable
    let slaDeadline = null;
    if (data.status !== "APPROVED") {
      slaDeadline = await calculateSLADeadline(
        data.status,
        data.status === "SUBMITTED" ? "UNDER_REVIEW" :
        data.status === "UNDER_REVIEW" ? "PARTIALLY_APPROVED" : "APPROVED",
        new Date()
      );
    }
    
    // Update submission
    const updatedSubmission = await prisma.submission.update({
      where: { id },
      data: {
        status: data.status,
        ...(slaDeadline ? { slaDeadline } : {}),
      },
    });
    
    // Log action in audit trail
    await prisma.auditLog.create({
      data: {
        action: "STATUS_CHANGED",
        entityType: "SUBMISSION",
        entityId: id,
        details: JSON.stringify({
          oldStatus: submission.status,
          newStatus: data.status,
        }),
        performedBy: {
          connect: { id: session.user.id },
        },
      },
    });
    
    // Send notifications
    try {
      // Email to submitter
      await sendEmail({
        to: submission.submittedBy.email,
        subject: `Status update for your submission: ${submission.title}`,
        body: `Your submission status has been changed to ${data.status.replace("_", " ")} by ${session.user.name}.`,
      });
      
      // Slack notification if configured
      await sendSlackNotification({
        userId: submission.submittedBy.id,
        message: `Your submission "${submission.title}" status has been updated to ${data.status.replace("_", " ")}`,
      });
    } catch (notificationError) {
      console.error("Failed to send status notification:", notificationError);
    }
    
    // Sync to Salesforce if applicable
    try {
      if (data.status === "APPROVED") {
        const sfResult = await syncStatusToSalesforce(updatedSubmission);
        
        if (sfResult.success) {
          await prisma.submission.update({
            where: { id },
            data: { sfSyncStatus: true },
          });
        }
      }
    } catch (sfError) {
      console.error("Failed to sync to Salesforce:", sfError);
    }
    
    return NextResponse.json(updatedSubmission);
  } catch (error) {
    console.error("Error updating submission status:", error);
    return NextResponse.json(
      { error: "Failed to update submission status" },
      { status: 500 }
    );
  }
}