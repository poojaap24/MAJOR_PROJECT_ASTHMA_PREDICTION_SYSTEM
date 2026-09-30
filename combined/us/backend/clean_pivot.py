import pandas as pd

# Load pivot dataset
df = pd.read_csv("data/pivot_dataset.csv")

# Convert datetime
df["datetimeUtc"] = pd.to_datetime(df["datetimeUtc"])

# Sort
df = df.sort_values(["location_name", "datetimeUtc"])

# Fill missing values
df = df.ffill()
df = df.bfill()
df = df.fillna(0)

# SAVE THE FINAL DATASET
df.to_csv("data/ml_ready_dataset.csv", index=False)

print("✅ ML dataset ready")
print(df.shape)

print("\nMissing values after cleaning:")
print(df.isnull().sum())