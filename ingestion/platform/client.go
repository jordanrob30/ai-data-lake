package platform

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

type Client struct {
	baseURL    string
	httpClient *http.Client
}

type SchemaResponse struct {
	ID             int                      `json:"id"`
	Hash           string                   `json:"hash"`
	Name           string                   `json:"name"`
	TenantID       string                   `json:"tenant_id"`
	Status         string                   `json:"status"`
	DetectedFields []map[string]interface{} `json:"detected_fields"`
	ConfirmedAt    *time.Time               `json:"confirmed_at"`
	CreatedAt      time.Time                `json:"created_at"`
	UpdatedAt      time.Time                `json:"updated_at"`
}

type CreateSchemaRequest struct {
	Hash           string                   `json:"hash"`
	KafkaTopic     string                   `json:"kafka_topic"`
	TenantID       string                   `json:"tenant_id"`
	SampleData     map[string]interface{}   `json:"sample_data"`
	DetectedFields []map[string]interface{} `json:"detected_fields"`
}

type CreateSchemaResponse struct {
	ID      int    `json:"id"`
	Hash    string `json:"hash"`
	Status  string `json:"status"`
	Message string `json:"message"`
}

func NewClient(baseURL string) *Client {
	return &Client{
		baseURL: baseURL,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// GetSchemaByHash retrieves a schema by hash and tenant
func (c *Client) GetSchemaByHash(hash, tenantID string) (*SchemaResponse, error) {
	url := fmt.Sprintf("%s/api/schemas/hash/%s", c.baseURL, hash)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("X-Tenant-ID", tenantID)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to make request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == 404 {
		return nil, nil // Schema not found
	}

	if resp.StatusCode != 200 {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("API error %d: %s", resp.StatusCode, string(body))
	}

	var schema SchemaResponse
	if err := json.NewDecoder(resp.Body).Decode(&schema); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &schema, nil
}

// CreateSchema creates a new schema confirmation request
func (c *Client) CreateSchema(req CreateSchemaRequest) (*CreateSchemaResponse, error) {
	url := fmt.Sprintf("%s/api/schemas", c.baseURL)

	jsonData, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	httpReq, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("failed to make request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 && resp.StatusCode != 201 {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("API error %d: %s", resp.StatusCode, string(body))
	}

	var createResp CreateSchemaResponse
	if err := json.NewDecoder(resp.Body).Decode(&createResp); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &createResp, nil
}

// IncrementPendingRecords increments the pending records count for a schema
func (c *Client) IncrementPendingRecords(hash, tenantID string) error {
	url := fmt.Sprintf("%s/api/schemas/hash/%s/increment", c.baseURL, hash)

	req, err := http.NewRequest("POST", url, nil)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Tenant-ID", tenantID)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to make request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("API returned status %d: %s", resp.StatusCode, string(body))
	}

	return nil
}
