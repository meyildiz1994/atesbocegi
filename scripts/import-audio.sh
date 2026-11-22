#!/usr/bin/env bash
# ElevenLabs'tan indirilen ham sesleri oyuna hazırlar (normalize, perde varyasyonları, döngü).
#   scripts/import-audio.sh <chime.mp3> <ambiyans.mp3>
set -euo pipefail
CHIME="$1"; AMB="$2"
OUT="$(dirname "$0")/../assets/audio"
TMP="$(mktemp -d)"
# Toplama çanı: ilk 0.45 sn, sonu yumuşak, tepe -1 dB. 6 perde: pentatonik (0,2,4,7,9,12 yarım ton).
ffmpeg -v error -y -i "$CHIME" -t 0.45 -af "afade=t=out:st=0.3:d=0.15,loudnorm=I=-14:TP=-1:LRA=7" -ar 44100 -ac 1 "$TMP/chime.wav"
i=1
for st in 0 2 4 7 9 12; do
  rate=$(python3 -c "print(round(44100*2**($st/12)))")
  ffmpeg -v error -y -i "$TMP/chime.wav" -af "asetrate=$rate,aresample=44100" -c:a aac -b:a 96k "$OUT/sfx_collect_$i.m4a"
  i=$((i+1))
done
# Ambiyans: normalize, sonu ile başını 2 sn çapraz karıştırarak kesintisiz döngü.
ffmpeg -v error -y -i "$AMB" -af "loudnorm=I=-24:TP=-3" -ar 44100 -ac 2 "$TMP/amb.wav"
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$TMP/amb.wav")
END=$(python3 -c "print($DUR-2)")
ffmpeg -v error -y -i "$TMP/amb.wav" -filter_complex \
  "[0]atrim=0:2,asetpts=PTS-STARTPTS[head];[0]atrim=2:$END,asetpts=PTS-STARTPTS[body];[0]atrim=$END,asetpts=PTS-STARTPTS[tail];[tail][head]amix=inputs=2:normalize=0,afade=t=in:d=2:curve=tri[x];[body][x]concat=n=2:v=0:a=1" \
  -c:a aac -b:a 96k "$OUT/amb_night.m4a"
rm -rf "$TMP"
echo ok
