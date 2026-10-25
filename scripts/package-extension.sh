#!/usr/bin/env bash

set -Eeuo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

manifest_version="$(python3 -c 'import json; print(json.load(open("manifest.json", encoding="utf-8"))["version"])')"
requested_version="${1:-$manifest_version}"

if [[ ! "$requested_version" =~ ^[0-9]+(\.[0-9]+){1,3}$ ]]; then
    printf 'Versão inválida: %s\n' "$requested_version" >&2
    exit 1
fi

if [[ "$manifest_version" != "$requested_version" ]]; then
    printf 'Versão do manifest (%s) difere da versão solicitada (%s).\n' \
        "$manifest_version" "$requested_version" >&2
    exit 1
fi

runtime_files=(
    manifest.json
    background.js
    content.js
    core.js
    popup.html
    popup.js
)

for file in "${runtime_files[@]}"; do
    if [[ ! -f "$file" ]]; then
        printf 'Arquivo runtime ausente: %s\n' "$file" >&2
        exit 1
    fi
done

dist_dir="$repo_root/dist"
artifact="$dist_dir/colab-clicker-v${requested_version}.zip"
checksum_file="$dist_dir/SHA256SUMS"
staging_dir="$(mktemp -d)"

cleanup() {
    rm -rf -- "$staging_dir"
}
trap cleanup EXIT

mkdir -p -- "$dist_dir"
rm -f -- "$artifact" "$checksum_file"

for file in "${runtime_files[@]}"; do
    cp -- "$file" "$staging_dir/"
done

(
    cd "$staging_dir"
    zip -q -X "$artifact" "${runtime_files[@]}"
)

unzip -tq "$artifact"
(
    cd "$dist_dir"
    sha256sum "$(basename "$artifact")"
) > "$checksum_file"

printf 'Pacote criado: %s\n' "$artifact"
printf 'Checksum criado: %s\n' "$checksum_file"
