FROM node:20-alpine
WORKDIR /addon
COPY source/ .
RUN npm ci --production 2>/dev/null || npm install --production 2>/dev/null || true
RUN mkdir -p /output && tar -czf /output/addon.tar.gz -C /addon .
