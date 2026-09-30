# ============================================
# PREDICT NEXT PM2.5 USING TRAINED CNN-LSTM
# ============================================

import sys
import pandas as pd
import numpy as np
import joblib
from personalized_risk import get_personalized_risk, get_advice
from tensorflow.keras.models import load_model
from risk_predictor import get_risk

MODEL_PATH = "forecast_model.keras"
SCALER_PATH = "scaler.pkl"
DATA_PATH = "ml_ready_dataset.csv"

FEATURES = [
    "pm25",
    "pm10",
    "no2",
    "co",
    "so2",
    "o3",
    "temperature",
    "relativehumidity",
    "wind_speed",
]

LOOKBACK = 16


def load_resources():
    try:
        model = load_model(MODEL_PATH)
        scaler = joblib.load(SCALER_PATH)
    except FileNotFoundError as e:
        print(f"\nERROR: Could not find a required file - {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\nERROR: Failed to load model/scaler - {e}")
        sys.exit(1)

    print("Model Loaded!")
    return model, scaler


def load_dataset():
    try:
        df = pd.read_csv(DATA_PATH)
    except FileNotFoundError:
        print(f"\nERROR: Dataset not found at '{DATA_PATH}'")
        sys.exit(1)

    missing = [c for c in FEATURES + ["location_name", "datetimeUtc"] if c not in df.columns]
    if missing:
        print(f"\nERROR: Dataset is missing required columns: {missing}")
        sys.exit(1)

    df["datetimeUtc"] = pd.to_datetime(df["datetimeUtc"])
    df = df.sort_values(["location_name", "datetimeUtc"])
    return df


def prompt_int(prompt_text, low, high):
    """Repeatedly prompts until a valid integer within [low, high] is entered."""
    while True:
        raw = input(prompt_text)
        try:
            value = int(raw)
        except ValueError:
            print(f"Please enter a whole number between {low} and {high}.")
            continue

        if value < low or value > high:
            print(f"Please enter a number between {low} and {high}.")
            continue

        return value


def main():
    model, scaler = load_resources()
    df = load_dataset()

    stations = sorted(df["location_name"].unique())

    if not stations:
        print("\nERROR: No stations found in dataset.")
        sys.exit(1)

    print("\nAvailable Stations\n")
    for i, station_name in enumerate(stations, start=1):
        print(f"{i}. {station_name}")

    choice = prompt_int("\nEnter station number: ", 1, len(stations))
    location = stations[choice - 1]

    station = df[df["location_name"] == location].reset_index(drop=True)

    print("\n===================================")
    print("Selected Station:", location)
    print("Total Readings :", len(station))
    print("===================================\n")

    max_start = len(station) - LOOKBACK - 1

    if max_start < 0:
        print(
            f"\nERROR: Not enough readings for this station to build a "
            f"{LOOKBACK}-step window. Needs at least {LOOKBACK + 1} readings, "
            f"has {len(station)}."
        )
        sys.exit(1)

    print(f"You can choose a starting index between 0 and {max_start}")
    start = prompt_int("Enter starting index: ", 0, max_start)

    window = station.iloc[start:start + LOOKBACK]

    print("\nWindow Used For Prediction\n")
    print(
        window[
            [
                "datetimeUtc",
                "pm25",
                "pm10",
                "no2",
                "co",
                "so2",
                "o3",
                "temperature",
                "relativehumidity",
                "wind_speed",
            ]
        ]
    )

    actual = station.iloc[start + LOOKBACK]["pm25"]
    print("\nActual Next PM2.5 :", actual)

    # -------------------------
    # Prepare input & predict
    # -------------------------
    try:
        X = window[FEATURES].values
        X = scaler.transform(X)
        X = X.reshape(1, LOOKBACK, len(FEATURES))
        prediction = model.predict(X, verbose=0)[0][0]
    except Exception as e:
        print(f"\nERROR: Prediction failed - {e}")
        sys.exit(1)

    risk = get_risk(prediction)

    # =====================================
    # User Profile (Later from Firebase)
    # =====================================
    user = {
        "name": "Pooja",
        "age": 21,
        "severity": "Moderate",
        "allergy": True,
    }

    try:
        personal_risk = get_personalized_risk(
            prediction,
            user["age"],
            user["severity"],
            user["allergy"],
        )
        advice = get_advice(personal_risk)
    except ValueError as e:
        print(f"\nERROR: Could not compute personalized risk - {e}")
        sys.exit(1)

    print("\n============================")
    print("ASTHMA RISK REPORT")
    print("============================")

    print("Station :", location)
    print("Predicted Future PM2.5 :", round(float(prediction), 2))
    print("Environmental Risk :", risk)

    print("\nUser Details")
    print("Name :", user["name"])
    print("Age :", user["age"])
    print("Asthma Severity :", user["severity"])
    print("Allergy :", user["allergy"])

    print("\nPersonalized Risk :", personal_risk)

    print("\nRecommendations")
    for tip in advice:
        print("-", tip)

    print("\nActual Next PM2.5 :", actual)
    print("Prediction Error :", round(abs(actual - prediction), 2))


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nInterrupted by user. Exiting.")
        sys.exit(0)