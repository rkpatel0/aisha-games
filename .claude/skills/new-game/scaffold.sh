#!/usr/bin/env bash
# Scaffold a new game folder from the templates and register it on the picker.
#
#   scaffold.sh <id> <Title> [emoji] [blurb] [players] [accent]
#
#   id       kebab-case folder name, e.g. counting-carrots
#   Title    display name, e.g. "Counting Carrots"
#   emoji    one emoji for the tab, header and tile      (default 🎮)
#   blurb    one line shown on the picker tile            (default "A new game!")
#   players  e.g. "1 player" / "2 players"                (default "1 player")
#   accent   CSS colour for the game's highlights         (default #8b5cf6)
set -euo pipefail

SKILL_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SKILL_DIR/../../.." && pwd)"

ID="${1:?usage: scaffold.sh <id> <Title> [emoji] [blurb] [players] [accent]}"
TITLE="${2:?missing Title}"
EMOJI="${3:-🎮}"
BLURB="${4:-A new game!}"
PLAYERS="${5:-1 player}"
ACCENT="${6:-#8b5cf6}"

[[ "$ID" =~ ^[a-z][a-z0-9-]*$ ]] || { echo "id must be kebab-case: $ID" >&2; exit 1; }

DEST="$ROOT/games/$ID"
# An existing folder is fine (the brief usually lands there first) — but never
# clobber a game that has already been built.
for existing in index.html game.css game.js; do
  [ -e "$DEST/$existing" ] && { echo "games/$ID/$existing already exists" >&2; exit 1; }
done

# CSS prefix: initials for a multi-word id (counting-carrots -> cc), otherwise
# the first three letters (amaze -> ama). One letter is too collision-prone.
if [[ "$ID" == *-* ]]; then
  PREFIX="$(echo "$ID" | awk -F- '{ for (i=1; i<=NF; i++) printf substr($i,1,1) }')"
else
  PREFIX="${ID:0:3}"
fi

mkdir -p "$DEST"
for file in index.html game.css game.js; do
  sed -e "s|{{ID}}|$ID|g" \
      -e "s|{{TITLE}}|$TITLE|g" \
      -e "s|{{EMOJI}}|$EMOJI|g" \
      -e "s|{{PREFIX}}|$PREFIX|g" \
      -e "s|{{ACCENT}}|$ACCENT|g" \
      "$SKILL_DIR/templates/$file" > "$DEST/$file"
done

# Register on the picker (idempotent).
ROOT="$ROOT" ID="$ID" TITLE="$TITLE" EMOJI="$EMOJI" BLURB="$BLURB" \
PLAYERS="$PLAYERS" ACCENT="$ACCENT" python3 - <<'PY'
import os, re
root = os.environ['ROOT']
path = os.path.join(root, 'core', 'games.js')
src = open(path).read()
gid = os.environ['ID']

if f"id: '{gid}'" in src:
    print(f"  core/games.js already lists {gid}")
else:
    entry = (
        "  {\n"
        f"    id: '{gid}',\n"
        f"    title: '{os.environ['TITLE']}',\n"
        f"    emoji: '{os.environ['EMOJI']}',\n"
        f"    dir: 'games/{gid}/index.html',\n"
        f"    blurb: '{os.environ['BLURB']}',\n"
        f"    players: '{os.environ['PLAYERS']}',\n"
        f"    accent: '{os.environ['ACCENT']}',\n"
        "  },\n"
    )
    src = re.sub(r"\n\];\s*$", "\n" + entry + "];\n", src)
    open(path, 'w').write(src)
    print("  registered in core/games.js")
PY

echo "✓ created games/$ID  (css prefix .$PREFIX-)"
echo
echo "Next:"
echo "  1. save the brief as games/$ID/spec.md"
echo "  2. replace the placeholder round in games/$ID/game.js"
echo "  3. ./serve.sh  → http://localhost:8777/games/$ID/index.html"
echo "  4. ./build-app.sh  to fold it into the Mac app"
