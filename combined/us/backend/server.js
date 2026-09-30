const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const { addReading, getWindow, isReady } = require("./readingsBuffer");
const authRoutes = require("./auth/routes/authRoutes");
const { testConnection } = require("./auth/config/db");
const Groq = require("groq-sdk");

const groq = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;

const app = express();
app.use(express.json());

// The frontend is now a separate React (Create React App) project that
// runs its own dev server (npm start -> http://localhost:3000), so this
// backend no longer serves any HTML/static files itself. It's a pure
// JSON API. CORS is opened up for the CRA dev server plus the old
// Live Server ports, in case those are still used for quick testing.
app.use(cors({
  origin: [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5500",
    "http://localhost:5500",
    "http://127.0.0.1:5501",
    "http://localhost:5501",
    // Set CLIENT_ORIGIN in .env when the frontend is deployed somewhere else
    ...(process.env.CLIENT_ORIGIN ? [process.env.CLIENT_ORIGIN] : [])
  ],
  // Required so the browser will send/receive the httpOnly refresh-token cookie
  credentials: true
}));

// Reads the refresh-token cookie used by /api/auth/refresh and /api/auth/logout
app.use(cookieParser());

// Login / signup / session routes (SQLite file, no install needed) — see backend/auth/
app.use("/api/auth", authRoutes);

app.get("/", (req, res) => {
  res.json({ ok: true, message: "BreatheSafe API is running. The frontend runs separately (npm start in /frontend)." });
});

// FIX: API key now comes from .env, never hardcoded in the file.
// Create a file called .env in this same folder with one line:
// OPENWEATHER_API_KEY=your_real_key_here
const API_KEY = process.env.OPENWEATHER_API_KEY;

if (!API_KEY) {
  console.warn("⚠️  OPENWEATHER_API_KEY is not set. Create backend/.env with OPENWEATHER_API_KEY=your_key or /geocode and /air will fail.");
}

const PREDICTION_SERVICE_URL = "http://127.0.0.1:5001/predict";
const PORT = process.env.PORT || 5000;

// -----------------------------------------------------
// Track how many OpenWeatherMap calls we make - useful since
// the free tier has limits (60 calls/minute, 1,000 calls/day).
// -----------------------------------------------------
let apiCalls = 0;

async function callOpenWeather(url) {
  apiCalls++;
  console.log(`OpenWeather calls so far: ${apiCalls}`);
  return await fetch(url);
}

// See the running count anytime by visiting /api-usage
app.get("/api-usage", (req, res) => {
  res.json({ openWeatherCallsSoFar: apiCalls });
});

// Health check
app.get("/test", (req, res) => {
  res.json({ ok: true, message: "Server is alive" });
});

// Serves the offline evaluation results (MAE/RMSE/R2) written by
// Evaluatemodel.py, so the frontend's "How AI Works" page can show
// real accuracy figures instead of nothing.
app.get("/api/model-metrics", (req, res) => {
  try {
    const metrics = JSON.parse(
      fs.readFileSync(path.join(__dirname, "forecast_metrics.json"), "utf8")
    );
    res.json(metrics);
  } catch (err) {
    res.status(500).json({ error: "Metrics file not found" });
  }
});

// Reverse geocoding (unchanged from your original)
app.get("/geocode", async (req, res) => {
  try {
    const { lat, lon } = req.query;
    if (!lat || !lon) return res.status(400).json({ error: "Missing lat/lon" });

    const url = `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${API_KEY}`;
    const response = await callOpenWeather(url);
    const data = await response.json();

    if (!data || !data.length) {
      return res.json({
        name: `${parseFloat(lat).toFixed(3)}°N, ${parseFloat(lon).toFixed(3)}°E`
      });
    }

    const g = data[0];
    const parts = [g.name, g.state, g.country].filter(Boolean);

    return res.json({
      name: parts.join(", "),
      city: g.name,
      state: g.state,
      country: g.country
    });

  } catch (err) {
    console.error("Geocode error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------------------------------
// Current air quality reading - fetches live pollution AND
// live weather data together (temperature/humidity/wind),
// merges them into one reading, and adds it to that
// location's rolling 16-reading window so the forecast
// model has real values for ALL 9 features it was trained
// on (not placeholder zeros for temp/humidity/wind).
// -----------------------------------------------------
app.get("/air", async (req, res) => {
  try {
    const { lat, lon, location } = req.query;

    if (!lat || !lon || !location) {
      return res.status(400).json({ error: "Missing lat/lon/location" });
    }

    const pollutionUrl = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`;
    const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;

    const [pollutionRes, weatherRes] = await Promise.all([
      callOpenWeather(pollutionUrl),
      callOpenWeather(weatherUrl)
    ]);

    const pollutionData = await pollutionRes.json();
    const weatherData = await weatherRes.json();

    if (!pollutionData.list || !pollutionData.list.length) {
      return res.status(500).json({ error: "No pollution data returned", raw: pollutionData });
    }

    if (!weatherData.main) {
      return res.status(500).json({ error: "No weather data returned", raw: weatherData });
    }

    const comp = pollutionData.list[0].components;
    const aqi = pollutionData.list[0].main.aqi;

    const reading = {
  pm25: comp.pm2_5 || 0,
  pm10: comp.pm10 || 0,
  no2: comp.no2 || 0,
  co: (comp.co || 0) / 1000,   // Convert µg/m³ to mg/m³
  so2: comp.so2 || 0,
  o3: comp.o3 || 0,
  temperature: weatherData.main.temp,
  relativehumidity: weatherData.main.humidity,
  wind_speed: weatherData.wind ? weatherData.wind.speed : 0,
};

    addReading(location, reading);

    return res.json({
      success: true,
      data: { aqi, ...reading },
      bufferStatus: `${getWindow(location).length}/16 readings collected for ${location}`
    });

  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: err.message });
  }
});

// TEST-ONLY route: manually add a reading to a location's buffer,
// bypassing OpenWeatherMap. Useful for testing predict-risk without
// waiting on real API data or 4 hours of collection time.
// (Remove this route before actually deploying the app for real use.)
app.post("/api/test-add-reading", (req, res) => {
  const { location, reading } = req.body;
  if (!location || !reading) {
    return res.status(400).json({ error: "Missing location or reading" });
  }
  addReading(location, reading);
  res.json({ success: true, bufferSize: getWindow(location).length });
});

// -----------------------------------------------------
// The actual forecast + personalized risk endpoint.
// Needs 16 readings already collected for this location
// (built up over time by repeated calls to /air above).
// -----------------------------------------------------
app.post("/api/predict-risk", async (req, res) => {
  try {
    const { location, user } = req.body;

    if (!location || !user) {
      return res.status(400).json({ error: "Missing location or user profile" });
    }

    if (!isReady(location)) {
      return res.status(400).json({
        error: `Not enough data yet for ${location}. Have ${getWindow(location).length}/16 readings - call /air a few more times (every 15 min in production).`
      });
    }

    const readings = getWindow(location);

    const response = await fetch(PREDICTION_SERVICE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ readings, user })
    });

    const result = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(result);
    }

    return res.json({ success: true, ...result });

  } catch (err) {
    console.error("Prediction error:", err.message);
    res.status(500).json({ error: "Prediction failed. Is predict_service.py running on port 5001?" });
  }
});

// =====================================================
// GROQ CHATBOT
// =====================================================
// The chatbot never predicts anything itself — it only explains
// whatever the ML model + rule-based risk engine already produced
// (passed in as predictionData from the frontend's saved history).

app.post("/api/chat", async (req, res) => {
  try {
    if (!groq) {
      return res.status(503).json({
        error: "Chatbot is not configured. Set GROQ_API_KEY in backend/.env to enable it."
      });
    }

    const { message, predictionData } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const systemPrompt = `
You are the BreatheSafe Assistant, a concise conversational assistant for the
Environmental Context-Based Asthma Trigger Risk Prediction System.

Your job is to explain the prediction results to the user in simple, clear,
natural language. The machine-learning model and rule-based risk engine
perform the actual prediction — you are only an explanation and
conversation layer.

RULES:
1. Use the prediction data below as the only source of truth.
2. Never invent, change, or replace the risk category. Valid values are
   exactly: safe, moderate, high, severe (shown to the user as
   LOW / MODERATE / HIGH / VERY HIGH).
3. Keep normal answers short (1-3 sentences) and conversational.
4. Only give a long, structured answer when the user explicitly asks for
   "the full report", "everything", or similar.
5. If the user asks for tips/precautions, give at least 4 short practical
   tips, primarily drawn from the "advice" field if present.
6. If the user asks about a specific pollutant (PM2.5, PM10, NO2, SO2, CO,
   O3), AQI, temperature, humidity, or wind speed, answer only about that
   value using the "pollutants"/"weather" fields if present.
7. Do not diagnose medical conditions or claim to be a doctor. If the user
   describes severe breathing difficulty, chest pain, or another emergency
   symptom, tell them to seek immediate medical attention.
8. If no prediction data is available, say so plainly and suggest running
   a prediction first from the Predict page.

Latest BreatheSafe prediction data (most recent first):
${JSON.stringify(predictionData, null, 2)}
`;

    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ],
      model: "openai/gpt-oss-20b",
      temperature: 0.3,
      max_tokens: 500
    });

    const reply =
      completion.choices[0]?.message?.content ||
      "Sorry, I could not generate a response.";

    res.json({ reply });
  } catch (err) {
    console.error("Groq chat error:", err.message);
    res.status(500).json({ error: "Failed to get a response from the chatbot." });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log("   Endpoints: /test  /geocode  /air  /api/predict-risk  /api/test-add-reading  /api-usage  /api/chat");
  console.log("   Auth:      POST /api/auth/register  /login  /refresh  /logout   GET /api/auth/me");
  testConnection(); // logs whether the auth database opened; never stops the server
});