"""
Ultra-minimal test app. Zero imports beyond fastapi.
If THIS doesn't work on LeapCell, the issue is with LeapCell/uvicorn itself.
"""
from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def root():
    return {"status": "ok", "message": "minimal app works"}

@app.get("/api/health")
def health():
    return {"status": "ok"}

@app.get("/api/debug")
def debug():
    import os, sys
    return {
        "status": "minimal_mode",
        "cwd": os.getcwd(),
        "python": sys.version,
        "files": sorted(os.listdir("."))[:20],
        "pythonpath_env": os.environ.get("PYTHONPATH", "not set"),
    }
