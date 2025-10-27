package main

import (
	"crypto/sha256"
	"encoding/csv"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"ai-data-lake/ingestion/config"
	"ai-data-lake/ingestion/kafka"
	"ai-data-lake/ingestion/middleware"
	"ai-data-lake/ingestion/platform"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

var httpConfig *config.HTTPConfig
var corsMiddleware *middleware.CORSMiddleware
var kafkaProducer *kafka.Producer
var platformClient *platform.Client

// processIncomingData handles the main logic for processing incoming data
func processIncomingData(tenantID string, data map[string]interface{}) error {
	// Generate schema hash
	schemaHash := generateSchemaHash(data)

	// Check if schema exists and is confirmed
	existingSchema, err := platformClient.GetSchemaByHash(schemaHash, tenantID)
	if err != nil {
		log.Printf("Error checking existing schema: %v", err)
		// Continue processing even if API call fails
	}

	if existingSchema != nil && existingSchema.Status == "confirmed" {
		// Schema is confirmed, process normally
		log.Printf("Schema %s is confirmed, processing data normally", schemaHash)
		return storeBronzeForTenant(tenantID, data)
	}

	// Schema is not confirmed or doesn't exist
	if existingSchema == nil {
		// Create new schema confirmation request
		detectedFields := detectFields(data, "")

		// Convert detected fields to the format expected by platform API
		var platformFields []map[string]interface{}
		for _, field := range detectedFields {
			platformFields = append(platformFields, map[string]interface{}{
				"name":         field.Name,
				"type":         field.Type,
				"sample_value": field.SampleValue,
				"required":     field.Required,
			})
		}

		// Generate Kafka topic name
		kafkaTopic := fmt.Sprintf("schema-%s", schemaHash)

		createReq := platform.CreateSchemaRequest{
			Hash:           schemaHash,
			KafkaTopic:     kafkaTopic,
			TenantID:       tenantID,
			SampleData:     data,
			DetectedFields: platformFields,
		}

		_, err := platformClient.CreateSchema(createReq)
		if err != nil {
			log.Printf("Error creating schema confirmation: %v", err)
			// Continue to queue the data even if schema creation fails
		} else {
			log.Printf("Created schema confirmation request for hash: %s", schemaHash)
		}

		// Create Kafka topic for this schema
		err = kafkaProducer.CreateTopic(schemaHash)
		if err != nil {
			log.Printf("Error creating Kafka topic for schema %s: %v", schemaHash, err)
		}
	}

	// Queue the data in Kafka until schema is confirmed
	log.Printf("Queuing data in Kafka for unconfirmed schema: %s", schemaHash)
	err = kafkaProducer.SendRecord(tenantID, schemaHash, data)
	if err != nil {
		return err
	}

	// Increment the pending records count in the platform database
	err = platformClient.IncrementPendingRecords(schemaHash, tenantID)
	if err != nil {
		log.Printf("Error incrementing pending records for schema %s: %v", schemaHash, err)
		// Don't fail the entire operation if pending records increment fails
	}

	return nil
}

// generateSchemaHash creates a consistent hash for the data structure
func generateSchemaHash(data map[string]interface{}) string {
	// Extract field names and types to create a consistent schema signature
	var fields []string
	extractFields(data, "", &fields)

	// Sort fields for consistent hashing
	sort.Strings(fields)

	// Create hash
	h := sha256.New()
	h.Write([]byte(strings.Join(fields, "|")))
	return hex.EncodeToString(h.Sum(nil))[:16] // Use first 16 chars for readability
}

// extractFields recursively extracts field names and types from nested data
func extractFields(data map[string]interface{}, prefix string, fields *[]string) {
	for key, value := range data {
		fieldName := key
		if prefix != "" {
			fieldName = fmt.Sprintf("%s.%s", prefix, key)
		}

		if nestedMap, ok := value.(map[string]interface{}); ok {
			// Recursively process nested objects
			extractFields(nestedMap, fieldName, fields)
		} else {
			// Add field with its type
			fieldType := getValueType(value)
			*fields = append(*fields, fmt.Sprintf("%s:%s", fieldName, fieldType))
		}
	}
}

// getValueType returns a simplified type string for consistent hashing
func getValueType(value interface{}) string {
	switch value.(type) {
	case nil:
		return "null"
	case bool:
		return "boolean"
	case int, int8, int16, int32, int64, uint, uint8, uint16, uint32, uint64:
		return "integer"
	case float32, float64:
		return "float"
	case string:
		return "string"
	case []interface{}:
		return "array"
	case map[string]interface{}:
		return "object"
	default:
		return "mixed"
	}
}

type Field struct {
	Name        string                 `json:"name"`
	Type        string                 `json:"type"`
	SampleValue interface{}            `json:"sample_value"`
	Required    bool                   `json:"required"`
	Format      string                 `json:"format,omitempty"`       // e.g., "YYYY-MM-DD", "###.##"
	Pattern     string                 `json:"pattern,omitempty"`      // regex pattern
	Precision   int                    `json:"precision,omitempty"`    // decimal places
	Scale       int                    `json:"scale,omitempty"`        // total digits
	MinValue    *float64               `json:"min_value,omitempty"`    // min observed value
	MaxValue    *float64               `json:"max_value,omitempty"`    // max observed value
	Constraints map[string]interface{} `json:"constraints,omitempty"` // additional constraints
}

// detectFields analyzes data and detects field types with metadata
func detectFields(data map[string]interface{}, prefix string) []Field {
	var fields []Field

	for key, value := range data {
		fieldName := key
		if prefix != "" {
			fieldName = fmt.Sprintf("%s.%s", prefix, key)
		}

		if nestedMap, ok := value.(map[string]interface{}); ok {
			// Recursively detect nested fields
			nestedFields := detectFields(nestedMap, fieldName)
			fields = append(fields, nestedFields...)
		} else {
			// Detect field type with metadata
			fieldType, format, precision, minVal, maxVal := detectFieldType(value)

			field := Field{
				Name:        fieldName,
				Type:        fieldType,
				SampleValue: value,
				Required:    value != nil, // Required if not null
				Format:      format,
				Precision:   precision,
				MinValue:    minVal,
				MaxValue:    maxVal,
			}

			// Add scale for numeric types (total number of digits)
			if precision > 0 && (fieldType == "float" || fieldType == "integer") {
				if minVal != nil {
					totalDigits := len(fmt.Sprintf("%.0f", *minVal))
					field.Scale = totalDigits + precision
				}
			}

			fields = append(fields, field)
		}
	}

	return fields
}

// detectFieldType returns the type and metadata for a field value
func detectFieldType(value interface{}) (fieldType string, format string, precision int, minVal *float64, maxVal *float64) {
	if value == nil {
		return "null", "", 0, nil, nil
	}

	switch v := value.(type) {
	case bool:
		return "boolean", "", 0, nil, nil
	case int:
		val := float64(v)
		return "integer", "", 0, &val, &val
	case int8:
		val := float64(v)
		return "integer", "", 0, &val, &val
	case int16:
		val := float64(v)
		return "integer", "", 0, &val, &val
	case int32:
		val := float64(v)
		return "integer", "", 0, &val, &val
	case int64:
		val := float64(v)
		return "integer", "", 0, &val, &val
	case uint:
		val := float64(v)
		return "integer", "", 0, &val, &val
	case uint8:
		val := float64(v)
		return "integer", "", 0, &val, &val
	case uint16:
		val := float64(v)
		return "integer", "", 0, &val, &val
	case uint32:
		val := float64(v)
		return "integer", "", 0, &val, &val
	case uint64:
		val := float64(v)
		return "integer", "", 0, &val, &val
	case float32:
		floatVal := float64(v)
		prec := detectFloatPrecision(floatVal)
		return "float", "", prec, &floatVal, &floatVal
	case float64:
		prec := detectFloatPrecision(v)
		return "float", "", prec, &v, &v
	case string:
		strType, strFormat := detectStringType(v)
		return strType, strFormat, 0, nil, nil
	case []interface{}:
		arrayType := detectArrayType(v)
		return arrayType, "", 0, nil, nil
	case map[string]interface{}:
		return "object", "", 0, nil, nil
	default:
		return "string", "", 0, nil, nil
	}
}

// detectFloatPrecision returns the number of decimal places in a float
func detectFloatPrecision(f float64) int {
	s := fmt.Sprintf("%f", f)
	// Trim trailing zeros
	s = strings.TrimRight(s, "0")
	s = strings.TrimRight(s, ".")

	parts := strings.Split(s, ".")
	if len(parts) == 2 {
		return len(parts[1])
	}
	return 0
}

func detectArrayType(arr []interface{}) string {
	if len(arr) == 0 {
		return "array[empty]"
	}

	// Analyze first few elements to determine array type
	sampleSize := len(arr)
	if sampleSize > 3 {
		sampleSize = 3
	}

	typeMap := make(map[string]int)
	for i := 0; i < sampleSize; i++ {
		elementType, _, _, _, _ := detectFieldType(arr[i])
		typeMap[elementType]++
	}

	// Find the most common type
	var dominantType string
	maxCount := 0
	for t, count := range typeMap {
		if count > maxCount {
			maxCount = count
			dominantType = t
		}
	}

	// Return array type with element information
	if len(typeMap) == 1 {
		return fmt.Sprintf("array[%s]", dominantType)
	} else {
		return fmt.Sprintf("array[mixed:%s]", dominantType)
	}
}

// detectStringType determines the specific type of string and returns type and format
func detectStringType(s string) (string, string) {
	// Email detection
	if strings.Contains(s, "@") && strings.Contains(s, ".") {
		return "email", ""
	}

	// URL detection
	if strings.HasPrefix(s, "http://") || strings.HasPrefix(s, "https://") {
		return "url", ""
	}

	// UUID detection (basic pattern)
	if len(s) == 36 && strings.Count(s, "-") == 4 {
		return "uuid", ""
	}

	// Date/DateTime detection with format capture
	if dateType, format := detectDateFormat(s); dateType != "" {
		return dateType, format
	}

	// JSON detection
	if (strings.HasPrefix(s, "{") && strings.HasSuffix(s, "}")) ||
		(strings.HasPrefix(s, "[") && strings.HasSuffix(s, "]")) {
		return "json", ""
	}

	// Phone number detection (basic)
	if len(s) >= 10 && strings.ContainsAny(s, "0123456789") {
		digitCount := 0
		for _, r := range s {
			if r >= '0' && r <= '9' {
				digitCount++
			}
		}
		if digitCount >= 10 && digitCount <= 15 {
			return "phone", ""
		}
	}

	return "string", ""
}

// detectDateFormat detects date/datetime formats and returns the type and format string
func detectDateFormat(s string) (string, string) {
	if len(s) < 8 {
		return "", ""
	}

	// ISO 8601 datetime with timezone (YYYY-MM-DDTHH:mm:ssZ or variations)
	if strings.Contains(s, "T") {
		if strings.HasSuffix(s, "Z") {
			return "datetime", "ISO8601-UTC"
		}
		if strings.Contains(s, "+") || strings.LastIndex(s, "-") > 10 {
			return "datetime", "ISO8601-TZ"
		}
		if len(s) >= 19 { // YYYY-MM-DDTHH:mm:ss
			return "datetime", "ISO8601"
		}
	}

	// Common date patterns
	if len(s) == 10 {
		// YYYY-MM-DD
		if s[4] == '-' && s[7] == '-' {
			return "date", "YYYY-MM-DD"
		}
		// DD/MM/YYYY or MM/DD/YYYY
		if s[2] == '/' && s[5] == '/' {
			return "date", "DD/MM/YYYY"
		}
		// DD-MM-YYYY
		if s[2] == '-' && s[5] == '-' {
			return "date", "DD-MM-YYYY"
		}
		// YYYY/MM/DD
		if s[4] == '/' && s[7] == '/' {
			return "date", "YYYY/MM/DD"
		}
	}

	// DateTime with space separator (YYYY-MM-DD HH:mm:ss)
	if len(s) == 19 && s[4] == '-' && s[7] == '-' && s[10] == ' ' && s[13] == ':' && s[16] == ':' {
		return "datetime", "YYYY-MM-DD HH:mm:ss"
	}

	// DateTime with T separator but no timezone (YYYY-MM-DDTHH:mm:ss)
	if len(s) == 19 && s[4] == '-' && s[7] == '-' && s[10] == 'T' && s[13] == ':' && s[16] == ':' {
		return "datetime", "YYYY-MM-DDTHH:mm:ss"
	}

	// DD/MM/YYYY HH:mm:ss
	if len(s) == 19 && s[2] == '/' && s[5] == '/' && s[10] == ' ' && s[13] == ':' && s[16] == ':' {
		return "datetime", "DD/MM/YYYY HH:mm:ss"
	}

	// Unix timestamp (10 digits for seconds, 13 for milliseconds)
	if len(s) == 10 || len(s) == 13 {
		allDigits := true
		for _, r := range s {
			if r < '0' || r > '9' {
				allDigits = false
				break
			}
		}
		if allDigits {
			if len(s) == 10 {
				return "timestamp", "unix-seconds"
			}
			return "timestamp", "unix-milliseconds"
		}
	}

	return "", ""
}

func storeBronzeForTenant(tenantID string, data map[string]interface{}) error {
	hash := generateSchemaHash(data)
	dir := filepath.Join("bronze", fmt.Sprintf("tenant_%s", tenantID))
	if err := os.MkdirAll(dir, 0755); err != nil {
		return err
	}
	filePath := filepath.Join(dir, hash+".csv")
	f, err := os.OpenFile(filePath, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		return err
	}
	defer f.Close()
	w := csv.NewWriter(f)
	stat, _ := os.Stat(filePath)
	isNew := stat == nil || stat.Size() == 0
	var keys []string
	if isNew {
		keys = make([]string, 0, len(data))
		for k := range data {
			keys = append(keys, k)
		}
		sort.Strings(keys)
		if err := w.Write(keys); err != nil {
			return err
		}
	} else {
		// For simplicity, assume same schema, not reading headers
		keys = make([]string, 0, len(data))
		for k := range data {
			keys = append(keys, k)
		}
		sort.Strings(keys)
	}
	values := make([]string, len(keys))
	for i, k := range keys {
		values[i] = fmt.Sprintf("%v", data[k])
	}
	if err := w.Write(values); err != nil {
		return err
	}
	w.Flush()
	return w.Error()
}

func tenantWebsocketHandler(w http.ResponseWriter, r *http.Request) {
	// Extract tenant ID from URL path
	path := r.URL.Path
	parts := strings.Split(path, "/")
	if len(parts) < 3 || parts[1] != "tenant" {
		http.Error(w, "Invalid URL format. Use /tenant/{tenant_id}/ws", http.StatusBadRequest)
		return
	}
	tenantID := parts[2]

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	defer conn.Close()

	fmt.Printf("WebSocket connection established for tenant %s\n", tenantID)

	for {
		_, message, err := conn.ReadMessage()
		if err != nil {
			break
		}
		var data map[string]interface{}
		if err := json.Unmarshal(message, &data); err != nil {
			continue
		}

		// Generate schema hash and process data
		hash := generateSchemaHash(data)

		// Process the data using new Kafka-based logic
		if err := processIncomingData(tenantID, data); err != nil {
			log.Printf("Error processing WebSocket data for tenant %s: %v", tenantID, err)
			continue
		}
		fmt.Printf("WebSocket: Received data for tenant %s with schema hash: %s\n", tenantID, hash)
	}
}

func tenantIngestHandler(w http.ResponseWriter, r *http.Request) {
	// Apply CORS headers
	middleware.ApplyCORSHeaders(w, &httpConfig.CORS, r.Header.Get("Origin"))

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Extract tenant ID from URL path
	path := r.URL.Path
	parts := strings.Split(path, "/")
	if len(parts) < 4 || parts[1] != "tenant" || parts[3] != "ingest" {
		http.Error(w, "Invalid URL format. Use /tenant/{tenant_id}/ingest", http.StatusBadRequest)
		return
	}
	tenantID := parts[2]

	// Accept raw payload - don't modify it
	var data map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	// Generate schema hash and process data
	hash := generateSchemaHash(data)

	// Process the data using new Kafka-based logic
	if err := processIncomingData(tenantID, data); err != nil {
		log.Printf("Error processing data for tenant %s: %v", tenantID, err)
		http.Error(w, "Failed to process data", http.StatusInternalServerError)
		return
	}
	fmt.Printf("POST: Received data for tenant %s with schema hash: %s\n", tenantID, hash)

	response := map[string]interface{}{
		"status":      "success",
		"tenant_id":   tenantID,
		"schema_hash": hash,
		"message":     "Data processed successfully",
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func kafkaTopicCountHandler(w http.ResponseWriter, r *http.Request) {
	// Extract topic name from URL path: /kafka/topic/{topic_name}/count
	pathParts := strings.Split(r.URL.Path, "/")
	if len(pathParts) < 4 {
		http.Error(w, "Invalid URL format. Use /kafka/topic/{topic_name}/count", http.StatusBadRequest)
		return
	}
	topicName := pathParts[3]

	// Extract schema hash from topic name (format: schema-{hash})
	if !strings.HasPrefix(topicName, "schema-") {
		http.Error(w, "Invalid topic format. Expected schema-{hash}", http.StatusBadRequest)
		return
	}
	schemaHash := strings.TrimPrefix(topicName, "schema-")

	// Get record count from Kafka
	count, err := kafkaProducer.GetTopicRecordCount(schemaHash)
	if err != nil {
		log.Printf("Error getting Kafka topic count for %s: %v", topicName, err)
		// Return 0 count instead of error to prevent frontend issues
		count = 0
	}

	w.Header().Set("Content-Type", "application/json")
	response := map[string]interface{}{
		"topic":       topicName,
		"count":       count,
		"schema_hash": schemaHash,
	}
	json.NewEncoder(w).Encode(response)
}

func main() {
	// Load configuration
	httpConfig = config.LoadHTTPConfig()
	corsMiddleware = middleware.NewCORSMiddleware(&httpConfig.CORS)

	// Initialize Kafka
	kafkaProducer = kafka.NewProducer([]string{"kafka:29092"})

	// Initialize Platform API client
	platformClient = platform.NewClient("http://platform")

	// Root endpoint with CORS
	http.HandleFunc("/", corsMiddleware.Handler(func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "AI Data Lake Ingestion Service\n\nEndpoints:\n- POST /tenant/{tenant_id}/ingest\n- WebSocket /tenant/{tenant_id}/ws\n\nCORS Configuration:\n- Allowed Origins: %v\n- Allowed Methods: %v",
			httpConfig.CORS.AllowedOrigins, httpConfig.CORS.AllowedMethods)
	}))

	// Health check endpoint
	http.HandleFunc("/health", corsMiddleware.Handler(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprintf(w, `{"status":"healthy","service":"ingestion"}`)
	}))

	// Kafka topic count endpoint
	http.HandleFunc("/kafka/topic/", func(w http.ResponseWriter, r *http.Request) {
		if strings.HasSuffix(r.URL.Path, "/count") {
			kafkaTopicCountHandler(w, r)
		} else {
			http.Error(w, "Invalid Kafka endpoint", http.StatusNotFound)
		}
	})

	// Tenant-specific endpoints
	http.HandleFunc("/tenant/", func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path
		if strings.HasSuffix(path, "/ingest") {
			tenantIngestHandler(w, r)
		} else if strings.HasSuffix(path, "/ws") {
			tenantWebsocketHandler(w, r)
		} else {
			// Apply CORS to error responses too
			middleware.ApplyCORSHeaders(w, &httpConfig.CORS, r.Header.Get("Origin"))
			http.Error(w, "Invalid endpoint. Use /tenant/{tenant_id}/ingest or /tenant/{tenant_id}/ws", http.StatusNotFound)
		}
	})

	fmt.Printf("Starting ingestion service on :%s\n", httpConfig.Port)
	fmt.Println("Endpoints:")
	fmt.Println("- POST /tenant/{tenant_id}/ingest")
	fmt.Println("- WebSocket /tenant/{tenant_id}/ws")
	fmt.Println("- GET /health")
	fmt.Printf("CORS Origins: %v\n", httpConfig.CORS.AllowedOrigins)

	if err := http.ListenAndServe(":"+httpConfig.Port, nil); err != nil {
		panic(err)
	}
}
