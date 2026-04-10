import pandas as pd
import random


input_file = "US_Crime_DataSet.csv" 
output_file = "US_Crime_DataSet_small.csv" 
sample_size = 1500  


df = pd.read_csv(input_file)


if sample_size > len(df):
    print(f"Sample size ({sample_size}) larger than dataset size ({len(df)}). Using full dataset.")
    df_sampled = df
else:
    df_sampled = df.sample(n=sample_size, random_state=42)  


df_sampled.to_csv(output_file, index=False)

print(f"Smaller dataset saved to {output_file}, {len(df_sampled)} rows.")