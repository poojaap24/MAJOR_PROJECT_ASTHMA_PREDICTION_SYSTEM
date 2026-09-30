import pandas as pd
import os
import glob

# Folder containing CSV files
folder_path = "."

# Get all CSV files
csv_files = glob.glob(os.path.join(folder_path, "*.csv"))

print(f"Found {len(csv_files)} CSV files.\n")

for file in csv_files:

    # Skip already cleaned files
    if os.path.basename(file).startswith("cleaned_"):
        continue

    print("=" * 50)
    print(f"Processing: {os.path.basename(file)}")

    # Load dataset
    df = pd.read_csv(file)

    print("Original Shape:", df.shape)

    # Missing values
    print("\nMissing Values:")
    print(df.isnull().sum())

    # Duplicate rows
    duplicates = df.duplicated().sum()
    print("\nDuplicate Rows:", duplicates)

    # Remove duplicates
    df = df.drop_duplicates()

    # Remove unnecessary columns
    columns_to_drop = [
        "location_id",
        "country_iso",
        "isMobile",
        "isMonitor",
        "owner_name",
        "provider"
    ]

    df = df.drop(columns=columns_to_drop, errors="ignore")

    # Convert datetime columns
    df["datetimeUtc"] = pd.to_datetime(df["datetimeUtc"])
    df["datetimeLocal"] = pd.to_datetime(df["datetimeLocal"])

    # Sort by datetime
    df = df.sort_values(by="datetimeUtc")

    # Show parameters found
    print("\nParameters Found:")
    print(df["parameter"].unique())

    # Save cleaned file
    output_file = "cleaned_" + os.path.basename(file)
    df.to_csv(output_file, index=False)

    print(f"\n✅ Saved: {output_file}")

print("\n" + "=" * 50)
print("🎉 ALL DATASETS CLEANED SUCCESSFULLY!")
print("=" * 50)