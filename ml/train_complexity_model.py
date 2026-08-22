"""
Train Nurse Review Complexity Classifier.
Uses synthetic dataset to train multiple classification models:
- Logistic Regression (with StandardScaler)
- Random Forest Classifier
- XGBoost Classifier
- Gradient Boosting Classifier
- Decision Tree Classifier
"""
import sys
import pandas as pd
import numpy as np
import joblib
from pathlib import Path
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import make_pipeline
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
import xgboost as xgb

# Feature columns (13 total)
FEATURE_COLS = [
    'patient_age',
    'emergency_flag',
    'previous_treatment',
    'medical_necessity_doc',
    'clinical_documentation',
    'number_of_diagnoses',
    'number_of_procedures',
    'rule_conditions_met',
    'unknown_pathways',
    'risk_level',
    # Categorical features (one-hot encoded)
    'treatment_type_Diagnostic',
    'treatment_type_Surgical',
    'treatment_type_Therapeutic',
]

TARGET_COL = 'complexity_label'

# Label encoding
LABEL_MAP = {'low': 0, 'medium': 1, 'high': 2}
LABEL_MAP_INV = {0: 'low', 1: 'medium', 2: 'high'}


def load_and_prepare_data(csv_path: str):
    """Load CSV and prepare features."""
    print("Loading dataset...")
    df = pd.read_csv(csv_path)
    print(f"  Loaded {len(df)} samples")
    print(f"  Class distribution: {df[TARGET_COL].value_counts().to_dict()}")
    print()
    
    # One-hot encode treatment_type
    df = pd.get_dummies(df, columns=['treatment_type'], prefix='treatment_type')
    
    # Ensure all expected columns exist
    for col in ['treatment_type_Diagnostic', 'treatment_type_Surgical', 'treatment_type_Therapeutic']:
        if col not in df.columns:
            df[col] = 0
    
    # Prepare X and y
    X = df[FEATURE_COLS].copy()
    y = df[TARGET_COL].map(LABEL_MAP)
    
    print("Feature matrix shape:", X.shape)
    print("Feature columns:", X.columns.tolist())
    print()
    
    return X, y, df


def evaluate_and_print_metrics(model, model_name, X_train, y_train, X_test, y_test):
    """Helper to evaluate and print classification metrics."""
    print("=" * 70)
    print(f"Training {model_name}")
    print("=" * 70)
    
    model.fit(X_train, y_train)
    
    # Cross-validation score (3-fold for speed)
    cv_scores = cross_val_score(model, X_train, y_train, cv=3, scoring='accuracy', n_jobs=-1)
    print(f"Cross-validation accuracy: {cv_scores.mean():.3f} (+/- {cv_scores.std():.3f})")
    
    # Test set evaluation
    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    print(f"Test set accuracy: {accuracy:.3f}")
    print()
    
    print("Classification Report:")
    print(classification_report(y_test, y_pred, target_names=['low', 'medium', 'high']))
    
    print("Confusion Matrix:")
    cm = confusion_matrix(y_test, y_pred)
    print("              Predicted")
    print("              low  med  high")
    for i, label in enumerate(['low', 'medium', 'high']):
        print(f"Actual {label:6}  {cm[i][0]:3d}  {cm[i][1]:3d}  {cm[i][2]:3d}")
    print()
    
    return accuracy, y_pred


def train_logistic_regression(X_train, y_train, X_test, y_test):
    """Train Logistic Regression classifier with StandardScaler."""
    pipeline = make_pipeline(
        StandardScaler(),
        LogisticRegression(
            solver='lbfgs',
            max_iter=500,
            random_state=42,
            n_jobs=-1
        )
    )
    accuracy, _ = evaluate_and_print_metrics(pipeline, "Logistic Regression (with Scaling)", X_train, y_train, X_test, y_test)
    
    log_reg = pipeline.named_steps['logisticregression']
    importance_scores = np.mean(np.abs(log_reg.coef_), axis=0)
    feature_importance = pd.DataFrame({
        'feature': X_train.columns,
        'importance': importance_scores
    }).sort_values('importance', ascending=False)
    
    print("Top Important Features (Avg |Coef|):")
    print(feature_importance.head(10).to_string(index=False))
    print()
    
    return pipeline, accuracy, feature_importance


def train_decision_tree(X_train, y_train, X_test, y_test):
    """Train Decision Tree classifier."""
    model = DecisionTreeClassifier(
        max_depth=8,
        min_samples_split=10,
        min_samples_leaf=5,
        random_state=42
    )
    accuracy, _ = evaluate_and_print_metrics(model, "Decision Tree Classifier", X_train, y_train, X_test, y_test)
    
    feature_importance = pd.DataFrame({
        'feature': X_train.columns,
        'importance': model.feature_importances_
    }).sort_values('importance', ascending=False)
    
    print("Top 10 Most Important Features:")
    print(feature_importance.head(10).to_string(index=False))
    print()
    
    return model, accuracy, feature_importance


def train_random_forest(X_train, y_train, X_test, y_test):
    """Train Random Forest classifier."""
    model = RandomForestClassifier(
        n_estimators=50,
        max_depth=10,
        min_samples_split=10,
        min_samples_leaf=5,
        random_state=42,
        n_jobs=-1
    )
    accuracy, _ = evaluate_and_print_metrics(model, "Random Forest Classifier", X_train, y_train, X_test, y_test)
    
    feature_importance = pd.DataFrame({
        'feature': X_train.columns,
        'importance': model.feature_importances_
    }).sort_values('importance', ascending=False)
    
    print("Top 10 Most Important Features:")
    print(feature_importance.head(10).to_string(index=False))
    print()
    
    return model, accuracy, feature_importance


def train_gradient_boosting(X_train, y_train, X_test, y_test):
    """Train Gradient Boosting classifier."""
    model = GradientBoostingClassifier(
        n_estimators=30,
        max_depth=4,
        learning_rate=0.1,
        random_state=42
    )
    accuracy, _ = evaluate_and_print_metrics(model, "Gradient Boosting Classifier", X_train, y_train, X_test, y_test)
    
    feature_importance = pd.DataFrame({
        'feature': X_train.columns,
        'importance': model.feature_importances_
    }).sort_values('importance', ascending=False)
    
    print("Top 10 Most Important Features:")
    print(feature_importance.head(10).to_string(index=False))
    print()
    
    return model, accuracy, feature_importance


def train_xgboost(X_train, y_train, X_test, y_test):
    """Train XGBoost classifier."""
    model = xgb.XGBClassifier(
        objective='multi:softmax',
        num_class=3,
        n_estimators=50,
        max_depth=6,
        learning_rate=0.1,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42,
        n_jobs=-1
    )
    accuracy, _ = evaluate_and_print_metrics(model, "XGBoost Classifier", X_train, y_train, X_test, y_test)
    
    feature_importance = pd.DataFrame({
        'feature': X_train.columns,
        'importance': model.feature_importances_
    }).sort_values('importance', ascending=False)
    
    print("Top 10 Most Important Features:")
    print(feature_importance.head(10).to_string(index=False))
    print()
    
    return model, accuracy, feature_importance


def save_models(trained_models: dict, best_model_name: str, feature_cols: list):
    """Save trained models to disk."""
    models_dir = Path('ml/models')
    models_dir.mkdir(exist_ok=True, parents=True)
    
    file_map = {
        'LogisticRegression': 'logistic_regression_complexity.pkl',
        'DecisionTree': 'decision_tree_complexity.pkl',
        'RandomForest': 'random_forest_complexity.pkl',
        'GradientBoosting': 'gradient_boosting_complexity.pkl',
        'XGBoost': 'xgboost_complexity.pkl',
    }
    
    for name, model in trained_models.items():
        fname = file_map.get(name, f"{name.lower()}_complexity.pkl")
        joblib.dump(model, models_dir / fname)
        print(f"  - Saved {models_dir / fname}")

    joblib.dump(LABEL_MAP, models_dir / 'label_map.pkl')
    joblib.dump(feature_cols, models_dir / 'feature_columns.pkl')
    
    best_model = trained_models[best_model_name]
    joblib.dump(best_model, models_dir / 'best_model.pkl')
    print(f"  - Saved best model: {models_dir / 'best_model.pkl'} ({best_model_name})")
    print("=" * 70)


def run_training_pipeline():
    """Main training routine."""
    print()
    print("=" * 70)
    print("Nurse Review Complexity Classifier -- Multi-Model Training Pipeline")
    print("=" * 70)
    print()
    
    csv_path = 'ml/synthetic_nurse_review_dataset.csv'
    if not Path(csv_path).exists():
        print(f"ERROR: Dataset not found at {csv_path}")
        print("Run generate_synthetic_dataset.py first")
        sys.exit(1)
    
    X, y, df = load_and_prepare_data(csv_path)
    
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    print(f"Train set: {len(X_train)} samples")
    print(f"Test set:  {len(X_test)} samples")
    print()
    
    trained_models = {}
    accuracies = {}
    
    # 1. Logistic Regression
    log_reg_model, log_reg_acc, _ = train_logistic_regression(X_train, y_train, X_test, y_test)
    trained_models['LogisticRegression'] = log_reg_model
    accuracies['LogisticRegression'] = log_reg_acc

    # 2. Decision Tree
    dt_model, dt_acc, _ = train_decision_tree(X_train, y_train, X_test, y_test)
    trained_models['DecisionTree'] = dt_model
    accuracies['DecisionTree'] = dt_acc
    
    # 3. Random Forest
    rf_model, rf_acc, _ = train_random_forest(X_train, y_train, X_test, y_test)
    trained_models['RandomForest'] = rf_model
    accuracies['RandomForest'] = rf_acc
    
    # 4. Gradient Boosting
    gb_model, gb_acc, _ = train_gradient_boosting(X_train, y_train, X_test, y_test)
    trained_models['GradientBoosting'] = gb_model
    accuracies['GradientBoosting'] = gb_acc

    # 5. XGBoost
    xgb_model, xgb_acc, _ = train_xgboost(X_train, y_train, X_test, y_test)
    trained_models['XGBoost'] = xgb_model
    accuracies['XGBoost'] = xgb_acc
    
    print("=" * 70)
    print("Model Comparison Summary")
    print("=" * 70)
    for model_name, acc in sorted(accuracies.items(), key=lambda x: x[1], reverse=True):
        print(f"  - {model_name:22}: Accuracy = {acc:.4f}")
    print()
    
    best_model_name = max(accuracies, key=accuracies.get)
    best_accuracy = accuracies[best_model_name]
    print(f"[BEST] Best overall model: {best_model_name} (accuracy: {best_accuracy:.4f})")
    print()
    
    save_models(trained_models, best_model_name, FEATURE_COLS)
    
    print()
    print("=" * 70)
    print("Training complete!")
    print("=" * 70)


if __name__ == '__main__':
    run_training_pipeline()
