#!/bin/bash

echo "🧪 Testing Node.js 18 compatibility..."

# Test with Docker
echo "Testing with Node 18 + Fastify 4.x..."
docker run --rm -v "$(pwd)":/app -w /app node:18-alpine sh -c "
    npm ci &&
    npm install fastify@4.x &&
    npm run lint &&
    npm test
" 2>&1 | grep -v "npm warn EBADENGINE"

echo ""
echo "Testing with Node 18 + Fastify 5.x..."
docker run --rm -v "$(pwd)":/app -w /app node:18-alpine sh -c "
    npm ci &&
    npm install fastify@5.x &&
    npm test
" 2>&1 | grep -v "npm warn EBADENGINE"

echo ""
echo "✅ Node 18 tests completed!"