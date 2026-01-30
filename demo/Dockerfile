# Use Cloudflare's sandbox base image
# Already includes: Ubuntu 22.04, Node.js 20, Bun 1.x, and the sandbox server
FROM docker.io/cloudflare/sandbox:0.7.0

WORKDIR /workspace

# Prebundle runtime dependencies for PRD execution
RUN printf '{\n  "name": "gateproof-prd-sandbox",\n  "type": "module",\n  "private": true,\n  "dependencies": {\n    "gateproof": "^0.2.0",\n    "tsx": "^4.20.5"\n  }\n}\n' > /workspace/package.json

RUN npm install

ENV NODE_ENV=production
