// src/services/weatherService.ts

// -------------------------
// TRADUZ CÓDIGO CLIMÁTICO
// -------------------------
function translateWeather(code: number): string {
  if (code === 0) return "Ensolarado";
  if (code >= 1 && code <= 3) return "Nublado";
  if (code >= 45 && code <= 48) return "Neblina";
  if (code >= 51 && code <= 57) return "Garoa";
  if (code >= 61 && code <= 65) return "Chuva";
  if (code >= 80 && code <= 82) return "Pancadas de chuva";
  if (code >= 95 && code <= 99) return "Tempestade";
  return "Nublado";
}

// -------------------------
// CALCULA PESO DO CLIMA
// -------------------------
function weatherWeight(code: number): number {
  if (code === 0) return 0;                  // ensolarado
  if (code >= 1 && code <= 3) return 0.05;   // poucas nuvens
  if (code >= 45 && code <= 48) return 0.1;  // neblina
  if (code >= 51 && code <= 57) return 0.15; // garoa
  if (code >= 61 && code <= 65) return 0.2;  // chuva consistente
  if (code >= 80 && code <= 82) return 0.25; // pancadas
  if (code >= 95 && code <= 99) return 0.3;  // tempestade
  return 0.1; // fallback
}

// -----------------------------------------------------------
// BUSCA PREVISÃO OFICIAL PARA O DIA + HORA DA CONSULTA
// -----------------------------------------------------------
export async function getClimateRiskForDate(
  lat: number,
  lon: number,
  appointmentDate: string, // formato YYYY-MM-DD
  appointmentTime: string  // formato HH:mm
) {
  try {
    const target = new Date(`${appointmentDate}T${appointmentTime}:00`);
    const day = appointmentDate;

    const url =
      `https://api.open-meteo.com/v1/forecast?` +
      `latitude=${lat}&longitude=${lon}&` +
      `hourly=weathercode&timezone=America/Sao_Paulo&` +
      `start_date=${day}&end_date=${day}`;

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Weather fetch failed: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();

    if (!data.hourly || !data.hourly.weathercode) {
      throw new Error("No hourly weather data returned.");
    }

    // procura o horário exato
    const targetHour = target.toISOString().slice(0, 13) + ":00";
    const index = data.hourly.time.indexOf(targetHour);

    const code =
      index !== -1 ? data.hourly.weathercode[index] : 0;

    const weight = weatherWeight(code);

    return {
      weatherCode: code,
      description: translateWeather(code),
      weight,
      weightPercent: weight * 100,
      date: appointmentDate,
      time: appointmentTime
    };
  } catch (err) {
    console.error("Weather error:", err);

    return {
      weatherCode: -1,
      description: "Indefinido",
      weight: 0.1,
      weightPercent: 10,
      date: appointmentDate,
      time: appointmentTime
    };
  }
}

// -----------------------------------------------------------
// FUNÇÃO ANTIGA, MANTIDA PARA COMPATIBILIDADE (opcional)
// CLIMA ATUAL, NÃO USADO EM CONSULTA!
// -----------------------------------------------------------
export async function getClimateRisk(lat: number, lon: number) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Weather fetch failed: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();

    if (!data.current_weather) {
      throw new Error("Could not fetch weather data");
    }

    const code = data.current_weather.weathercode;
    const weight = weatherWeight(code);

    return {
      weatherCode: code,
      description: translateWeather(code),
      weight,
      weightPercent: weight * 100
    };
  } catch (err) {
    console.error("Weather error:", err);
    return {
      weatherCode: -1,
      description: "Indefinido",
      weight: 0.1,
      weightPercent: 10
    };
  }
}
