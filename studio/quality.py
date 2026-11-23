"""Fail-closed publication gate: a draft is not a successful video."""

import math
from . import library, coverage
from .config import Cfg


def verdict(report, rplan, style, alignment=None, duplicates=None):
    issues = []
    if rplan.get("render_source") and rplan["render_source"] != library.source_fingerprint(
        style, [s.get("template", "") for s in rplan.get("scenes", [])]
    ):
        issues.append("Aset/renderer berubah sesudah preview dibuat.")
    fingerprint = library.fingerprint(rplan, style)
    current = bool(report) and report.get("fingerprint") == fingerprint
    if not current:
        issues.append("Review tidak ada atau sudah kedaluwarsa.")
    scenes = (report or {}).get("scenes", [])
    if len(scenes) != len(rplan["scenes"]) or {r.get("no") for r in scenes} != set(
        range(1, len(rplan["scenes"]) + 1)
    ):
        issues.append("Belum semua adegan dinilai tepat satu kali.")
    unreviewed = []
    for row in scenes:
        score = row.get("score")
        if not isinstance(score, (int, float)) or not math.isfinite(score):
            unreviewed.append(row.get("no"))
        elif not max(8, Cfg.REVIEW_MIN_SCORE) <= score <= 10:
            issues.append(f"Adegan {row.get('no')} belum lolos review (skor {score:g}/10).")
    if unreviewed:
        issues.append(
            f"Review AI belum selesai untuk {len(unreviewed)} adegan; belum ada nilai yang valid."
        )
    for scene in rplan["scenes"]:
        if scene["end"] <= scene["start"]:
            issues.append("Rentang waktu adegan tidak valid.")
    if not alignment or alignment.get("reliable") is not True:
        issues.append("Timing/kecocokan naskah dan MP3 belum terverifikasi.")
    issues.extend((report or {}).get("technical_issues", []))
    evidence = report.get("visual_evidence", {}) if current else {}
    variation = coverage.assess(rplan, evidence, duplicates or {})
    if duplicates is None:
        issues.append("Pemeriksaan gambar duplikat pada storyboard belum tersedia.")
    issues.extend(variation["issues"])
    return {
        "variation": variation,
        "passed": not issues,
        "issues": issues,
        "fingerprint": fingerprint,
        "threshold": max(8, Cfg.REVIEW_MIN_SCORE),
    }
