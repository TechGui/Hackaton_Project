import { mutation, query } from "./_generated/server";
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
export const incrementContactAttempt = mutation({
  args: { id: v.id("patients") },
  handler: async (ctx, { id }) => {
    const patient = await ctx.db.get(id);
    if (!patient) return;

    const attempts = patient.contactAttempts ?? 0;

    await ctx.db.patch(id, {
      contactAttempts: Math.min(attempts + 1, 3) 
    });
  }
});
export const decrementContactAttempt = mutation({
  args: { id: v.id("patients") },
  handler: async (ctx, { id }) => {
    const patient = await ctx.db.get(id);
    if (!patient) return;

    const attempts = patient.contactAttempts ?? 0;

    await ctx.db.patch(id, {
      contactAttempts: Math.max(attempts - 1, 0) 
    });
  }
});