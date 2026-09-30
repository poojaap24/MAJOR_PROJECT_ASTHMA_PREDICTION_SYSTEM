import numpy as np
from tensorflow.keras.models import load_model
import joblib

model = load_model("forecast_model.keras")
scaler = joblib.load("scaler.pkl")

# two deliberately extreme, very different 16-row windows
low  = np.tile([1, 1, 0.01, 10, 0.01, 5, 15, 20, 0.5], (16, 1)).astype(float)
high = np.tile([300, 400, 5, 400, 5, 100, 40, 95, 10], (16, 1)).astype(float)

for name, x in [("low", low), ("high", high)]:
    xs = scaler.transform(x).reshape(1, 16, 9)
    print(name, model.predict(xs, verbose=0))