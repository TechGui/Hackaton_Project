import { convexAuth, getAuthUserId } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import { query } from "./_generated/server";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password, Anonymous],
});

export const loggedInUser = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }
    const user = await ctx.db.get(userId);
    if (!user) {
      return null;
    }
    
    // Get user role
    const userRole = await ctx.db
      .query("userRoles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    
    return {
      ...user,
      role: userRole?.role,
      patientId: userRole?.patientId,
    };
  },
});
