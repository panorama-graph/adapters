# Imagem do example-seed: o CLI empacotado pelo esbuild num arquivo só, sobre o Node. Os exports (directory.json,
# infra.yaml) vêm de fora, num volume.
# Construída desta pasta, um projeto comum que depende só do SDK publicado (a versão do pnpm-lock.yaml):
#   docker build -t example-seed .
FROM node:24-bookworm-slim AS build
WORKDIR /src
RUN npm install -g pnpm@11.20.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY tsconfig.json ./
COPY src src
RUN pnpm run build

FROM node:24-bookworm-slim
COPY --from=build --chmod=755 /src/dist/example-seed.js /usr/local/lib/example-seed.js
RUN ln -s /usr/local/lib/example-seed.js /usr/local/bin/example-seed
WORKDIR /workspace
ENTRYPOINT ["example-seed"]
CMD ["--help"]
