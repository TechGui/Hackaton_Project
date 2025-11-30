// convex/weather.ts
import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Peso simplificado para evitar divergência com versões do front
function getWeatherWeightBackend(code: number): number {
  if (code === 0) return 5;
  if (code >= 1 && code <= 3) return 15;
  if (code >= 45 && code <= 48) return 25;
  if (code >= 51 && code <= 57) return 40;
  if (code >= 61 && code <= 65) return 55;
  if (code >= 80 && code <= 82) return 70;
  if (code >= 95 && code <= 99) return 90;
  return 20;
}

export const getClimateFactor = mutation({
  args: {
    lat: v.number(),
    lon: v.number(),
  },
  handler: async (_ctx, args) => {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${args.lat}&longitude=${args.lon}&current=weathercode&timezone=America/Sao_Paulo`;

    const res = await fetch(url);
    const data = await res.json();

    const code = data.current?.weathercode ?? 3;
    const weight = getWeatherWeightBackend(code);
    const percent = Math.min(100, Math.max(0, weight));

    return {
      weatherCode: code,
      weight,
      percent,
    };
  },
});
