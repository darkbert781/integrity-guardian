import os
import pandas as pd
import pytest
from service.ai_engine import AIEngine

def test_ai_engine_train_and_classify():
    model_path = "test_ai_model.pkl"
    try:
        engine = AIEngine(model_path=model_path)
        
        # 1. Train model on dummy normal events
        df = pd.DataFrame([
            {'hour_of_day': 12, 'day_of_week': 2, 'events_per_minute': 1, 'process_entropy': 0.1, 'extension_is_executable': 0, 'extension_is_encrypted': 0, 'path_depth': 4, 'is_system_path': 0},
            {'hour_of_day': 14, 'day_of_week': 2, 'events_per_minute': 2, 'process_entropy': 0.2, 'extension_is_executable': 0, 'extension_is_encrypted': 0, 'path_depth': 4, 'is_system_path': 0},
        ] * 50) # Repeat to give IsolationForest enough samples
        
        engine.train(df)
        
        assert os.path.exists(model_path)
        
        # 2. Test classify benign
        benign_event = {'file_path': 'C:\\temp\\log.txt', 'process_name': 'notepad.exe'}
        label, score = engine.classify(benign_event)
        assert label in ['BENIGN', 'SUSPICIOUS']
        
        # 3. Test classify critical (rule-based)
        critical_event = {'file_path': 'C:\\temp\\document.locked', 'process_name': 'unknown.exe'}
        label, score = engine.classify(critical_event)
        assert label == 'CRITICAL'
        assert score == 1.0
        
        vss_event = {'file_path': 'C:\\temp\\a.txt', 'process_name': 'vssadmin.exe'}
        label, score = engine.classify(vss_event)
        assert label == 'CRITICAL'
        
    finally:
        if os.path.exists(model_path):
            os.remove(model_path)
