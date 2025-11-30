import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  // Available time slots imported from CSV
  availableSlots: defineTable({
    date: v.string(), // YYYY-MM-DD format
    time: v.string(), // HH:MM format
    doctorName: v.string(),
    specialty: v.string(),
    location: v.string(),
    isBooked: v.boolean(),
    appointmentId: v.optional(v.id("appointments")),
  })
    .index("by_date", ["date"])
    .index("by_doctor", ["doctorName"])
    .index("by_availability", ["isBooked"])
    .index("by_date_and_availability", ["date", "isBooked"]),

  // Patient information and waitlist
  patients: defineTable({
    firstName: v.string(),
    lastName: v.string(),
    phone: v.string(),
    email: v.optional(v.string()),
    dateOfBirth: v.string(),
    priority: v.number(), // 1 = highest priority
    specialty: v.string(), // required specialty
    preferredDoctors: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
    isActive: v.boolean(), // false if patient no longer needs appointment
    addedToWaitlist: v.number(), // timestamp
    lastContactAttempt: v.optional(v.number()),
    contactAttempts: v.number(),
  })
    .index("by_priority", ["priority"])
    .index("by_specialty", ["specialty"])
    .index("by_phone", ["phone"])
    .index("by_active_priority", ["isActive", "priority"]),

  // Scheduled appointments
  appointments: defineTable({
    patientId: v.id("patients"),
    slotId: v.id("availableSlots"),
    status: v.union(
      v.literal("scheduled"),
      v.literal("confirmed"),
      v.literal("cancelled"),
      v.literal("completed"),
      v.literal("no_show")
    ),
    scheduledAt: v.number(), // timestamp when appointment was scheduled
    confirmedAt: v.optional(v.number()),
    notes: v.optional(v.string()),
    rescheduleCount: v.number(),
  })
    .index("by_patient", ["patientId"])
    .index("by_slot", ["slotId"])
    .index("by_status", ["status"]),

  // Twilio call logs
  messages: defineTable({
    patientId: v.optional(v.id("patients")),
    direction: v.union(v.literal("outbound"), v.literal("inbound")),
    body: v.string(),
    whatsappMessageSid: v.optional(v.string()),
    status: v.optional(v.string()),
    timestamp: v.number(),
  })
    .index("by_patient", ["patientId"])
    .index("by_timestamp", ["timestamp"]),

  pendingOffers: defineTable({
    patientId: v.id("patients"),
    slotIds: v.array(v.id("availableSlots")),
    messageSid: v.string(),
    createdAt: v.number(),
  })
    .index("by_patient_created", ["patientId", "createdAt"]),

  // User roles for authentication
  userRoles: defineTable({
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("patient")),
    patientId: v.optional(v.id("patients")), // link to patient record if role is patient
  })
    .index("by_user", ["userId"])
    .index("by_role", ["role"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
