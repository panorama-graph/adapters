# Imagem dos adaptadores para pipelines, para o cluster e para a carga de exemplo: graph-publish, graph-deployments,
# graph-seed e graph-receiver (o serviço que recebe os pacotes de build, `graph-receiver --api <url>`, porta 3210)
# empacotados pelo esbuild, um arquivo por CLI com as dependências dentro, sobre o Node com shell, tar e kubectl (o
# graph-deployments lê os Deployments do cluster com ele).
# Construída da raiz do repositório (o SDK vem do npm, na versão do pnpm-lock.yaml):
#   docker build -t panorama-graph-adapters .
FROM node:24-bookworm-slim AS build
WORKDIR /src
RUN npm install -g pnpm@11.20.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY tsconfig.json ./
COPY src src
RUN pnpm run build

FROM node:24-bookworm-slim
ARG KUBECTL_VERSION=v1.31.5
ADD --chmod=755 https://dl.k8s.io/release/${KUBECTL_VERSION}/bin/linux/amd64/kubectl /usr/local/bin/kubectl
COPY --from=build --chmod=755 /src/dist/ /usr/local/lib/panorama-graph-adapters/
RUN for cli in graph-publish graph-deployments graph-seed graph-receiver; do \
      ln -s /usr/local/lib/panorama-graph-adapters/$cli.js /usr/local/bin/$cli; \
    done
WORKDIR /workspace
EXPOSE 3210
CMD ["graph-publish", "--help"]
