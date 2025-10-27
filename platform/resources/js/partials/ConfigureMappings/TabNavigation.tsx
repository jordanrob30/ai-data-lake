interface TabNavigationProps {
  activeTab: "json" | "entities";
  onTabChange: (tab: "json" | "entities") => void;
  mappablePathsCount: number;
  existingEntitiesCount: number;
}

export const TabNavigation = ({
  activeTab,
  onTabChange,
  mappablePathsCount,
  existingEntitiesCount,
}: TabNavigationProps) => {
  return (
    <div className="bg-white rounded-lg shadow border mb-8">
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex">
          <button
            onClick={() => onTabChange("json")}
            className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "json"
                ? "border-indigo-500 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Interactive JSON ({mappablePathsCount} mappable)
          </button>
          <button
            onClick={() => onTabChange("entities")}
            className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "entities"
                ? "border-indigo-500 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Entity Schemas ({existingEntitiesCount} created)
          </button>
        </nav>
      </div>
    </div>
  );
};

