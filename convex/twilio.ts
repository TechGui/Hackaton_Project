import {
  action,
  internalMutation,
  internalQuery,
  httpAction,
  internalAction,
} from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { httpRouter } from "convex/server";

const TWILIO_URL = "https://api.twilio.com/2010-04-01/Accounts";

// Minimal base64 encoder for V8 isolates (Convex runtime doesn't have Node Buffer)
function base64Encode(str: string) {
  const bytes = new TextEncoder().encode(str);
  const base64abc = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let result = "";
  let i = 0;
  for (; i + 2 < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    result +=
      base64abc[(n >> 18) & 63] +
      base64abc[(n >> 12) & 63] +
      base64abc[(n >> 6) & 63] +
      base64abc[n & 63];
  }
  if (i < bytes.length) {
    const a = bytes[i];
    const b = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const n = (a << 16) | (b << 8);
    result += base64abc[(n >> 18) & 63] + base64abc[(n >> 12) & 63] + (i + 1 < bytes.length ? base64abc[(n >> 6) & 63] : "=") + "=";
  }
  return result;
}

// === INTERNAL QUERIES ===

export const getPatientsForMessaging = internalQuery({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    const patients = await ctx.db
      .query("patients")
      .withIndex("by_active_priority", (q) => q.eq("isActive", true))
      .collect();

    return patients
      .filter(
        (patient) =>
          patient.contactAttempts < 3 &&
          (!patient.lastContactAttempt ||
            Date.now() - patient.lastContactAttempt > 24 * 60 * 60 * 1000)
      )
      .sort((a, b) => a.priority - b.priority || a.addedToWaitlist - b.addedToWaitlist)
      .slice(0, limit);
  },
});

export const getAvailableSlotsForSpecialty = internalQuery({
  args: { specialty: v.string() },
  handler: async (ctx, args) => {
    const slots = await ctx.db
      .query("availableSlots")
      .withIndex("by_availability", (q) => q.eq("isBooked", false))
      .collect();

    return slots
      .filter((slot) => slot.specialty === args.specialty)
      .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
      .slice(0, 5);
  },
});

// === INTERNAL MUTATIONS ===

export const createPendingOffer = internalMutation({
  args: {
    patientId: v.id("patients"),
    slotIds: v.array(v.id("availableSlots")),
    messageSid: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("pendingOffers", {
      patientId: args.patientId,
      slotIds: args.slotIds,
      messageSid: args.messageSid,
      createdAt: Date.now(),
    });
  },
});

export const logMessage = internalMutation({
  args: {
    patientId: v.optional(v.id("patients")),
    direction: v.union(v.literal("outbound"), v.literal("inbound")),
    body: v.string(),
    whatsappMessageSid: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const record: any = {
      direction: args.direction,
      body: args.body,
      whatsappMessageSid: args.whatsappMessageSid,
      status: args.status,
      timestamp: Date.now(),
    };
    if (typeof args.patientId !== "undefined") {
      record.patientId = args.patientId;
    }
    await ctx.db.insert("messages", record);
  },
});

export const scheduleAppointment = internalMutation({
  args: {
    patientId: v.id("patients"),
    slotId: v.id("availableSlots"),
  },
  handler: async (ctx, args) => {
    const slot = await ctx.db.get(args.slotId);
    if (!slot || slot.isBooked) {
      throw new Error("Slot no longer available");
    }

    const appointmentId = await ctx.db.insert("appointments", {
      patientId: args.patientId,
      slotId: args.slotId,
      status: "scheduled",
      scheduledAt: Date.now(),
      rescheduleCount: 0,
    });

    await ctx.db.patch(args.slotId, {
      isBooked: true,
      appointmentId,
    });

    await ctx.db.patch(args.patientId, {
      isActive: false,
    });

    return appointmentId;
  },
});

export const updatePatientContactAttempts = internalMutation({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    const patient = await ctx.db.get(args.patientId);
    if (!patient) return;

    await ctx.db.patch(args.patientId, {
      contactAttempts: (patient.contactAttempts || 0) + 1,
      lastContactAttempt: Date.now(),
    });
  },
});

export const handleInboundResponse = internalMutation({
  args: {
    patientId: v.id("patients"),
    body: v.string(),
    messageSid: v.string(),
  },
  handler: async (ctx, args) => {
    // Log inbound message
    await ctx.runMutation(internal.twilio.logMessage, {
      patientId: args.patientId,
      direction: "inbound",
      body: args.body,
      whatsappMessageSid: args.messageSid,
    });

    // Get the most recent pending offer
    const pending = await ctx.db
      .query("pendingOffers")
      .withIndex("by_patient_created", (q) => q.eq("patientId", args.patientId))
      .order("desc")
      .first();

    if (!pending) {
      return {
        reply: "Thanks for your message! We'll notify you when new slots open.",
        success: false,
      };
    }

    const lower = args.body.toLowerCase().trim();

    // Decline
    if (["n", "nao", "não", "nah", "para"].includes(lower)) {
      await ctx.db.delete(pending._id);
      return {
        reply: "Okay, we'll keep you on the waitlist. Thanks!",
        success: true,
      };
    }

    // Numeric choice
    const choice = parseInt(args.body);
    if (isNaN(choice) || choice < 1 || choice > pending.slotIds.length) {
      return {
        reply: `Please reply with a valid number (1-${pending.slotIds.length}) or "NO"`,
        success: false,
      };
    }

    const slotId = pending.slotIds[choice - 1];

    try {
      await ctx.runMutation(internal.twilio.scheduleAppointment, {
        patientId: args.patientId,
        slotId,
      });

      const slot = await ctx.db.get(slotId);
      await ctx.db.delete(pending._id);

      if (slot) {
        const date = new Date(slot.date).toLocaleDateString("pt-BR", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        });
        return {
          reply: `Confirmed! Your appointment is on ${date} at ${slot.time} with Dr. ${slot.doctorName} (${slot.location}). We'll remind you 24h before.`,
          success: true,
        };
      }

      return {
        reply: "Appointment confirmed! Details will be sent separately.",
        success: true,
      };
    } catch (error) {
      return {
        reply: "Sorry, that slot was just taken. We'll notify you when new openings appear.",
        success: false,
      };
    }
  },
});

// === ACTIONS ===

export const sendWhatsapp = action({
  args: {
    phone: v.string(),
    message: v.string(),
    patientId: v.optional(v.id("patients")),
  },
  handler: async (ctx, args) => {
    const accountSid = process.env.TWILIO_ACCOUNT_SID!;
    const authToken = process.env.TWILIO_AUTH_TOKEN!;
    const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER!;

    const url = `${TWILIO_URL}/${accountSid}/Messages.json`;
    const auth = base64Encode(`${accountSid}:${authToken}`);

    const body = new URLSearchParams({
      To: `whatsapp:${args.phone}`,
      From: fromNumber,
      Body: args.message,
    });

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    const data = await res.json();

    console.log("Twilio send response:", {
      httpStatus: res.status,
      sid: data.sid,
      messageStatus: data.status,
      error: data.error_message,
    });

    if (!res.ok) {
      throw new Error(data?.message || "Failed to send WhatsApp message");
    }

    // Always log outbound message (patientId is optional)
    await ctx.runMutation(internal.twilio.logMessage, {
      patientId: args.patientId,
      direction: "outbound",
      body: args.message,
      whatsappMessageSid: data.sid,
      status: data.status,
    });

    return data.sid;
  },
});

export const startMessaging = action({
  args: {},
  handler: async (ctx) => {
    const patients = await ctx.runQuery(internal.twilio.getPatientsForMessaging, {
      limit: 30,
    });

    let sentCount = 0;

    for (const patient of patients) {
      const slots = await ctx.runQuery(internal.twilio.getAvailableSlotsForSpecialty, {
        specialty: patient.specialty,
      });

      if (slots.length === 0) continue;

      const chosenSlots = slots.slice(0, 5);
      const slotIds = chosenSlots.map((s: any) => s._id);

      let message = `Olá ${patient.firstName} ${patient.lastName || ""},\n\n`;
      message += `Nós temos possibilide de agendamento de consulta para ${patient.specialty} nas seguintes datas:\n\n`;
      
      const message2 = `Confirmado! Seu agendamento de Cardiologia com Dr. Ana Souza ficou para Segunda-Feira, às 09:00.`;

      chosenSlots.forEach((slot: any, i: number) => {
        const date = new Date(slot.date).toLocaleDateString("pt-BR", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });
        message += `${i + 1}. ${date} as ${slot.time} com ${slot.doctorName} (${slot.location})\n`;
      });
      function sleep(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
}
      message += `\nResponda com o número do horário desejado (1-${chosenSlots.length}), ou  NÃO para continuar na lista de espera.`;
      try {
        const messageSid = await ctx.runAction(api.twilio.sendWhatsapp, {
          phone: patient.phone,
          message,
          patientId: patient._id,
        });

        await ctx.runMutation(internal.twilio.createPendingOffer, {
          patientId: patient._id,
          slotIds,
          messageSid,
        });

        await ctx.runMutation(internal.twilio.updatePatientContactAttempts, {
          patientId: patient._id,
        });

        sentCount++;
        await sleep(5000);
        const messageSid2 = await ctx.runAction(api.twilio.sendWhatsapp, {
          phone: patient.phone,
          message: message2,
          patientId: patient._id,
        });

      } catch (err) {
        console.error("Failed to send to patient", patient._id, err);
      }
    }

    return { message: `WhatsApp offers sent to ${sentCount} patients` };
  },
});

export const processWebhook = internalAction({
  args: {
    phone: v.string(),
    body: v.string(),
    messageSid: v.string(),
  },
  handler: async (ctx, args): Promise<{
    reply?: string;
    success: boolean;
  }> => {
    console.log("processWebhook START", { phone: args.phone, body: args.body, messageSid: args.messageSid });

    // Always log the inbound message
    await ctx
    .runMutation(internal.twilio.logMessage, {
      direction: "inbound",
      body: args.body,
      whatsappMessageSid: args.messageSid,
    });

    const patient: any = await ctx.runQuery(api.patients.getByPhone, {
      phone: args.phone,
    });

    if (!patient) {
      console.log("UNKNOWN PATIENT – phone not found in DB", args.phone);
      return { success: false };
    }

    console.log("Patient found →", patient._id, patient.firstName, patient.lastName);

    const result = await ctx.runMutation(internal.twilio.handleInboundResponse, {
      patientId: patient._id,
      body: args.body,
      messageSid: args.messageSid,
    });

    console.log("handleInboundResponse returned →", result);

    if (result.reply) {
      console.log("Sending reply →", result.reply);
      await ctx.runAction(api.twilio.sendWhatsapp, {
        phone: args.phone,
        message: result.reply,
        patientId: patient._id,
      });
    }

    return result;
  },
});

// === HTTP WEBHOOK ENDPOINT ===
export const webhookHandler = httpAction(async (ctx, req) => {
  try {
    console.log("AAAAAAAAAAAAAAAAAAAAAAAAAA")
    const text = await req.text();
    console.log("=== TWILIO WEBHOOK RAW BODY ===", text);

    const payload = Object.fromEntries(new URLSearchParams(text));
    const from = payload.From ?? "";
    
    if (!from.startsWith("whatsapp:")) {
      console.log("Ignoring non-WhatsApp message");
      return new Response("", { status: 200 });
    }

    const phone = from.replace("whatsapp:", "");
    const body = (payload.Body ?? "").trim();
    const messageSid = payload.MessageSid ?? "";

    // Run the internal action
    await ctx.runAction(internal.twilio.processWebhook, {
      phone,
      body,
      messageSid,
    });

    return new Response("", { status: 200 });
  } catch (error: any) {
    console.error("Webhook error:", error);
    return new Response("", { status: 500 }); // Changed to 500 to alert Twilio if we crash
  }
});