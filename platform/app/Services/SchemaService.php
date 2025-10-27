<?php

namespace App\Services;

use Illuminate\Support\Facades\Hash;

class SchemaService
{
    public function hashSchema(array $schema): string
    {
        // Sort schema keys to ensure consistent hashing
        ksort($schema);
        // Convert to JSON for hashing
        $json = json_encode($schema);
        // Use SHA-256 hash
        return Hash::make($json);
    }

    public function detectSchemaChange(array $newSchema, string $existingHash): bool
    {
        return $this->hashSchema($newSchema) !== $existingHash;
    }
}
