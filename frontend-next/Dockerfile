# Use the internal Harbor mirror — Docker Hub is not reachable from this network.
# This is the same node image the legacy CRA frontend uses.
ARG NODE_IMAGE=harbor.int.taqniat.ae/library/node@sha256:c5847f1185e06add3909f70790d0057aed3f51c4f64b637ff4b558447bd0dd27

# ---- Builder ----
FROM ${NODE_IMAGE} AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- Runner ----
# Next.js standalone mode produces a minimal Node.js server, so we use the
# same Node image (NOT nginx — nginx would only work for static output).
FROM ${NODE_IMAGE} AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Create a non-root user. The harbor node image is Debian-based, so use
# the Debian-style useradd (not alpine's adduser).
RUN groupadd --system --gid 1001 nodejs && \
    useradd  --system --uid 1001 --gid nodejs --shell /bin/false nextjs

# Copy the standalone server + its static assets + public folder.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000

# Use node itself for the healthcheck — wget/curl are not installed in the
# harbor node image and we want to avoid apt layers.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3000/healthz',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "server.js"]
