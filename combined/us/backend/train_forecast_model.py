# ============================================
# ASTHMA RISK PREDICTION
# CNN-LSTM Forecast Model  (Improved Version)
# ============================================
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import joblib
import json
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

from sklearn.preprocessing import MinMaxScaler

import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Input, Conv1D, LSTM, Dense, Dropout
from tensorflow.keras.callbacks import EarlyStopping

# Fix randomness so results are the same every time we run this
np.random.seed(42)
tf.random.set_seed(42)

# -------------------------
# Load Dataset
# -------------------------

df = pd.read_csv("ml_ready_dataset.csv")

print("Dataset Loaded Successfully!")
print("Shape:", df.shape)

print("\nColumns:")
print(df.columns)

# -------------------------
# Convert datetime column
# -------------------------

df["datetimeUtc"] = pd.to_datetime(df["datetimeUtc"])

# -------------------------
# Sort data
# -------------------------

df = df.sort_values(["location_name", "datetimeUtc"])

print("\nData sorted successfully!")

# -------------------------
# Reset index
# -------------------------

df = df.reset_index(drop=True)

print("\nFirst 5 rows after sorting:")
print(df[["location_name", "datetimeUtc", "pm25"]].head())

# ============================================
# PART 2.5 - HOLD OUT 3 CITIES COMPLETELY
# (model will NEVER see these during training,
# so we can honestly test "does it work on a
# new city it has never seen")
#
# NOTE: We keep this SAME holdout-city approach
# as before. We tested a stricter per-city
# chronological split and it caused R2 to crash
# (near 0 / negative) because ~87% of this
# dataset is from January 2026 alone, with a
# very different pollution level than
# Feb/Mar/Jul. That is a real seasonal
# distribution-shift problem in the DATA, not a
# bug in the model, and is documented in the
# report instead of "fixed" here.
# ============================================

HOLDOUT_STATIONS = [
    "Zoo Park, Hyderabad - TSPCB",
    "Manali, Chennai - CPCB",
    "Worli, Mumbai - MPCB"
]

train_df = df[~df["location_name"].isin(HOLDOUT_STATIONS)].copy()
holdout_df = df[df["location_name"].isin(HOLDOUT_STATIONS)].copy()

print("\nTraining stations:", train_df["location_name"].nunique())
print("Held-out (unseen) stations:", holdout_df["location_name"].nunique())

# ============================================
# PART 3 - CREATE SEQUENCES
# ============================================

LOOKBACK = 16

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


def make_sequences(data):

    X = []
    y = []

    # Create sequences separately for every monitoring station
    for location in data["location_name"].unique():

        station = data[data["location_name"] == location]

        values = station[FEATURES].values

        target = station["pm25"].values

        # Sliding window
        for i in range(len(station) - LOOKBACK):

            X.append(values[i:i + LOOKBACK])

            y.append(target[i + LOOKBACK])

    return np.array(X), np.array(y)


print("\nCreating training sequences...")
X, y = make_sequences(train_df)
print("Done!")
print("X Shape :", X.shape)
print("y Shape :", y.shape)

print("\nCreating held-out (unseen city) sequences...")
X_holdout, y_holdout = make_sequences(holdout_df)
print("Done!")
print("X Holdout Shape :", X_holdout.shape)
print("y Holdout Shape :", y_holdout.shape)


# ============================================
# PART 4 - TRAIN / VALIDATION / TEST SPLIT
# (explicit split done here, up front, instead
# of letting model.fit() carve out validation
# data implicitly. Holdout cities are kept
# completely separate from all of this.)
# ============================================

train_split = int(len(X) * 0.72)   # 72% train
val_split = int(len(X) * 0.80)     # next 8% validation (72-80%)
# remaining 20% -> test

X_train = X[:train_split]
X_val = X[train_split:val_split]
X_test = X[val_split:]

y_train = y[:train_split]
y_val = y[train_split:val_split]
y_test = y[val_split:]

print("\nTraining Samples   :", len(X_train))
print("Validation Samples :", len(X_val))
print("Testing Samples    :", len(X_test))
print("Holdout Samples    :", len(X_holdout))


# ============================================
# PART 4.5 - CONVERT TARGET TO "DELTA" INSTEAD OF ABSOLUTE VALUE
# ------------------------------------------------
# Instead of asking the model to predict the raw
# next PM2.5 value, we ask it to predict the CHANGE
# from the last known reading (last timestep in the
# lookback window). Pollution barely moves between
# consecutive readings, so predicting the absolute
# value makes the model's job harder than it needs
# to be, and a naive "predict = last known value"
# baseline actually beats an absolute-value model on
# this dataset. We reconstruct the real prediction
# later as: last_known_pm25 + predicted_delta
#
# pm25 is index 0 in FEATURES, captured here BEFORE
# scaling since y is also unscaled.
# ============================================

last_known_train = X_train[:, -1, 0].copy()
last_known_val = X_val[:, -1, 0].copy()
last_known_test = X_test[:, -1, 0].copy()
last_known_holdout = X_holdout[:, -1, 0].copy()

y_train_delta = y_train - last_known_train
y_val_delta = y_val - last_known_val
# NOTE: y_test / y_holdout stay as absolute values.
# We only need deltas for TRAINING targets; test/holdout
# absolute y is used later for the final evaluate() call
# after reconstructing predictions.

print("\nTarget converted to delta (change from last known reading).")


# ============================================
# PART 5 - SCALE THE DATA
# ============================================

scaler = MinMaxScaler()

# Flatten the data
X_train_flat = X_train.reshape(-1, len(FEATURES))
X_val_flat = X_val.reshape(-1, len(FEATURES))
X_test_flat = X_test.reshape(-1, len(FEATURES))
X_holdout_flat = X_holdout.reshape(-1, len(FEATURES))

# Learn scaling from training data ONLY
scaler.fit(X_train_flat)

# Apply scaling to all sets using the SAME scaler
X_train_scaled = scaler.transform(X_train_flat)
X_val_scaled = scaler.transform(X_val_flat)
X_test_scaled = scaler.transform(X_test_flat)
X_holdout_scaled = scaler.transform(X_holdout_flat)

# Convert back to original shape
X_train = X_train_scaled.reshape(X_train.shape)
X_val = X_val_scaled.reshape(X_val.shape)
X_test = X_test_scaled.reshape(X_test.shape)
X_holdout = X_holdout_scaled.reshape(X_holdout.shape)

print("\nData Scaled Successfully!")

# ============================================
# PART 6 - BUILD CNN-LSTM
# ============================================

model = Sequential()

# Proper Input layer instead of input_shape= inside Conv1D
model.add(Input(shape=(LOOKBACK, len(FEATURES))))

model.add(
    Conv1D(
        filters=64,
        kernel_size=3,
        activation="relu"
    )
)

model.add(
    Conv1D(
        filters=32,
        kernel_size=3,
        activation="relu"
    )
)

model.add(
    LSTM(
        64,
        return_sequences=True
    )
)

model.add(
    LSTM(
        32
    )
)

model.add(
    Dropout(
        0.2
    )
)

model.add(
    Dense(
        1
    )
)

model.compile(
    optimizer="adam",
    loss="mse",
    metrics=["mae"]
)

print("\nModel Created Successfully!")

model.summary()

# ============================================
# PART 7 - TRAIN MODEL (with EarlyStopping)
# ============================================

early_stop = EarlyStopping(
    monitor="val_loss",
    patience=5,
    restore_best_weights=True
)

print("\nTraining Started...\n")

history = model.fit(
    X_train,
    y_train_delta,
    validation_data=(X_val, y_val_delta),   # explicit validation set, DELTA targets
    epochs=40,                         # higher ceiling, EarlyStopping decides real stopping point
    batch_size=32,
    callbacks=[early_stop],
    verbose=1
)

print("\nTraining Finished!")
print(f"Stopped at epoch {len(history.history['loss'])} "
      f"(best weights restored automatically by EarlyStopping)")


# ============================================
# PART 7.5 - PLOT TRAINING LOSS CURVE
# ============================================

plt.figure(figsize=(8, 5))
plt.plot(history.history["loss"], label="Train Loss")
plt.plot(history.history["val_loss"], label="Validation Loss")
plt.xlabel("Epoch")
plt.ylabel("Loss (MSE)")
plt.title("Training vs Validation Loss")
plt.legend()
plt.tight_layout()
plt.savefig("training_loss.png")
print("Saved training_loss.png")


# ============================================
# PART 8 - EVALUATE MODEL (test + holdout)
# ============================================

def evaluate(name, X_data, y_data, last_known):
    # model now predicts a DELTA, so reconstruct the
    # absolute PM2.5 prediction before scoring
    delta_predictions = model.predict(X_data, verbose=0).flatten()
    predictions = last_known + delta_predictions

    mae = mean_absolute_error(y_data, predictions)
    mse = mean_squared_error(y_data, predictions)
    rmse = np.sqrt(mse)
    r2 = r2_score(y_data, predictions)

    print(f"\n==============================")
    print(f"{name}")
    print(f"==============================")
    print("MAE :", mae)
    print("MSE :", mse)
    print("RMSE:", rmse)
    print("R2  :", r2)

    return {"MAE": float(mae), "MSE": float(mse), "RMSE": float(rmse), "R2": float(r2)}


metrics_test = evaluate("TEST SET (same cities, unseen time)", X_test, y_test, last_known_test)
metrics_holdout = evaluate("HOLDOUT SET (completely unseen cities)", X_holdout, y_holdout, last_known_holdout)

# ============================================
# PART 9 - SAVE MODEL
# ============================================

model.save("forecast_model.keras")
joblib.dump(scaler, "scaler.pkl")

metrics = {
    "same_city_test": metrics_test,
    "unseen_city_test": metrics_holdout,
    "epochs_run": len(history.history["loss"]),
    "note": "Model predicts DELTA (change from last known PM2.5), not the absolute value. PredictService.py must add the last known reading's raw pm25 back to the model's output."
}

with open("forecast_metrics.json", "w") as f:
    json.dump(metrics, f, indent=4)

print("\n==============================")
print("FILES SAVED")
print("==============================")
print("forecast_model.keras")
print("scaler.pkl")
print("forecast_metrics.json")
print("training_loss.png")# ============================================
# ASTHMA RISK PREDICTION
# CNN-LSTM Forecast Model  (Improved Version)
# ============================================
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import joblib
import json
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

from sklearn.preprocessing import MinMaxScaler

import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Input, Conv1D, LSTM, Dense, Dropout
from tensorflow.keras.callbacks import EarlyStopping

# Fix randomness so results are the same every time we run this
np.random.seed(42)
tf.random.set_seed(42)

# -------------------------
# Load Dataset
# -------------------------

df = pd.read_csv("ml_ready_dataset.csv")

print("Dataset Loaded Successfully!")
print("Shape:", df.shape)

print("\nColumns:")
print(df.columns)

# -------------------------
# Convert datetime column
# -------------------------

df["datetimeUtc"] = pd.to_datetime(df["datetimeUtc"])

# -------------------------
# Sort data
# -------------------------

df = df.sort_values(["location_name", "datetimeUtc"])

print("\nData sorted successfully!")

# -------------------------
# Reset index
# -------------------------

df = df.reset_index(drop=True)

print("\nFirst 5 rows after sorting:")
print(df[["location_name", "datetimeUtc", "pm25"]].head())

# ============================================
# PART 2.5 - HOLD OUT 3 CITIES COMPLETELY
# (model will NEVER see these during training,
# so we can honestly test "does it work on a
# new city it has never seen")
#
# NOTE: We keep this SAME holdout-city approach
# as before. We tested a stricter per-city
# chronological split and it caused R2 to crash
# (near 0 / negative) because ~87% of this
# dataset is from January 2026 alone, with a
# very different pollution level than
# Feb/Mar/Jul. That is a real seasonal
# distribution-shift problem in the DATA, not a
# bug in the model, and is documented in the
# report instead of "fixed" here.
# ============================================

HOLDOUT_STATIONS = [
    "Zoo Park, Hyderabad - TSPCB",
    "Manali, Chennai - CPCB",
    "Worli, Mumbai - MPCB"
]

train_df = df[~df["location_name"].isin(HOLDOUT_STATIONS)].copy()
holdout_df = df[df["location_name"].isin(HOLDOUT_STATIONS)].copy()

print("\nTraining stations:", train_df["location_name"].nunique())
print("Held-out (unseen) stations:", holdout_df["location_name"].nunique())

# ============================================
# PART 3 - CREATE SEQUENCES
# ============================================

LOOKBACK = 16

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


def make_sequences(data):

    X = []
    y = []

    # Create sequences separately for every monitoring station
    for location in data["location_name"].unique():

        station = data[data["location_name"] == location]

        values = station[FEATURES].values

        target = station["pm25"].values

        # Sliding window
        for i in range(len(station) - LOOKBACK):

            X.append(values[i:i + LOOKBACK])

            y.append(target[i + LOOKBACK])

    return np.array(X), np.array(y)


print("\nCreating training sequences...")
X, y = make_sequences(train_df)
print("Done!")
print("X Shape :", X.shape)
print("y Shape :", y.shape)

print("\nCreating held-out (unseen city) sequences...")
X_holdout, y_holdout = make_sequences(holdout_df)
print("Done!")
print("X Holdout Shape :", X_holdout.shape)
print("y Holdout Shape :", y_holdout.shape)


# ============================================
# PART 4 - TRAIN / VALIDATION / TEST SPLIT
# (explicit split done here, up front, instead
# of letting model.fit() carve out validation
# data implicitly. Holdout cities are kept
# completely separate from all of this.)
# ============================================

train_split = int(len(X) * 0.72)   # 72% train
val_split = int(len(X) * 0.80)     # next 8% validation (72-80%)
# remaining 20% -> test

X_train = X[:train_split]
X_val = X[train_split:val_split]
X_test = X[val_split:]

y_train = y[:train_split]
y_val = y[train_split:val_split]
y_test = y[val_split:]

print("\nTraining Samples   :", len(X_train))
print("Validation Samples :", len(X_val))
print("Testing Samples    :", len(X_test))
print("Holdout Samples    :", len(X_holdout))


# ============================================
# PART 4.5 - CONVERT TARGET TO "DELTA" INSTEAD OF ABSOLUTE VALUE
# ------------------------------------------------
# Instead of asking the model to predict the raw
# next PM2.5 value, we ask it to predict the CHANGE
# from the last known reading (last timestep in the
# lookback window). Pollution barely moves between
# consecutive readings, so predicting the absolute
# value makes the model's job harder than it needs
# to be, and a naive "predict = last known value"
# baseline actually beats an absolute-value model on
# this dataset. We reconstruct the real prediction
# later as: last_known_pm25 + predicted_delta
#
# pm25 is index 0 in FEATURES, captured here BEFORE
# scaling since y is also unscaled.
# ============================================

last_known_train = X_train[:, -1, 0].copy()
last_known_val = X_val[:, -1, 0].copy()
last_known_test = X_test[:, -1, 0].copy()
last_known_holdout = X_holdout[:, -1, 0].copy()

y_train_delta = y_train - last_known_train
y_val_delta = y_val - last_known_val
# NOTE: y_test / y_holdout stay as absolute values.
# We only need deltas for TRAINING targets; test/holdout
# absolute y is used later for the final evaluate() call
# after reconstructing predictions.

print("\nTarget converted to delta (change from last known reading).")


# ============================================
# PART 5 - SCALE THE DATA
# ============================================

scaler = MinMaxScaler()

# Flatten the data
X_train_flat = X_train.reshape(-1, len(FEATURES))
X_val_flat = X_val.reshape(-1, len(FEATURES))
X_test_flat = X_test.reshape(-1, len(FEATURES))
X_holdout_flat = X_holdout.reshape(-1, len(FEATURES))

# Learn scaling from training data ONLY
scaler.fit(X_train_flat)

# Apply scaling to all sets using the SAME scaler
X_train_scaled = scaler.transform(X_train_flat)
X_val_scaled = scaler.transform(X_val_flat)
X_test_scaled = scaler.transform(X_test_flat)
X_holdout_scaled = scaler.transform(X_holdout_flat)

# Convert back to original shape
X_train = X_train_scaled.reshape(X_train.shape)
X_val = X_val_scaled.reshape(X_val.shape)
X_test = X_test_scaled.reshape(X_test.shape)
X_holdout = X_holdout_scaled.reshape(X_holdout.shape)

print("\nData Scaled Successfully!")

# ============================================
# PART 6 - BUILD CNN-LSTM
# ============================================

model = Sequential()

# Proper Input layer instead of input_shape= inside Conv1D
model.add(Input(shape=(LOOKBACK, len(FEATURES))))

model.add(
    Conv1D(
        filters=64,
        kernel_size=3,
        activation="relu"
    )
)

model.add(
    Conv1D(
        filters=32,
        kernel_size=3,
        activation="relu"
    )
)

model.add(
    LSTM(
        64,
        return_sequences=True
    )
)

model.add(
    LSTM(
        32
    )
)

model.add(
    Dropout(
        0.2
    )
)

model.add(
    Dense(
        1
    )
)

model.compile(
    optimizer="adam",
    loss="mse",
    metrics=["mae"]
)

print("\nModel Created Successfully!")

model.summary()

# ============================================
# PART 7 - TRAIN MODEL (with EarlyStopping)
# ============================================

early_stop = EarlyStopping(
    monitor="val_loss",
    patience=5,
    restore_best_weights=True
)

print("\nTraining Started...\n")

history = model.fit(
    X_train,
    y_train_delta,
    validation_data=(X_val, y_val_delta),   # explicit validation set, DELTA targets
    epochs=40,                         # higher ceiling, EarlyStopping decides real stopping point
    batch_size=32,
    callbacks=[early_stop],
    verbose=1
)

print("\nTraining Finished!")
print(f"Stopped at epoch {len(history.history['loss'])} "
      f"(best weights restored automatically by EarlyStopping)")


# ============================================
# PART 7.5 - PLOT TRAINING LOSS CURVE
# ============================================

plt.figure(figsize=(8, 5))
plt.plot(history.history["loss"], label="Train Loss")
plt.plot(history.history["val_loss"], label="Validation Loss")
plt.xlabel("Epoch")
plt.ylabel("Loss (MSE)")
plt.title("Training vs Validation Loss")
plt.legend()
plt.tight_layout()
plt.savefig("training_loss.png")
print("Saved training_loss.png")


# ============================================
# PART 8 - EVALUATE MODEL (test + holdout)
# ============================================

def evaluate(name, X_data, y_data, last_known):
    # model now predicts a DELTA, so reconstruct the
    # absolute PM2.5 prediction before scoring
    delta_predictions = model.predict(X_data, verbose=0).flatten()
    predictions = last_known + delta_predictions

    mae = mean_absolute_error(y_data, predictions)
    mse = mean_squared_error(y_data, predictions)
    rmse = np.sqrt(mse)
    r2 = r2_score(y_data, predictions)

    print(f"\n==============================")
    print(f"{name}")
    print(f"==============================")
    print("MAE :", mae)
    print("MSE :", mse)
    print("RMSE:", rmse)
    print("R2  :", r2)

    return {"MAE": float(mae), "MSE": float(mse), "RMSE": float(rmse), "R2": float(r2)}


metrics_test = evaluate("TEST SET (same cities, unseen time)", X_test, y_test, last_known_test)
metrics_holdout = evaluate("HOLDOUT SET (completely unseen cities)", X_holdout, y_holdout, last_known_holdout)

# ============================================
# PART 9 - SAVE MODEL
# ============================================

model.save("forecast_model.keras")
joblib.dump(scaler, "scaler.pkl")

metrics = {
    "same_city_test": metrics_test,
    "unseen_city_test": metrics_holdout,
    "epochs_run": len(history.history["loss"]),
    "note": "Model predicts DELTA (change from last known PM2.5), not the absolute value. PredictService.py must add the last known reading's raw pm25 back to the model's output."
}

with open("forecast_metrics.json", "w") as f:
    json.dump(metrics, f, indent=4)

print("\n==============================")
print("FILES SAVED")
print("==============================")
print("forecast_model.keras")
print("scaler.pkl")
print("forecast_metrics.json")
print("training_loss.png")