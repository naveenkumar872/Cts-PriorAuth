"""
ML Model Training Script Entrypoint.
Runs multi-model classification pipeline for complexity prediction.
"""
import sys
from pathlib import Path

# Add ml directory to sys.path
sys.path.append(str(Path(__file__).parent))

from train_complexity_model import run_training_pipeline

if __name__ == '__main__':
    run_training_pipeline()
