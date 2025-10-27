package kafka

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/segmentio/kafka-go"
)

type Producer struct {
	brokers []string
}

type RecordMessage struct {
	TenantID   string                 `json:"tenant_id"`
	SchemaHash string                 `json:"schema_hash"`
	Data       map[string]interface{} `json:"data"`
	Timestamp  time.Time              `json:"timestamp"`
	ReceivedAt time.Time              `json:"received_at"`
}

func NewProducer(brokers []string) *Producer {
	return &Producer{
		brokers: brokers,
	}
}

// SendRecord sends a data record to Kafka using schema hash as topic
func (p *Producer) SendRecord(tenantID, schemaHash string, data map[string]interface{}) error {
	// Use schema hash as topic name to isolate data by schema
	topic := fmt.Sprintf("schema-%s", schemaHash)

	message := RecordMessage{
		TenantID:   tenantID,
		SchemaHash: schemaHash,
		Data:       data,
		Timestamp:  time.Now(),
		ReceivedAt: time.Now(),
	}

	messageBytes, err := json.Marshal(message)
	if err != nil {
		return fmt.Errorf("failed to marshal message: %w", err)
	}

	writer := &kafka.Writer{
		Addr:         kafka.TCP(p.brokers...),
		Topic:        topic,
		Balancer:     &kafka.LeastBytes{},
		RequiredAcks: kafka.RequireOne,
		Async:        false, // Synchronous for reliability
	}
	defer writer.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	err = writer.WriteMessages(ctx, kafka.Message{
		Key:   []byte(tenantID), // Use tenant ID as key for partitioning
		Value: messageBytes,
		Time:  time.Now(),
	})

	if err != nil {
		return fmt.Errorf("failed to write message to Kafka: %w", err)
	}

	log.Printf("Successfully sent record to Kafka topic: %s", topic)
	return nil
}

// CreateTopic creates a Kafka topic if it doesn't exist
func (p *Producer) CreateTopic(schemaHash string) error {
	topic := fmt.Sprintf("schema-%s", schemaHash)

	conn, err := kafka.Dial("tcp", p.brokers[0])
	if err != nil {
		return fmt.Errorf("failed to connect to Kafka: %w", err)
	}
	defer conn.Close()

	controller, err := conn.Controller()
	if err != nil {
		return fmt.Errorf("failed to get controller: %w", err)
	}

	controllerConn, err := kafka.Dial("tcp", fmt.Sprintf("%s:%d", controller.Host, controller.Port))
	if err != nil {
		return fmt.Errorf("failed to connect to controller: %w", err)
	}
	defer controllerConn.Close()

	topicConfigs := []kafka.TopicConfig{
		{
			Topic:             topic,
			NumPartitions:     3,
			ReplicationFactor: 1,
			ConfigEntries: []kafka.ConfigEntry{
				{ConfigName: "retention.ms", ConfigValue: "604800000"}, // 7 days
				{ConfigName: "cleanup.policy", ConfigValue: "delete"},
			},
		},
	}

	err = controllerConn.CreateTopics(topicConfigs...)
	if err != nil {
		// Topic might already exist, which is fine
		log.Printf("Topic creation result for %s: %v", topic, err)
	}

	return nil
}

// GetTopicRecordCount returns the number of records in a Kafka topic
func (p *Producer) GetTopicRecordCount(schemaHash string) (int64, error) {
	topic := fmt.Sprintf("schema-%s", schemaHash)

	conn, err := kafka.Dial("tcp", p.brokers[0])
	if err != nil {
		return 0, fmt.Errorf("failed to connect to Kafka: %w", err)
	}
	defer conn.Close()

	// Get topic partitions
	partitions, err := conn.ReadPartitions(topic)
	if err != nil {
		return 0, fmt.Errorf("failed to read partitions for topic %s: %w", topic, err)
	}

	var totalRecords int64 = 0

	// Count records in each partition
	for _, partition := range partitions {
		partitionConn, err := kafka.DialLeader(context.Background(), "tcp", p.brokers[0], topic, partition.ID)
		if err != nil {
			log.Printf("Failed to connect to partition %d: %v", partition.ID, err)
			continue
		}

		// Get the latest offset (high water mark)
		_, highWaterMark, err := partitionConn.ReadOffsets()
		if err != nil {
			log.Printf("Failed to read offsets for partition %d: %v", partition.ID, err)
			partitionConn.Close()
			continue
		}

		totalRecords += highWaterMark
		partitionConn.Close()
	}

	return totalRecords, nil
}
