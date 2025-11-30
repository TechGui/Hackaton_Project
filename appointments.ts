import { query, mutation, QueryCtx, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// Get user role
async function getUserRole(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");
  
  const userRole = await ctx.db
    .query("userRoles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();
  
  return { userId, userRole };
}

// Setup function to create admin user role
export const setupAdminRole = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Check if role already exists
    const existingRole = await ctx.db
      .query("userRoles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
    
    if (!existingRole) {
      await ctx.db.insert("userRoles", {
        userId: args.userId,
        role: "admin",
      });
    }
    
    return { success: true };
  },
});

// Admin: Import available slots from CSV data
export const importSlots = mutation({
  args: {
    slots: v.array(v.object({
      date: v.string(),
      time: v.string(),
      doctorName: v.string(),
      specialty: v.string(),
      location: v.string(),
    }))
  },
  handler: async (ctx, args) => {
    const { userRole } = await getUserRole(ctx);
    if (!userRole || userRole.role !== "admin") {
      throw new Error("Admin access required");
    }

    const results = [];
    for (const slot of args.slots) {
      // Check if slot already exists
      const existing = await ctx.db
        .query("availableSlots")
        .filter((q) => 
          q.and(
            q.eq(q.field("date"), slot.date),
            q.eq(q.field("time"), slot.time),
            q.eq(q.field("doctorName"), slot.doctorName)
          )
        )
        .first();

      if (!existing) {
        const slotId = await ctx.db.insert("availableSlots", {
          ...slot,
          isBooked: false,
        });
        results.push({ success: true, slotId });
      } else {
        results.push({ success: false, reason: "Slot already exists" });
      }
    }
    
    return results;
  },
});

// Admin: Get all available slots
export const getAvailableSlots = query({
  args: {
    date: v.optional(v.string()),
    specialty: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userRole } = await getUserRole(ctx);
    if (!userRole || userRole.role !== "admin") {
      throw new Error("Admin access required");
    }

    let slots;
    
    if (args.date) {
      slots = await ctx.db
        .query("availableSlots")
        .withIndex("by_date", (q) => q.eq("date", args.date!))
        .collect();
    } else {
      slots = await ctx.db.query("availableSlots").collect();
    }
    
    return slots.filter(slot => 
      (!args.specialty || slot.specialty === args.specialty)
    );
  },
});

// Admin: Get patients in waitlist
export const getWaitlist = query({
  args: {
    specialty: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userRole } = await getUserRole(ctx);
    if (!userRole || userRole.role !== "admin") {
      throw new Error("Admin access required");
    }

    const patients = await ctx.db
      .query("patients")
      .withIndex("by_active_priority", (q) => q.eq("isActive", true))
      .collect();
    
    return patients
      .filter(patient => !args.specialty || patient.specialty === args.specialty)
      .sort((a, b) => a.priority - b.priority);
  },
});

// Admin: Add patient to waitlist
export const addPatient = mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    phone: v.string(),
    email: v.optional(v.string()),
    dateOfBirth: v.string(),
    specialty: v.string(),
    priority: v.number(),
    preferredDoctors: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userRole } = await getUserRole(ctx);
    if (!userRole || userRole.role !== "admin") {
      throw new Error("Admin access required");
    }

    return await ctx.db.insert("patients", {
      ...args,
      isActive: true,
      addedToWaitlist: Date.now(),
      contactAttempts: 0,
    });
  },
});

// Patient: Get my appointments
export const getMyAppointments = query({
  args: {},
  handler: async (ctx) => {
    const { userId, userRole } = await getUserRole(ctx);
    if (!userRole || userRole.role !== "patient" || !userRole.patientId) {
      throw new Error("Patient access required");
    }

    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_patient", (q) => q.eq("patientId", userRole.patientId!))
      .collect();

    const appointmentsWithDetails = [];
    for (const appointment of appointments) {
      const slot = await ctx.db.get(appointment.slotId);
      if (slot) {
        appointmentsWithDetails.push({
          ...appointment,
          slot,
        });
      }
    }

    return appointmentsWithDetails;
  },
});

// Patient: Request reschedule
export const requestReschedule = mutation({
  args: {
    appointmentId: v.id("appointments"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userRole } = await getUserRole(ctx);
    if (!userRole || userRole.role !== "patient" || !userRole.patientId) {
      throw new Error("Patient access required");
    }

    const appointment = await ctx.db.get(args.appointmentId);
    if (!appointment || appointment.patientId !== userRole.patientId) {
      throw new Error("Appointment not found");
    }

    // Cancel current appointment
    await ctx.db.patch(args.appointmentId, {
      status: "cancelled",
      notes: args.reason ? `Reschedule requested: ${args.reason}` : "Reschedule requested",
    });

    // Free up the slot
    await ctx.db.patch(appointment.slotId, {
      isBooked: false,
      appointmentId: undefined,
    });

    // Reactivate patient in waitlist
    await ctx.db.patch(userRole.patientId, {
      isActive: true,
    });

    return { success: true };
  },
});

// Admin: Schedule appointment for patient
export const scheduleAppointment = mutation({
  args: {
    patientId: v.id("patients"),
    slotId: v.id("availableSlots"),
  },
  handler: async (ctx, args) => {
    const { userRole } = await getUserRole(ctx);
    if (!userRole || userRole.role !== "admin") {
      throw new Error("Admin access required");
    }

    const slot = await ctx.db.get(args.slotId);
    if (!slot || slot.isBooked) {
      throw new Error("Slot not available");
    }

    const patient = await ctx.db.get(args.patientId);
    if (!patient || !patient.isActive) {
      throw new Error("Patient not found or inactive");
    }

    // Create appointment
    const appointmentId = await ctx.db.insert("appointments", {
      patientId: args.patientId,
      slotId: args.slotId,
      status: "scheduled",
      scheduledAt: Date.now(),
      rescheduleCount: 0,
    });

    // Mark slot as booked
    await ctx.db.patch(args.slotId, {
      isBooked: true,
      appointmentId,
    });

    // Mark patient as inactive (removed from waitlist)
    await ctx.db.patch(args.patientId, {
      isActive: false,
    });

    return appointmentId;
  },
});

// Get dashboard stats for admin
export const getDashboardStats = query({
  args: {},
  handler: async (ctx) => {
    const { userRole } = await getUserRole(ctx);
    if (!userRole || userRole.role !== "admin") {
      throw new Error("Admin access required");
    }

    const [
      totalPatients,
      activePatients,
      totalSlots,
      bookedSlots,
      todayAppointments
    ] = await Promise.all([
      ctx.db.query("patients").collect().then(p => p.length),
      ctx.db.query("patients").withIndex("by_active_priority", q => q.eq("isActive", true)).collect().then(p => p.length),
      ctx.db.query("availableSlots").collect().then(s => s.length),
      ctx.db.query("availableSlots").withIndex("by_availability", q => q.eq("isBooked", true)).collect().then(s => s.length),
      ctx.db.query("availableSlots").withIndex("by_date", q => q.eq("date", new Date().toISOString().split('T')[0])).collect().then(s => s.filter(slot => slot.isBooked).length)
    ]);

    return {
      totalPatients,
      activePatients,
      totalSlots,
      bookedSlots,
      availableSlots: totalSlots - bookedSlots,
      todayAppointments,
    };
  },
});
