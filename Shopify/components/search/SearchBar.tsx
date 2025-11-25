'use client';

import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import SearchDropdown from './SearchDropdown';
import { useSearchBar } from '@/hooks/useSearchBar';

export default function SearchBar() {
  const {
    query,
    results,
    loading,
    isOpen,
    inputRef,
    containerRef,
    setQuery,
    handleKeyDown,
    handleFocus,
    handleClear,
    handleSelect,
  } = useSearchBar();

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#667085]" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search products..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          className="pl-10 pr-10"
        />
        {query && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6"
            onClick={handleClear}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      {isOpen && (query || results.length > 0) && (
        <SearchDropdown
          results={results}
          query={query}
          loading={loading}
          onSelect={handleSelect}
        />
      )}
    </div>
  );
}

