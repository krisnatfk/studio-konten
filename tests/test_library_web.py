import threading,unittest
from http.server import ThreadingHTTPServer
from playwright.sync_api import sync_playwright
from studio import web
from studio.config import Cfg

class GalleryTests(unittest.TestCase):
 def test_gallery_search_and_preview_contract(self):
  server=ThreadingHTTPServer(('127.0.0.1',0),web.H);thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
  try:
   with sync_playwright() as pw:
    br=pw.chromium.launch(args=['--no-sandbox']);ctx=br.new_context(http_credentials={'username':'studio','password':Cfg.WEB_PASSWORD})
    pg=ctx.new_page();pg.goto(f'http://127.0.0.1:{server.server_port}/library');pg.wait_for_selector('article')
    self.assertEqual(pg.locator('article').count(),120)
    pg.locator('#q').fill('memancing');self.assertEqual(pg.locator('article').count(),1)
    self.assertIn('memancing',pg.locator('article').text_content())
    response=ctx.request.get(f'http://127.0.0.1:{server.server_port}/api/library');self.assertEqual(response.status,200);self.assertEqual(len(response.json()['templates']),120)
    br.close()
  finally:server.shutdown();server.server_close()
