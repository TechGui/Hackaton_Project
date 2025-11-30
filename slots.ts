    import { query } from "./_generated/server";
    import { v } from "convex/values";

    export const getById = query({
    args: { slotId: v.id("availableSlots") },
    handler: (ctx, { slotId }) => ctx.db.get(slotId)
    });