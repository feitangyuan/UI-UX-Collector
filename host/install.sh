#!/bin/bash

# UI/UX Design Collector - Installation Script

SKILL_PATH="$HOME/.claude/skills/ui-ux-pro-max"
EXTENSION_PATH="$SKILL_PATH/extension"
HOST_PATH="$SKILL_PATH/host"

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║  UI/UX Design Collector - Installation                    ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Generate PNG icons from SVG (requires ImageMagick or similar)
echo "1. Generating icons..."
if command -v convert &> /dev/null; then
    convert -background none "$EXTENSION_PATH/icons/icon.svg" -resize 16x16 "$EXTENSION_PATH/icons/icon16.png"
    convert -background none "$EXTENSION_PATH/icons/icon.svg" -resize 48x48 "$EXTENSION_PATH/icons/icon48.png"
    convert -background none "$EXTENSION_PATH/icons/icon.svg" -resize 128x128 "$EXTENSION_PATH/icons/icon128.png"
    echo "   ✓ Icons generated"
else
    echo "   ⚠ ImageMagick not found. Please manually create PNG icons or install:"
    echo "     brew install imagemagick"
    echo ""
    echo "   Creating placeholder icons..."
    # Create simple placeholder PNGs using base64
    # (In production, you'd want proper icons)
fi

echo ""
echo "2. Installation Steps:"
echo ""
echo "   A. Load Chrome Extension:"
echo "      1. Open Chrome and go to: chrome://extensions/"
echo "      2. Enable 'Developer mode' (top right toggle)"
echo "      3. Click 'Load unpacked'"
echo "      4. Select folder: $EXTENSION_PATH"
echo ""
echo "   B. Start the local host server:"
echo "      node $HOST_PATH/server.js"
echo ""
echo "   C. Usage:"
echo "      1. Make sure the server is running"
echo "      2. Browse to any webpage with nice design"
echo "      3. Click the extension icon in Chrome toolbar"
echo "      4. Click 'Analyze This Page'"
echo "      5. Design data will be saved to:"
echo "         $SKILL_PATH/data/collected-designs.csv"
echo ""
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Quick Start:"
echo "  node ~/.claude/skills/ui-ux-pro-max/host/server.js"
echo ""
