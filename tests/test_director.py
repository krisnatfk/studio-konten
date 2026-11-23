"""Self-check logika sutradara per bagian (tanpa LLM). Jalankan: PYTHONPATH=. .venv/bin/python tests/test_director.py"""
from studio import director as D

cues = [{"i": i, "start": i * 2.0, "end": i * 2.0 + 1.8, "text": f"kalimat {i}"} for i in range(10)]
st = {"maks_detik_adegan": 11}

# adegan kembar berurutan digabung, rentang dipaksa mulai di a, fill=False tidak menarik ke b
s = lambda d, e, t="kuburan", p=None: {"dari": d, "sampai": e, "template": t, "params": p or {}}
out = D._clip([s(3, 4), s(5, 5), s(6, 6, "sumur")], 2, 9, fill=False)
assert [(x["dari"], x["sampai"], x["template"]) for x in out] == [(2, 5, "kuburan"), (6, 6, "sumur")], out
assert D._clip([s(3, 4)], 2, 9)[-1]["sampai"] == 9

# jawaban terpotong: hanya objek adegan yang utuh yang diambil
part = '{"judul":"","adegan":[{"dari":0,"sampai":1,"template":"sumur","params":{}},{"dari":2,"sampai":3,"templ'
assert [x["template"] for x in D._salvage(part)] == ["sumur"]
assert D._salvage("bukan json") == []

# adegan terlalu panjang dipotong (sisanya akan diminta ulang); kartu judul maks 3.5 dtk
cut = D._cut_long([s(0, 8, "kuburan")], cues, st, lambda m: None)
assert cut[-1]["sampai"] < 8 and cues[cut[-1]["sampai"]]["end"] <= 11
cut = D._cut_long([s(0, 3, "judul_kartu"), s(4, 9)], cues, st, lambda m: None)
assert len(cut) == 1 and cut[0]["sampai"] == 0, cut

# skema per bagian membatasi rentang & jumlah adegan (mencegah loop)
sch = D._schema({"kuburan": {}}, 4, 7)["properties"]["adegan"]
assert sch["maxItems"] == 4 and sch["items"]["properties"]["dari"] == {"type": "integer", "minimum": 4, "maximum": 7}
print("OK")

# pemeriksa: hantu di kalimat tanpa hantu ditegur & diperbaiki; hantu yang memang ada dibiarkan
vc = [dict(c, vis="teras rumah | Bapak | memeluk anak") for c in cues]
vc[5]["vis"] = "jalan desa | Kuntilanak | berbisik"
assert D._issues([s(0, 1, "sosok_dekat")], vc) and not D._issues([s(4, 5, "sosok_dekat")], vc)
assert D._issues([s(0, 1, "kamar_tidur", {"sosok": True})], vc)
fx = D._autofix([s(0, 1, "kamar_tidur", {"sosok": True, "sosok_jenis": "pocong", "narator": True})], vc, None, lambda m: None)
assert fx[0]["params"] == {"narator": True}, fx
assert D._autofix([s(0, 1, "sosok_dekat")], vc, None, lambda m: None)[0]["template"] != "sosok_dekat"
print("OK pemeriksa")
