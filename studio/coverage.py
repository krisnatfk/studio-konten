"""Plan camera cuts inside continuous scenes and count confirmed visual changes."""

import math
import re

MIN_SHOTS = 20
MIN_MOMENTS = 50
SHOT_SECONDS = 1.5
MOMENT_SECONDS = 0.75
VIEWS = ("utama", "detail", "samping", "luas")


def _subject(scene):
    p = scene["params"]
    names = [p.get(k) for k in ("tahap", "aksi", "kejadian", "isi", "benda", "objek", "efek")]
    return ", ".join(str(n).replace("_", " ") for n in names if n and n != "tidak_ada") or scene[
        "template"
    ].replace("_", " ")


def _targets(params, start, end):
    targets = []
    for group, prefix in (("kustom", "ku"), ("aktor", "a"), ("props", "prop")):
        for k, obj in enumerate(params.get(group) or []):
            if not isinstance(obj, dict):
                continue
            begin, finish = obj.get("t"), obj.get("akhir_t")
            if (begin is not None and begin >= end) or (finish is not None and finish <= start):
                continue
            name = obj.get("nama") or obj.get("jenis")
            if isinstance(name, str) and name:
                targets.append({"element": prefix + str(k), "name": name.replace("_", " ")})
    return targets[:2]


def _events(scene):
    """Visible changes already implemented by the selected template."""
    events = [(d["t"], d["focus"]) for d in scene.get("directions", [])]
    for key, value in scene["params"].items():
        if key.endswith("_t") and isinstance(value, (float, int)):
            events.append((value, key[:-2].replace("_", " ")))
        if not isinstance(value, list):
            continue
        for item in value:
            if not isinstance(item, dict):
                continue
            subject = item.get("nama") or item.get("teks") or item.get("jenis") or key
            for field, time in item.items():
                if (field == "t" or field.endswith("_t")) and isinstance(time, (float, int)):
                    state = item.get("pose", "") if field == "t" else field[:-2]
                    events.append((time, f"{subject} {state}".replace("_", " ").strip()))
    return events


def plan_shots(scenes, cues, actions, fps):
    """Cuts only move the camera. Animation, cue IDs and audio keep scene time."""
    parts = [1] * len(scenes)
    spans = [s["end"] - s["start"] for s in scenes]
    while parts:
        i = max(
            range(len(parts)),
            key=lambda j: spans[j] / parts[j] if spans[j] >= (parts[j] + 1) * SHOT_SECONDS else -1,
        )
        if spans[i] < (parts[i] + 1) * SHOT_SECONDS or (
            sum(parts) >= MIN_SHOTS and spans[i] / parts[i] <= 4.2
        ):
            break
        parts[i] += 1

    stages = {a["scene"]: a for a in actions}
    index = 0
    for i, (s, count) in enumerate(zip(scenes, parts)):
        start, end = s["start"], s["end"]
        words = [
            t for c in cues if c["end"] > start and c["start"] < end for t in [c["start"], *c.get("wt", [])]
        ]
        cuts = [start]
        for j in range(1, count):
            target = start + spans[i] * j / count
            choices = [
                t
                for t in words
                if abs(t - target) <= 0.4
                and cuts[-1] + SHOT_SECONDS <= t <= end - (count - j) * SHOT_SECONDS
            ]
            cut = (
                min(choices, key=lambda t: abs(t - target))
                if choices
                else max(cuts[-1] + SHOT_SECONDS, target)
            )
            cuts.append(round(cut, 3))
        cuts.append(end)
        events = _events(s)
        s["shots"] = []
        for j, (a, b) in enumerate(zip(cuts, cuts[1:])):
            index += 1
            # The template establishes its own subject and framing on the first take.
            view = VIEWS[j % len(VIEWS)]
            if (
                j == 0
                and i
                and scenes[i - 1]["template"] == s["template"]
                and _subject(scenes[i - 1]) == _subject(s)
            ):
                view = VIEWS[(VIEWS.index(scenes[i - 1]["shots"][-1]["view"]) + 1) % len(VIEWS)]
            if j and view == s["shots"][-1]["view"]:
                view = VIEWS[(VIEWS.index(view) + 1) % len(VIEWS)]
            shot = dict(no=index, start=a, end=b, view=view, moments=[])
            if s["template"] == "komposisi" and view in ("detail", "samping"):
                shot["targets"] = _targets(s["params"], a, b)
            s["shots"].append(shot)
            span = b - a
            n = max(1, min(5, math.floor(span / MOMENT_SECONDS)))
            hints = [(c["start"], c["text"]) for c in cues if c["end"] > a and c["start"] < b]
            stage = stages.get(i)
            for m in range(n):
                low, high = a + span * m / n, a + span * (m + 1) / n
                t = (low + high) / 2
                nearby = [
                    (time + 0.2, label) for time, label in events if low + 0.12 <= time + 0.2 <= high - 0.12
                ]
                label = _subject(s)
                if nearby:
                    t, action = min(nearby, key=lambda row: abs(t - row[0]))
                    label += " · " + action
                elif stage and stage.get("stages"):
                    fraction = (t - stage["start"]) / max(0.01, stage["end"] - stage["start"])
                    labels = stage["stages"]
                    label += " · " + str(labels[max(0, min(len(labels) - 1, int(fraction * len(labels))))])
                elif hints:
                    label += " · " + next((v for time, v in reversed(hints) if time <= t), hints[0][1])
                if shot.get("targets"):
                    targets = shot["targets"]
                    label = (
                        targets[min(len(targets) - 1, int((t - a) / (b - a) * len(targets)))]["name"]
                        + " · "
                        + label
                    )
                frame = min(math.ceil(b * fps) - 1, max(math.ceil(a * fps), round(t * fps)))
                if frame >= 0 and a <= frame / fps < b:
                    shot["moments"].append(dict(id=f"{index}.{m + 1}", t=frame / fps, focus=label))
    return scenes


def shots(rplan):
    return [shot for scene in rplan["scenes"] for shot in scene.get("shots", [])]


def assess(rplan, evidence, duplicates):
    """Intersect actual shot coverage, semantic review and clean-image comparisons."""
    evidence = evidence if isinstance(evidence, dict) else {}
    observations = evidence.get("moments")
    observations = observations if isinstance(observations, dict) else {}
    approved_views = evidence.get("shots")
    approved_views = approved_views if isinstance(approved_views, dict) else {}
    seen_views = set()
    accepted = {}
    seen = set()
    fixes = {}
    count = 0
    repeated_shots = []
    for i, scene in enumerate(rplan["scenes"]):
        for shot in scene.get("shots", []):
            # A whole replay still needs an edit even if the rest of the film
            # independently clears both numeric minimums.
            if shot["moments"] and all(m["id"] in duplicates for m in shot["moments"]):
                repeated_shots.append(str(shot["no"]))
            distinct = False
            for m in shot["moments"]:
                key = m["id"]
                note = observations.get(key)
                if not isinstance(note, str) or not note.strip() or key in duplicates:
                    continue
                normalized = " ".join(re.findall(r"\w+", note.casefold()))
                if not normalized or normalized in seen:
                    continue
                if (
                    shot["end"] - shot["start"] < MOMENT_SECONDS
                    or not shot["start"] <= m["t"] < shot["end"]
                ):
                    continue
                accepted[key] = note
                seen.add(normalized)
                distinct = True
            view = approved_views.get(str(shot["no"]))
            view = " ".join(re.findall(r"\w+", view.casefold())) if isinstance(view, str) else ""
            distinct = distinct and bool(view) and view not in seen_views
            if distinct:
                seen_views.add(view)
                count += 1
            confirmed_here = sum(m["id"] in accepted for m in shot["moments"])
            if not distinct or confirmed_here < min(2, len(shot["moments"])):
                fixes.setdefault(str(i), []).append(str(shot["no"]))
    issues = []
    if repeated_shots:
        issues.append("Seluruh gambar kunci terulang pada shot " + ", ".join(repeated_shots) + ".")
    if count < MIN_SHOTS:
        issues.append(f"Hanya {count}/{MIN_SHOTS} shot berbeda terkonfirmasi.")
    if len(accepted) < MIN_MOMENTS:
        issues.append(f"Hanya {len(accepted)}/{MIN_MOMENTS} momen visual berbeda terkonfirmasi.")
    if issues and fixes:
        issues.append(
            "Perjelas aksi, detail atau perubahan keadaan pada shot "
            + ", ".join(n for ns in fixes.values() for n in ns)
            + "."
        )
    if issues and (
        len(shots(rplan)) < MIN_SHOTS or sum(len(s["moments"]) for s in shots(rplan)) < MIN_MOMENTS
    ):
        issues.append(
            "Tambahkan durasi narasi atau rancang ulang adegan agar tiap perubahan sempat terbaca."
        )
    return dict(
        shots=count,
        moments=len(accepted),
        planned_shots=len(shots(rplan)),
        planned_moments=sum(len(s["moments"]) for s in shots(rplan)),
        confirmed=accepted,
        duplicates=duplicates,
        fixes=fixes,
        issues=issues,
    )
