# ============================================
# TEST SCRIPT - sends a real request to predict_service.py
# Uses actual data from your dataset so it's a realistic test.
# ============================================

import pandas as pd
import requests

FEATURES = [
    "pm25", "pm10", "no2", "co", "so2", "o3",
    "temperature", "relativehumidity", "wind_speed"
]

df = pd.read_csv("ml_ready_dataset.csv")
df["datetimeUtc"] = pd.to_datetime(df["datetimeUtc"])
df = df.sort_values(["location_name", "datetimeUtc"])

# Grab 16 real readings from one station
station = df[df["location_name"] == "BTM Layout, Bengaluru - CPCB"].reset_index(drop=True)
window = station.iloc[100:116]

readings = window[FEATURES].to_dict(orient="records")

payload = {
    "readings": readings,
    "user": {
        "age": 21,
        "severity": "moderate",
        "allergy": True
    }
}

response = requests.post("http://127.0.0.1:5001/predict", json=payload)

print("Status code:", response.status_code)
print("Response:")
print(response.json())