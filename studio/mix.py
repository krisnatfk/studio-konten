"""Mixing audio: voice over + ambience (angin, dengung, jangkrik) + SFX di detik event + loudnorm."""
import subprocess
from pathlib import Path

from .config import Cfg

SFX_SRC = {
    "tok.wav": "(sin(2*PI*190*t)*0.9+sin(2*PI*410*t)*0.35+(random(0)*2-1)*0.6*exp(-t*120))*exp(-t*24)",
    "door.wav": "(sin(2*PI*120*t)*0.9+(random(0)*2-1)*0.4*exp(-t*140))*exp(-t*20)",
    "far.wav": "(sin(2*PI*260*t)*0.8+sin(2*PI*520*t)*0.25)*exp(-t*30)",
    "brak.wav": "((random(0)*2-1)*0.9*exp(-t*9)+sin(2*PI*70*t)*0.8*exp(-t*6))",
}


def ensure_sfx():
    Cfg.SFX_DIR.mkdir(parents=True, exist_ok=True)
    for name, expr in SFX_SRC.items():
        p = Cfg.SFX_DIR / name
        if not p.exists():
            d = 0.9 if name == "brak.wav" else 0.5
            subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", f"aevalsrc='{expr}':d={d}:s=44100", "-ac", "2", str(p)], check=True)


def mix(vo, out, duration, events, style, bgm=None):
    ensure_sfx()
    D = f"{duration:.3f}"
    amb = style.get("ambience", {})
    inp = ["-i", str(vo)]
    fc = [f"[0:a]aresample=44100,aformat=channel_layouts=stereo,highpass=f=70" +
          (",aecho=0.85:0.5:110:0.16" if style.get("vo_echo", True) else "") + f",volume=1.25,apad=whole_dur={D}[vo]"]
    labels = ["[vo]"]
    k = 1

    def add_lavfi(src, chain, name):
        nonlocal k
        inp.extend(["-f", "lavfi", "-t", D, "-i", src])
        fc.append(f"[{k}:a]aformat=channel_layouts=stereo,{chain}[{name}]")
        labels.append(f"[{name}]")
        k += 1

    end_fade = max(0.0, duration - 3)
    if amb.get("angin"):
        add_lavfi("anoisesrc=color=pink:amplitude=0.5:sample_rate=44100",
                  f"bandpass=f=420:width_type=h:w=500,tremolo=f=0.13:d=0.7,volume={amb['angin']},afade=t=in:d=3,afade=t=out:st={end_fade:.2f}:d=3", "wind")
    if amb.get("dengung"):
        add_lavfi("sine=f=55:sample_rate=44100", f"tremolo=f=0.2:d=0.5,volume={amb['dengung']},afade=t=in:d=4", "d1")
    if amb.get("dengung2"):
        add_lavfi("sine=f=82.4:sample_rate=44100", f"tremolo=f=0.15:d=0.6,volume={amb['dengung2']},afade=t=in:d=6", "d2")
    if amb.get("jangkrik"):
        stop = duration
        if amb.get("jangkrik_berhenti_sebelum_ketuk"):
            kn = [e["t"] for e in events if e["type"] == "ketuk"]
            if kn and kn[0] > duration * 0.25:
                stop = max(0.0, kn[0] - 2.0)
        add_lavfi("sine=f=4300:sample_rate=44100", f"tremolo=f=26:d=1,tremolo=f=2.3:d=1,volume='if(lt(t,{stop:.2f}),{amb['jangkrik']},0)':eval=frame,afade=t=in:d=3", "cri")
    if amb.get("swell_akhir"):
        s0 = max(0.0, duration - 8)
        add_lavfi("sine=f=41:sample_rate=44100", f"volume='{amb['swell_akhir']}*min(1,max(0,(t-{s0:.2f})/6))':eval=frame", "sw")
    if bgm and Path(bgm).exists():
        inp += ["-stream_loop", "-1", "-i", str(bgm)]
        fc.append(f"[{k}:a]aresample=44100,aformat=channel_layouts=stereo,atrim=0:{D},volume={style.get('bgm_volume', 0.25)},afade=t=in:d=2,afade=t=out:st={end_fade:.2f}:d=3[bgm]")
        labels.append("[bgm]")
        k += 1
    sfx = style.get("sfx", {})
    for e in events[:60]:
        s = sfx.get(e["type"])
        if not s:
            continue
        p = Cfg.SFX_DIR / s["file"]
        if not p.exists():
            continue
        ms = max(0, int(e["t"] * 1000))
        inp += ["-i", str(p)]
        fc.append(f"[{k}:a]aresample=44100,aformat=channel_layouts=stereo,volume={s['vol']},adelay={ms}|{ms}[e{k}]")
        labels.append(f"[e{k}]")
        k += 1
    fc.append("".join(labels) + f"amix=inputs={len(labels)}:normalize=0:duration=longest,alimiter=limit=0.95,"
              f"loudnorm=I=-16:TP=-1.5:LRA=11,afade=t=out:st={max(0.0, duration - 1.1):.2f}:d=1.1,atrim=0:{D}[out]")
    cmd = ["ffmpeg", "-y", "-v", "error"] + inp + ["-filter_complex", ";".join(fc), "-map", "[out]", "-ar", "44100", "-c:a", "aac", "-b:a", "192k", str(out)]
    subprocess.run(cmd, check=True, capture_output=True, text=True)
    return out
