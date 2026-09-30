import joblib
scaler = joblib.load("scaler.pkl")
FEATURES = ["pm25","pm10","no2","co","so2","o3","temperature","relativehumidity","wind_speed"]
for f, mn, mx in zip(FEATURES, scaler.data_min_, scaler.data_max_):
    print(f"{f:16s} min={mn:.4f}  max={mx:.4f}")