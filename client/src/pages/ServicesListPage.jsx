import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, ShoppingCart, Sparkles, RotateCcw, Ban, CheckCircle2 } from 'lucide-react';
import api from '../utils/api';
import { useSystem } from '../contexts/SystemContext';
import LoadingSpinner from '../components/LoadingSpinner';

export default function ServicesListPage() {
  const { formatPrice, currentCurrency } = useSystem();
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [mobileFilter, setMobileFilter] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [servicesData, categoriesData] = await Promise.all([
          api.services.getAll(),
          api.services.getCategories(),
        ]);
        setServices(servicesData.services || servicesData || []);
        setCategories(categoriesData.categories || categoriesData || []);
      } catch (err) {
        console.error('Failed to fetch services:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filtered = services.filter((s) => {
    const matchesCategory = selectedCategory === 'all' || 
      String(s.category) === String(selectedCategory) || 
      String(s.category_id) === String(selectedCategory);
    const matchesSearch = s.name?.toLowerCase().includes(search.toLowerCase()) || 
      s.description?.toLowerCase().includes(search.toLowerCase()) ||
      String(s.service_id || s.id).includes(search);
    return matchesCategory && matchesSearch;
  });

  if (loading) return <LoadingSpinner fullPage />;

  return (
    <div className="services-list-page animate-in fade-in duration-150">
      {/* Header */}
      <div className="services-list-header">
        <div className="section-container">
          <div className="hero-badge inline-flex mb-3">⚡ Wholesale SMM Catalog</div>
          <h1 className="page-title">
            Our <span className="gradient-text">Wholesale Services</span>
          </h1>
          <p className="page-subtitle max-w-xl mx-auto">
            Browse our complete live catalog of social media marketing services with transparent wholesale pricing in {currentCurrency.code}.
          </p>
        </div>
      </div>

      <div className="section-container px-4 py-8">
        {/* Quick Horizontal Category Pills (SMMXZ Style) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 scrollbar-thin">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              selectedCategory === 'all'
                ? 'bg-primary text-white shadow-md shadow-primary/25'
                : 'bg-bg-surface-elevated text-text-secondary hover:text-text-primary border border-border-main'
            }`}
          >
            🌟 All Categories ({services.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id || cat._id || cat.name}
              onClick={() => setSelectedCategory(String(cat.id || cat._id || cat.name))}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === String(cat.id || cat._id || cat.name)
                  ? 'bg-primary text-white shadow-md shadow-primary/25'
                  : 'bg-bg-surface-elevated text-text-secondary hover:text-text-primary border border-border-main'
              }`}
            >
              {cat.icon || '📦'} {cat.name}
            </button>
          ))}
        </div>

        <div className="services-layout">
          {/* Desktop Left Sidebar Filter */}
          <aside className="services-sidebar hidden lg:block">
            <h3 className="sidebar-filter-title">Filter by Category</h3>
            <button
              className={`filter-btn ${selectedCategory === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('all')}
            >
              All Services ({services.length})
            </button>
            <div className="space-y-1 max-h-[600px] overflow-y-auto pr-1">
              {categories.map((cat) => (
                <button
                  key={cat.id || cat._id || cat.name}
                  className={`filter-btn flex items-center justify-between ${
                    selectedCategory === String(cat.id || cat._id || cat.name) ? 'active' : ''
                  }`}
                  onClick={() => setSelectedCategory(String(cat.id || cat._id || cat.name))}
                >
                  <span className="truncate">{cat.icon || '📦'} {cat.name}</span>
                </button>
              ))}
            </div>
          </aside>

          {/* Main Content Area */}
          <div className="services-main">
            {/* Search Bar */}
            <div className="services-search-bar">
              <Search size={18} className="text-muted-foreground" />
              <input
                type="text"
                placeholder="Search services by name, keyword, or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-transparent border-none text-text-primary text-sm focus:outline-none"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="text-xs text-muted-foreground hover:text-text-primary"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Results Count */}
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-3 px-1">
              <span>Showing <strong>{filtered.length}</strong> available services</span>
              <span>All prices in <strong>{currentCurrency.code}</strong></span>
            </div>

            {/* Responsive Table */}
            <div className="services-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="w-16">ID</th>
                    <th>Service Name & Features</th>
                    <th className="w-28 text-right">Rate / 1,000</th>
                    <th className="w-24 text-center">Min / Max</th>
                    <th className="w-28 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="table-empty py-16 text-center text-muted-foreground">
                        <Sparkles size={32} className="mx-auto mb-2 opacity-40 text-primary" />
                        <p className="font-semibold text-sm">No services found matching your search</p>
                        <p className="text-xs mt-1">Try selecting another category or clearing your search term</p>
                      </td>
                    </tr>
                  ) : (
                    filtered.map((service) => (
                      <tr key={service.id || service._id} className="transition-colors hover:bg-bg-surface-hover/60">
                        <td className="font-mono text-xs font-bold text-muted-foreground">
                          #{service.service_id || service.id}
                        </td>
                        <td>
                          <div className="service-name text-text-primary font-bold text-sm">
                            {service.name}
                          </div>
                          {service.description && (
                            <div className="service-desc-small text-xs text-muted-foreground mt-1 line-clamp-2">
                              {service.description}
                            </div>
                          )}
                          <div className="flex items-center gap-2 mt-1.5">
                            {service.refill ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <RotateCcw size={10} /> Refill Guarantee
                              </span>
                            ) : null}
                            {service.cancel ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                <Ban size={10} /> Cancel Supported
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="text-right">
                          <span className="price-cell text-sm font-extrabold text-emerald-400">
                            {formatPrice(service.rate || service.price_per_1000 || 0)}
                          </span>
                        </td>
                        <td className="text-center font-mono text-xs text-muted-foreground">
                          <div>{service.min_quantity || service.min || 10}</div>
                          <div className="opacity-60 text-[10px]">to {(service.max_quantity || service.max || 10000).toLocaleString()}</div>
                        </td>
                        <td className="text-center">
                          <Link
                            to={`/dashboard/new-order?service_id=${service.id || service._id}`}
                            className="btn-gradient btn-sm inline-flex items-center gap-1.5 px-3 py-1.5 text-xs"
                          >
                            <ShoppingCart size={13} />
                            <span>Order</span>
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
