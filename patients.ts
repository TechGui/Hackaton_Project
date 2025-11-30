import { query } from "./_generated/server";
import { v } from "convex/values";

export const getByPhone = query({
  args: { phone: v.string() },
  handler: async (ctx, { phone }) => {
    return await ctx.db
      .query("patients")
      .withIndex("by_phone", (q) => q.eq("phone", phone))
      .unique();
  },
});