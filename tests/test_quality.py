"""Regresi provider, aktivitas narasi dan waktu kata. Tanpa akses API."""
import unittest
from unittest.mock import patch, Mock
from studio import director as D, align, review
from studio.config import Cfg


class QualityTests(unittest.TestCase):
    def setUp(self):
        self.style = D.load_style('horor_kampung')
        self.cat = D.load_catalog(self.style)
        self.cues = [{'i': i, 'start': i * 4., 'end': i * 4. + 3.8, 'pe': i * 4. + 3.4, 'text': t} for i, t in enumerate([
            'Pasar ramai dengan toko, pedagang dan pembeli.',
            'Bapak membakar sate sambil mengipas bara.',
            'Ibu mengaduk masakan di dapur.',
            'Aku pulang ke rumah.'
        ])]

    def test_high_effort_including_vision_and_no_disable_on_gateway(self):
        response = Mock(status_code=200)
        response.json.return_value = {'choices': [{'finish_reason': 'stop', 'message': {'content': '{"ok":true}'}}]}
        with patch.object(Cfg, 'LLM_REASONING_EFFORT', 'high'), patch.object(D, '_context', return_value=100000), patch.object(D, '_is_vllm', return_value=False), patch.object(D.requests, 'post', return_value=response) as post:
            for content in ('uji', [{'type': 'text', 'text': 'nilai'}, {'type': 'image_url', 'image_url': {'url': 'data:image/jpeg;base64,AA'}}]):
                D._chat([{'role': 'user', 'content': content}], None, lambda _: None, max_out=400)
                body = post.call_args.kwargs['json']
                self.assertEqual(body['reasoning_effort'], 'high')
                self.assertNotIn('chat_template_kwargs', body)
                self.assertGreater(body['max_tokens'], 400)

    def test_retry_does_not_silently_remove_high(self):
        bad = Mock(status_code=400, text='response_format unsupported')
        good = Mock(status_code=200)
        good.json.return_value = {'choices': [{'finish_reason': 'stop', 'message': {'content': '{}'}}]}
        with patch.object(Cfg, 'LLM_REASONING_EFFORT', 'high'), patch.object(D, '_context', return_value=100000), patch.object(D, '_is_vllm', return_value=False), patch.object(D.requests, 'post', side_effect=[bad, good]) as post:
            D._chat([{'role': 'user', 'content': 'test'}], {'type': 'object'}, lambda _: None, max_out=400)
            self.assertTrue(all(call.kwargs['json']['reasoning_effort'] == 'high' for call in post.call_args_list))

    def test_fallback_follows_market_cooking_and_no_forced_final_ghost(self):
        plan = D.rule_based(self.cues, [], self.cat)
        self.assertEqual([s['template'] for s in plan['adegan'][:3]], ['pasar_ramai', 'bakar_sate', 'dapur_memasak'])
        self.assertFalse(D._shows_ghost(plan['adegan'][-1]))

    def test_mismatch_caught_and_activity_repaired(self):
        scene = {'dari': 1, 'sampai': 1, 'template': 'jalan_setapak', 'params': {}}
        self.assertTrue(D._issues([scene], self.cues))
        out = D._autofix([scene], self.cues, None, lambda _: None)[0]
        self.assertEqual(out['template'], 'bakar_sate')
        self.assertEqual(out['params']['aksi_mulai_cue'], 1)

    def test_activity_boundary_not_lost(self):
        scene = {'dari': 0, 'sampai': 2, 'template': 'pasar_ramai', 'params': {}}
        self.assertEqual(D._cut_long([scene], self.cues, self.style, lambda _: None)[-1]['sampai'], 0)
        cs = [dict(self.cues[0], start=0, end=.7), dict(self.cues[1], start=.7, end=4)]
        raw = {'adegan': [dict(scene, dari=0, sampai=0), dict(scene, dari=1, sampai=1, template='bakar_sate')], 'peran': []}
        self.assertEqual(len(D.normalize(raw, cs, self.cat)[0]['adegan']), 2)

    def test_word_match_and_action_time_survive_normalization(self):
        cues = [{'i': 0, 'start': 0., 'end': 5., 'pe': 4.8, 'text': 'Bapak mulai membakar sate sekarang'}]
        words = [{'word': w, 'start': t, 'end': t + .3} for w, t in [('Bapak', .2), ('mulai', 1.1), ('eh', 1.4), ('membakar', 2.3), ('sate', 3.1), ('sekarang', 4.1)]]
        align.word_times(cues, words)
        self.assertEqual(cues[0]['wt'], [.2, 1.1, 2.3, 3.1, 4.1])
        raw = {'adegan': [{'dari': 0, 'sampai': 0, 'template': 'komposisi', 'kamera': {}, 'params': {'aktor': [{'jenis': 'bapak', 'pose': 'mengipas', 'cue': 0, 'kata': 'membakar', 'akhir_cue': 0, 'alat': 'kipas'}]}}]}
        plan, _ = D.normalize(raw, cues, self.cat)
        actor = D.resolve(plan, cues, [], 5, self.style)['scenes'][0]['params']['aktor'][0]
        self.assertEqual(actor['t'], 2.3)
        self.assertEqual(actor['akhir_t'], 4.8)

    def test_vision_review_uses_same_high_effort_client(self):
        with patch.object(D, '_chat', return_value='{"adegan":[]}') as chat:
            review._ask([(1, 'narasi', '{}', [])], lambda _: None)
            self.assertEqual(chat.call_count, 1)

    def test_batch_revision_preserves_untargeted_scenes_and_ranges(self):
        import json
        plan = D.rule_based(self.cues, [], self.cat)
        plan['sumber'] = 'ai'
        target = dict(plan['adegan'][1], params={'aksi': 'membalik_sate'})
        with patch.object(D, '_chat', return_value=json.dumps({'adegan': [target]})):
            result = D.revise(plan, self.cues, self.style, {1: 'Perjelas tangan dan alat'}, lambda _: None)
        self.assertEqual(result['adegan'][1]['params']['aksi'], 'membalik_sate')
        self.assertEqual(result['adegan'][0], D.normalize(plan, self.cues, self.cat)[0]['adegan'][0])
        self.assertEqual([(a['dari'], a['sampai']) for a in result['adegan']], [(a['dari'], a['sampai']) for a in plan['adegan']])


if __name__ == '__main__':
    unittest.main()
