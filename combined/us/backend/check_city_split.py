import pandas as pd

LOOKBACK = 16

df = pd.read_csv("ml_ready_dataset.csv")
df["datetimeUtc"] = pd.to_datetime(df["datetimeUtc"])

for city, g in df.groupby("location_name"):
    n = len(g)

    train = int(n*0.8)
    val = int(n*0.1)
    test = n-train-val

    train_seq = max(0, train-LOOKBACK)
    val_seq = max(0, val-LOOKBACK)
    test_seq = max(0, test-LOOKBACK)

    print(f"{city}")
    print(f"Rows : {n}")
    print(f"Train rows : {train} -> sequences {train_seq}")
    print(f"Val rows   : {val} -> sequences {val_seq}")
    print(f"Test rows  : {test} -> sequences {test_seq}")
    print("-"*40)