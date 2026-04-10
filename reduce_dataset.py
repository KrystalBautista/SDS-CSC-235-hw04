
import pandas as pd


file_path = "US_Crime_DataSet.csv"  
rows_to_keep = 1000


df = pd.read_csv(file_path)


if rows_to_keep >= len(df):
    print(f"CSV has only {len(df)} rows, keeping all of them.")
    df_small = df
else:
    df_small = df.sample(n=rows_to_keep, random_state=42)


df_small.to_csv(file_path, index=False)

print(f"Original CSV overwritten with {len(df_small)} rows.")