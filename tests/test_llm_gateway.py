import json
import unittest
from unittest.mock import Mock, patch

from studio import director as D, library, quality
from studio.config import Cfg


class GatewayTests(unittest.TestCase):
    def response(self, chunks):
        response = Mock(status_code=200)
        response.json.side_effect = ValueError("SSE is not a JSON document")
        response.text = "\n\n".join("data: " + (c if isinstance(c, str) else json.dumps(c)) for c in chunks) + "\n\n"
        return response

    def test_gateway_that_defaults_to_sse_preserves_content_and_high_effort(self):
        response = self.response([
            {"choices": [{"index": 0, "delta": {"reasoning_content": "internal reasoning"}}]},
            {"choices": [{"index": 0, "delta": {"content": '{"judul":"Tiang",'}}]},
            {"choices": [{"index": 0, "delta": {"content": '"adegan":[]}'}, "finish_reason": "stop"}]},
            "[DONE]"])
        with patch.object(Cfg, "LLM_REASONING_EFFORT", "high"), patch.object(D, "_context", return_value=100000), patch.object(D, "_is_vllm", return_value=False), \
             patch.object(D.requests, "post", return_value=response) as request:
            out = D._chat([{"role": "user", "content": "Susun adegan."}], None, lambda _: None, max_out=400)
        self.assertEqual(D.parse_json(out), {"judul": "Tiang", "adegan": []})
        self.assertNotIn("internal reasoning", out)
        self.assertIs(request.call_args.kwargs["json"]["stream"], False)
        self.assertEqual(request.call_args.kwargs["json"]["reasoning_effort"], "high")

    def test_interrupted_stream_is_not_accepted_as_complete(self):
        response = self.response([{"choices": [{"delta": {"content": '{"adegan":['}}]}])
        with self.assertRaises(D.TooLong) as caught:
            D._completion(response)
        self.assertEqual(caught.exception.partial, '{"adegan":[')

    def test_non_json_html_is_an_error_not_a_context_limit(self):
        response = self.response([])
        response.text = "<html>Upstream is unavailable</html>"
        with self.assertRaises(ValueError):
            D._completion(response)

    def test_educational_analysis_requests_technical_steps(self):
        cues = [{"i": 0, "start": 0, "end": 4, "text": "Tiang beton dicetak lalu dipasang."}]
        style = D.load_style("edukasi_3d")
        with patch.object(D, "_chat", return_value="0. bengkel | cetakan | memadatkan beton | alat kerja") as chat:
            D._summary(cues, lambda _: None, style)
            self.assertIn("PROSES", chat.call_args.args[0][1]["content"])
            self.assertNotIn("HANTU", chat.call_args.args[0][1]["content"])
            D._visual_notes(cues, "Tiang beton", lambda _: None, style)
            self.assertIn("edukasi 3D", chat.call_args.args[0][0]["content"])

    def test_fallback_preserves_electrical_subject_without_inventing_disasters(self):
        lines = ["Bagaimana tiang listrik berdiri kokoh?", "Tiang bambu di desa terlihat kuat.",
                 "Bambu mulai lapuk dan keropos.", "Solusinya menggunakan tiang beton.",
                 "Bagian berikutnya yaitu isolator.", "Sirip memperpanjang jalur arus saat basah.",
                 "Kabel dipasang dengan ketegangan yang tepat.", "Itulah perhitungan teknik kelistrikan."]
        cues = [{"i": i, "start": 4.5 * i, "end": 4.5 * i + 4, "text": line} for i, line in enumerate(lines)]
        plan = D.edukasi_rule_based(cues, D.load_catalog("edukasi_3d"))
        self.assertTrue(plan["judul"])
        self.assertTrue(all(a["params"]["latar"] == "kampung" for a in plan["adegan"]))
        self.assertTrue(all(a["params"].get("kejadian") not in ("korsleting", "kekeringan") for a in plan["adegan"]))
        self.assertEqual(plan["adegan"][3]["params"]["objek"], "tiang_beton")
        self.assertEqual(plan["adegan"][5]["params"]["benda"], "isolator")

    def test_unavailable_review_is_reported_as_unreviewed_and_remains_blocked(self):
        rplan = {"scenes": [{"start": 0, "end": 4}, {"start": 4, "end": 8}]}
        report = {"fingerprint": library.fingerprint(rplan, "edukasi_3d"),
                  "scenes": [{"no": 1, "score": None}, {"no": 2, "score": None}]}
        result = quality.verdict(report, rplan, "edukasi_3d", {"reliable": True})
        self.assertFalse(result["passed"])
        self.assertTrue(any("momen visual" in issue for issue in result["issues"]))
        self.assertIn("belum selesai untuk 2 adegan", result["issues"][0])


if __name__ == "__main__":
    unittest.main()
