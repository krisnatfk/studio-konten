#!/usr/bin/env bash
# Installer Horor Studio untuk Ubuntu 24.04 LTS
#   ./install.sh               -> pasang semua (Whisper CPU/GPU otomatis)
#   ./install.sh --whisper-gpu -> tambah library CUDA untuk Whisper di GPU (±1,5 GB unduhan)
#   ./install.sh --no-whisper  -> tanpa Whisper (naskah wajib dikirim)
set -euo pipefail
cd "$(dirname "$0")"
DIR="$(pwd)"
WGPU=0; NOWH=0
for a in "$@"; do
  [[ "$a" == "--whisper-gpu" ]] && WGPU=1
  [[ "$a" == "--no-whisper" ]] && NOWH=1
done

echo "==> Paket sistem (butuh sudo)"
sudo apt-get update
sudo apt-get install -y python3-venv python3-pip ffmpeg fonts-noto-core fonts-inter fonts-dejavu-core curl

echo "==> Virtualenv Python"
python3 -m venv .venv
. .venv/bin/activate
pip install --upgrade pip wheel
pip install -r requirements.txt
if [[ $NOWH -eq 0 ]]; then
  pip install "faster-whisper>=1.1"
  if [[ $WGPU -eq 1 ]]; then pip install nvidia-cublas-cu12 "nvidia-cudnn-cu12==9.*"; fi
fi

echo "==> Chromium untuk render (Playwright)"
python -m playwright install --with-deps chromium

[[ -f .env ]] || cp .env.example .env
mkdir -p data

echo "==> Service systemd"
SVC=/etc/systemd/system/horor-studio.service
sudo tee $SVC >/dev/null <<EOF
[Unit]
Description=Horor Studio (bot Telegram + render animasi)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$DIR
ExecStart=$DIR/run.sh
Restart=always
RestartSec=5
Nice=5

[Install]
WantedBy=multi-user.target
EOF
chmod +x run.sh
sudo systemctl daemon-reload
sudo systemctl enable horor-studio

echo
echo "Selesai. Langkah berikutnya:"
echo "  1. nano $DIR/.env   (isi TELEGRAM_BOT_TOKEN, cek LLM_BASE_URL & LLM_MODEL)"
echo "  2. sudo systemctl start horor-studio"
echo "  3. journalctl -u horor-studio -f   (lihat log)"
