import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      // Add user role to session
      session.user.role = user.role;
      session.user.id = user.id;
      return session;
    },
    async signIn({ account, profile }) {
      if (account.provider === "google") {
        // Check if user exists
        const user = await prisma.user.findUnique({
          where: { email: profile.email },
        });
        
        // If user doesn't exist, create one with default SUBMITTER role
        if (!user) {
          await prisma.user.create({
            data: {
              email: profile.email,
              name: profile.name,
              image: profile.picture,
              role: "SUBMITTER", // Default role
            },
          });
          
          // Log user creation in audit
          await prisma.auditLog.create({
            data: {
              action: "USER_CREATED",
              entityType: "USER",
              entityId: profile.email,
              details: JSON.stringify({ method: "GOOGLE_AUTH" }),
              performedBy: {
                connect: { email: profile.email }
              }
            },
          });
        }
        
        return true;
      }
      return false;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };