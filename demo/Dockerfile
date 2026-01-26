FROM node:20-slim

WORKDIR /workspace

# Prebundle runtime dependencies for PRD execution.
RUN printf '{\n  "name": "gateproof-prd-sandbox",\n  "type": "module",\n  "private": true,\n  "dependencies": {\n    "gateproof": "^0.2.0",\n    "tsx": "^4.20.5"\n  }\n}\n' > /workspace/package.json

RUN npm install

ENV NODE_ENV=production
EXPOSE 8787
