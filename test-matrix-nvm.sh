#!/bin/bash

# Test matrix script using nvm
echo "🧪 Running matrix tests with nvm..."

# Check if nvm is installed
if ! command -v nvm &> /dev/null; then
    echo "❌ nvm is not installed. Please install nvm first."
    echo "Visit: https://github.com/nvm-sh/nvm"
    exit 1
fi

# Test configurations
NODE_VERSIONS=("16" "18" "20")
FASTIFY_VERSIONS=("4.x" "5.x")

# Save current node version
CURRENT_NODE=$(nvm current)

# Function to run tests
run_test() {
    local node_version=$1
    local fastify_version=$2
    
    echo ""
    echo "================================================"
    echo "📦 Testing Node.js $node_version with Fastify $fastify_version"
    echo "================================================"
    
    # Switch Node version
    nvm use $node_version || nvm install $node_version
    
    # Clean install
    rm -rf node_modules package-lock.json
    npm install
    npm install fastify@$fastify_version
    
    # Run tests
    npm run lint && npm test
    
    if [ $? -eq 0 ]; then
        echo "✅ Node.js $node_version + Fastify $fastify_version: PASSED"
    else
        echo "❌ Node.js $node_version + Fastify $fastify_version: FAILED"
    fi
}

# Run all combinations
for node_ver in "${NODE_VERSIONS[@]}"; do
    for fastify_ver in "${FASTIFY_VERSIONS[@]}"; do
        run_test $node_ver $fastify_ver
    done
done

# Restore original Node version
nvm use $CURRENT_NODE

echo ""
echo "🎉 All matrix tests completed!"