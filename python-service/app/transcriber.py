
import os
import subprocess
import logging
from functools import lru_cache

import numpy as np
from faster_whisper import WhisperModel

logger = logging.getLogger("instagram-transcription")

SAMPLE_RATE = 16000


@lru_cache(maxsize=1)
def get_model():
    model_size = os.getenv("WHISPER_MODEL", "base")
    device = os.getenv("WHISPER_DEVICE", "cpu")
    compute_type = os.getenv(
        "WHISPER_COMPUTE_TYPE",
        "int8",
    )

    logger.info(
        "Loading Whisper model: %s | Device: %s",
        model_size,
        device,
    )

    model = WhisperModel(
        model_size,
        device=device,
        compute_type=compute_type,
    )

    logger.info("Whisper model loaded successfully")

    return model


def decode_audio(file_path: str) -> np.ndarray:
    """
    Decode media using FFmpeg and return a mono
    16 kHz float32 NumPy array.

    This bypasses faster-whisper's PyAV decoder.
    """

    command = [
        "ffmpeg",
        "-nostdin",
        "-hide_banner",
        "-loglevel",
        "error",
        "-i",
        file_path,
        "-vn",
        "-ac",
        "1",
        "-ar",
        str(SAMPLE_RATE),
        "-f",
        "f32le",
        "pipe:1",
    ]

    logger.info("Decoding audio with FFmpeg")

    try:
        process = subprocess.run(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=180,
            check=False,
        )

    except FileNotFoundError as error:
        raise RuntimeError(
            "FFmpeg is not installed or is not in PATH"
        ) from error

    except subprocess.TimeoutExpired as error:
        raise RuntimeError(
            "FFmpeg audio decoding timed out"
        ) from error

    if process.returncode != 0:
        details = process.stderr.decode(
            "utf-8",
            errors="replace",
        )

        raise RuntimeError(
            f"FFmpeg decoding failed: {details[:1000]}"
        )

    audio = np.frombuffer(
        process.stdout,
        dtype=np.float32,
    ).copy()

    if audio.size == 0:
        raise RuntimeError(
            "No audio was decoded from the uploaded file"
        )

    logger.info(
        "Audio decoded successfully | Duration: %.2f seconds",
        audio.size / SAMPLE_RATE,
    )

    return audio


def transcribe_file(file_path: str):
    logger.info("Starting transcription: %s", file_path)

    audio = decode_audio(file_path)

    model = get_model()

    # Pass decoded samples instead of a file path.
    # This avoids the incompatible av.open() call.
    segments, info = model.transcribe(
        audio,
        beam_size=5,
        vad_filter=True,
    )

    results = []

    for segment in segments:
        results.append({
            "start": round(segment.start, 2),
            "end": round(segment.end, 2),
            "text": segment.text.strip(),
        })

    transcript = " ".join(
        segment["text"] for segment in results
    ).strip()

    logger.info(
        "Transcription completed | Characters: %d",
        len(transcript),
    )

    return {
        "text": transcript,
        "language": info.language,
        "language_probability": info.language_probability,
        "duration": info.duration,
        "segments": results,
    }
