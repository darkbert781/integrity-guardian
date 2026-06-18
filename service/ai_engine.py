import pandas as pd
from sklearn.ensemble import IsolationForest
import pickle
import logging
import os
from typing import Dict, Any, Tuple

logger = logging.getLogger(__name__)

class AIEngine:
    def __init__(self, model_path: str = "ai_model.pkl"):
        self.model_path = model_path
        self.model = None
        self._load_model()
        
    def _load_model(self):
        if os.path.exists(self.model_path):
            try:
                with open(self.model_path, 'rb') as f:
                    self.model = pickle.load(f)
                logger.info("AI Model loaded successfully.")
            except Exception as e:
                logger.error(f"Failed to load AI model: {e}")
                self.model = None

    def train(self, events_df: pd.DataFrame):
        """Trains Isolation Forest on feature columns."""
        features = ['hour_of_day', 'day_of_week', 'events_per_minute', 
                    'process_entropy', 'extension_is_executable', 
                    'extension_is_encrypted', 'path_depth', 'is_system_path']
                    
        # Check if df has the right features, else fill with 0
        for f in features:
            if f not in events_df.columns:
                events_df[f] = 0
                
        X = events_df[features]
        
        self.model = IsolationForest(n_estimators=100, contamination=0.01, random_state=42)
        self.model.fit(X)
        
        with open(self.model_path, 'wb') as f:
            pickle.dump(self.model, f)
            
        logger.info("AI Model trained and saved.")

    def _extract_features(self, event: Dict[str, Any]) -> pd.DataFrame:
        file_path = event.get('file_path', '')
        ext = os.path.splitext(file_path)[1].lower()
        
        return pd.DataFrame([{
            'hour_of_day': 12,
            'day_of_week': 3,
            'events_per_minute': 1,
            'process_entropy': 0.5,
            'extension_is_executable': 1 if ext in ['.exe', '.dll', '.sys'] else 0,
            'extension_is_encrypted': 1 if ext in ['.locked', '.encrypted', '.cry', '.ransom', '.enc'] else 0,
            'path_depth': len(file_path.split(os.sep)),
            'is_system_path': 1 if 'system32' in file_path.lower() else 0
        }])

    def classify(self, event: Dict[str, Any]) -> Tuple[str, float]:
        """Returns (Label, confidence_score)"""
        file_path = event.get('file_path', '')
        ext = os.path.splitext(file_path)[1].lower()
        process_name = event.get('process_name', '').lower()
        
        if ext in ['.locked', '.encrypted', '.cry', '.ransom', '.enc']:
            return ('CRITICAL', 1.0)
            
        if process_name == 'vssadmin.exe':
            return ('CRITICAL', 1.0)
            
        if self.model is None:
            return ('BENIGN', 0.0)
            
        features = self._extract_features(event)
        
        try:
            score = self.model.score_samples(features)[0]
            confidence = abs(score)
            
            if score < -0.5:
                return ('SUSPICIOUS', confidence)
            return ('BENIGN', confidence)
        except Exception as e:
            logger.error(f"Error classifying event: {e}")
            return ('BENIGN', 0.0)
