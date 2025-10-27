<?php

namespace App\Events;

use App\Models\Schema;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class SchemaAnalysisEvent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public string $status; // 'started', 'completed', 'failed'
    public int $schemaId;
    public string $tenantId;
    public ?array $data;

    /**
     * Create a new event instance.
     *
     * @param string $status
     * @param Schema $schema
     * @param array|null $data
     */
    public function __construct(string $status, Schema $schema, ?array $data = null)
    {
        $this->status = $status;
        $this->schemaId = $schema->id;
        $this->tenantId = $schema->tenant_id;
        $this->data = $data;
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return Channel
     */
    public function broadcastOn(): Channel
    {
        // Broadcast to tenant-specific channel
        return new Channel("tenant.{$this->tenantId}.schemas");
    }

    /**
     * Get the data to broadcast.
     *
     * @return array
     */
    public function broadcastWith(): array
    {
        return [
            'status' => $this->status,
            'schema_id' => $this->schemaId,
            'tenant_id' => $this->tenantId,
            'data' => $this->data,
            'timestamp' => now()->toIso8601String(),
        ];
    }

    /**
     * The event's broadcast name.
     *
     * @return string
     */
    public function broadcastAs(): string
    {
        return 'schema.analysis';
    }
}
