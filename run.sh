#!/usr/bin/env bash
# Dipanggil systemd. Menyiapkan library CUDA untuk Whisper (jika dipasang) lalu menjalankan layanan.
cd "$(dirname "$0")"
. .venv/bin/activate
LIBS=$(python - <<'EOF' 2>/dev/null
import os
try:
    import nvidia.cublas.lib, nvidia.cudnn.lib
    print(os.path.dirname(nvidia.cublas.lib.__file__) + ":" + os.path.dirname(nvidia.cudnn.lib.__file__))
except Exception:
    pass
EOF
)
[[ -n "$LIBS" ]] && export LD_LIBRARY_PATH="$LIBS:${LD_LIBRARY_PATH:-}"
exec python -m studio
