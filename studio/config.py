"""Konfigurasi dari file .env (tanpa dependensi tambahan)."""
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def _load_env(path: Path):
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        k, v = k.strip(), v.strip().strip('"').strip("'")
        os.environ.setdefault(k, v)


_load_env(ROOT / ".env")


def _b(name, default):
    return os.environ.get(name, str(default)).strip().lower() in ("1", "true", "yes", "on", "ya")


def _i(name, default):
    try:
        return int(os.environ.get(name, default))
    except ValueError:
        return default


def _f(name, default):
    try:
        return float(os.environ.get(name, default))
    except ValueError:
        return default


class Cfg:
    DATA_DIR = Path(os.environ.get("DATA_DIR", str(ROOT / "data")))
    JOBS_DIR = DATA_DIR / "jobs"
    MODELS_DIR = DATA_DIR / "models"
    ENGINE_DIR = ROOT / "engine"
    STYLES_DIR = ROOT / "styles"
    SFX_DIR = ROOT / "sfx"

    # Telegram
    TG_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
    TG_ALLOWED = {s.strip() for s in os.environ.get("TELEGRAM_ALLOWED_USERS", "").split(",") if s.strip()}
    TG_API = os.environ.get("TELEGRAM_API_URL", "https://api.telegram.org").rstrip("/")
    TG_LOCAL = _b("TELEGRAM_LOCAL_API", False)

    # LLM (vLLM yang SUDAH berjalan, OpenAI-compatible)
    LLM_ENABLED = _b("LLM_ENABLED", True)
    LLM_BASE_URL = os.environ.get("LLM_BASE_URL", "http://127.0.0.1:8000/v1").rstrip("/")
    LLM_MODEL = os.environ.get("LLM_MODEL", "QuantTrio/gemma-4-31B-it-AWQ")
    LLM_API_KEY = os.environ.get("LLM_API_KEY", "EMPTY")
    LLM_TIMEOUT = _i("LLM_TIMEOUT", 240)
    LLM_CONTEXT = _i("LLM_CONTEXT", 8192)  # samakan dengan --max-model-len vLLM
    LLM_TEMPERATURE = _f("LLM_TEMPERATURE", 0.4)
    LLM_MAX_TOKENS = _i("LLM_MAX_TOKENS", 4000)
    LLM_DISABLE_THINKING = _b("LLM_DISABLE_THINKING", True)
    # OpenAI-compatible gateway (termasuk Combo GG). Tidak dikirim ke vLLM lokal.
    LLM_REASONING_EFFORT = os.environ.get("LLM_REASONING_EFFORT", "high").strip().lower()
    LLM_REASONING_TOKENS = _i("LLM_REASONING_TOKENS", 8000)

    # Whisper
    WHISPER_MODE = os.environ.get("WHISPER_MODE", "auto").lower()  # auto | cuda | cpu | off
    WHISPER_MODEL = os.environ.get("WHISPER_MODEL", "large-v3-turbo")
    WHISPER_MIN_FREE_MB = _i("WHISPER_MIN_FREE_MB", 2600)
    WHISPER_CPU_THREADS = _i("WHISPER_CPU_THREADS", 8)
    WHISPER_WHEN_SCRIPT = _b("WHISPER_WHEN_SCRIPT", True)  # tetap transkrip walau ada naskah (timing lebih presisi)

    # Render
    DEFAULT_FPS = max(1, _i("RENDER_FPS", 30))
    FPS = DEFAULT_FPS
    RENDER_WORKERS = _i("RENDER_WORKERS", 0)  # 0 = otomatis
    JPEG_QUALITY = _i("JPEG_QUALITY", 92)
    CHROME_PATH = os.environ.get("CHROME_PATH", "")
    MAX_VIDEO_MB = _f("MAX_VIDEO_MB", 48)  # batas kirim bot Telegram resmi = 50 MB; 0 = tanpa batas
    X264_PRESET = os.environ.get("X264_PRESET", "veryfast")
    X264_CRF = max(0, min(51, _i("X264_CRF", 19)))
    KEEP_FRAMES = _b("KEEP_FRAMES", False)

    # Review AI (vision) sebelum render: 0 = mati
    REVIEW_ROUNDS = _i("REVIEW_ROUNDS", 2)
    REVIEW_MIN_SCORE = max(8, _f("REVIEW_MIN_SCORE", 8))

    # Konten
    DEFAULT_STYLE = os.environ.get("DEFAULT_STYLE", "horor_kampung")
    WATERMARK = os.environ.get("WATERMARK", "")
    SHOW_TITLE_BAR = _b("SHOW_TITLE_BAR", True)
    AUTO_RENDER = _b("AUTO_RENDER", True)

    # Web
    WEB_HOST = os.environ.get("WEB_HOST", "0.0.0.0")
    WEB_PORT = _i("WEB_PORT", 8090)
    WEB_PASSWORD = os.environ.get("WEB_PASSWORD", "")


for d in (Cfg.DATA_DIR, Cfg.JOBS_DIR, Cfg.MODELS_DIR):
    d.mkdir(parents=True, exist_ok=True)
