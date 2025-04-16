import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db";
import { sendEmail, sendSlackNotification } from "@/lib/notifications";

// GET - Fetch comments for a submission
export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { id } = params;
    
    // Verify submission exists
    const submission = await prisma.submission.findUnique({
      where: { id },
    });
    
    if (!submission) {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 }
      );
    }
    
    // Check if user has access to this submission
    if (
      session.user.role !== "ADMIN" &&
      session.user.role !== "REVIEWER" &&
      submission.submittedById !== session.user.id
    ) {
      return NextResponse.json(
        { error: "You do not have permission to view these comments" },
        { status: 403 }
      );
    }
    
    // Fetch comments with user info
    const comments = await prisma.comment.findMany({
      where: {
        submissionId: id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        mentions: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });
    
    return NextResponse.json(comments);
  } catch (error) {
    console.error("Error fetching comments:", error);
    return NextResponse.json(
      { error: "Failed to fetch comments" },
      { status: 500 }
    );
  }
}

// POST - Add a new comment
export async function POST(request, { params }) {
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
    
    // All authenticated users can comment on submissions they have access to
    const data = await request.json();
    
    if (!data.content) {
      return NextResponse.json(
        { error: "Comment content is required" },
        { status: 400 }
      );
    }
    
    // Create the comment
    const comment = await prisma.comment.create({
      data: {
        content: data.content,
        user: {
          connect: { id: session.user.id },
        },
        submission: {
          connect: { id },
        },
        ...(data.parentId && {
          parent: {
            connect: { id: data.parentId },
          },
        }),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });
    
    // Process mentions if provided
    if (data.mentions && Array.isArray(data.mentions) && data.mentions.length > 0) {
      const mentionedUsers = await prisma.user.findMany({
        where: {
          name: {
            in: data.mentions,
          },
        },
      });
      
      // Create mentions
      for (const user of mentionedUsers) {
        await prisma.mention.create({
          data: {
            user: {
              connect: { id: user.id },
            },
            comment: {
              connect: { id: comment.id },
            },
          },
        });
        
        // Send notification to mentioned user
        try {
          // Email notification
          await sendEmail({
            to: user.email,
            subject: `You were mentioned in a comment on ${submission.title}`,
            body: `${session.user.name} mentioned you in a comment: "${data.content}"`,
          });
          
          // Slack notification if configured
          await sendSlackNotification({
            userId: user.id,
            message: `You were mentioned in a comment on ${submission.title} by ${session.user.name}`,
          });
        } catch (notificationError) {
          console.error("Failed to send mention notification:", notificationError);
        }
      }
    }
    
    // Notify submission owner if not the commenter
    if (submission.submittedById !== session.user.id) {
      try {
        await sendEmail({
          to: submission.submittedBy.email,
          subject: `New comment on your submission: ${submission.title}`,
          body: `${session.user.name} commented on your submission: "${data.content}"`,
        });
      } catch (notificationError) {
        console.error("Failed to send comment notification:", notificationError);
      }
    }
    
    // Log action in audit trail
    await prisma.auditLog.create({
      data: {
        action: "COMMENT_ADDED",
        entityType: "COMMENT",
        entityId: comment.id,
        details: JSON.stringify({ submissionId: id, content: data.content }),
        performedBy: {
          connect: { id: session.user.id },
        },
      },
    });
    
    return NextResponse.json(comment);
  } catch (error) {
    console.error("Error creating comment:", error);
    return NextResponse.json(
      { error: "Failed to create comment" },
      { status: 500 }
    );
  }
}