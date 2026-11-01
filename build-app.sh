#!/usr/bin/env bash
# Build "Aisha's Games.app" — a native macOS wrapper around the local web games.
# Needs the Xcode Command Line Tools (swiftc). Run it again after changing a game.
set -euo pipefail
cd "$(dirname "$0")"

APP="dist/Aisha's Games.app"
CONTENTS="$APP/Contents"

echo "→ cleaning"
rm -rf "$APP"
mkdir -p "$CONTENTS/MacOS" "$CONTENTS/Resources/web"

echo "→ compiling"
swiftc -O -target "$(uname -m)-apple-macosx12.0" \
       -o "$CONTENTS/MacOS/AishaGames" app/main.swift

echo "→ copying games"
cp index.html "$CONTENTS/Resources/web/"
cp -R core games "$CONTENTS/Resources/web/"
# the specs are notes for us, not part of the app
find "$CONTENTS/Resources/web" -name 'spec.md' -delete

echo "→ icon"
if [ ! -f app/icon.icns ]; then
  ICONSET="$(mktemp -d)/AppIcon.iconset"
  mkdir -p "$ICONSET"
  for size in 16 32 128 256 512; do
    sips -z $size $size            app/icon.png --out "$ICONSET/icon_${size}x${size}.png"      >/dev/null
    sips -z $((size*2)) $((size*2)) app/icon.png --out "$ICONSET/icon_${size}x${size}@2x.png"  >/dev/null
  done
  iconutil -c icns "$ICONSET" -o app/icon.icns
fi
cp app/icon.icns "$CONTENTS/Resources/AppIcon.icns"

echo "→ Info.plist"
cat > "$CONTENTS/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key>              <string>Aisha's Games</string>
  <key>CFBundleDisplayName</key>       <string>Aisha's Games</string>
  <key>CFBundleExecutable</key>        <string>AishaGames</string>
  <key>CFBundleIdentifier</key>        <string>com.rpatel.aishagames</string>
  <key>CFBundleIconFile</key>          <string>AppIcon</string>
  <key>CFBundlePackageType</key>       <string>APPL</string>
  <key>CFBundleShortVersionString</key><string>1.0</string>
  <key>CFBundleVersion</key>           <string>1</string>
  <key>LSMinimumSystemVersion</key>    <string>12.0</string>
  <key>LSApplicationCategoryType</key> <string>public.app-category.kids-games</string>
  <key>NSHighResolutionCapable</key>   <true/>
</dict>
</plist>
PLIST

echo "→ signing (ad-hoc)"
codesign --force --deep --sign - "$APP" 2>/dev/null

echo "✓ built $APP"
