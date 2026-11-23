"""Transkripsi opsional dengan faster-whisper.

VRAM di server dipakai vLLM (~29 GB), jadi model dimuat HANYA saat dibutuhkan lalu dilepas lagi.
Mode 'auto': pakai GPU jika VRAM kosong >= WHISPER_MIN_FREE_MB, selain itu CPU (int8).
"""
import gc
import subprocess

from .config import Cfg


def gpu_free_mb():
    try:
        out = subprocess.run(["nvidia-smi", "--query-gpu=memory.free", "--format=csv,noheader,nounits"],
                             capture_output=True, text=True, timeout=10).stdout.strip().splitlines()
        return int(out[0]) if out else 0
    except Exception:
        return 0


def available():
    if Cfg.WHISPER_MODE == "off":
        return False
    try:
        import faster_whisper  # noqa: F401
        return True
    except Exception:
        return False


def _pcm16k(path):
    """Decode ke mono 16 kHz float32 lewat ffmpeg.

    Dekoder bawaan faster-whisper memakai PyAV dengan opsi yang tidak selalu ada di
    versi terpasang (mis. `metadata_errors`), jadi audio disiapkan sendiri.
    """
    out = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-f", "f32le", "-ac", "1", "-ar", "16000", "-"],
                         capture_output=True, check=True).stdout
    import numpy as np
    return np.frombuffer(out, dtype=np.float32)


def transcribe(path, log=print, prompt=None):
    """Kembalikan list kata: [{'word','start','end'}] atau None bila tidak tersedia/gagal."""
    if not available():
        return None
    from faster_whisper import WhisperModel

    try:
        audio = _pcm16k(path)
    except Exception as e:
        log(f"Gagal decode audio untuk Whisper: {e}")
        return None

    plans = []
    if Cfg.WHISPER_MODE in ("auto", "cuda"):
        free = gpu_free_mb()
        if Cfg.WHISPER_MODE == "cuda" or free >= Cfg.WHISPER_MIN_FREE_MB:
            plans.append(("cuda", "int8_float16"))
        else:
            log(f"VRAM kosong {free} MB < {Cfg.WHISPER_MIN_FREE_MB} MB, Whisper pakai CPU")
    plans.append(("cpu", "int8"))

    for device, ctype in plans:
        model = None
        try:
            log(f"Whisper {Cfg.WHISPER_MODEL} di {device} ({ctype})")
            model = WhisperModel(Cfg.WHISPER_MODEL, device=device, compute_type=ctype,
                                 cpu_threads=Cfg.WHISPER_CPU_THREADS, download_root=str(Cfg.MODELS_DIR))
            segs, _ = model.transcribe(audio, language="id", word_timestamps=True, beam_size=5,
                                       vad_filter=False, condition_on_previous_text=False)
            words = []
            for s in segs:
                for w in (s.words or []):
                    words.append({"word": w.word, "start": round(w.start, 3), "end": round(w.end, 3)})
            return words
        except Exception as e:  # OOM, arsitektur GPU belum didukung, dll -> coba CPU
            log(f"Whisper gagal di {device}: {e}")
        finally:
            del model
            gc.collect()
    return None
