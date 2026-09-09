import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Calendar,
  Filter,
  Check,
  Search,
  X,
  SlidersHorizontal,
  ChevronDown,
  RotateCcw,
  Layers
} from 'lucide-react';
import { FilterState, FLEET_CATEGORIES, FleetCategoryItem } from '../types';

interface GlobalFilterBarProps {
  filters: FilterState;
  onFilterChange: (updated: Partial<FilterState>) => void;
  availableCategories: string[];
  availableUnits: string[];
  availableDates: string[];
  minDate: string;
  maxDate: string;
  categoryUnitCounts?: Record<string, number>;
}

export const GlobalFilterBar: React.FC<GlobalFilterBarProps> = ({
  filters,
  onFilterChange,
  availableCategories,
  availableUnits,
  availableDates,
  minDate,
  maxDate,
  categoryUnitCounts = {},
}) => {
  const [isUnitDropdownOpen, setIsUnitDropdownOpen] = useState(false);
  const [unitSearchText, setUnitSearchText] = useState('');
  const unitDropdownRef = useRef<HTMLDivElement>(null);

  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [categorySearchText, setCategorySearchText] = useState('');
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (unitDropdownRef.current && !unitDropdownRef.current.contains(event.target as Node)) {
        setIsUnitDropdownOpen(false);
      }
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setIsCategoryDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredUnitOptions = availableUnits.filter(u =>
    u.toLowerCase().includes(unitSearchText.toLowerCase())
  );

  // Combine standard 12 categories with any custom detected categories
  const allCategoryOptions = useMemo<FleetCategoryItem[]>(() => {
    const list = [...FLEET_CATEGORIES];
    availableCategories.forEach(cat => {
      const exists = list.some(c => c.id.toLowerCase() === cat.toLowerCase());
      if (!exists && cat && cat !== 'ALL') {
        list.push({
          id: cat,
          name: cat,
          code: cat.slice(0, 2).toUpperCase(),
          label: cat,
          description: `Custom Category: ${cat}`,
          prefix: cat.slice(0, 2).toUpperCase(),
        });
      }
    });
    return list;
  }, [availableCategories]);

  // Filtered categories in dropdown search
  const filteredCategories = useMemo(() => {
    const q = categorySearchText.toLowerCase().trim();
    if (!q) return allCategoryOptions;
    return allCategoryOptions.filter(
      c =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.label.toLowerCase().includes(q)
    );
  }, [allCategoryOptions, categorySearchText]);

  // Find currently active category details
  const currentCategoryItem = allCategoryOptions.find(
    c => c.id.toLowerCase() === filters.selectedCategory.toLowerCase()
  );

  const toggleUnitSelection = (unit: string) => {
    const exists = filters.selectedUnits.includes(unit);
    if (exists) {
      onFilterChange({ selectedUnits: filters.selectedUnits.filter(u => u !== unit) });
    } else {
      onFilterChange({ selectedUnits: [...filters.selectedUnits, unit] });
    }
  };

  const handleSelectAllUnits = () => {
    onFilterChange({ selectedUnits: [] }); // empty array signifies all units
  };

  const handleClearAllUnits = () => {
    onFilterChange({ selectedUnits: [] });
  };

  const setDatePreset = (start: string, end: string) => {
    onFilterChange({
      dateMode: 'range',
      startDate: start,
      endDate: end,
    });
  };

  return (
    <section className="bg-[#181c24] border border-[#31353e]/80 p-3 rounded-lg shadow-sm flex flex-col gap-3">
      {/* Top Controls Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Date Filter Module */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Mode Switch: Range vs Single */}
          <div className="flex items-center bg-[#0f131c] p-0.5 rounded border border-[#31353e]/70">
            <button
              onClick={() => onFilterChange({ dateMode: 'range' })}
              className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition-colors ${
                filters.dateMode === 'range'
                  ? 'bg-[#262a33] text-[#89ceff] shadow-sm font-semibold'
                  : 'text-[#88929b] hover:text-[#dfe2ee]'
              }`}
            >
              Date Range
            </button>
            <button
              onClick={() => onFilterChange({ dateMode: 'single' })}
              className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition-colors ${
                filters.dateMode === 'single'
                  ? 'bg-[#262a33] text-[#89ceff] shadow-sm font-semibold'
                  : 'text-[#88929b] hover:text-[#dfe2ee]'
              }`}
            >
              Single Date
            </button>
          </div>

          {/* Date Picker Input */}
          {filters.dateMode === 'range' ? (
            <div className="flex items-center gap-1.5 bg-[#0f131c] px-2.5 py-1 rounded border border-[#31353e]/70">
              <Calendar className="w-3.5 h-3.5 text-[#89ceff]" />
              <input
                type="date"
                value={filters.startDate}
                min={minDate}
                max={filters.endDate || maxDate}
                onChange={e => onFilterChange({ startDate: e.target.value })}
                className="bg-transparent text-xs font-mono text-[#dfe2ee] focus:outline-none cursor-pointer"
              />
              <span className="text-xs text-[#88929b] font-mono">to</span>
              <input
                type="date"
                value={filters.endDate}
                min={filters.startDate || minDate}
                max={maxDate}
                onChange={e => onFilterChange({ endDate: e.target.value })}
                className="bg-transparent text-xs font-mono text-[#dfe2ee] focus:outline-none cursor-pointer"
              />
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-[#0f131c] px-2.5 py-1 rounded border border-[#31353e]/70">
              <Calendar className="w-3.5 h-3.5 text-[#89ceff]" />
              <input
                type="date"
                value={filters.selectedSingleDate}
                min={minDate}
                max={maxDate}
                onChange={e => onFilterChange({ selectedSingleDate: e.target.value })}
                className="bg-transparent text-xs font-mono text-[#dfe2ee] focus:outline-none cursor-pointer"
              />
            </div>
          )}

          {/* Quick Date Presets */}
          <div className="hidden sm:flex items-center gap-1">
            <button
              onClick={() => setDatePreset(minDate, maxDate)}
              className="px-2 py-1 bg-[#1c2028] hover:bg-[#262a33] text-[#bec8d2] text-[11px] font-mono rounded border border-[#31353e]/50 transition-colors"
            >
              Full Period
            </button>
            {availableDates.length >= 7 && (
              <button
                onClick={() => setDatePreset(availableDates[0], availableDates[Math.min(6, availableDates.length - 1)])}
                className="px-2 py-1 bg-[#1c2028] hover:bg-[#262a33] text-[#bec8d2] text-[11px] font-mono rounded border border-[#31353e]/50 transition-colors"
              >
                1st Week
              </button>
            )}
            {availableDates.length > 7 && (
              <button
                onClick={() => setDatePreset(availableDates[7], availableDates[availableDates.length - 1])}
                className="px-2 py-1 bg-[#1c2028] hover:bg-[#262a33] text-[#bec8d2] text-[11px] font-mono rounded border border-[#31353e]/50 transition-colors"
              >
                2nd Week
              </button>
            )}
          </div>
        </div>

        {/* Right Search Input */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#88929b]" />
          <input
            type="text"
            value={filters.searchQuery}
            onChange={e => onFilterChange({ searchQuery: e.target.value })}
            placeholder="Search Unit ID or Activity..."
            className="w-full bg-[#0f131c] text-[#dfe2ee] pl-8 pr-7 py-1 rounded text-xs font-mono placeholder:text-[#88929b] border border-[#31353e]/70 focus:outline-none focus:border-[#89ceff]"
          />
          {filters.searchQuery && (
            <button
              onClick={() => onFilterChange({ searchQuery: '' })}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[#88929b] hover:text-[#dfe2ee]"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Bottom Category and Unit Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#31353e]/50">
        {/* Category Dropdown Menu ("gaya drip down") */}
        <div className="flex items-center gap-2">
          <div className="relative" ref={categoryDropdownRef}>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-mono border transition-all ${
                  filters.selectedCategory !== 'ALL'
                    ? 'bg-[#0ea5e9]/15 border-[#89ceff] text-[#dfe2ee] font-medium shadow-sm'
                    : 'bg-[#0f131c] border-[#31353e]/80 text-[#dfe2ee] hover:bg-[#1c2028] hover:border-[#89ceff]/50'
                }`}
                title="Filter by Equipment Category"
              >
                <div className="flex items-center gap-1.5">
                  <Layers className={`w-3.5 h-3.5 ${filters.selectedCategory !== 'ALL' ? 'text-[#89ceff]' : 'text-[#88929b]'}`} />
                  <span className="text-[#88929b] text-[11px]">Category:</span>
                </div>

                {filters.selectedCategory === 'ALL' ? (
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-[#262a33] text-[#89ceff] text-[10px] font-bold">
                      ALL
                    </span>
                    <span className="font-semibold text-[#dfe2ee]">All Categories</span>
                    <span className="text-[11px] text-[#88929b]">({allCategoryOptions.length} Types)</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-[#89ceff] text-[#00344d] text-[10px] font-bold">
                      {currentCategoryItem ? currentCategoryItem.code : filters.selectedCategory.slice(0, 2).toUpperCase()}
                    </span>
                    <span className="font-bold text-[#89ceff]">
                      {currentCategoryItem ? currentCategoryItem.name : filters.selectedCategory}
                    </span>
                  </div>
                )}

                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isCategoryDropdownOpen ? 'rotate-180 text-[#89ceff]' : 'text-[#88929b]'}`} />
              </button>

              {/* Clear Category Quick Button */}
              {filters.selectedCategory !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => onFilterChange({ selectedCategory: 'ALL' })}
                  title="Reset Category to All"
                  className="p-1.5 rounded bg-[#1c2028] border border-[#31353e] text-[#88929b] hover:text-[#ffb4ab] hover:border-[#ffb4ab]/40 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Category Dropdown Popover */}
            {isCategoryDropdownOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-80 sm:w-96 bg-[#1c2028] border border-[#31353e] rounded-lg shadow-2xl z-50 p-2 flex flex-col gap-2">
                {/* Search Box */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#88929b]" />
                  <input
                    type="text"
                    value={categorySearchText}
                    onChange={e => setCategorySearchText(e.target.value)}
                    placeholder="Filter category (FD, DT, Excavator, Dozer...)"
                    className="w-full bg-[#0f131c] text-[#dfe2ee] pl-8 pr-7 py-1.5 rounded text-xs font-mono border border-[#31353e] focus:outline-none focus:border-[#89ceff]"
                    autoFocus
                  />
                  {categorySearchText && (
                    <button
                      onClick={() => setCategorySearchText('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[#88929b] hover:text-[#dfe2ee]"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Categories List */}
                <div className="max-h-72 overflow-y-auto flex flex-col gap-1 pr-1">
                  {/* All Categories Option */}
                  <button
                    type="button"
                    onClick={() => {
                      onFilterChange({ selectedCategory: 'ALL' });
                      setIsCategoryDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-2 rounded text-left transition-colors ${
                      filters.selectedCategory === 'ALL'
                        ? 'bg-[#0ea5e9]/20 border border-[#89ceff]/50 text-[#dfe2ee]'
                        : 'hover:bg-[#262a33] text-[#bec8d2]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-7 h-6 rounded bg-[#262a33] text-[#89ceff] text-[10px] font-mono font-bold flex items-center justify-center">
                        ALL
                      </span>
                      <div>
                        <div className="text-xs font-mono font-bold text-[#dfe2ee]">
                          All Categories (Semua Kategori)
                        </div>
                        <div className="text-[10px] font-mono text-[#88929b]">
                          Show all 12 mining equipment & auxiliary categories
                        </div>
                      </div>
                    </div>
                    {filters.selectedCategory === 'ALL' && (
                      <Check className="w-4 h-4 text-[#89ceff] shrink-0" />
                    )}
                  </button>

                  <div className="border-t border-[#31353e]/60 my-1"></div>

                  {/* 12 Categorized Options */}
                  {filteredCategories.map(cat => {
                    const isSelected = filters.selectedCategory.toLowerCase() === cat.id.toLowerCase();
                    const unitCount = categoryUnitCounts[cat.id] || 0;

                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          onFilterChange({ selectedCategory: cat.id });
                          setIsCategoryDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between p-2 rounded text-left transition-colors ${
                          isSelected
                            ? 'bg-[#0ea5e9]/20 border border-[#89ceff]/50 text-[#dfe2ee]'
                            : 'hover:bg-[#262a33] text-[#bec8d2]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={`w-7 h-6 rounded text-[11px] font-mono font-bold flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'bg-[#89ceff] text-[#00344d]'
                              : 'bg-[#0f131c] text-[#89ceff] border border-[#31353e]'
                          }`}>
                            {cat.code}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-mono font-bold truncate ${isSelected ? 'text-[#89ceff]' : 'text-[#dfe2ee]'}`}>
                                {cat.name}
                              </span>
                              {cat.prefix && (
                                <span className="text-[10px] font-mono text-[#88929b] bg-[#0f131c] px-1 rounded border border-[#31353e]/50">
                                  {cat.prefix}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] font-mono text-[#88929b] truncate">
                              {cat.description}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          {unitCount > 0 && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#0f131c] text-[#88929b] border border-[#31353e]/60">
                              {unitCount} {unitCount === 1 ? 'unit' : 'units'}
                            </span>
                          )}
                          {isSelected && (
                            <Check className="w-4 h-4 text-[#89ceff]" />
                          )}
                        </div>
                      </button>
                    );
                  })}

                  {filteredCategories.length === 0 && (
                    <div className="py-4 text-center text-xs font-mono text-[#88929b]">
                      No categories found matching "{categorySearchText}"
                    </div>
                  )}
                </div>

                {/* Footer Note */}
                <div className="pt-1.5 border-t border-[#31353e] flex items-center justify-between text-[10px] font-mono text-[#88929b]">
                  <span>12 Standard Fleet Categories</span>
                  <span>Timeshet Mobile</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Unit Multi-Select Dropdown */}
        <div className="flex items-center gap-2">
          <div className="relative" ref={unitDropdownRef}>
            <button
              onClick={() => setIsUnitDropdownOpen(!isUnitDropdownOpen)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono border transition-colors ${
                filters.selectedUnits.length > 0
                  ? 'bg-[#0ea5e9]/10 border-[#89ceff] text-[#89ceff] font-semibold'
                  : 'bg-[#0f131c] border-[#31353e]/70 text-[#dfe2ee] hover:bg-[#1c2028]'
              }`}
            >
              <SlidersHorizontal className="w-3 h-3 text-[#89ceff]" />
              <span>
                {filters.selectedUnits.length === 0
                  ? `All Units (${availableUnits.length})`
                  : `${filters.selectedUnits.length} Units Selected`}
              </span>
              <ChevronDown className="w-3 h-3 ml-1 text-[#88929b]" />
            </button>

            {/* Dropdown Menu */}
            {isUnitDropdownOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-64 bg-[#1c2028] border border-[#31353e] rounded-lg shadow-2xl z-50 p-2 flex flex-col gap-2">
                <div className="flex items-center justify-between pb-1 border-b border-[#31353e]">
                  <span className="text-xs font-mono font-bold text-[#dfe2ee]">Filter Specific Units</span>
                  <button
                    onClick={handleSelectAllUnits}
                    className="text-[11px] font-mono text-[#89ceff] hover:underline"
                  >
                    Select All
                  </button>
                </div>

                {/* Unit search in dropdown */}
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#88929b]" />
                  <input
                    type="text"
                    value={unitSearchText}
                    onChange={e => setUnitSearchText(e.target.value)}
                    placeholder="Filter unit ID..."
                    className="w-full bg-[#0f131c] text-[#dfe2ee] pl-7 pr-2 py-1 rounded text-[11px] font-mono border border-[#31353e] focus:outline-none"
                  />
                </div>

                {/* List of Units */}
                <div className="max-h-48 overflow-y-auto flex flex-col gap-0.5">
                  {filteredUnitOptions.map(unit => {
                    const isSelected = filters.selectedUnits.includes(unit);
                    return (
                      <button
                        key={unit}
                        onClick={() => toggleUnitSelection(unit)}
                        className={`flex items-center justify-between px-2 py-1.5 rounded text-xs font-mono text-left transition-colors ${
                          isSelected
                            ? 'bg-[#0ea5e9]/20 text-[#89ceff] font-bold'
                            : 'text-[#bec8d2] hover:bg-[#262a33]'
                        }`}
                      >
                        <span>{unit}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#89ceff]" />}
                      </button>
                    );
                  })}
                  {filteredUnitOptions.length === 0 && (
                    <span className="text-[11px] font-mono text-[#88929b] text-center py-2">
                      No units matching search
                    </span>
                  )}
                </div>

                {filters.selectedUnits.length > 0 && (
                  <div className="pt-1 border-t border-[#31353e] flex justify-between items-center">
                    <span className="text-[10px] font-mono text-[#88929b]">
                      {filters.selectedUnits.length} selected
                    </span>
                    <button
                      onClick={handleClearAllUnits}
                      className="text-[10px] font-mono text-[#ffb4ab] hover:underline"
                    >
                      Clear Selection
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
