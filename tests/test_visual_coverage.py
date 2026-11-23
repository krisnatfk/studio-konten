import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from PIL import Image
from studio import coverage, director, library, pipeline, quality, render
from studio.config import Cfg


def approved_fixture(nshots=20, nmoments=50):
    shots, views, moments = [], {}, {}
    for i in range(nshots):
        start = i * 4.0
        n = nmoments // nshots + (i < nmoments % nshots)
        shot = dict(no=i + 1, start=start, end=start + 4, view="utama", moments=[])
        for j in range(n):
            key = f"{i + 1}.{j + 1}"
            shot["moments"].append(dict(id=key, t=start + (j + 0.5) * 4 / n, focus="aksi"))
            moments[key] = f"Keadaan visual {key}"
        views[str(i + 1)] = f"Komposisi {i + 1}"
        shots.append(shot)
    scene = dict(start=0.0, end=nshots * 4.0, template="aktivitas", shots=shots)
    plan = {"scenes": [scene]}
    report = {
        "fingerprint": library.fingerprint(plan, "edukasi_3d"),
        "scenes": [dict(no=1, score=8)],
        "visual_evidence": {"shots": views, "moments": moments},
    }
    return plan, report


class VisualCoverageTests(unittest.TestCase):
    def test_publication_boundaries(self):
        for nshots, nmoments, passed in [(19, 50, False), (20, 49, False), (20, 50, True)]:
            with self.subTest(shots=nshots, moments=nmoments):
                plan, report = approved_fixture(nshots, nmoments)
                result = quality.verdict(report, plan, "edukasi_3d", {"reliable": True}, {})
                self.assertEqual(result["passed"], passed, result["issues"])

    def test_wholly_repeated_extra_shot_blocks_an_otherwise_complete_video(self):
        plan, report = approved_fixture(21, 63)
        copies = {f"21.{n}": f"1.{n}" for n in (1, 2, 3)}
        result = quality.verdict(report, plan, "edukasi_3d", {"reliable": True}, copies)
        self.assertEqual(result["variation"]["shots"], 20)
        self.assertEqual(result["variation"]["moments"], 60)
        self.assertFalse(result["passed"])
        self.assertTrue(any("terulang pada shot 21" in issue for issue in result["issues"]))

    def test_approved_review_promotes_preview_and_preserves_previous_final(self):
        from contextlib import ExitStack

        plan, report = approved_fixture()
        scene = plan["scenes"][0]
        scene.update(params={}, camera={"gerak": "diam"})
        plan.update(events=[], cues=[])
        for style in director.list_styles():
            with self.subTest(style=style), tempfile.TemporaryDirectory() as tmp, ExitStack() as stack:
                root = Path(tmp)
                report["fingerprint"] = library.fingerprint(plan, style)
                (root / "review_report.json").write_text(json.dumps(report))
                (root / "cues.json").write_text(json.dumps({"alignment": {"reliable": True}}))
                (root / "final.mp4").write_bytes(b"old")
                (root / "_sb").mkdir()
                (root / "_sb" / "duplicates.json").write_text("{}")

                def encode(frames, audio, out, duration):
                    out.write_bytes(b"new")
                    return out

                stack.enter_context(patch.object(Cfg, "LLM_ENABLED", False))
                stack.enter_context(patch.object(pipeline, "jdir", return_value=root))
                stack.enter_context(
                    patch.object(pipeline, "_build", return_value=(plan, root / "page.html"))
                )
                stack.enter_context(patch.object(pipeline, "step"))
                stack.enter_context(patch.object(pipeline, "notify"))
                stack.enter_context(patch.object(render, "storyboard"))
                stack.enter_context(patch.object(render, "render_frames"))
                stack.enter_context(patch.object(pipeline.mix, "mix"))
                stack.enter_context(patch.object(render, "encode", side_effect=encode))
                out = pipeline.produce(
                    {"id": "test", "payload": {}},
                    lambda _: None,
                    {"adegan": []},
                    [],
                    [],
                    scene["end"],
                    director.load_style(style),
                )
                self.assertEqual(out.name, "final.mp4")
                self.assertEqual(out.read_bytes(), b"new")
                self.assertEqual(next(root.glob("previous_final_*.mp4")).read_bytes(), b"old")
                self.assertTrue(json.loads((root / "quality_report.json").read_text())["passed"])

    def test_duplicate_images_repeated_claims_and_missing_shot_reviews(self):
        plan, report = approved_fixture()

        def check(duplicates):
            return quality.verdict(report, plan, "edukasi_3d", {"reliable": True}, duplicates)

        self.assertFalse(check(None)["passed"])
        self.assertEqual(check({"20.2": "1.1"})["variation"]["moments"], 49)
        report["visual_evidence"]["moments"]["20.2"] = report["visual_evidence"]["moments"]["1.1"]
        self.assertFalse(check({})["passed"])
        del report["visual_evidence"]["shots"]["1"]
        self.assertEqual(check({})["variation"]["shots"], 19)
        report["fingerprint"] = "old"
        self.assertEqual(check({})["variation"]["moments"], 0)

    def test_both_styles_subdivide_long_cues_without_resetting_audio(self):
        for style_name in director.list_styles():
            style = director.load_style(style_name)
            cues = [
                dict(i=i, start=8.0 * i, end=8.0 * (i + 1), text="Aku menggali tanah di kampung.")
                for i in range(8)
            ]
            with patch.object(Cfg, "LLM_ENABLED", False):
                plan = director.direct(cues, [], style, log=lambda _: None)
            resolved = director.resolve(plan, cues, [], 64.0, style)
            shots = coverage.shots(resolved)
            self.assertGreaterEqual(len(shots), 20)
            self.assertGreaterEqual(sum(len(s["moments"]) for s in shots), 50)
            self.assertEqual(shots[0]["start"], 0.0)
            self.assertEqual(shots[-1]["end"], 64.0)
            self.assertEqual([s["end"] for s in shots[:-1]], [s["start"] for s in shots[1:]])
            self.assertTrue(
                all(
                    m["t"] * Cfg.FPS == round(m["t"] * Cfg.FPS)
                    or abs(m["t"] * Cfg.FPS - round(m["t"] * Cfg.FPS)) < 1e-8
                    for s in shots
                    for m in s["moments"]
                )
            )
            self.assertEqual([c["start"] for c in cues], [c["start"] for c in resolved["cues"]])
            for scene in resolved["scenes"]:
                views = [s["view"] for s in scene["shots"]]
                self.assertTrue(all(a != b for a, b in zip(views, views[1:])))

    def test_word_anchored_manual_direction_and_short_audio(self):
        style = director.load_style("edukasi_3d")
        cues = [dict(i=0, start=0.0, end=4.0, text="Fondasi mulai terlihat", wt=[0.0, 1.3, 2.5])]
        scene = dict(
            dari=0,
            sampai=0,
            template="cofferdam",
            params={"tahap": "cor_tiang"},
            momen=[dict(cue=0, kata="mulai", fokus="Beton mulai muncul")],
        )
        p, _ = director.normalize({"adegan": [scene]}, cues, director.load_catalog(style))
        r = director.resolve(p, cues, [], 4.0, style)
        self.assertEqual(r["scenes"][0]["directions"][0]["t"], 1.3)
        self.assertTrue(
            any("Beton mulai muncul" in m["focus"] for s in coverage.shots(r) for m in s["moments"])
        )
        self.assertFalse(quality.verdict(None, r, "edukasi_3d", {"reliable": True}, {})["passed"])

    def test_storyboard_labels_all_frames_and_detects_nonadjacent_copies(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            folder = root / "_sb"
            plan, _ = approved_fixture()

            def draw(cmd, **kwargs):
                self.assertIn("--art-only", cmd)
                for i in range(50):
                    Image.new("RGB", (100, 160), (i if i != 49 else 0, 0, 0)).save(
                        folder / f"sb{i:03d}.jpg"
                    )

            with patch.object(render.subprocess, "run", side_effect=draw):
                render.storyboard(root / "page.html", plan, root / "board.jpg", folder)
            self.assertEqual(len(list(folder.glob("key-*.jpg"))), 50)
            self.assertIn("20.2", json.loads((folder / "duplicates.json").read_text()))


class CleanFrameTest(unittest.TestCase):
    def test_chromium_does_not_count_changing_captions(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            html = root / "page.html"
            html.write_text("""<!doctype html><style>body{margin:0;background:#314959}
                #sub{font:180px sans-serif;color:white}</style><div id="sub"></div><script>
                window.render=t=>{document.querySelector('#sub').textContent=String(t)};
                window.__ready=true;</script>""")
            plan = {
                "scenes": [
                    {"shots": [{"no": 1, "moments": [{"id": "1.1", "t": 0.5}, {"id": "1.2", "t": 2}]}]}
                ]
            }
            render.storyboard(html, plan, root / "storyboard.jpg", root / "_sb")
            self.assertEqual(json.loads((root / "_sb/duplicates.json").read_text()), {"1.2": "1.1"})


class RevisionCoverageTest(unittest.TestCase):
    def test_mixed_scenes_cannot_discard_a_previously_verified_minimum(self):
        import copy
        from contextlib import ExitStack

        fixture, approved = approved_fixture()
        shots = fixture["scenes"][0]["shots"]

        def source(versions):
            return {
                "adegan": [
                    dict(dari=i, sampai=i, template="aktivitas", version=v) for i, v in enumerate(versions)
                ]
            }

        with tempfile.TemporaryDirectory() as tmp, ExitStack() as stack:
            root = Path(tmp)
            folder = root / "_sb"
            folder.mkdir()
            (folder / "duplicates.json").write_text("{}")

            def build(job, plan, *args, **kwargs):
                scenes = [
                    dict(
                        start=i * 40,
                        end=(i + 1) * 40,
                        template="aktivitas",
                        shots=shots[i * 10 : (i + 1) * 10],
                        version=a["version"],
                    )
                    for i, a in enumerate(plan["adegan"])
                ]
                return {"scenes": scenes}, root / "page.html"

            def inspect_scenes(html, plan, *args):
                versions = [a["version"] for a in plan["adegan"]]
                scores = {0: 9 if versions[0] == 1 else 7, 1: 7 if versions[1] == 1 else 9}
                return {k: "Perjelas aksi" for k, v in scores.items() if v < 8}, 8.0, scores

            def evidence(plan, *args):
                data = copy.deepcopy(approved["visual_evidence"])
                if plan["scenes"][0]["version"] == 1:
                    del data["moments"]["20.2"]
                return data

            for obj, attr, value in [
                (pipeline, "jdir", lambda _: root),
                (pipeline, "_build", build),
                (pipeline, "step", lambda *args: None),
                (pipeline, "notify", lambda *args: None),
                (pipeline.review, "review", inspect_scenes),
                (pipeline.review, "visual_evidence", evidence),
                (render, "storyboard", lambda *args: None),
                (pipeline.inspect_render, "inspect", lambda *args: []),
                (director, "revise", lambda *args: source([2, 2])),
                (Cfg, "REVIEW_ROUNDS", 1),
            ]:
                stack.enter_context(patch.object(obj, attr, value))
            plan, rplan, _ = pipeline._review(
                {"id": "test"}, lambda _: None, source([1, 1]), [], [], 80.0, {"name": "edukasi_3d"}
            )
            self.assertEqual([a["version"] for a in plan["adegan"]], [2, 2])
            report = json.loads((root / "review_report.json").read_text())
            result = quality.verdict(report, rplan, "edukasi_3d", {"reliable": True}, {})
            self.assertEqual(result["variation"]["moments"], 50)
            self.assertFalse(result["passed"])  # One scene still needs a quality revision.
