import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

DATA_PATH = "synthetic_nurse_review_dataset.csv"

df = pd.read_csv(DATA_PATH)


numerical_features = [
    "Patient_Age",
    "Missing_Information",
    "Number_of_Diagnoses",
    "Number_of_Procedures",
    "Rule_Conditions_Met",
    "Rule_Conflicts",
    "Previous_Requests",
]

categorical_features = [
    "Diagnosis_Code",
    "Procedure_Code",
    "Treatment_Type",
    "Emergency_Flag",
    "Previous_Treatment",
    "Medical_Necessity_Doc",
    "Clinical_Documentation",
]

# Processing_Time included ONLY to visually confirm the leakage finding.
# It is NOT used as a training feature in train_model.py.
extra_leakage_check = ["Processing_Time"] if "Processing_Time" in df.columns else []

# ============================================================
# 3. ENCODE TARGET AS ORDERED NUMBER (for correlation only)
# ============================================================
complexity_order = {"Low": 0, "Medium": 1, "High": 2}
df["Complexity_Level_Numeric"] = df["Complexity_Level"].map(complexity_order)

# ============================================================
# 4. ONE-HOT ENCODE CATEGORICAL FEATURES
# ============================================================
categorical_encoded = pd.get_dummies(
    df[categorical_features],
    prefix=categorical_features,
)

# ============================================================
# 5. COMBINE EVERYTHING INTO ONE DATAFRAME
# ============================================================
corr_df = pd.concat(
    [
        df[numerical_features + extra_leakage_check],
        categorical_encoded,
        df["Complexity_Level_Numeric"],
    ],
    axis=1,
)

print(f"Total columns going into correlation (numeric + one-hot categorical + target): "
      f"{corr_df.shape[1]}")

# ============================================================
# 6. COMPUTE CORRELATION MATRIX
# ============================================================
corr_matrix = corr_df.corr()

# ============================================================
# 7A. FULL HEATMAP - every feature vs every feature
# ============================================================
plt.figure(figsize=(max(14, corr_matrix.shape[1] * 0.45), max(12, corr_matrix.shape[0] * 0.4)))
sns.heatmap(
    corr_matrix,
    annot=False,          # too many columns to annotate individual numbers
    cmap="coolwarm",
    center=0,
    linewidths=0.3,
    cbar_kws={"label": "Correlation coefficient"},
)
plt.title("Correlation Heatmap - All Features (numeric + one-hot categorical) vs Complexity_Level")
plt.tight_layout()
plt.savefig("correlation_heatmap_full.png", dpi=150)
print("Saved: correlation_heatmap_full.png")

# ============================================================
# 7B. SORTED BAR CHART - correlation of every feature with the target
# ============================================================
target_corr = corr_matrix["Complexity_Level_Numeric"].drop("Complexity_Level_Numeric")
target_corr_sorted = target_corr.sort_values()

plt.figure(figsize=(10, max(8, len(target_corr_sorted) * 0.28)))
colors = ["#d62728" if v < 0 else "#1f77b4" for v in target_corr_sorted.values]
plt.barh(target_corr_sorted.index, target_corr_sorted.values, color=colors)
plt.axvline(0, color="black", linewidth=0.8)
plt.xlabel("Correlation with Complexity_Level")
plt.title("Every Feature's Correlation with Complexity_Level (sorted)")
plt.tight_layout()
plt.savefig("correlation_with_target.png", dpi=150)
print("Saved: correlation_with_target.png")

print("\nTop 15 features most correlated with Complexity_Level (by absolute value):")
print(target_corr.abs().sort_values(ascending=False).head(15).round(3))

plt.show()
