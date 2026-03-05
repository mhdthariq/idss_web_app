#!/usr/bin/env bash
set -euo pipefail

echo "=== Building for Vercel (Build Output API) ==="

# Clean previous output
rm -rf .vercel/output

# Create Build Output API directory structure
mkdir -p .vercel/output/functions/api/index.func
mkdir -p .vercel/output/static

# Bundle the serverless function with Bun targeting Node.js
echo "Bundling api/index.ts with Bun..."
bun build api/index.ts \
  --outfile=.vercel/output/functions/api/index.func/index.mjs \
  --target=node \
  --bundle \
  --minify

echo "Bundle size: $(du -sh .vercel/output/functions/api/index.func/index.mjs | cut -f1)"

# Copy data directory into the function so it's available at runtime
echo "Copying data files into function..."
cp -r data .vercel/output/functions/api/index.func/data

echo "Data directory size: $(du -sh .vercel/output/functions/api/index.func/data | cut -f1)"

# Create a package.json inside the function directory to enable ESM
cat > .vercel/output/functions/api/index.func/package.json << 'EOF'
{
  "type": "module"
}
EOF

# Create the function config (.vc-config.json)
# Use nodejs20.x runtime with ESM handler
cat > .vercel/output/functions/api/index.func/.vc-config.json << 'EOF'
{
  "runtime": "nodejs20.x",
  "handler": "index.mjs",
  "launcherType": "Nodejs",
  "maxDuration": 30,
  "memory": 1024,
  "supportsResponseStreaming": true
}
EOF

# Create the top-level config.json for routing
# All requests get routed to our single serverless function
cat > .vercel/output/config.json << 'EOF'
{
  "version": 3,
  "routes": [
    {
      "handle": "filesystem"
    },
    {
      "src": "/(.*)",
      "dest": "/api/index"
    }
  ]
}
EOF

echo ""
echo "=== Build Output API structure ==="
find .vercel/output -type f | sort
echo ""
echo "=== Build complete ==="
