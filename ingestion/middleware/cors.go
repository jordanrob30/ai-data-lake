package middleware

import (
	"net/http"
	"strconv"
	"strings"

	"ai-data-lake/ingestion/config"
)

type CORSMiddleware struct {
	config *config.CORSConfig
}

func NewCORSMiddleware(cfg *config.CORSConfig) *CORSMiddleware {
	return &CORSMiddleware{
		config: cfg,
	}
}

func (c *CORSMiddleware) Handler(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")

		// Check if origin is allowed
		if c.isOriginAllowed(origin) {
			w.Header().Set("Access-Control-Allow-Origin", origin)
		} else if c.isWildcardAllowed() {
			w.Header().Set("Access-Control-Allow-Origin", "*")
		}

		// Set other CORS headers
		if len(c.config.AllowedMethods) > 0 {
			w.Header().Set("Access-Control-Allow-Methods", strings.Join(c.config.AllowedMethods, ", "))
		}

		if len(c.config.AllowedHeaders) > 0 {
			w.Header().Set("Access-Control-Allow-Headers", strings.Join(c.config.AllowedHeaders, ", "))
		}

		if len(c.config.ExposedHeaders) > 0 {
			w.Header().Set("Access-Control-Expose-Headers", strings.Join(c.config.ExposedHeaders, ", "))
		}

		if c.config.AllowCredentials {
			w.Header().Set("Access-Control-Allow-Credentials", "true")
		}

		if c.config.MaxAge > 0 {
			w.Header().Set("Access-Control-Max-Age", strconv.Itoa(c.config.MaxAge))
		}

		// Handle preflight requests
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next(w, r)
	}
}

func (c *CORSMiddleware) isOriginAllowed(origin string) bool {
	if origin == "" {
		return false
	}

	for _, allowedOrigin := range c.config.AllowedOrigins {
		if allowedOrigin == origin {
			return true
		}
		// Support wildcard subdomains like *.example.com
		if strings.HasPrefix(allowedOrigin, "*.") {
			domain := strings.TrimPrefix(allowedOrigin, "*.")
			if strings.HasSuffix(origin, domain) {
				return true
			}
		}
	}

	return false
}

func (c *CORSMiddleware) isWildcardAllowed() bool {
	for _, origin := range c.config.AllowedOrigins {
		if origin == "*" {
			return true
		}
	}
	return false
}

// Apply CORS headers directly to a response writer (for simple cases)
func ApplyCORSHeaders(w http.ResponseWriter, cfg *config.CORSConfig, origin string) {
	corsMiddleware := NewCORSMiddleware(cfg)

	// Simulate the middleware logic
	if corsMiddleware.isOriginAllowed(origin) {
		w.Header().Set("Access-Control-Allow-Origin", origin)
	} else if corsMiddleware.isWildcardAllowed() {
		w.Header().Set("Access-Control-Allow-Origin", "*")
	}

	if len(cfg.AllowedMethods) > 0 {
		w.Header().Set("Access-Control-Allow-Methods", strings.Join(cfg.AllowedMethods, ", "))
	}

	if len(cfg.AllowedHeaders) > 0 {
		w.Header().Set("Access-Control-Allow-Headers", strings.Join(cfg.AllowedHeaders, ", "))
	}
}
