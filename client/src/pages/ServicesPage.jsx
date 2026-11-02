import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { useSystem } from '../contexts/SystemContext';
import LoadingSpinner from '../components/LoadingSpinner';
import Breadcrumbs from '../components/ui/Breadcrumbs';
import { Package, Search, ShoppingCart, Sparkles, RotateCcw, Ban } from 'lucide-react';

export default function ServicesPage() {
  const { formatPrice, currentCurrency } = useSystem();
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

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
        console.error('Failed to fetch data:', err);
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
      String(s.service_id || s.id).includes(search);
    return matchesCategory && matchesSearch;
  });

  if (loading) return <LoadingSpinner fullPage />;

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="dashboard-page-header">
        <div>
          <Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Services & Pricing' }]} />
          <h1 className="dashboard-page-title mt-1 flex items-center gap-2.5">
            <Package size={26} className="text-primary" />
            <span>Wholesale <span className="gradient-text">Services Catalog</span></span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time pricing and delivery specifications in {currentCurrency.code}.
          </p>
        </div>
        <Link to="/dashboard/new-order" className="btn btn-primary btn-sm inline-flex items-center gap-2">
          <ShoppingCart size={15} />
          <span>New Order</span>
        </Link>
      </div>

      {/* Quick Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            selectedCategory === 'all'
              ? 'bg-primary text-white shadow-md shadow-primary/25'
              : 'bg-surface text-text-secondary hover:text-text-primary border border-border-main'
          }`}
        >
          All ({services.length})
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id || cat._id || cat.name}
            onClick={() => setSelectedCategory(String(cat.id || cat._id || cat.name))}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              selectedCategory === String(cat.id || cat._id || cat.name)
                ? 'bg-primary text-white shadow-md shadow-primary/25'
                : 'bg-surface text-text-secondary hover:text-text-primary border border-border-main'
            }`}
          >
            {cat.icon || '📦'} {cat.name}
          </button>
        ))}
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-surface border border-border-main">
        <div className="flex items-center gap-2 flex-1 px-3 py-2 rounded-xl bg-bg-surface-elevated border border-border-main">
          <Search size={16} className="text-muted-foreground" />
          <input
            type="text"
            placeholder="Search service name or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent border-none text-text-primary text-xs focus:outline-none"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-[11px] text-muted-foreground hover:text-text-primary">
              Clear
            </button>
          )}
        </div>
        <select
          className="px-3.5 py-2 rounded-xl bg-bg-surface-elevated border border-border-main text-xs text-text-primary focus:outline-none focus:border-primary"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          <option value="all">All Categories ({services.length})</option>
          {categories.map((cat) => (
            <option key={cat._id || cat.id || cat.name} value={cat._id || cat.id || cat.name}>
              {cat.icon || '📦'} {cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* Responsive Table */}
      <div className="table-responsive glass-card overflow-x-auto rounded-2xl border border-border-main">
        <table className="data-table w-full text-left text-xs">
          <thead>
            <tr>
              <th className="w-16">ID</th>
              <th>Service</th>
              <th className="w-28 text-right">Rate / 1000</th>
              <th className="w-24 text-center">Min / Max</th>
              <th className="w-28 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="5" className="table-empty py-12 text-center text-muted-foreground">
                  <p>No services found matching your criteria.</p>
                </td>
              </tr>
            ) : (
              filtered.map((service) => (
                <tr key={service._id || service.id} className="hover:bg-bg-surface-hover/50 transition-colors">
                  <td className="font-mono font-bold text-muted-foreground">
                    #{service.service_id || service._id || service.id}
                  </td>
                  <td>
                    <div className="font-bold text-text-primary text-xs sm:text-sm">
                      {service.name}
                    </div>
                    {service.description && (
                      <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                        {service.description}
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 mt-1">
                      {service.refill ? (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400">
                          Refill
                        </span>
                      ) : null}
                      {service.cancel ? (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-400">
                          Cancel
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="text-right">
                    <span className="font-mono font-bold text-emerald-400 text-xs sm:text-sm">
                      {formatPrice(service.rate || service.price_per_1000 || 0)}
                    </span>
                  </td>
                  <td className="text-center font-mono text-[11px] text-muted-foreground">
                    <div>{service.min || service.min_quantity || 10}</div>
                    <div className="text-[10px] opacity-60">to {(service.max || service.max_quantity || 10000).toLocaleString()}</div>
                  </td>
                  <td className="text-center">
                    <Link
                      to={`/dashboard/new-order?service_id=${service.id || service._id}`}
                      className="btn-gradient btn-sm inline-flex items-center gap-1.5 px-3 py-1.5 text-xs"
                    >
                      <ShoppingCart size={13} /> Order
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
