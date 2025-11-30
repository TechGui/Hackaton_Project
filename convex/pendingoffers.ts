import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getLatestByPatient = query({
  args: { patientId: v.id("patients") },
  handler: (ctx, { patientId }) =>
    ctx.db.query("pendingOffers")
      .withIndex("by_patient_created", (q) =>
        q.eq("patientId", patientId))
      .order("desc")
      .first(),
});

export const remove = mutation({
  args: { pendingOfferId: v.id("pendingOffers") },
  handler: (ctx, { pendingOfferId }) =>
    ctx.db.delete(pendingOfferId),
});

