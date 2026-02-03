"""
Echo Stems Plugin - Audio Stem Separation API

Provides HTTP API for separating audio tracks into stems
(vocals, drums, bass, other) using Demucs.
"""

import os
import uuid
import asyncio
import logging
from pathlib import Path
from typing import Optional
from contextlib import asynccontextmanager

import torch
import torchaudio
from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration
DATA_DIR = Path(os.getenv("DATA_DIR", "/app/data"))
MODEL_NAME = os.getenv("DEMUCS_MODEL", "htdemucs")
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
PORT = int(os.getenv("PORT", 5000))

# Ensure directories exist
DATA_DIR.mkdir(parents=True, exist_ok=True)
(DATA_DIR / "input").mkdir(exist_ok=True)
(DATA_DIR / "output").mkdir(exist_ok=True)

# Global model reference
separator = None


class JobStatus(BaseModel):
    """Job status response."""
    job_id: str
    status: str  # pending, processing, completed, failed
    progress: Optional[float] = None
    error: Optional[str] = None
    stems: Optional[dict] = None


class SeparationRequest(BaseModel):
    """Separation request parameters."""
    model: str = "htdemucs"
    stems: list[str] = ["vocals", "drums", "bass", "other"]


# Job tracking
jobs: dict[str, JobStatus] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load model on startup."""
    global separator
    logger.info(f"Loading Demucs model '{MODEL_NAME}' on {DEVICE}...")

    try:
        from demucs.pretrained import get_model
        from demucs.apply import apply_model

        separator = get_model(MODEL_NAME)
        separator.to(DEVICE)
        separator.eval()
        logger.info(f"Model loaded successfully on {DEVICE}")
    except Exception as e:
        logger.error(f"Failed to load model: {e}")
        # Continue anyway - will fail on separation requests

    yield

    # Cleanup on shutdown
    logger.info("Shutting down stems plugin...")


app = FastAPI(
    title="Echo Stems Plugin",
    description="Audio stem separation API using Demucs",
    version="1.0.0",
    lifespan=lifespan
)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "model": MODEL_NAME,
        "device": DEVICE,
        "model_loaded": separator is not None
    }


@app.get("/info")
async def plugin_info():
    """Plugin information."""
    return {
        "name": "stems",
        "version": "1.0.0",
        "description": "Audio stem separation using Demucs",
        "model": MODEL_NAME,
        "device": DEVICE,
        "supported_stems": ["vocals", "drums", "bass", "other"],
        "supported_formats": ["wav", "mp3", "flac", "ogg"]
    }


async def process_separation(job_id: str, input_path: Path, output_dir: Path):
    """Process stem separation in background."""
    global separator

    try:
        jobs[job_id].status = "processing"
        jobs[job_id].progress = 0.0

        if separator is None:
            raise RuntimeError("Model not loaded")

        from demucs.apply import apply_model
        from demucs.audio import save_audio

        logger.info(f"[{job_id}] Loading audio from {input_path}")

        # Load audio
        waveform, sample_rate = torchaudio.load(str(input_path))

        # Resample to model's sample rate if needed (44100 Hz for htdemucs)
        if sample_rate != separator.samplerate:
            logger.info(f"[{job_id}] Resampling from {sample_rate} to {separator.samplerate}")
            resampler = torchaudio.transforms.Resample(sample_rate, separator.samplerate)
            waveform = resampler(waveform)

        # Ensure stereo
        if waveform.shape[0] == 1:
            waveform = waveform.repeat(2, 1)
        elif waveform.shape[0] > 2:
            waveform = waveform[:2]

        # Add batch dimension
        waveform = waveform.unsqueeze(0).to(DEVICE)

        jobs[job_id].progress = 0.2
        logger.info(f"[{job_id}] Running separation...")

        # Run separation
        with torch.no_grad():
            sources = apply_model(separator, waveform, device=DEVICE, progress=False)

        jobs[job_id].progress = 0.8
        logger.info(f"[{job_id}] Saving stems...")

        # Save stems
        output_dir.mkdir(parents=True, exist_ok=True)
        stems = {}

        for i, stem_name in enumerate(separator.sources):
            stem_path = output_dir / f"{stem_name}.wav"
            stem_audio = sources[0, i].cpu()
            torchaudio.save(str(stem_path), stem_audio, separator.samplerate)
            stems[stem_name] = str(stem_path)
            logger.info(f"[{job_id}] Saved {stem_name} to {stem_path}")

        # Cleanup input file
        input_path.unlink(missing_ok=True)

        jobs[job_id].status = "completed"
        jobs[job_id].progress = 1.0
        jobs[job_id].stems = stems

        logger.info(f"[{job_id}] Separation completed successfully")

    except Exception as e:
        logger.error(f"[{job_id}] Separation failed: {e}")
        jobs[job_id].status = "failed"
        jobs[job_id].error = str(e)


@app.post("/separate")
async def separate_audio(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
):
    """
    Upload audio file and start stem separation.
    Returns job ID to track progress.
    """
    if separator is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    # Generate job ID
    job_id = str(uuid.uuid4())

    # Save uploaded file
    input_dir = DATA_DIR / "input"
    input_path = input_dir / f"{job_id}_{file.filename}"

    try:
        content = await file.read()
        with open(input_path, "wb") as f:
            f.write(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {e}")

    # Create output directory for this job
    output_dir = DATA_DIR / "output" / job_id

    # Initialize job status
    jobs[job_id] = JobStatus(
        job_id=job_id,
        status="pending",
        progress=0.0
    )

    # Start background processing
    background_tasks.add_task(process_separation, job_id, input_path, output_dir)

    logger.info(f"Created job {job_id} for file {file.filename}")

    return {"job_id": job_id, "status": "pending"}


@app.get("/job/{job_id}")
async def get_job_status(job_id: str):
    """Get status of a separation job."""
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")

    return jobs[job_id]


@app.get("/job/{job_id}/stem/{stem_name}")
async def download_stem(job_id: str, stem_name: str):
    """Download a specific stem from a completed job."""
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")

    job = jobs[job_id]

    if job.status != "completed":
        raise HTTPException(status_code=400, detail=f"Job not completed: {job.status}")

    if not job.stems or stem_name not in job.stems:
        raise HTTPException(status_code=404, detail=f"Stem '{stem_name}' not found")

    stem_path = Path(job.stems[stem_name])

    if not stem_path.exists():
        raise HTTPException(status_code=404, detail="Stem file not found")

    return FileResponse(
        stem_path,
        media_type="audio/wav",
        filename=f"{stem_name}.wav"
    )


@app.delete("/job/{job_id}")
async def delete_job(job_id: str):
    """Delete a job and its output files."""
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")

    job = jobs[job_id]

    # Delete output directory
    output_dir = DATA_DIR / "output" / job_id
    if output_dir.exists():
        import shutil
        shutil.rmtree(output_dir)

    # Remove from jobs dict
    del jobs[job_id]

    return {"status": "deleted", "job_id": job_id}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT)
