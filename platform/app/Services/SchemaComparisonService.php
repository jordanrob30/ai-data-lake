<?php

namespace App\Services;

class SchemaComparisonService
{
    /**
     * Compare a source schema with all available entity schemas
     * Returns similarity scores and recommendations
     *
     * @param array $sourceFields - Detected fields from ingestion
     * @param array $existingEntities - Available entity schemas to compare against
     * @return array - Sorted list of matches with scores and compatibility info
     */
    public function findBestMatches(array $sourceFields, array $existingEntities): array
    {
        $matches = [];

        foreach ($existingEntities as $entity) {
            $score = $this->calculateSimilarityScore($sourceFields, $entity['fields'] ?? []);
            $compatibility = $this->checkFormatCompatibility($sourceFields, $entity['fields'] ?? []);

            $matches[] = [
                'entity_id' => $entity['id'],
                'entity_name' => $entity['name'],
                'similarity_score' => $score['total_score'],
                'field_name_match' => $score['field_name_score'],
                'type_match' => $score['type_score'],
                'format_match' => $score['format_score'],
                'structure_match' => $score['structure_score'],
                'format_compatibility' => $compatibility,
                'recommendation' => $this->getRecommendation($score['total_score'], $compatibility),
            ];
        }

        // Sort by total similarity score descending
        usort($matches, fn($a, $b) => $b['similarity_score'] <=> $a['similarity_score']);

        return $matches;
    }

    /**
     * Calculate similarity score between source and target fields
     *
     * @param array $sourceFields
     * @param array $targetFields
     * @return array - Breakdown of scores
     */
    private function calculateSimilarityScore(array $sourceFields, array $targetFields): array
    {
        if (empty($sourceFields) || empty($targetFields)) {
            return [
                'total_score' => 0,
                'field_name_score' => 0,
                'type_score' => 0,
                'format_score' => 0,
                'structure_score' => 0,
            ];
        }

        // Build field maps for comparison
        $sourceMap = $this->buildFieldMap($sourceFields);
        $targetMap = $this->buildFieldMap($targetFields);

        // Calculate individual scores
        $fieldNameScore = $this->calculateFieldNameSimilarity($sourceMap, $targetMap);
        $typeScore = $this->calculateTypeSimilarity($sourceMap, $targetMap);
        $formatScore = $this->calculateFormatSimilarity($sourceMap, $targetMap);
        $structureScore = $this->calculateStructureSimilarity($sourceFields, $targetFields);

        // Weighted total score (out of 100)
        $totalScore = (
            $fieldNameScore * 0.4 +  // 40% weight on field names
            $typeScore * 0.3 +       // 30% weight on types
            $formatScore * 0.2 +     // 20% weight on formats
            $structureScore * 0.1    // 10% weight on structure
        );

        return [
            'total_score' => round($totalScore, 2),
            'field_name_score' => round($fieldNameScore, 2),
            'type_score' => round($typeScore, 2),
            'format_score' => round($formatScore, 2),
            'structure_score' => round($structureScore, 2),
        ];
    }

    /**
     * Build a map of field names to their properties
     */
    private function buildFieldMap(array $fields): array
    {
        $map = [];
        foreach ($fields as $field) {
            $name = is_array($field) ? ($field['name'] ?? $field['field_name'] ?? null) : $field->name;
            if ($name) {
                $map[$name] = $field;
            }
        }
        return $map;
    }

    /**
     * Calculate field name similarity using fuzzy matching
     */
    private function calculateFieldNameSimilarity(array $sourceMap, array $targetMap): float
    {
        $sourceNames = array_keys($sourceMap);
        $targetNames = array_keys($targetMap);

        if (empty($sourceNames) || empty($targetNames)) {
            return 0;
        }

        $totalSimilarity = 0;
        $matchCount = 0;

        foreach ($sourceNames as $sourceName) {
            $bestMatch = 0;

            foreach ($targetNames as $targetName) {
                // Use Levenshtein distance for fuzzy matching
                $similarity = $this->calculateStringSimilarity($sourceName, $targetName);
                if ($similarity > $bestMatch) {
                    $bestMatch = $similarity;
                }
            }

            $totalSimilarity += $bestMatch;
            $matchCount++;
        }

        return $matchCount > 0 ? ($totalSimilarity / $matchCount) * 100 : 0;
    }

    /**
     * Calculate type similarity between fields
     */
    private function calculateTypeSimilarity(array $sourceMap, array $targetMap): float
    {
        $matches = 0;
        $total = 0;

        foreach ($sourceMap as $name => $sourceField) {
            if (isset($targetMap[$name])) {
                $sourceType = $this->getFieldType($sourceField);
                $targetType = $this->getFieldType($targetMap[$name]);

                if ($this->typesAreCompatible($sourceType, $targetType)) {
                    $matches++;
                }
                $total++;
            }
        }

        return $total > 0 ? ($matches / $total) * 100 : 0;
    }

    /**
     * Calculate format similarity (dates, numbers, etc.)
     */
    private function calculateFormatSimilarity(array $sourceMap, array $targetMap): float
    {
        $matches = 0;
        $total = 0;

        foreach ($sourceMap as $name => $sourceField) {
            if (isset($targetMap[$name])) {
                $sourceFormat = $this->getFieldFormat($sourceField);
                $targetFormat = $this->getFieldFormat($targetMap[$name]);

                if ($sourceFormat && $targetFormat) {
                    if ($sourceFormat === $targetFormat) {
                        $matches++;
                    }
                    $total++;
                }
            }
        }

        return $total > 0 ? ($matches / $total) * 100 : 100; // 100 if no formats to compare
    }

    /**
     * Calculate structure similarity (field count, nesting, etc.)
     */
    private function calculateStructureSimilarity(array $sourceFields, array $targetFields): float
    {
        $sourceCount = count($sourceFields);
        $targetCount = count($targetFields);

        if ($sourceCount === 0 || $targetCount === 0) {
            return 0;
        }

        // Calculate similarity based on field count
        $countSimilarity = 1 - (abs($sourceCount - $targetCount) / max($sourceCount, $targetCount));

        return $countSimilarity * 100;
    }

    /**
     * Check format compatibility and identify required transformations
     */
    private function checkFormatCompatibility(array $sourceFields, array $targetFields): array
    {
        $incompatibilities = [];
        $transformations = [];

        $sourceMap = $this->buildFieldMap($sourceFields);
        $targetMap = $this->buildFieldMap($targetFields);

        foreach ($sourceMap as $name => $sourceField) {
            if (isset($targetMap[$name])) {
                $sourceFormat = $this->getFieldFormat($sourceField);
                $targetFormat = $this->getFieldFormat($targetMap[$name]);

                if ($sourceFormat && $targetFormat && $sourceFormat !== $targetFormat) {
                    $incompatibilities[] = [
                        'field' => $name,
                        'source_format' => $sourceFormat,
                        'target_format' => $targetFormat,
                        'transformation_needed' => true,
                    ];

                    // Suggest transformation if known
                    $transformation = $this->suggestTransformation($sourceFormat, $targetFormat);
                    if ($transformation) {
                        $transformations[] = [
                            'field' => $name,
                            'transformation' => $transformation,
                        ];
                    }
                }
            }
        }

        return [
            'is_compatible' => empty($incompatibilities),
            'incompatibilities' => $incompatibilities,
            'suggested_transformations' => $transformations,
        ];
    }

    /**
     * Get recommendation based on score and compatibility
     */
    private function getRecommendation(float $score, array $compatibility): string
    {
        if ($score >= 90 && $compatibility['is_compatible']) {
            return 'strong_match';
        } elseif ($score >= 75) {
            return 'good_match';
        } elseif ($score >= 50) {
            return 'partial_match';
        } else {
            return 'create_new';
        }
    }

    /**
     * Calculate string similarity (0-1)
     */
    private function calculateStringSimilarity(string $str1, string $str2): float
    {
        $str1 = strtolower($str1);
        $str2 = strtolower($str2);

        // Exact match
        if ($str1 === $str2) {
            return 1.0;
        }

        // Levenshtein distance
        $maxLen = max(strlen($str1), strlen($str2));
        if ($maxLen === 0) {
            return 0.0;
        }

        $distance = levenshtein($str1, $str2);
        return 1 - ($distance / $maxLen);
    }

    /**
     * Check if two types are compatible
     */
    private function typesAreCompatible(string $type1, string $type2): bool
    {
        // Exact match
        if ($type1 === $type2) {
            return true;
        }

        // Numeric type compatibility
        $numericTypes = ['integer', 'float', 'number', 'decimal'];
        if (in_array($type1, $numericTypes) && in_array($type2, $numericTypes)) {
            return true;
        }

        // String type compatibility
        $stringTypes = ['string', 'text', 'varchar'];
        if (in_array($type1, $stringTypes) && in_array($type2, $stringTypes)) {
            return true;
        }

        // Date/time compatibility
        $dateTypes = ['date', 'datetime', 'timestamp'];
        if (in_array($type1, $dateTypes) && in_array($type2, $dateTypes)) {
            return true;
        }

        return false;
    }

    /**
     * Suggest transformation between formats
     */
    private function suggestTransformation(?string $sourceFormat, ?string $targetFormat): ?string
    {
        if (!$sourceFormat || !$targetFormat) {
            return null;
        }

        // Date format transformations
        $dateFormats = ['YYYY-MM-DD', 'DD/MM/YYYY', 'MM/DD/YYYY', 'DD-MM-YYYY', 'ISO8601', 'ISO8601-UTC'];
        if (in_array($sourceFormat, $dateFormats) && in_array($targetFormat, $dateFormats)) {
            return "date_format_conversion:{$sourceFormat}->{$targetFormat}";
        }

        // Timestamp transformations
        if (str_contains($sourceFormat, 'unix') && str_contains($targetFormat, 'ISO8601')) {
            return "timestamp_to_datetime:{$sourceFormat}->{$targetFormat}";
        }

        return "format_conversion:{$sourceFormat}->{$targetFormat}";
    }

    /**
     * Get field type from field object/array
     */
    private function getFieldType($field): string
    {
        if (is_array($field)) {
            return $field['type'] ?? $field['field_type'] ?? 'string';
        }

        return $field->type ?? $field->field_type ?? 'string';
    }

    /**
     * Get field format from field object/array
     */
    private function getFieldFormat($field): ?string
    {
        if (is_array($field)) {
            return $field['format'] ?? null;
        }

        return $field->format ?? null;
    }
}
