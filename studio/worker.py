"""Worker: ambil job dari antrean satu per satu (GPU/CPU dipakai bergiliran)."""
import threading
import time

from . import db, pipeline


def loop():
    while True:
        job = db.next_queued()
        if not job:
            time.sleep(1.5)
            continue
        print(f"== job {job['id']} ({job['task']})", flush=True)
        pipeline.run(job)


def start():
    db.reset_stuck()
    t = threading.Thread(target=loop, daemon=True, name="worker")
    t.start()
    return t
