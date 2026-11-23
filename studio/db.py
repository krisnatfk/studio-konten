"""Antrean job sederhana di SQLite (aman dipakai beberapa thread)."""
import json
import sqlite3
import threading
import time
import uuid

from .config import Cfg

_lock = threading.Lock()
_conn = sqlite3.connect(str(Cfg.DATA_DIR / "studio.db"), check_same_thread=False)
_conn.row_factory = sqlite3.Row
_conn.execute("""CREATE TABLE IF NOT EXISTS jobs(
  id TEXT PRIMARY KEY, created REAL, updated REAL, source TEXT, chat_id TEXT,
  status TEXT, task TEXT, payload TEXT, title TEXT, error TEXT, progress REAL DEFAULT 0)""")
_conn.commit()

# status: menunggu_naskah | antri | proses | selesai | gagal | batal
ACTIVE = ("antri", "proses")


def _row(r):
    if r is None:
        return None
    d = dict(r)
    d["payload"] = json.loads(d["payload"] or "{}")
    return d


def create(source, chat_id=None, status="antri", task="full", payload=None):
    jid = time.strftime("%Y%m%d-%H%M%S") + "-" + uuid.uuid4().hex[:4]
    now = time.time()
    with _lock:
        _conn.execute("INSERT INTO jobs(id,created,updated,source,chat_id,status,task,payload,title,error) VALUES(?,?,?,?,?,?,?,?,?,?)",
                      (jid, now, now, source, str(chat_id) if chat_id else None, status, task, json.dumps(payload or {}), "", ""))
        _conn.commit()
    (Cfg.JOBS_DIR / jid).mkdir(parents=True, exist_ok=True)
    return jid


def get(jid):
    with _lock:
        return _row(_conn.execute("SELECT * FROM jobs WHERE id=?", (jid,)).fetchone())


def update(jid, **kw):
    if "payload" in kw:
        kw["payload"] = json.dumps(kw["payload"])
    kw["updated"] = time.time()
    keys = ",".join(f"{k}=?" for k in kw)
    with _lock:
        _conn.execute(f"UPDATE jobs SET {keys} WHERE id=?", (*kw.values(), jid))
        _conn.commit()


def enqueue(jid, task, payload_update=None):
    j = get(jid)
    p = j["payload"]
    if payload_update:
        p.update(payload_update)
    update(jid, status="antri", task=task, payload=p, error="", progress=0)


def next_queued():
    with _lock:
        r = _conn.execute("SELECT * FROM jobs WHERE status='antri' ORDER BY updated LIMIT 1").fetchone()
        if r:
            _conn.execute("UPDATE jobs SET status='proses', updated=? WHERE id=?", (time.time(), r["id"]))
            _conn.commit()
    return _row(r)


def recent(limit=50, chat_id=None):
    with _lock:
        if chat_id:
            rows = _conn.execute("SELECT * FROM jobs WHERE chat_id=? ORDER BY created DESC LIMIT ?", (str(chat_id), limit)).fetchall()
        else:
            rows = _conn.execute("SELECT * FROM jobs ORDER BY created DESC LIMIT ?", (limit,)).fetchall()
    return [_row(r) for r in rows]


def waiting_script(chat_id):
    with _lock:
        r = _conn.execute("SELECT * FROM jobs WHERE chat_id=? AND status='menunggu_naskah' ORDER BY created DESC LIMIT 1", (str(chat_id),)).fetchone()
    return _row(r)


def reset_stuck():
    """Saat start ulang: job yang terputus di tengah proses dikembalikan ke antrean."""
    with _lock:
        _conn.execute("UPDATE jobs SET status='antri' WHERE status='proses'")
        _conn.commit()
