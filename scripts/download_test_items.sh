#!/bin/bash
# Grabs 19 curated transparent PNGs from pngimg.com (free license) into the
# Miaurmario storage volume for the dev user. Idempotent: re-running skips
# files that already exist. After this, run scripts/seed_test_items.py inside
# the backend container to insert matching DB rows.
#
# Override USER_ID and STORAGE_DIR via env if seeding a different user or a
# host mount located elsewhere.
set -e

USER_ID="${USER_ID:-99571cf5-f0f5-409c-85de-d9ba717f2305}"
STORAGE_DIR="${STORAGE_DIR:-/home/andrei/servicios/wardrowbe/data/uploads}/${USER_ID}"

mkdir -p "$STORAGE_DIR"

# 19 curated items: slug|url
ITEMS=(
  "miaur-tshirt-black-oversized|https://pngimg.com/uploads/tshirt/tshirt_PNG5425.png"
  "miaur-polo-cream-classic|https://pngimg.com/uploads/polo_shirt/polo_shirt_PNG8138.png"
  "miaur-sweater-cable-cream|https://pngimg.com/uploads/sweater/sweater_PNG10.png"
  "miaur-sweater-burgundy|https://pngimg.com/uploads/sweater/sweater_PNG12.png"
  "miaur-jeans-wide-leg-blue|https://pngimg.com/uploads/jeans/jeans_PNG5745.png"
  "miaur-jeans-black-skinny|https://pngimg.com/uploads/jeans/jeans_PNG5747.png"
  "miaur-jeans-white-cropped|https://pngimg.com/uploads/jeans/jeans_PNG5749.png"
  "miaur-leggings-black-textured|https://pngimg.com/uploads/leggings/leggings_PNG10.png"
  "miaur-dress-slip-black|https://pngimg.com/uploads/dress/dress_PNG100.png"
  "miaur-dress-red-cocktail|https://pngimg.com/uploads/dress/dress_PNG101.png"
  "miaur-kimono-floral|https://pngimg.com/uploads/kimono/kimono_PNG10.png"
  "miaur-jacket-denim-blue|https://pngimg.com/uploads/jacket/jacket_PNG8025.png"
  "miaur-coat-camel-long|https://pngimg.com/uploads/coat/coat_PNG10.png"
  "miaur-leather-jacket-black|https://pngimg.com/uploads/leather_jacket/leather_jacket_PNG10.png"
  "miaur-boots-black-combat|https://pngimg.com/uploads/boots/boots_PNG7779.png"
  "miaur-heels-red-louboutin|https://pngimg.com/uploads/louboutin/louboutin_PNG10828.png"
  "miaur-sneakers-converse-white|https://pngimg.com/uploads/converse/converse_PNG10.png"
  "miaur-bag-black-crossbody|https://pngimg.com/uploads/women_bag/women_bag_PNG6393.png"
  "miaur-hat-cream-fedora|https://pngimg.com/uploads/hat/hat_PNG5689.png"
)

echo "Downloading ${#ITEMS[@]} items to $STORAGE_DIR"

for entry in "${ITEMS[@]}"; do
  slug="${entry%%|*}"
  url="${entry##*|}"
  dest="${STORAGE_DIR}/${slug}.png"
  if [[ -f "$dest" ]]; then
    echo "  ✓ $slug (already present)"
    continue
  fi
  http_code=$(curl -sS -w "%{http_code}" -o "$dest" "$url" 2>/dev/null || echo "fail")
  size=$(stat -c%s "$dest" 2>/dev/null || echo 0)
  if [[ "$http_code" == "200" && "$size" -gt 10000 ]]; then
    echo "  ✓ $slug ($size bytes)"
  else
    echo "  ✗ $slug FAILED (HTTP $http_code, $size bytes)"
    rm -f "$dest"
  fi
done

echo
echo "Fixing ownership so the FastAPI process can read the files"
sudo chown -R 1000:1000 "$STORAGE_DIR" 2>/dev/null || chown -R 1000:1000 "$STORAGE_DIR" 2>/dev/null || true
ls -la "$STORAGE_DIR" | tail -22
