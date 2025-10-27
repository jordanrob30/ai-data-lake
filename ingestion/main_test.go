package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"github.com/gorilla/websocket"
)

func TestGetSchemaHash(t *testing.T) {
	data := map[string]interface{}{"a": 1, "b": "test"}
	hash := getSchemaHash(data)
	expected := "fb8e20fc2e4c3f248c60c39bd652f3c1347298bb977b8b4d5903b85055620603"
	if hash != expected {
		t.Errorf("Expected %s, got %s", expected, hash)
	}
}

func TestStoreBronze(t *testing.T) {
	data := map[string]interface{}{"a": "1", "b": "test"}
	hash := "testhash"
	defer os.Remove(filepath.Join("bronze", hash+".csv"))
	err := storeBronze(data, hash)
	if err != nil {
		t.Errorf("Error storing bronze: %v", err)
	}
	// Optionally check file contents
}

func TestQueueUnmappedData(t *testing.T) {
	os.Setenv("AMQP_URL", "amqp://guest:guest@localhost:5673/")
	initRabbitMQ()
	defer rabbitConn.Close()
	defer rabbitCh.Close()
	err := queueUnmappedData([]byte(`{"test": "data"}`), "testhash")
	if err != nil {
		t.Errorf("Error queuing data: %v", err)
	}
}

func TestIngestHandler(t *testing.T) {
	os.Setenv("AMQP_URL", "amqp://guest:guest@localhost:5673/")
	initRabbitMQ()
	defer rabbitConn.Close()
	defer rabbitCh.Close()
	data := map[string]interface{}{"key": "value"}
	jsonData, _ := json.Marshal(data)
	req := httptest.NewRequest("POST", "/ingest", bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	ingestHandler(w, req)
	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", w.Code)
	}
}

func TestWebsocketHandler(t *testing.T) {
	os.Setenv("AMQP_URL", "amqp://guest:guest@localhost:5673/")
	initRabbitMQ()
	defer rabbitConn.Close()
	defer rabbitCh.Close()
	server := httptest.NewServer(http.HandlerFunc(websocketHandler))
	defer server.Close()
	u := "ws" + server.URL[4:]
	ws, _, err := websocket.DefaultDialer.Dial(u, nil)
	if err != nil {
		t.Fatal(err)
	}
	defer ws.Close()
	err = ws.WriteMessage(websocket.TextMessage, []byte(`{"key":"value"}`))
	if err != nil {
		t.Error(err)
	}
}
