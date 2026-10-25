#!/usr/bin/env bash

set -Eeuo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

required_files=(
    manifest.json
    background.js
    content.js
    core.js
    popup.html
    popup.js
)

for file in "${required_files[@]}"; do
    if [[ ! -f "$file" ]]; then
        printf 'Arquivo runtime ausente: %s\n' "$file" >&2
        exit 1
    fi
done

python3 -m json.tool manifest.json >/dev/null
python3 -m json.tool package.json >/dev/null

for file in background.js content.js core.js popup.js; do
    node --check "$file"
done

printf 'Extensão válida: manifest, arquivos runtime e sintaxe JavaScript.\n'
