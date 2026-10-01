@echo off
set PYTHONPATH=%cd%
set PYTHON=C:\Users\hp\AppData\Local\Programs\Python\Python313\python.exe

echo Running real pipeline...
"%PYTHON%" scripts/run_real_pipeline.py
pause
