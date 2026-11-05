
import numpy as np
import pandas as pd
import joblib

from tensorflow.keras.models import load_model
from sklearn.metrics import (
    mean_absolute_error,
    mean_squared_error,
    r2_score
)

# --------------------------------------------------
# 1. Risk classification thresholds
# --------------------------------------------------

def risk_level(pm25):
    if pm25 <= 30:
        return 0  # LOW
    elif pm25 <= 60:
        return 1  # MODERATE
    elif pm25 <= 90:
        return 2  # HIGH
    return 3      # VERY HIGH


# --------------------------------------------------
# 2. Load dataset, model and scaler
# --------------------------------------------------

df = pd.read_csv("ml_ready_dataset.csv")
df["datetimeUtc"] = pd.to_datetime(df["datetimeUtc"])

df = df.sort_values(
    ["location_name", "datetimeUtc"]
).reset_index(drop=True)

model = load_model("forecast_model.keras")
scaler = joblib.load("scaler.pkl")

HOLDOUT_STATIONS = [
    "Zoo Park, Hyderabad - TSPCB",
    "Manali, Chennai - CPCB",
    "Worli, Mumbai - MPCB"
]

FEATURES = [
    "pm25",
    "pm10",
    "no2",
    "co",
    "so2",
    "o3",
    "temperature",
    "relativehumidity",
    "wind_speed"
]

LOOKBACK = 16


# --------------------------------------------------
# 3. Create sequences exactly as in training
# --------------------------------------------------

def make_sequences(data):
    X = []
    y = []
    last_known = []

    for location in data["location_name"].unique():
        station = data[data["location_name"] == location]

        values = station[FEATURES].values
        target = station["pm25"].values

        for i in range(len(station) - LOOKBACK):
            X.append(values[i:i + LOOKBACK])
            y.append(target[i + LOOKBACK])
            last_known.append(
                values[i + LOOKBACK - 1, 0]
            )

    return (
        np.array(X),
        np.array(y),
        np.array(last_known)
    )


# --------------------------------------------------
# 4. Reproduce the original test and holdout sets
# --------------------------------------------------

train_df = df[
    ~df["location_name"].isin(HOLDOUT_STATIONS)
].copy()

holdout_df = df[
    df["location_name"].isin(HOLDOUT_STATIONS)
].copy()

X, y, last = make_sequences(train_df)

X_holdout, y_holdout, last_holdout = make_sequences(
    holdout_df
)

test_start = int(len(X) * 0.80)

X_test = X[test_start:]
y_test = y[test_start:]
last_test = last[test_start:]


# --------------------------------------------------
# 5. Scale features using the saved training scaler
# --------------------------------------------------

def prepare(X_data):
    original_shape = X_data.shape

    flat = X_data.reshape(-1, len(FEATURES))
    scaled = scaler.transform(flat)

    return scaled.reshape(original_shape)


# --------------------------------------------------
# 6. Calculate forecasting and risk metrics
# --------------------------------------------------

def evaluate(name, X_data, y_true, last_values):
    X_scaled = prepare(X_data)

    predicted_delta = model.predict(
        X_scaled, verbose=0
    ).flatten()

    # Convert predicted change into absolute PM2.5
    y_pred = last_values + predicted_delta

    # Forecasting metrics
    mae = mean_absolute_error(y_true, y_pred)
    mse = mean_squared_error(y_true, y_pred)
    rmse = np.sqrt(mse)
    r2 = r2_score(y_true, y_pred)

    # Convert true and predicted PM2.5 to risk levels
    true_levels = np.array([
        risk_level(value) for value in y_true
    ])

    pred_levels = np.array([
        risk_level(value) for value in y_pred
    ])

    # Exact-Level Accuracy
    exact_accuracy = np.mean(
        true_levels == pred_levels
    ) * 100

    # Within-One-Level Accuracy
    within_one_accuracy = np.mean(
        np.abs(true_levels - pred_levels) <= 1
    ) * 100

    # HIGH+ Recall: actual HIGH or VERY HIGH samples
    high_mask = true_levels >= 2

    if np.any(high_mask):
        high_recall = np.mean(
            pred_levels[high_mask] >= 2
        ) * 100
    else:
        high_recall = float("nan")

    print("\n" + "=" * 45)
    print(name)
    print("=" * 45)

    print(f"Samples evaluated: {len(y_true)}")
    print(f"MAE: {mae:.6f}")
    print(f"MSE: {mse:.6f}")
    print(f"RMSE: {rmse:.6f}")
    print(f"R2: {r2:.6f}")

    print("\nRisk Classification Metrics")
    print(f"Exact-Level Accuracy: {exact_accuracy:.2f}%")
    print(
        f"Within-One-Level Accuracy: "
        f"{within_one_accuracy:.2f}%"
    )
    print(f"HIGH+ Recall: {high_recall:.2f}%")
    print(
        f"Actual HIGH/VERY HIGH samples: "
        f"{int(high_mask.sum())}"
    )


# --------------------------------------------------
# 7. Evaluate both datasets
# --------------------------------------------------

evaluate(
    "SAME-CITY TEST SET",
    X_test,
    y_test,
    last_test
)

evaluate(
    "UNSEEN-CITY HOLDOUT SET",
    X_holdout,
    y_holdout,
    last_holdout
)
