"""
Kavanoz boşaltma sesini kodla üretir (numpy + ffmpeg). --all ile toplama ve ambiyans
yer tutucularını da üretir (ElevenLabs sürümleri scripts/import-audio.sh ile gelir).

  python3 scripts/synth-sfx.py
"""
import os
import subprocess
import wave

import numpy as np

SR = 44100
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'audio')
rng = np.random.default_rng(7)


def write(name, x):
    x = x / (np.max(np.abs(x)) + 1e-9) * 0.85
    pcm = (x * 32767).astype(np.int16)
    tmp = f'/tmp/{name}.wav'
    with wave.open(tmp, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp, '-c:a', 'aac', '-b:a', '96k',
                    os.path.join(OUT, f'{name}.m4a')], check=True)


def t(sec):
    return np.arange(int(SR * sec)) / SR


def chime(freq, dur=0.45):
    x = t(dur)
    partials = [(1, 1.0, 9), (2.76, 0.35, 14), (5.4, 0.15, 22), (8.93, 0.06, 30)]
    s = sum(a * np.sin(2 * np.pi * freq * m * x) * np.exp(-d * x) for m, a, d in partials)
    attack = np.minimum(1, x / 0.004)
    return s * attack


def lowpass(x, alpha):
    y = np.zeros_like(x)
    acc = 0.0
    for i, v in enumerate(x):
        acc += alpha * (v - acc)
        y[i] = acc
    return y


def whoosh(dur=1.1):
    x = t(dur)
    n = rng.standard_normal(len(x))
    env = np.sin(np.pi * np.clip(x / dur, 0, 1)) ** 2
    # Yükselen filtreli gürültü: blok blok farklı alfa.
    out = np.zeros_like(n)
    blocks = 40
    size = len(n) // blocks
    acc = 0.0
    for b in range(blocks):
        a = 0.02 + 0.25 * (b / blocks)
        for i in range(b * size, (b + 1) * size):
            acc += a * (n[i] - acc)
            out[i] = acc
    swell = 0.6 * sum(chime(f, dur) * np.clip((x - 0.35) / 0.3, 0, 1) for f in (523.25, 659.25, 783.99))
    return out * env * 1.5 + swell * 0.5


def crickets(dur=12.0):
    x = t(dur)
    out = np.zeros_like(x)
    for voice in range(4):
        f = 4200 + voice * 380
        rate = 0.55 + 0.2 * voice
        phase = rng.uniform(0, 1)
        carrier = np.sin(2 * np.pi * f * x)
        trill = (np.sin(2 * np.pi * 32 * x) > 0.2).astype(float)
        gate = ((x * rate + phase) % 1.0 < 0.22).astype(float)
        out += carrier * trill * lowpass(gate, 0.002) * (0.12 + 0.05 * voice)
    wind = lowpass(rng.standard_normal(len(x)), 0.01)
    wind *= 0.6 + 0.4 * np.sin(2 * np.pi * x / dur * 2)
    mix = out + wind * 0.9
    fade = int(SR * 0.5)  # döngü sınırında tık olmasın
    ramp = np.linspace(0, 1, fade)
    mix[:fade] *= ramp
    mix[-fade:] *= ramp[::-1]
    return mix * 0.5


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    # Toplama çanı ve ambiyans artık ElevenLabs'tan (scripts/import-audio.sh).
    # Kodla üretilmiş sürümler için: --all
    import sys
    if '--all' in sys.argv:
        for i, f in enumerate([1046.5, 1174.7, 1318.5, 1568.0, 1760.0, 2093.0], start=1):
            write(f'sfx_collect_{i}', chime(f))
        write('amb_night', crickets())
    write('sfx_jar_empty', whoosh())
    print('ok')
