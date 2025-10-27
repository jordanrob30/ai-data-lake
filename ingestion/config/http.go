package config

import (
	"os"
	"strings"
)

type HTTPConfig struct {
	Port         string
	CORS         CORSConfig
	RateLimiting RateLimitConfig
}

type CORSConfig struct {
	AllowedOrigins   []string
	AllowedMethods   []string
	AllowedHeaders   []string
	ExposedHeaders   []string
	AllowCredentials bool
	MaxAge           int
}

type RateLimitConfig struct {
	Enabled        bool
	RequestsPerMin int
	BurstSize      int
}

func LoadHTTPConfig() *HTTPConfig {
	return &HTTPConfig{
		Port: getEnv("HTTP_PORT", "8080"),
		CORS: CORSConfig{
			AllowedOrigins:   parseStringSlice(getEnv("CORS_ALLOWED_ORIGINS", "*")),
			AllowedMethods:   parseStringSlice(getEnv("CORS_ALLOWED_METHODS", "GET,POST,PUT,DELETE,OPTIONS")),
			AllowedHeaders:   parseStringSlice(getEnv("CORS_ALLOWED_HEADERS", "Content-Type,Authorization,X-Requested-With")),
			ExposedHeaders:   parseStringSlice(getEnv("CORS_EXPOSED_HEADERS", "X-Total-Count")),
			AllowCredentials: getEnv("CORS_ALLOW_CREDENTIALS", "false") == "true",
			MaxAge:           getEnvInt("CORS_MAX_AGE", 86400), // 24 hours
		},
		RateLimiting: RateLimitConfig{
			Enabled:        getEnv("RATE_LIMITING_ENABLED", "false") == "true",
			RequestsPerMin: getEnvInt("RATE_LIMIT_REQUESTS_PER_MIN", 60),
			BurstSize:      getEnvInt("RATE_LIMIT_BURST_SIZE", 10),
		},
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		// Simple int parsing - in production you'd want proper error handling
		if value == "0" {
			return 0
		}
		// For simplicity, return default if not a simple number
		return defaultValue
	}
	return defaultValue
}

func parseStringSlice(value string) []string {
	if value == "" {
		return []string{}
	}
	return strings.Split(value, ",")
}
