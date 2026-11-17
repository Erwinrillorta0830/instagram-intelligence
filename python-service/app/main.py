
import os
import hmac
import logging
import tempfile
import traceback
from pathlib import Path

from dotenv import load_dotenv
from fastapi import (
    FastAPI,
    File,
    HTTPException,
    UploadFile,
    Depends,
)
from fastapi.security import APIKeyHeader
from starlette.concurrency import run_in_threadpool

from app.transcriber import transcribe_file


# ============================================================
# ENVIRONMENT CONFIGURATION
# ============================================================

load_dotenv()

MAX_FILE_SIZE = 25 * 1024 * 1024

ALLOWED_EXTENSIONS = {
    ".mp3",
    ".mp4",
    ".m4a",
    ".wav",
    ".webm",
    ".ogg",
}

WHISPER_MODEL = os.getenv("WHISPER_MODEL", "base")


# ============================================================
# LOGGING CONFIGURATION
# ============================================================

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
)

logger = logging.getLogger("instagram-transcription")


# ============================================================
# FASTAPI APPLICATION
# ============================================================

app = FastAPI(
    title="Instagram Intelligence Transcription",
    description="Local AI transcription powered by faster-whisper",
    version="1.1.0",
)


# ============================================================
# API KEY AUTHENTICATION
# ============================================================

api_key_header = APIKeyHeader(
    name="X-Internal-API-Key",
    auto_error=False,
)


def verify_key(
    key: str | None = Depends(api_key_header),
):
    expected = os.getenv("TRANSCRIPTION_API_KEY")

    if (
        not expected
        or not key
        or not hmac.compare_digest(key, expected)
    ):
        logger.warning("Unauthorized transcription request")

        raise HTTPException(
            status_code=401,
            detail="Unauthorized",
        )


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/")
def root():
    return {
        "service": "Instagram Intelligence Transcription",
        "status": "running",
        "engine": "faster-whisper",
        "model": WHISPER_MODEL,
        "documentation": "/docs",
    }


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "faster-whisper",
        "model": WHISPER_MODEL,
    }


# ============================================================
# TRANSCRIPTION ENDPOINT
# ============================================================

@app.post(
    "/transcribe",
    dependencies=[Depends(verify_key)],
)
async def transcribe(
    file: UploadFile = File(...),
):
    temp_path = None

    filename = Path(file.filename or "").name
    extension = Path(filename).suffix.lower()

    logger.info(
        "New transcription request | File: %s",
        filename,
    )

    # --------------------------------------------------------
    # VALIDATE FILE EXTENSION
    # --------------------------------------------------------

    if extension not in ALLOWED_EXTENSIONS:
        logger.warning(
            "Unsupported file extension: %s",
            extension,
        )

        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file extension: {extension}",
        )

    try:
        # ----------------------------------------------------
        # SAVE UPLOADED FILE TEMPORARILY
        # ----------------------------------------------------

        total_size = 0

        with tempfile.NamedTemporaryFile(
            suffix=extension,
            delete=False,
        ) as temp:

            temp_path = temp.name

            while True:
                chunk = await file.read(1024 * 1024)

                if not chunk:
                    break

                total_size += len(chunk)

                if total_size > MAX_FILE_SIZE:
                    logger.warning(
                        "File exceeded maximum size: %s",
                        filename,
                    )

                    raise HTTPException(
                        status_code=413,
                        detail="File exceeds 25 MB limit",
                    )

                temp.write(chunk)

        if total_size == 0:
            raise HTTPException(
                status_code=400,
                detail="Uploaded file is empty",
            )

        logger.info(
            "File saved | Size: %.2f MB",
            total_size / (1024 * 1024),
        )

        # ----------------------------------------------------
        # RUN FASTER-WHISPER
        # ----------------------------------------------------

        logger.info(
            "Starting transcription | Model: %s",
            WHISPER_MODEL,
        )

        result = await run_in_threadpool(
            transcribe_file,
            temp_path,
        )

        transcript = result.get("text", "")

        logger.info(
            "Transcription completed | Characters: %s",
            len(transcript),
        )

        # ----------------------------------------------------
        # RETURN RESULT
        # ----------------------------------------------------

        return {
            "success": True,
            "model": WHISPER_MODEL,
            "filename": filename,
            "file_size_bytes": total_size,
            **result,
        }

    # --------------------------------------------------------
    # HANDLE VALIDATION ERRORS
    # --------------------------------------------------------

    except HTTPException:
        raise

    # --------------------------------------------------------
    # HANDLE TRANSCRIPTION ERRORS
    # --------------------------------------------------------

    except Exception as error:

        logger.error(
            "WHISPER TRANSCRIPTION FAILED: %s",
            str(error),
        )

        logger.error(
            "FULL TRACEBACK:\n%s",
            traceback.format_exc(),
        )

        raise HTTPException(
            status_code=500,
            detail="Transcription failed. Check FastAPI server logs.",
        ) from error

    # --------------------------------------------------------
    # CLEAN UP TEMPORARY FILES
    # --------------------------------------------------------

    finally:
        await file.close()

        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)

                logger.info(
                    "Temporary file deleted successfully"
                )

            except OSError as cleanup_error:
                logger.warning(
                    "Unable to delete temporary file: %s",
                    cleanup_error,
                )
