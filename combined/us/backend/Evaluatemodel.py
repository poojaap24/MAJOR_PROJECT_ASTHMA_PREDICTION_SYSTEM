# ============================================
# EVALUATE CNN-LSTM MODEL ACROSS ALL WINDOWS
# ============================================
# Runs the model over every valid window for every station and
# reports overall + per-station MAE and RMSE, instead of judging
# accuracy from a single manually chosen sample.

import sys
import numpy as np
import pandas as pd
import joblib
from tensorflow.keras.models import load_model

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
    except Exception as e:
        print(f"ERROR loading model/scaler: {e}")
        sys.exit(1)
    return model, scaler


def load_dataset():
    try:
        df = pd.read_csv(DATA_PATH)
    except FileNotFoundError:
        print(f"ERROR: Dataset not found at '{DATA_PATH}'")
        sys.exit(1)

    df["datetimeUtc"] = pd.to_datetime(df["datetimeUtc"])
    df = df.sort_values(["location_name", "datetimeUtc"])
    return df


def build_windows(station_df):
    """Builds all (X, y) pairs for a single station's time series."""
    n = len(station_df)
    max_start = n - LOOKBACK - 1

    if max_start < 0:
        return [], []

    X_list = []
    y_list = []

    values = station_df[FEATURES].values
    pm25_values = station_df["pm25"].values

    for start in range(max_start + 1):
        X_list.append(values[start:start + LOOKBACK])
        y_list.append(pm25_values[start + LOOKBACK])

    return X_list, y_list


def evaluate():
    model, scaler = load_resources()
    df = load_dataset()

    stations = sorted(df["location_name"].unique())

    all_errors = []
    per_station_results = []

    print(f"Evaluating {len(stations)} stations...\n")

    for location in stations:
        station_df = df[df["location_name"] == location].reset_index(drop=True)
        X_list, y_list = build_windows(station_df)

        if not X_list:
            print(f"- {location}: skipped (not enough readings)")
            continue

        X_batch = np.array([scaler.transform(x) for x in X_list])
        y_true = np.array(y_list)

        y_pred = model.predict(X_batch, verbose=0).flatten()

        errors = np.abs(y_true - y_pred)
        mae = errors.mean()
        rmse = np.sqrt(((y_true - y_pred) ** 2).mean())

        all_errors.extend(errors.tolist())
        per_station_results.append((location, len(y_true), mae, rmse))

        print(f"- {location}: n={len(y_true)}  MAE={mae:.2f}  RMSE={rmse:.2f}")

    if not all_errors:
        print("\nNo windows could be evaluated. Check dataset size per station.")
        return

    all_errors = np.array(all_errors)
    overall_mae = all_errors.mean()
    overall_rmse = np.sqrt((all_errors ** 2).mean())

    print("\n============================")
    print("OVERALL RESULTS")
    print("============================")
    print(f"Total predictions : {len(all_errors)}")
    print(f"Overall MAE  : {overall_mae:.2f}")
    print(f"Overall RMSE : {overall_rmse:.2f}")

    worst = sorted(per_station_results, key=lambda r: r[2], reverse=True)[:3]
    print("\nStations with highest MAE (worth investigating):")
    for location, n, mae, rmse in worst:
        print(f"- {location}: MAE={mae:.2f} (n={n})")


if __name__ == "__main__":
    evaluate()