import tempfile
import threading
import unittest
from http.server import ThreadingHTTPServer
from pathlib import Path
from unittest.mock import Mock, patch

import requests

from studio import pipeline, telegram_bot, web
from studio.config import Cfg


class AudioUploadTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.d = Path(self.tmp.name)
        for p in (patch.object(Cfg, 'DATA_DIR', self.d),
                  patch.object(Cfg, 'WEB_PASSWORD', ''),
                  patch.object(pipeline, 'jdir', return_value=self.d),
                  patch.object(web.db, 'create', return_value='test'),
                  patch.object(web.db, 'update'),
                  patch.object(web.db, 'waiting_script', return_value=None),
                  patch.object(web.transcribe, 'available', return_value=False)):
            p.start()
            self.addCleanup(p.stop)
        self.addCleanup(self.tmp.cleanup)
        self.server = ThreadingHTTPServer(('127.0.0.1', 0), web.H)
        threading.Thread(target=self.server.serve_forever, daemon=True).start()
        self.url = f'http://127.0.0.1:{self.server.server_port}'
        self.addCleanup(self.server.server_close)
        self.addCleanup(self.server.shutdown)

    def test_mp3_upload_saves_audio_and_script_then_queues(self):
        r = requests.post(self.url + '/api/jobs', data={'naskah': 'Aku pulang.'},
                          files={'audio': ('voice.mp3', b'manual-mp3', 'audio/mpeg')}, timeout=5)
        self.assertEqual(r.status_code, 200)
        self.assertEqual((self.d / 'input.mp3').read_bytes(), b'manual-mp3')
        self.assertEqual((self.d / 'naskah.txt').read_text(), 'Aku pulang.')
        web.db.update.assert_called_once_with('test', status='antri')

    def test_script_without_audio_creates_no_job(self):
        r = requests.post(self.url + '/api/jobs', files={'naskah': (None, 'Aku pulang.')}, timeout=5)
        self.assertEqual(r.status_code, 400)
        web.db.create.assert_not_called()

    def test_telegram_pairs_pending_script_with_uploaded_mp3(self):
        bot = telegram_bot.Bot()
        bot.send = Mock()
        bot.download = Mock()
        script = 'Aku pulang melewati kampung yang gelap.'
        bot.on_text_script(123, script)
        web.db.create.assert_not_called()
        with patch.object(bot, 'allowed', return_value=True):
            bot.handle({'chat': {'id': 123}, 'audio': {'file_id': 'upload', 'file_name': 'voice.mp3'}})
        bot.download.assert_called_once_with('upload', self.d / 'input.mp3')
        self.assertEqual((self.d / 'naskah.txt').read_text(), script)
        web.db.update.assert_called_once_with('test', status='antri')

    def test_missing_audio_reports_manual_upload_required(self):
        with self.assertRaisesRegex(ValueError, 'Unggah MP3 secara manual'):
            pipeline.analyze({'id': 'test', 'payload': {'audio': 'input.mp3'}}, Mock())

    def test_dashboard_uploads_mp3_without_browser_errors(self):
        from playwright.sync_api import sync_playwright
        errors = []
        info = {'llm': False, 'whisper': False, 'styles': ['horor_kampung'],
                'default_style': 'horor_kampung', 'watermark': '', 'catalogs': {}, 'catalog': {}}
        with sync_playwright() as pw:
            browser = pw.chromium.launch(args=['--no-sandbox'])
            page = browser.new_page()
            page.on('pageerror', lambda e: errors.append(str(e)))
            page.route('**/api/info', lambda route: route.fulfill(json=info))
            page.route('**/api/jobs', lambda route: route.continue_() if route.request.method == 'POST' else route.fulfill(json=[]))
            page.route('**/api/jobs/test', lambda route: route.fulfill(json={
                'id': 'test', 'title': '', 'status': 'antri', 'progress': 0, 'error': '', 'log': ''}))
            page.goto(self.url)
            page.locator('#script').fill('Aku pulang.')
            page.locator('#audio-file').set_input_files({'name': 'voice.mp3', 'mimeType': 'audio/mpeg', 'buffer': b'manual-mp3'})
            with page.expect_response(lambda r: r.url.endswith('/api/jobs') and r.request.method == 'POST') as response:
                page.locator('#go').click()
            self.assertEqual(response.value.status, 200)
            page.wait_for_function("document.querySelector('#up').textContent === 'masuk antrean'")
            self.assertEqual(errors, [])
            browser.close()
