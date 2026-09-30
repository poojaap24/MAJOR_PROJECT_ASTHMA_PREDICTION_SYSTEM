import pandas as pd

# Load master dataset
df = pd.read_csv("data/master_dataset.csv")

# Convert datetime
df["datetimeUtc"] = pd.to_datetime(df["datetimeUtc"])

# Pivot (Long → Wide)
pivot_df = df.pivot_table(
    index=[
        "datetimeUtc",
        "location_name",
        "latitude",
        "longitude"
    ],
    columns="parameter",
    values="value",
    aggfunc="first"
).reset_index()

# Remove column name
pivot_df.columns.name = None

# Sort
pivot_df = pivot_df.sort_values(
    ["location_name", "datetimeUtc"]
)

# Save
pivot_df.to_csv("data/pivot_dataset.csv", index=False)

print("✅ Pivot completed!")
print("Shape:", pivot_df.shape)
print(pivot_df.head())