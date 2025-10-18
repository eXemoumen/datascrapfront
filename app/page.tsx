"use client";

import { useState, useEffect } from "react";

interface Announcement {
  id: number;
  member_id: string;
  company_name: string;
  announcement_title: string;
  description: string;
  products: string;
  location: string;
  announcement_type: string;
  announcement_date: string;
  announcement_url: string;
  scraped_date: string;
  checked: number;
  created_at: string;
}

interface Stats {
  total: number;
  checked: number;
  unchecked: number;
  today: number;
  topProducts?: Array<{ product: string; count: number }>;
  topLocations?: Array<{ location: string; count: number }>;
}

interface FilterState {
  searchTerm: string;
  filterType: string;
  filterLocation: string;
  filterProduct: string;
  filterStatus: string;
  dateFrom: string;
  dateTo: string;
  showFilters: boolean;
}

export default function Home() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    checked: 0,
    unchecked: 0,
    today: 0,
  });
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [statusCheckInterval, setStatusCheckInterval] =
    useState<NodeJS.Timeout | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    searchTerm: "",
    filterType: "all",
    filterLocation: "all",
    filterProduct: "all",
    filterStatus: "all",
    dateFrom: "",
    dateTo: "",
    showFilters: false,
  });

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
  const IS_PRODUCTION = process.env.NODE_ENV === "production";

  useEffect(() => {
    fetchAnnouncements();
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const response = await fetch(`${API_URL}/api/announcements`);
      const data = await response.json();
      setAnnouncements(Array.isArray(data) ? data : []);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching announcements:", error);
      setAnnouncements([]);
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_URL}/api/stats`);
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const toggleCheck = async (id: number, currentChecked: number) => {
    try {
      const newChecked = currentChecked === 1 ? 0 : 1;
      await fetch(`${API_URL}/api/announcements/${id}/check`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checked: newChecked }),
      });

      setAnnouncements(
        announcements.map((a) =>
          a.id === id ? { ...a, checked: newChecked } : a
        )
      );
      fetchStats();
    } catch (error) {
      console.error("Error toggling check:", error);
    }
  };

  const startScraping = async () => {
    try {
      setScraping(true);
      await fetch(`${API_URL}/api/scrape`, { method: "POST" });

      const checkStatus = setInterval(async () => {
        const response = await fetch(`${API_URL}/api/scrape/status`);
        const status = await response.json();

        if (!status.running) {
          clearInterval(checkStatus);
          setScraping(false);
          // Auto-reload data when scraping completes
          await fetchAnnouncements();
          await fetchStats();
          alert(status.message + "\n\nPage will refresh to show new results!");
          window.location.reload();
        }
      }, 2000);

      setStatusCheckInterval(checkStatus);
    } catch (error) {
      console.error("Error starting scrape:", error);
      setScraping(false);
    }
  };

  const stopScraping = () => {
    if (statusCheckInterval) {
      clearInterval(statusCheckInterval);
      setStatusCheckInterval(null);
    }
    setScraping(false);
    // Reload data to show what was scraped so far
    fetchAnnouncements();
    fetchStats();
    alert("Scraping stopped! Showing results scraped so far.");
  };

  const updateFilter = (key: keyof FilterState, value: string | boolean) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearAllFilters = () => {
    setFilters({
      searchTerm: "",
      filterType: "all",
      filterLocation: "all",
      filterProduct: "all",
      filterStatus: "all",
      dateFrom: "",
      dateTo: "",
      showFilters: false,
    });
  };

  const filteredAnnouncements = Array.isArray(announcements)
    ? announcements.filter((a) => {
        // Search filter
        const matchesSearch =
          filters.searchTerm === "" ||
          a.announcement_title
            .toLowerCase()
            .includes(filters.searchTerm.toLowerCase()) ||
          a.description
            .toLowerCase()
            .includes(filters.searchTerm.toLowerCase()) ||
          a.location.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
          a.products.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
          a.company_name
            .toLowerCase()
            .includes(filters.searchTerm.toLowerCase());

        // Type filter
        const matchesType =
          filters.filterType === "all" ||
          a.announcement_type === filters.filterType;

        // Location filter
        const matchesLocation =
          filters.filterLocation === "all" ||
          a.location === filters.filterLocation;

        // Product filter
        const matchesProduct =
          filters.filterProduct === "all" ||
          a.products
            .toLowerCase()
            .includes(filters.filterProduct.toLowerCase());

        // Status filter
        const matchesStatus =
          filters.filterStatus === "all" ||
          (filters.filterStatus === "checked" && a.checked === 1) ||
          (filters.filterStatus === "unchecked" && a.checked === 0);

        // Date range filter
        const announcementDate = new Date(a.announcement_date);
        const fromDate = filters.dateFrom ? new Date(filters.dateFrom) : null;
        const toDate = filters.dateTo ? new Date(filters.dateTo) : null;

        const matchesDateRange =
          (!fromDate || announcementDate >= fromDate) &&
          (!toDate || announcementDate <= toDate);

        return (
          matchesSearch &&
          matchesType &&
          matchesLocation &&
          matchesProduct &&
          matchesStatus &&
          matchesDateRange
        );
      })
    : [];

  // Get unique values for filter options
  const uniqueTypes = Array.from(
    new Set(announcements.map((a) => a.announcement_type))
  ).filter(Boolean);
  const uniqueLocations = Array.from(
    new Set(announcements.map((a) => a.location))
  ).filter(Boolean);
  const uniqueProducts = Array.from(
    new Set(
      announcements
        .flatMap((a) => a.products.split(",").map((p) => p.trim()))
        .filter(Boolean)
    )
  );

  // Count active filters
  const activeFiltersCount = [
    filters.searchTerm,
    filters.filterType !== "all",
    filters.filterLocation !== "all",
    filters.filterProduct !== "all",
    filters.filterStatus !== "all",
    filters.dateFrom,
    filters.dateTo,
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-800 mb-4 lg:mb-0">
              EspaceAgro Scraper Dashboard
            </h1>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              {!IS_PRODUCTION && (
                <>
                  <button
                    onClick={startScraping}
                    disabled={scraping}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {scraping ? "🔄 Scraping..." : "▶️ Start Scraping"}
                  </button>
                  {scraping && (
                    <button
                      onClick={stopScraping}
                      className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 flex items-center gap-2"
                    >
                      ⏹️ Stop Scraping
                    </button>
                  )}
                </>
              )}
              <button
                onClick={() => {
                  fetchAnnouncements();
                  fetchStats();
                }}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                🔄 Refresh Data
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {stats.total}
              </div>
              <div className="text-sm text-gray-600">Total Announcements</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {stats.checked}
              </div>
              <div className="text-sm text-gray-600">Checked</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">
                {stats.unchecked}
              </div>
              <div className="text-sm text-gray-600">Unchecked</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {stats.today}
              </div>
              <div className="text-sm text-gray-600">Added Today</div>
            </div>
          </div>

          {/* Data Insights */}
          {(stats.topProducts && stats.topProducts.length > 0) ||
          (stats.topLocations && stats.topLocations.length > 0) ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Top Products */}
              {stats.topProducts && stats.topProducts.length > 0 && (
                <div className="bg-gradient-to-r from-orange-50 to-red-50 p-4 rounded-lg border">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    🍎 Top Products
                  </h3>
                  <div className="space-y-2">
                    {stats.topProducts.slice(0, 5).map((item, index) => (
                      <div
                        key={item.product}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-600">
                            #{index + 1}
                          </span>
                          <span className="text-sm text-gray-800 capitalize">
                            {item.product}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-orange-500 h-2 rounded-full"
                              style={{
                                width: `${
                                  stats.topProducts && stats.topProducts[0]
                                    ? (item.count /
                                        stats.topProducts[0].count) *
                                      100
                                    : 0
                                }%`,
                              }}
                            ></div>
                          </div>
                          <span className="text-sm font-semibold text-orange-600">
                            {item.count}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Top Locations */}
              {stats.topLocations && stats.topLocations.length > 0 && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    📍 Top Locations
                  </h3>
                  <div className="space-y-2">
                    {stats.topLocations.slice(0, 5).map((item, index) => (
                      <div
                        key={item.location}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-600">
                            #{index + 1}
                          </span>
                          <span className="text-sm text-gray-800 capitalize">
                            {item.location}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-500 h-2 rounded-full"
                              style={{
                                width: `${
                                  stats.topLocations && stats.topLocations[0]
                                    ? (item.count /
                                        stats.topLocations[0].count) *
                                      100
                                    : 0
                                }%`,
                              }}
                            ></div>
                          </div>
                          <span className="text-sm font-semibold text-blue-600">
                            {item.count}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {/* Search and Filter Controls */}
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="🔍 Search announcements, companies, locations, products..."
                  value={filters.searchTerm}
                  onChange={(e) => updateFilter("searchTerm", e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={() =>
                  updateFilter("showFilters", !filters.showFilters)
                }
                className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-200 flex items-center gap-2"
              >
                🔧 Advanced Filters
                {activeFiltersCount > 0 && (
                  <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                    {activeFiltersCount}
                  </span>
                )}
              </button>
            </div>

            {/* Quick Filter Buttons */}
            {(stats.topProducts && stats.topProducts.length > 0) ||
            (stats.topLocations && stats.topLocations.length > 0) ? (
              <div className="space-y-3">
                {/* Top Products Quick Filters */}
                {stats.topProducts && stats.topProducts.length > 0 && (
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-2">
                      🍎 Quick Product Filters:
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {stats.topProducts.slice(0, 6).map((item) => (
                        <button
                          key={item.product}
                          onClick={() =>
                            updateFilter("filterProduct", item.product)
                          }
                          className={`px-3 py-1 text-xs rounded-full transition-colors ${
                            filters.filterProduct === item.product
                              ? "bg-orange-500 text-white"
                              : "bg-orange-100 text-orange-700 hover:bg-orange-200"
                          }`}
                        >
                          {item.product} ({item.count})
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Top Locations Quick Filters */}
                {stats.topLocations && stats.topLocations.length > 0 && (
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-2">
                      📍 Quick Location Filters:
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {stats.topLocations.slice(0, 6).map((item) => (
                        <button
                          key={item.location}
                          onClick={() =>
                            updateFilter("filterLocation", item.location)
                          }
                          className={`px-3 py-1 text-xs rounded-full transition-colors ${
                            filters.filterLocation === item.location
                              ? "bg-blue-500 text-white"
                              : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                          }`}
                        >
                          {item.location} ({item.count})
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {/* Advanced Filters Panel */}
            {filters.showFilters && (
              <div className="bg-gray-50 p-4 rounded-lg border">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                  {/* Type Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type
                    </label>
                    <select
                      value={filters.filterType}
                      onChange={(e) =>
                        updateFilter("filterType", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All Types</option>
                      {uniqueTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Location Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Location
                    </label>
                    <select
                      value={filters.filterLocation}
                      onChange={(e) =>
                        updateFilter("filterLocation", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All Locations</option>
                      {uniqueLocations.map((location) => (
                        <option key={location} value={location}>
                          {location}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Product Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Product
                    </label>
                    <select
                      value={filters.filterProduct}
                      onChange={(e) =>
                        updateFilter("filterProduct", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All Products</option>
                      {uniqueProducts.map((product) => (
                        <option key={product} value={product}>
                          {product}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Status Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={filters.filterStatus}
                      onChange={(e) =>
                        updateFilter("filterStatus", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All Status</option>
                      <option value="checked">Checked</option>
                      <option value="unchecked">Unchecked</option>
                    </select>
                  </div>

                  {/* Date From */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      From Date
                    </label>
                    <input
                      type="date"
                      value={filters.dateFrom}
                      onChange={(e) => updateFilter("dateFrom", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Date To */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      To Date
                    </label>
                    <input
                      type="date"
                      value={filters.dateTo}
                      onChange={(e) => updateFilter("dateTo", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Filter Actions */}
                <div className="flex flex-wrap gap-3 items-center">
                  <button
                    onClick={clearAllFilters}
                    className="bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200 flex items-center gap-2"
                  >
                    ✕ Clear All Filters
                  </button>

                  {/* Active Filters Display */}
                  {activeFiltersCount > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {filters.searchTerm && (
                        <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                          Search: &ldquo;{filters.searchTerm}&rdquo;
                        </span>
                      )}
                      {filters.filterType !== "all" && (
                        <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                          Type: {filters.filterType}
                        </span>
                      )}
                      {filters.filterLocation !== "all" && (
                        <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm">
                          Location: {filters.filterLocation}
                        </span>
                      )}
                      {filters.filterProduct !== "all" && (
                        <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm">
                          Product: {filters.filterProduct}
                        </span>
                      )}
                      {filters.filterStatus !== "all" && (
                        <span className="bg-pink-100 text-pink-800 px-3 py-1 rounded-full text-sm">
                          Status: {filters.filterStatus}
                        </span>
                      )}
                      {(filters.dateFrom || filters.dateTo) && (
                        <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm">
                          Date: {filters.dateFrom || "∞"} to{" "}
                          {filters.dateTo || "∞"}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Results Summary */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="text-sm text-gray-600">
                    Showing{" "}
                    <span className="font-semibold text-gray-900">
                      {filteredAnnouncements.length}
                    </span>{" "}
                    of{" "}
                    <span className="font-semibold text-gray-900">
                      {announcements.length}
                    </span>{" "}
                    announcements
                  </div>
                  {activeFiltersCount > 0 && (
                    <div className="text-blue-600 text-sm">
                      {activeFiltersCount} filter
                      {activeFiltersCount !== 1 ? "s" : ""} active
                    </div>
                  )}
                </div>

                {/* Filter Results Analytics */}
                {filteredAnnouncements.length > 0 && (
                  <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      <span>
                        {
                          filteredAnnouncements.filter((a) => a.checked === 1)
                            .length
                        }{" "}
                        checked
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                      <span>
                        {
                          filteredAnnouncements.filter((a) => a.checked === 0)
                            .length
                        }{" "}
                        unchecked
                      </span>
                    </div>
                    {filteredAnnouncements.length > 0 && (
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                        <span>
                          {Math.round(
                            (filteredAnnouncements.filter(
                              (a) => a.checked === 1
                            ).length /
                              filteredAnnouncements.length) *
                              100
                          )}
                          % completion
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              Loading announcements...
            </div>
          ) : filteredAnnouncements.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <div className="text-4xl mb-4">🔍</div>
              <div className="text-lg font-medium mb-2">
                No announcements found
              </div>
              <div className="text-sm">
                {activeFiltersCount > 0
                  ? "Try adjusting your filters or search terms"
                  : "No announcements available"}
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      ✓
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Title
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Products
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Link
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredAnnouncements.map((announcement) => (
                    <tr
                      key={announcement.id}
                      className={`hover:bg-gray-50 transition-colors ${
                        announcement.checked ? "bg-green-50" : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={announcement.checked === 1}
                          onChange={() =>
                            toggleCheck(announcement.id, announcement.checked)
                          }
                          className="w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-500 cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900 mb-1">
                          {announcement.announcement_title}
                        </div>
                        <div className="text-xs text-gray-500 mb-1">
                          <span className="font-medium">Company:</span>{" "}
                          {announcement.company_name}
                        </div>
                        <div className="text-xs text-gray-500 line-clamp-2">
                          {announcement.description}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          {announcement.announcement_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {announcement.location}
                      </td>
                      <td
                        className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate"
                        title={announcement.products}
                      >
                        {announcement.products}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {announcement.announcement_date}
                      </td>
                      <td className="px-4 py-3">
                        <a
                          href={announcement.announcement_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          View →
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
