#!/bin/bash
# Installs the tooling for troy-video/ (norostyle motion pipeline) in Claude Code cloud sessions.
set -euo pipefail
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then exit 0; fi
cd "${CLAUDE_PROJECT_DIR:-.}"

if ! command -v ffmpeg >/dev/null; then apt-get update; apt-get install -y ffmpeg; fi

# Python packages for prep.py / audio.py / transcription (system Python)
pyhashes="$(python3 -I -c 'import sysconfig; print(sysconfig.get_path("purelib"))')/.session-start.sha256"
if ! sha256sum --check --status "$pyhashes" 2>/dev/null; then
  rm -f "$pyhashes"
  python3 -m pip install -q -r troy-video/requirements.txt
  sha256sum .claude/hooks/session-start.sh troy-video/requirements.txt > "$pyhashes" || rm -f "$pyhashes"
fi

# LaMa inpainting model (git-ignored, 200 MB): fetch once
if [ ! -s troy-video/models/lama.onnx ]; then
  mkdir -p troy-video/models
  curl -sL -o troy-video/models/lama.onnx.part "https://huggingface.co/Carve/LaMa-ONNX/resolve/main/lama_fp32.onnx"
  mv troy-video/models/lama.onnx.part troy-video/models/lama.onnx
fi
