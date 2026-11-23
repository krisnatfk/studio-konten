"""Jalankan semuanya: worker + dashboard web + bot Telegram.

python -m studio
"""
import time

from . import director, mix, telegram_bot, transcribe, web, worker
from .config import Cfg


def main():
    print("== Horor Studio ==")
    mix.ensure_sfx()
    print(f"LLM {Cfg.LLM_MODEL} (effort={Cfg.LLM_REASONING_EFFORT}) @ {Cfg.LLM_BASE_URL}: {'OK' if director.llm_ok() else 'TIDAK TERHUBUNG (pakai sutradara aturan)'}")
    print(f"Whisper: {'tersedia' if transcribe.available() else 'tidak aktif'} (mode {Cfg.WHISPER_MODE}, model {Cfg.WHISPER_MODEL})")
    worker.start()
    web.start()
    telegram_bot.start()
    while True:
        time.sleep(3600)


if __name__ == "__main__":
    main()
