import pandas as pd
import glob
import os

# Find all cleaned CSV files
files = glob.glob("cleaned_*.csv")

print(f"Found {len(files)} cleaned files.\n")

all_data = []

for file in files:
    print("Reading:", file)

    df = pd.read_csv(file)

    # Keep track of source file
    df["source_file"] = os.path.basename(file)

    all_data.append(df)

# Merge everything
master_df = pd.concat(all_data, ignore_index=True)

# Save
master_df.to_csv("data/master_dataset.csv", index=False)

print("\n===================================")
print("MASTER DATASET CREATED SUCCESSFULLY!")
print("===================================")
print("\nShape:", master_df.shape)
print("\nColumns:")
print(master_df.columns)