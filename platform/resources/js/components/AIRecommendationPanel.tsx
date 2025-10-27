import React, { useState } from 'react';
import { AIRecommendations, AIFieldMapping } from '../partials/ConfigureMappings/types';

interface AIRecommendationPanelProps {
    recommendations: AIRecommendations;
    onAcceptAll: (recommendations: AIRecommendations) => void;
    onModify: (recommendations: AIRecommendations) => void;
    onRegenerate: () => void;
    isAnalyzing?: boolean;
}

export default function AIRecommendationPanel({
    recommendations,
    onAcceptAll,
    onModify,
    onRegenerate,
    isAnalyzing = false,
}: AIRecommendationPanelProps) {
    const [editedRecommendations, setEditedRecommendations] = useState<AIRecommendations>(recommendations);
    const [isEditing, setIsEditing] = useState(false);

    const handleFieldMappingChange = (index: number, field: keyof AIFieldMapping, value: string | number) => {
        const updated = { ...editedRecommendations };
        updated.field_mappings[index] = {
            ...updated.field_mappings[index],
            [field]: value,
        };
        setEditedRecommendations(updated);
        setIsEditing(true);
    };

    const handleEntityNameChange = (name: string) => {
        setEditedRecommendations({
            ...editedRecommendations,
            entity_name: name,
        });
        setIsEditing(true);
    };

    const handleSaveModifications = () => {
        onModify(editedRecommendations);
        setIsEditing(false);
    };

    const getConfidenceColor = (confidence: number): string => {
        if (confidence >= 0.9) return 'text-green-600 bg-green-50';
        if (confidence >= 0.7) return 'text-yellow-600 bg-yellow-50';
        return 'text-orange-600 bg-orange-50';
    };

    const getConfidenceLabel = (confidence: number): string => {
        if (confidence >= 0.9) return 'High';
        if (confidence >= 0.7) return 'Medium';
        return 'Low';
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        AI Recommendations
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        {recommendations.action === 'create_new'
                            ? 'Creating new canonical entity'
                            : `Mapping to existing entity (${recommendations.similarity_score}% match)`}
                    </p>
                </div>
                <button
                    onClick={onRegenerate}
                    disabled={isAnalyzing}
                    className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isAnalyzing ? 'Analyzing...' : 'Regenerate'}
                </button>
            </div>

            {/* Reasoning */}
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <h3 className="text-sm font-medium text-blue-900 mb-2">AI Reasoning</h3>
                <p className="text-sm text-blue-800">{recommendations.reasoning}</p>
            </div>

            {/* Entity Name */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Entity Name
                </label>
                <input
                    type="text"
                    value={editedRecommendations.entity_name}
                    onChange={(e) => handleEntityNameChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            {/* Canonical Schema Fields */}
            <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Canonical Schema Fields</h3>
                <div className="space-y-2">
                    {recommendations.canonical_schema.fields.map((field, index) => (
                        <div
                            key={index}
                            className="flex items-center gap-4 p-3 bg-gray-50 rounded-md border border-gray-200"
                        >
                            <div className="flex-1">
                                <span className="font-medium text-gray-900">{field.name}</span>
                            </div>
                            <div className="text-sm text-gray-600">
                                <span className="px-2 py-1 bg-white rounded border border-gray-300">
                                    {field.type}
                                </span>
                            </div>
                            {field.format && (
                                <div className="text-xs text-gray-500">
                                    Format: {field.format}
                                </div>
                            )}
                            {field.required && (
                                <span className="text-xs text-red-600 font-medium">Required</span>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Field Mappings */}
            <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Field Mappings</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Source Field
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Target Field
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Transformation
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    JSONata Formula
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Confidence
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {editedRecommendations.field_mappings.map((mapping, index) => (
                                <tr key={index} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-sm text-gray-900">
                                        {mapping.source_field}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-900">
                                        {mapping.target_field}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                            {mapping.transformation}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <input
                                            type="text"
                                            value={mapping.jsonata_formula}
                                            onChange={(e) =>
                                                handleFieldMappingChange(index, 'jsonata_formula', e.target.value)
                                            }
                                            className="w-full px-2 py-1 text-sm font-mono border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        />
                                    </td>
                                    <td className="px-4 py-3">
                                        <span
                                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getConfidenceColor(mapping.confidence)}`}
                                        >
                                            {getConfidenceLabel(mapping.confidence)} ({(mapping.confidence * 100).toFixed(0)}%)
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Explanations */}
                <div className="mt-4 space-y-2">
                    {editedRecommendations.field_mappings.map((mapping, index) => (
                        <div key={index} className="text-xs text-gray-600 pl-4 border-l-2 border-gray-200">
                            <span className="font-medium">{mapping.source_field} → {mapping.target_field}:</span>{' '}
                            {mapping.explanation}
                        </div>
                    ))}
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-500">
                    {isEditing && 'You have unsaved modifications'}
                </div>
                <div className="flex gap-3">
                    {isEditing && (
                        <button
                            onClick={handleSaveModifications}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            Save Modifications
                        </button>
                    )}
                    <button
                        onClick={() => onAcceptAll(editedRecommendations)}
                        className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                        Accept & Apply Mappings
                    </button>
                </div>
            </div>
        </div>
    );
}
