import { EntityMatch } from "./types";

interface Props {
  entityMatches: EntityMatch[];
  onSelectMatch: (entityId: number, entityName: string) => void;
}

export const EntityMatchingSuggestions = ({ entityMatches, onSelectMatch }: Props) => {
  if (entityMatches.length === 0) {
    return null;
  }

  // Get the best match
  const bestMatch = entityMatches[0];

  // Get recommendation badge styling
  const getRecommendationBadge = (recommendation: string) => {
    const badges = {
      strong_match: { color: 'bg-green-100 text-green-800', icon: '✓✓', label: 'Strong Match' },
      good_match: { color: 'bg-blue-100 text-blue-800', icon: '✓', label: 'Good Match' },
      partial_match: { color: 'bg-yellow-100 text-yellow-800', icon: '~', label: 'Partial Match' },
      create_new: { color: 'bg-gray-100 text-gray-800', icon: '+', label: 'Create New' },
    };
    return badges[recommendation as keyof typeof badges] || badges.create_new;
  };

  return (
    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-6 mb-6">
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-2xl">🤖</span>
          </div>
        </div>

        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Intelligent Entity Matching
          </h3>

          {bestMatch.similarity_score >= 50 ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                We found existing entities that might match your data structure. Consider mapping to an existing entity instead of creating a new one.
              </p>

              {/* Best Match Card */}
              <div className="bg-white rounded-lg border-2 border-indigo-300 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-semibold text-gray-900">{bestMatch.entity_name}</h4>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRecommendationBadge(bestMatch.recommendation).color}`}>
                      {getRecommendationBadge(bestMatch.recommendation).icon} {getRecommendationBadge(bestMatch.recommendation).label}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-indigo-600">{Math.round(bestMatch.similarity_score)}%</div>
                    <div className="text-xs text-gray-500">Similarity</div>
                  </div>
                </div>

                {/* Similarity Breakdown */}
                <div className="grid grid-cols-4 gap-2 mb-4">
                  <div className="text-center">
                    <div className="text-sm font-medium text-gray-700">{Math.round(bestMatch.field_name_match)}%</div>
                    <div className="text-xs text-gray-500">Fields</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-medium text-gray-700">{Math.round(bestMatch.type_match)}%</div>
                    <div className="text-xs text-gray-500">Types</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-medium text-gray-700">{Math.round(bestMatch.format_match)}%</div>
                    <div className="text-xs text-gray-500">Formats</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-medium text-gray-700">{Math.round(bestMatch.structure_match)}%</div>
                    <div className="text-xs text-gray-500">Structure</div>
                  </div>
                </div>

                {/* Format Compatibility Warnings */}
                {!bestMatch.format_compatibility.is_compatible && bestMatch.format_compatibility.incompatibilities.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
                    <div className="flex items-start space-x-2">
                      <span className="text-yellow-600 text-sm">⚠️</span>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-yellow-900 mb-1">
                          Format Transformations Required
                        </div>
                        <div className="text-xs text-yellow-700 space-y-1">
                          {bestMatch.format_compatibility.incompatibilities.map((incompat, idx) => (
                            <div key={idx}>
                              • <span className="font-mono">{incompat.field}</span>: {incompat.source_format} → {incompat.target_format}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => onSelectMatch(bestMatch.entity_id, bestMatch.entity_name)}
                  className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                >
                  Use This Entity
                </button>
              </div>

              {/* Other Matches */}
              {entityMatches.length > 1 && (
                <details className="group">
                  <summary className="cursor-pointer text-sm text-indigo-600 hover:text-indigo-800 font-medium">
                    View {entityMatches.length - 1} more {entityMatches.length - 1 === 1 ? 'match' : 'matches'}
                  </summary>
                  <div className="mt-3 space-y-2">
                    {entityMatches.slice(1, 4).map((match, idx) => (
                      <div key={idx} className="bg-white border border-gray-200 rounded-lg p-3 flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-gray-900">{match.entity_name}</span>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${getRecommendationBadge(match.recommendation).color}`}>
                              {Math.round(match.similarity_score)}%
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => onSelectMatch(match.entity_id, match.entity_name)}
                          className="ml-3 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                        >
                          Select
                        </button>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-600 mb-3">
                No close matches found for this data structure. We recommend creating a new entity.
              </p>
              <div className="bg-white rounded-lg border border-gray-200 p-3 text-sm text-gray-700">
                💡 Tip: Hover over objects and arrays in the JSON view to create new entities.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
