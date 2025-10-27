/**
 * AI Integration Example for PendingSchemaDetailNode
 *
 * This file shows how to integrate AI schema analysis into PendingSchemaDetailNode.tsx
 * Add these sections to the existing component.
 */

import { useState } from 'react';
import AIRecommendationPanel from '../AIRecommendationPanel';
import { AIRecommendations } from '../../partials/ConfigureMappings/types';

// ============================================================================
// STEP 1: Add these state variables to PendingSchemaDetailNode component
// ============================================================================

export function AIStateVariables() {
    const [aiRecommendations, setAiRecommendations] = useState<AIRecommendations | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [showAIPanel, setShowAIPanel] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);
}

// ============================================================================
// STEP 2: Add these handler functions
// ============================================================================

export function AIHandlerFunctions(schemaId: number) {
    const handleAnalyzeWithAI = async () => {
        setIsAnalyzing(true);
        setAiError(null);

        try {
            const response = await fetch(`/api/schemas/${schemaId}/analyze`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'AI analysis failed');
            }

            const result = await response.json();
            setAiRecommendations(result.recommendations);
            setShowAIPanel(true);
        } catch (error: any) {
            console.error('AI analysis error:', error);
            setAiError(error.message || 'Failed to analyze schema with AI');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleAcceptAIRecommendations = async (recommendations: AIRecommendations) => {
        try {
            if (recommendations.action === 'create_new') {
                // Create new entity based on AI recommendations
                const entityData = {
                    entityName: recommendations.entity_name,
                    fields: recommendations.canonical_schema.fields.map(field => ({
                        name: field.name,
                        type: field.type,
                        required: field.required,
                        format: field.format,
                    })),
                };

                // Trigger entity creation event
                window.dispatchEvent(new CustomEvent('createNewEntityFromAI', {
                    detail: {
                        schemaId: schemaId,
                        entityName: recommendations.entity_name,
                        entityData: entityData,
                        aiRecommendations: recommendations,
                        sourceNodeId: `pending-${schemaId}`,
                    }
                }));

                // Apply field mappings with JSONata formulas
                await applyFieldMappings(schemaId, recommendations);

            } else if (recommendations.entity_id) {
                // Map to existing entity
                await mapToExistingEntity(recommendations.entity_id, recommendations);
            }

            setShowAIPanel(false);
            setAiRecommendations(null);
        } catch (error: any) {
            console.error('Failed to apply AI recommendations:', error);
            setAiError('Failed to apply recommendations: ' + error.message);
        }
    };

    const applyFieldMappings = async (schemaId: number, recommendations: AIRecommendations) => {
        // Transform AI field mappings to the format expected by EntityController.saveEntities()
        const entities = [{
            fieldPath: '$',  // Root path
            entityName: recommendations.entity_name,
            isArray: false,
            schemaMapping: {
                entityName: recommendations.entity_name,
                fields: recommendations.field_mappings.map(mapping => ({
                    sourcePath: mapping.source_field,
                    fieldName: mapping.target_field,
                    fieldType: recommendations.canonical_schema.fields.find(f => f.name === mapping.target_field)?.type || 'string',
                    isRequired: recommendations.canonical_schema.fields.find(f => f.name === mapping.target_field)?.required || false,
                    isArray: false,
                    mappingType: mapping.transformation === 'direct' ? 'direct' : 'formula',
                    formulaExpression: mapping.jsonata_formula,
                    formulaLanguage: mapping.transformation !== 'direct' ? 'JSONata' : undefined,
                    transformation: mapping.transformation,
                    confidence: mapping.confidence,
                })),
                sourceStructure: {},
            },
        }];

        const response = await fetch(`/api/schemas/${schemaId}/entities`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
            },
            body: JSON.stringify({
                schema_name: recommendations.entity_name,
                entities: entities,
            }),
        });

        if (!response.ok) {
            throw new Error('Failed to save entity mappings');
        }

        return response.json();
    };

    const mapToExistingEntity = async (entityId: number, recommendations: AIRecommendations) => {
        // Similar to applyFieldMappings but maps to existing entity
        const entities = [{
            fieldPath: '$',
            entityName: recommendations.entity_name,
            isArray: false,
            schemaMapping: {
                entityName: recommendations.entity_name,
                fields: recommendations.field_mappings.map(mapping => ({
                    sourcePath: mapping.source_field,
                    fieldName: mapping.target_field,
                    fieldType: recommendations.canonical_schema.fields.find(f => f.name === mapping.target_field)?.type || 'string',
                    isRequired: false,
                    isArray: false,
                    mappingType: mapping.transformation === 'direct' ? 'direct' : 'formula',
                    formulaExpression: mapping.jsonata_formula,
                    formulaLanguage: mapping.transformation !== 'direct' ? 'JSONata' : undefined,
                })),
                sourceStructure: {},
            },
        }];

        const response = await fetch(`/api/schemas/${schemaId}/entities`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
            },
            body: JSON.stringify({
                entities: entities,
            }),
        });

        if (!response.ok) {
            throw new Error('Failed to save mappings');
        }

        // Dispatch event to update visualization
        window.dispatchEvent(new CustomEvent('addExistingEntity', {
            detail: {
                entityId: entityId,
                entityName: recommendations.entity_name,
                sourceNodeId: `pending-${schemaId}`,
            }
        }));

        return response.json();
    };

    return {
        handleAnalyzeWithAI,
        handleAcceptAIRecommendations,
        applyFieldMappings,
        mapToExistingEntity,
    };
}

// ============================================================================
// STEP 3: Add this UI component in the render method
// Place it after the "Create as Entity" button or in a prominent location
// ============================================================================

export function AIAnalysisUI() {
    return (
        <div className="mt-4 space-y-4">
            {/* AI Analysis Button */}
            <div className="flex items-center gap-3">
                <button
                    onClick={handleAnalyzeWithAI}
                    disabled={isAnalyzing}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                    {isAnalyzing ? (
                        <>
                            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Analyzing with AI...
                        </>
                    ) : (
                        <>
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                            Analyze with AI
                        </>
                    )}
                </button>

                {/* Info tooltip */}
                <div className="text-xs text-gray-500">
                    AI will analyze this schema and recommend entity mappings
                </div>
            </div>

            {/* Error Display */}
            {aiError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                    <div className="flex items-start gap-2">
                        <svg className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                            <p className="text-sm font-medium text-red-800">AI Analysis Failed</p>
                            <p className="text-xs text-red-700 mt-1">{aiError}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* AI Recommendation Panel */}
            {showAIPanel && aiRecommendations && (
                <AIRecommendationPanel
                    recommendations={aiRecommendations}
                    onAcceptAll={handleAcceptAIRecommendations}
                    onModify={(modified) => setAiRecommendations(modified)}
                    onRegenerate={handleAnalyzeWithAI}
                    isAnalyzing={isAnalyzing}
                />
            )}
        </div>
    );
}

// ============================================================================
// STEP 4: Auto-trigger AI analysis on component mount (optional)
// Add this useEffect hook if you want automatic analysis
// ============================================================================

export function AutoAnalysisEffect() {
    useEffect(() => {
        // Auto-trigger AI analysis if not already analyzed
        const autoAnalyze = async () => {
            try {
                const response = await fetch(`/api/schemas/${schemaId}/ai-recommendations`);
                if (response.ok) {
                    const result = await response.json();
                    if (result.status === 'completed' && result.recommendations) {
                        setAiRecommendations(result.recommendations);
                        // Don't auto-show panel, but recommendations are available
                    } else if (result.status === 'pending' || result.status === 'disabled') {
                        // Optionally auto-trigger analysis
                        // handleAnalyzeWithAI();
                    }
                }
            } catch (error) {
                console.error('Failed to check AI recommendations:', error);
            }
        };

        autoAnalyze();
    }, [schemaId]);
}

// ============================================================================
// INTEGRATION NOTES:
// ============================================================================
//
// 1. Import the AIRecommendationPanel component at the top of PendingSchemaDetailNode.tsx
// 2. Add the state variables from Step 1
// 3. Add the handler functions from Step 2
// 4. Add the UI component from Step 3 in an appropriate location in the render
// 5. Optionally add the auto-analysis effect from Step 4
//
// The component is now ready to use AI-powered schema analysis!
// ============================================================================
