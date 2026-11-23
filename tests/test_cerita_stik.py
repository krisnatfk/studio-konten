import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from playwright.sync_api import sync_playwright

from studio import director, render
from studio.config import Cfg


class CeritaStikTests(unittest.TestCase):
    def setUp(self):
        self.style = director.load_style("cerita_stik")
        self.catalog = director.load_catalog(self.style)

    def test_narration_selects_story_and_process_templates(self):
        lines = ["Ia merakit layang-layang.", "Angin lewat melalui lubang.",
                 "Di kebun kelapa.", "Akar menyerap air.", "Gas mengalir lewat pipa."]
        cues = [dict(i=i, start=3*i, end=3*i+3, text=line) for i, line in enumerate(lines)]
        with patch.object(Cfg, "LLM_ENABLED", False):
            plan = director.direct(cues, [], self.style, log=lambda _: None)
        self.assertEqual([s["template"] for s in plan["adegan"]],
                         ["meja_kerja", "diagram_angin", "kebun_kelapa", "akar_kelapa", "tangki"])
        messages = director._chunk_msgs(cues, 0, 4, self.catalog, self.style, "", None, None)
        self.assertNotIn("kampung_malam", messages[-1]["content"])

    def test_every_template_renders_and_cue_timing_survives_seeking(self):
        names = list(self.catalog)
        cues = [dict(i=i, start=i*3., end=i*3+3., text="Coba lihat", wt=[i*3+.25, i*3+1.5])
                for i in range(len(names))]
        scenes = [dict(dari=i, sampai=i, template=name, params={}, kamera={"gerak":"maju"})
                  for i, name in enumerate(names)]
        scenes[0]["params"] = dict(label="Mulai", label_cue=0, pemicu="lihat")
        plan, warnings = director.normalize({"adegan": scenes}, cues, self.catalog)
        self.assertFalse(warnings)
        resolved = director.resolve(plan, cues, [], cues[-1]["end"], self.style)
        with tempfile.TemporaryDirectory() as tmp, sync_playwright() as pw:
            html = render.build_page(resolved, Path(tmp)/"page.html", self.style)
            browser = pw.chromium.launch(args=["--no-sandbox"])
            page = browser.new_page(viewport=dict(width=1080, height=1920))
            errors = []
            page.on("pageerror", lambda error: errors.append(str(error)))
            page.goto(html.as_uri())
            page.wait_for_function("window.__ready === true")
            for i in range(len(names)):
                page.evaluate("render", i*3+1.8)
            page.evaluate("render", .65)
            self.assertEqual(page.locator("#sub").text_content(), "Coba")
            self.assertFalse(page.locator("#label").is_visible())
            still = page.screenshot()
            page.evaluate("render", 1.6)
            self.assertTrue(page.locator("#label").is_visible())
            self.assertEqual(page.locator("#sub").text_content(), "lihat")
            page.evaluate("render", .65)
            self.assertEqual(page.screenshot(), still)
            self.assertFalse(errors)
            browser.close()
