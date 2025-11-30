import { httpAction } from "./_generated/server";
import { auth } from "./auth";
import { httpRouter } from "convex/server";
import { webhookHandler } from "./twilio"; // Import the handler

const http = httpRouter();

auth.addHttpRoutes(http);

http.route({
  path: "/ping",
  method: "GET",
  handler: httpAction(async () => {
    return new Response("pong", { status: 200 });
  }),
});


http.route({
  path: "/whatsappWebhook",
  method: "POST",
  handler: webhookHandler,
});

export default http;