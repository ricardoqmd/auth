# Build + run the demo from the monorepo.
# Build context MUST be the repo root (the docker-compose.yml in /docker sets it):
#   docker build -f apps/demo/Dockerfile -t ricardoqmd-auth-demo .
FROM node:22-bookworm-slim

# NEXT_PUBLIC_* are inlined into the client bundle at build time, so they must be
# present during `next build`. Defaults target the bundled Keycloak (browser-side
# at http://localhost:8080). Override via build args for a real deployment, e.g.
#   --build-arg NEXT_PUBLIC_KC_URL=https://keycloak.your-domain.org
ARG NEXT_PUBLIC_KC_URL=http://localhost:8080
ARG NEXT_PUBLIC_KC_REALM=demo
ARG NEXT_PUBLIC_KC_CLIENT_ID=demo-app
ARG NEXT_PUBLIC_API_URL=
ENV NEXT_PUBLIC_KC_URL=$NEXT_PUBLIC_KC_URL \
    NEXT_PUBLIC_KC_REALM=$NEXT_PUBLIC_KC_REALM \
    NEXT_PUBLIC_KC_CLIENT_ID=$NEXT_PUBLIC_KC_CLIENT_ID \
    NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_TELEMETRY_DISABLED=1

RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

WORKDIR /app

# Install with the full workspace so workspace:* deps resolve.
COPY . .
RUN pnpm install --frozen-lockfile

# Build the three packages, then the demo (next build).
RUN pnpm build
RUN pnpm --filter @ricardoqmd-demo/app build

EXPOSE 3000

# -H 0.0.0.0 so the server is reachable from outside the container.
CMD ["pnpm", "--filter", "@ricardoqmd-demo/app", "exec", "next", "start", "-p", "3000", "-H", "0.0.0.0"]
