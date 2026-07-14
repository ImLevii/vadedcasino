# Deterministic production image for Cosmic Luck (Express API + SolidJS SPA).
# This makes the build/start steps come from the repo instead of the
# platform's build/start command fields, which were being concatenated into
#   vite build 'pnpm start' 'npm run server '
# and crashing the container with "Could not resolve entry module".

FROM node:20-bookworm-slim AS build

# Toolchain required to compile native deps (bcrypt, sharp).
RUN apt-get update && apt-get install -y --no-install-recommends \
        python3 \
        make \
        g++ \
        ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# pnpm without relying on corepack prompts.
RUN npm install -g pnpm@8

# Install ALL dependencies (dev included) so the frontend can be built.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# Copy the rest of the source and build the SPA into /app/dist.
COPY . .
RUN pnpm build

# ---------------------------------------------------------------------------

FROM node:20-bookworm-slim AS runtime

ENV NODE_ENV=production
ENV PORT=3000
WORKDIR /app

RUN npm install -g pnpm@8

# Carry over the already-built app, including compiled native modules and dist.
COPY --from=build /app ./

EXPOSE 3000

# `pnpm start` runs `node app.js` (see package.json).
CMD ["pnpm", "start"]
