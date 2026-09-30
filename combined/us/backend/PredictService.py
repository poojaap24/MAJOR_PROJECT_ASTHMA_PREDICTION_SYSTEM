from flask import Flask, request, jsonify
import numpy as np
import joblib
from tensorflow.keras.models import load_model

from risk_predictor import get_risk
from personalized_risk import get_personalized_risk, get_advice

app = Flask(__name__)

FEATURES = [
    "pm25", "pm10", "no2", "co", "so2", "o3",
    "temperature", "relativehumidity", "wind_speed"
]

LOOKBACK = 16

print("Loading model and scaler...")
model = load_model("forecast_model.keras")
scaler = joblib.load("scaler.pkl")
print("Ready!")


def to_bool(v):
    """Frontend sends real booleans, but accept 'Yes'/'true' strings too."""
    if isinstance(v, str):
        return v.strip().lower() in ("yes", "true", "1")
    return bool(v)


@app.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.get_json()

        readings = data.get("readings")
        user = data.get("user") or {}

        if not readings or len(readings) != LOOKBACK:
            return jsonify({"error": f"Need exactly {LOOKBACK} readings"}), 400

        X = np.array([[r[f] for f in FEATURES] for r in readings])

        # raw (unscaled) latest PM2.5 - the model predicts the CHANGE from this
        last_known_pm25 = float(X[-1][0])

        X = scaler.transform(X).reshape(1, LOOKBACK, len(FEATURES))

        predicted_delta = float(model.predict(X, verbose=0)[0][0])
        prediction = max(0.0, last_known_pm25 + predicted_delta)

        # ---- all six profile fields reach the risk logic ----
        age = int(user["age"])
        severity = user["severity"]
        allergy = to_bool(user.get("allergy", False))
        smoker = to_bool(user.get("smoker", False))
        condition = user.get("condition", "none")
        outdoor = to_bool(user.get("outdoorExposure", user.get("outdoor_exposure", False)))

        env_risk = get_risk(prediction)

        personal_risk = get_personalized_risk(
            prediction, age, severity, allergy,
            smoker=smoker, condition=condition, outdoor_exposure=outdoor
        )

        advice = get_advice(
            personal_risk,
            smoker=smoker, condition=condition, outdoor_exposure=outdoor
        )

        return jsonify({
            "last_known_pm25": round(last_known_pm25, 2),
            "predicted_change": round(predicted_delta, 2),
            "predicted_pm25": round(prediction, 2),
            "environmental_risk": env_risk,
            "personalized_risk": personal_risk,
            "advice": advice,
            "model": "CNN-LSTM"
        })

    except Exception as e:
        print(e)
        return jsonify({"error": str(e)}), 500


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5001)