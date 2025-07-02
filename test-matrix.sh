#!/bin/bash

# Test matrix script for local testing
echo "🧪 Running matrix tests locally..."

# Test configurations
NODE_VERSIONS=("16" "18" "20")
FASTIFY_VERSIONS=("4.x" "5.x")

# Function to run tests
run_test() {
    local node_version=$1
    local fastify_version=$2
    
    echo ""
    echo "================================================"
    echo "📦 Testing Node.js $node_version with Fastify $fastify_version"
    echo "================================================"
    
    # Run in Docker container
    docker run --rm -v "$(pwd)":/app -w /app node:$node_version-alpine sh -c "
        npm ci &&
        npm install fastify@$fastify_version &&
        npm run lint &&
        npm test
    "
    
    if [ $? -eq 0 ]; then
        echo "✅ Node.js $node_version + Fastify $fastify_version: PASSED"
    else
        echo "❌ Node.js $node_version + Fastify $fastify_version: FAILED"
        exit 1
    fi
}

# Run all combinations
for node_ver in "${NODE_VERSIONS[@]}"; do
    for fastify_ver in "${FASTIFY_VERSIONS[@]}"; do
        run_test $node_ver $fastify_ver
    done
done

echo ""
echo "🎉 All matrix tests completed!"