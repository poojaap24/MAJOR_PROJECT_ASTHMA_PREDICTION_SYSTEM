// ============================================
// This is an EXAMPLE of how to wire the pieces into your
// existing server.js. Copy the relevant parts in - don't
// replace your whole file with this.
// ============================================

const axios = require("axios"); // npm install axios
const { addReading, getWindow, isReady } = require("./readingsBuffer");

const PREDICTION_SERVICE_URL = "http://127.0.0.1:5001/predict";

// -----------------------------------------------
// Call this every 15 minutes per location (e.g. with
// node-cron, or setInterval) - fetches current pollution
// data (from OpenWeatherMap, same as your existing code)
// and adds it to that location's rolling window.
// -----------------------------------------------
async function collectReading(location, lat, lon) {
  // reuse your EXISTING OpenWeatherMap fetch logic here -
  // this is just a placeholder showing the shape needed
  const currentData = await fetchWeatherData(lat, lon); // your existing function

  const reading = {
    pm25: currentData.pm25,
    pm10: currentData.pm10,
    no2: currentData.no2,
    co: currentData.co,
    so2: currentData.so2,
    o3: currentData.o3,
    temperature: currentData.temperature,
    relativehumidity: currentData.humidity,
    wind_speed: currentData.windSpeed,
  };

  addReading(location, reading);
}

// -----------------------------------------------
// Real endpoint: frontend calls this to get a prediction
// for a specific user + location
// -----------------------------------------------
app.post("/api/predict-risk", async (req, res) => {
  try {
    const { location, user } = req.body;

    if (!isReady(location)) {
      return res.status(400).json({
        error: `Not enough data yet for ${location}. Need 16 readings, collecting every 15 min.`,
      });
    }

    const readings = getWindow(location);

    const response = await axios.post(PREDICTION_SERVICE_URL, {
      readings,
      user, // { age, severity, allergy } - from Firebase profile
    });

    res.json(response.data);

  } catch (err) {
    console.error("Prediction error:", err.message);
    res.status(500).json({ error: "Prediction failed" });
  }
});