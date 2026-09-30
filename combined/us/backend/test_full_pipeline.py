# ============================================
# FILL BUFFER + TEST /api/predict-risk
# Feeds 16 real historical readings into your running
# Node server's buffer, then asks it for a prediction -
# lets you test the whole pipeline without waiting on
# OpenWeatherMap or 4 real hours of data collection.
# ============================================

import pandas as pd
import requests

SERVER_URL = "http://localhost:3000"
LOCATION = "TEST_BTM"  # any name - just a label for this buffer

FEATURES = [
    "pm25", "pm10", "no2", "co", "so2", "o3",
    "temperature", "relativehumidity", "wind_speed"
]

df = pd.read_csv("ml_ready_dataset.csv")
df["datetimeUtc"] = pd.to_datetime(df["datetimeUtc"])
df = df.sort_values(["location_name", "datetimeUtc"])

station = df[df["location_name"] == "BTM Layout, Bengaluru - CPCB"].reset_index(drop=True)
window = station.iloc[100:116]

print(f"Filling buffer for '{LOCATION}' with 16 historical readings...")

# NOTE: This calls a small internal test route to push readings directly
# into the buffer (bypassing OpenWeatherMap), since server.js's /air
# route normally does this automatically from live data.
for _, row in window.iterrows():
    reading = {f: float(row[f]) for f in FEATURES}
    resp = requests.post(f"{SERVER_URL}/api/test-add-reading", json={
        "location": LOCATION,
        "reading": reading
    })
    print(" added one reading, status:", resp.status_code)

print("\nNow requesting a prediction...\n")

payload = {
    "location": LOCATION,
    "user": {
        "age": 21,
        "severity": "moderate",
        "allergy": True
    }
}

response = requests.post(f"{SERVER_URL}/api/predict-risk", json=payload)
print("Status code:", response.status_code)
print("Response:")
print(response.json())
