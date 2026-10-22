# Imagem dos adaptadores para pipelines, para o cluster e para a carga de exemplo: graph-publish, graph-deployments,
# graph-seed e graph-receiver (o serviço que recebe os pacotes de build, `graph-receiver --api <url>`, porta 3210)
# compilados em binários, sobre uma base com shell, tar e kubectl (o graph-deployments lê os Deployments do cluster com ele).
# Construída da raiz do repositório (o SDK vem do npm, na versão do bun.lock):
#   docker build -t panorama-graph-adapters .
FROM oven/bun:1.4.2 AS build
WORKDIR /src
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production
COPY tsconfig.json ./
COPY src src
RUN bun build --compile --outfile /out/graph-publish src/graph-publish/cli.ts \
 && bun build --compile --outfile /out/graph-deployments src/graph-deployments/cli.ts \
 && bun build --compile --outfile /out/graph-seed src/graph-seed/cli.ts \
 && bun build --compile --outfile /out/graph-receiver src/graph-receiver/cli.ts

FROM debian:bookworm-slim
ARG KUBECTL_VERSION=v1.31.5
ADD --chmod=755 https://dl.k8s.io/release/${KUBECTL_VERSION}/bin/linux/amd64/kubectl /usr/local/bin/kubectl
COPY --from=build /out/graph-publish /out/graph-deployments /out/graph-seed /out/graph-receiver /usr/local/bin/
WORKDIR /workspace
EXPOSE 3210
CMD ["graph-publish", "--help"]
