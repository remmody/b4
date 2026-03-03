# Stage 1: Build the web UI
FROM --platform=$BUILDPLATFORM node:22-alpine AS ui-builder

RUN corepack enable && corepack prepare pnpm@10.18.2 --activate

WORKDIR /app/src/http/ui
COPY src/http/ui/package.json src/http/ui/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY src/http/ui/ ./
ARG VERSION=dev
ENV VITE_APP_VERSION=${VERSION}
RUN pnpm build

# Stage 2: Build the Go binary
FROM --platform=$BUILDPLATFORM golang:1.25-alpine AS go-builder

WORKDIR /app

COPY src/go.mod src/go.sum ./src/
RUN cd src && go mod download

COPY src/ ./src/
COPY --from=ui-builder /app/src/http/ui/dist ./src/http/ui/dist
COPY makefile ./

ARG VERSION=dev
ARG TARGETARCH
ARG TARGETVARIANT

RUN COMMIT=$(echo "docker" ) && \
    DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ) && \
    GOARM=${TARGETVARIANT#v} \
    CGO_ENABLED=0 GOOS=linux GOARCH=${TARGETARCH} go -C src build \
    -trimpath \
    -buildvcs=false \
    -ldflags "-s -w -X main.Version=${VERSION} -X main.Commit=${COMMIT} -X main.Date=${DATE}" \
    -o /b4

# Stage 2.5: UPX compression 
FROM --platform=$TARGETPLATFORM alpine:3.23.3 AS upx-compressor

RUN apk add --no-cache upx

COPY --from=go-builder /b4 /b4
RUN upx --ultra-brute --lzma /b4 -o /b4.upx && upx -t /b4.upx

# Stage 3: Runtime image
FROM alpine:3.23.3

RUN apk add --no-cache \
    iptables ip6tables nftables kmod iproute2 tzdata \
    && rm -rf /var/cache/apk/*

COPY --from=upx-compressor /b4.upx /usr/local/bin/b4

VOLUME /etc/b4
EXPOSE 7000

ENTRYPOINT ["b4"]
