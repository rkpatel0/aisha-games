#!/usr/bin/env bash
# Rebuild levels-data.js — the 30 grown-up levels, made ahead of time so the
# big ones load instantly. Uses macOS's built-in JavaScript (osascript), so no
# Node needed. Seeded: the same code always makes the same levels.
#
#   games/abc-caterpillar/tools/make-levels.sh
set -euo pipefail
DIR="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT

{
  cat "$DIR/puzzles.js"
  cat <<'JS'
const used = new Set();
const levels = CaterpillarPuzzles.LEVELS.map((_, i) => {
  const p = CaterpillarPuzzles.level(i + 1, used);
  if (!p) throw new Error('could not make level ' + (i + 1));
  if (p.text) used.add(p.text);
  return p;
});
'/* Made by tools/make-levels.sh from puzzles.js — do not edit by hand. */\n' +
'const CaterpillarLevels = [\n' + levels.map((p) => '  ' + JSON.stringify(p)).join(',\n') + ',\n];\n';
JS
} > "$TMP/make.js"

osascript -l JavaScript "$TMP/make.js" > "$DIR/levels-data.js"
echo "✓ wrote levels-data.js ($(grep -c '"v":' "$DIR/levels-data.js") levels)"
