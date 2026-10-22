# Imagem do example-seed: o CLI compilado num binário. Os exports (directory.json, infra.yaml) vêm de fora, num volume.
# Construída desta pasta, um projeto comum que depende só do SDK publicado (a versão do bun.lock):
#   docker build -t example-seed .
FROM oven/bun:1.4.2 AS build
WORKDIR /src
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production
COPY tsconfig.json ./
COPY src src
RUN bun build --compile --outfile /out/example-seed src/cli.ts

FROM debian:bookworm-slim
COPY --from=build /out/example-seed /usr/local/bin/
WORKDIR /workspace
ENTRYPOINT ["example-seed"]
CMD ["--help"]
