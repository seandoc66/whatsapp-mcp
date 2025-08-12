FROM golang:1.19-alpine AS builder

WORKDIR /app

# Copy go mod files
COPY go.* ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Build the application
RUN CGO_ENABLED=1 go build -o whatsapp-bridge main.go

# Final stage
FROM alpine:latest

# Install ca-certificates for HTTPS
RUN apk --no-cache add ca-certificates

WORKDIR /root/

# Copy the binary from builder stage
COPY --from=builder /app/whatsapp-bridge .

# Create store directory
RUN mkdir -p /app/store

# Expose port
EXPOSE 8080

# Run the binary
CMD ["./whatsapp-bridge"]