import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Zap, Shield, Clock, DollarSign, Headphones, TrendingUp,
  UserPlus, CreditCard, ShoppingCart, Rocket, Instagram,
  Facebook, Youtube, Twitter, MessageCircle, Music,
  ChevronDown, ChevronUp, Star, ArrowRight, Globe, Send,
  Sparkles, CheckCircle2, RotateCcw, Filter, Search, Award
} from 'lucide-react';
import api from '../utils/api';
import { useSystem } from '../contexts/SystemContext';

function AnimatedCounter({ target, suffix = '' }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const animated = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !animated.current) {
          animated.current = true;
          let start = 0;
          const duration = 2000;
          const step = (timestamp) => {
            if (!start) start = timestamp;
            const progress = Math.min((timestamp - start) / duration, 1);
            setCount(Math.floor(progress * target));
            if (progress < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  return (
    <span ref={ref}>
      {count.toLocaleString()}{suffix}
    </span>
  );
}

function FAQItem({ question, answer }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`faq-item ${open ? 'open' : ''}`}>
      <button className="faq-question" onClick={() => setOpen(!open)} type="button">
        <span>{question}</span>
        {open ? <ChevronUp size={20} className="text-primary flex-shrink-0" /> : <ChevronDown size={20} className="text-muted-foreground flex-shrink-0" />}
      </button>
      {open && <div className="faq-answer animate-in fade-in duration-150">{answer}</div>}
    </div>
  );
}

export default function HomePage() {
  const { formatPrice, currentCurrency } = useSystem();
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  // Live Services Preview State (SMMXZ Style)
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCat, setSelectedCat] = useState('all');
  const [serviceSearch, setServiceSearch] = useState('');
  const [loadingServices, setLoadingServices] = useState(true);

  // Newsletter State
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);

  useEffect(() => {
    const loadServices = async () => {
      try {
        const [servicesData, categoriesData] = await Promise.all([
          api.services.getAll(),
          api.services.getCategories(),
        ]);
        setServices(servicesData.services || servicesData || []);
        setCategories(categoriesData.categories || categoriesData || []);
      } catch (err) {
        console.error('Failed to load homepage services preview:', err);
      } finally {
        setLoadingServices(false);
      }
    };
    loadServices();
  }, []);

  const features = [
    { icon: Zap, title: 'Instant Delivery', desc: 'Automated order execution. Most services start within 0-5 minutes of placement.' },
    { icon: DollarSign, title: 'Cheapest Wholesale Rates', desc: 'Direct API pricing without middlemen. Save up to 70% on all social media growth services.' },
    { icon: Shield, title: 'Guaranteed Retention', desc: 'High-quality engagement with 30-day to 365-day refill guarantees on eligible services.' },
    { icon: CreditCard, title: 'Local & Global Payments', desc: 'Instant deposit through bKash, Nagad, Rocket, Bank Transfer, Stripe, and Binance Pay.' },
    { icon: TrendingUp, title: 'Reseller API v2', desc: 'Standard SMM v2 protocol to connect your child panel or website with 99.9% uptime.' },
    { icon: Headphones, title: '24/7 Dedicated Support', desc: 'Fast turnaround via support tickets, live chat assistance, and experienced team.' },
  ];

  const steps = [
    { icon: UserPlus, title: 'Create Free Account', desc: 'Sign up in 30 seconds with email and username. No credit card required.' },
    { icon: CreditCard, title: 'Add Funds Easily', desc: 'Deposit funds instantly using local bKash, Nagad, Rocket or global cards.' },
    { icon: ShoppingCart, title: 'Choose Service & Order', desc: 'Select from 5,000+ services, paste your link, specify quantity, and submit.' },
    { icon: Rocket, title: 'Watch Instant Growth', desc: 'Orders are processed automatically and delivered with real-time status tracking.' },
  ];

  const platforms = [
    { icon: Instagram, name: 'Instagram', color: '#E1306C', desc: 'Followers, Likes, Views, Reels' },
    { icon: Facebook, name: 'Facebook', color: '#1877F2', desc: 'Page Likes, Followers, Post Likes' },
    { icon: Youtube, name: 'YouTube', color: '#FF0000', desc: 'Subscribers, Views, Watch Time' },
    { icon: Music, name: 'TikTok', color: '#00F2EA', desc: 'Followers, Likes, Views, Shares' },
    { icon: Send, name: 'Telegram', color: '#0088CC', desc: 'Channel Members, Post Views' },
    { icon: Twitter, name: 'Twitter / X', color: '#1DA1F2', desc: 'Followers, Retweets, Likes' },
    { icon: MessageCircle, name: 'WhatsApp', color: '#25D366', desc: 'Group Members, Bulk Reach' },
    { icon: Globe, name: 'Web Traffic', color: '#6366f1', desc: 'Organic Visitors, Geo-targeted' },
  ];

  const testimonials = [
    { name: 'Rakib Hasan', role: 'Digital Agency Owner', text: 'SMMuper has transformed how our agency handles client social media. The automated delivery and bKash instant payment make it the undisputed #1 panel in Bangladesh.', rating: 5 },
    { name: 'Sarah Ahmed', role: 'Content Creator', text: 'I have been using SMMuper for 8 months. The YouTube views and Instagram followers are high retention. Highly recommended!', rating: 5 },
    { name: 'Tanvir Mahmud', role: 'SMM Reseller', text: 'The Reseller API v2 integration is flawless. Connected my child panel in 5 minutes and processed over $4,000 in orders seamlessly.', rating: 5 },
    { name: 'Nadia Islam', role: 'E-commerce Brand', text: 'Customer support answered our ticket within 3 minutes and provided refill immediately. The transparency in pricing is amazing.', rating: 5 },
  ];

  const faqs = [
    { question: 'What is an SMM Panel?', answer: 'An SMM (Social Media Marketing) panel is an automated wholesale portal where creators, brands, and agencies purchase social media engagement services (followers, views, likes, watch time) at wholesale prices.' },
    { question: 'How fast do orders start and complete?', answer: 'Most automated services begin within 0-5 minutes of placing an order. Full completion speed depends on the selected service quantity and natural delivery speed settings.' },
    { question: 'What payment methods do you support in Bangladesh?', answer: 'We support local automated & manual payments via bKash, Nagad, Rocket, Bank Transfer, alongside global methods like Binance Pay and Stripe credit/debit cards.' },
    { question: 'Do you offer a Refill and Refund guarantee?', answer: 'Yes! Services marked with a Refill badge include automated and manual refill protection. If an order cannot be completed by the network, our system automatically refunds the balance to your wallet.' },
    { question: 'Can I resell your services with my own domain?', answer: 'Yes! You can connect your own domain via our Child Panel system or integrate our Reseller API v2 into your existing WordPress, PHP, or custom platform.' },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [testimonials.length]);

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!newsletterEmail.trim()) return;
    try {
      await api.cms.subscribe(newsletterEmail.trim());
      setNewsletterSubscribed(true);
      setNewsletterEmail('');
    } catch (err) {
      setNewsletterSubscribed(true);
    }
  };

  // Filtered live services preview (limited to top 8 rows for homepage)
  const filteredPreview = services.filter((s) => {
    const matchesCat = selectedCat === 'all' || 
      String(s.category) === String(selectedCat) || 
      String(s.category_id) === String(selectedCat);
    const matchesSearch = s.name?.toLowerCase().includes(serviceSearch.toLowerCase());
    return matchesCat && matchesSearch;
  }).slice(0, 8);

  return (
    <div className="home-page animate-in fade-in duration-150">
      {/* ─── 1. HERO SECTION (SMMXZ Style) ─── */}
      <section className="hero-section">
        <div className="hero-bg-effects">
          <div className="hero-orb hero-orb-1" />
          <div className="hero-orb hero-orb-2" />
          <div className="hero-orb hero-orb-3" />
        </div>

        <div className="hero-container">
          <div className="hero-badge">
            <Sparkles size={14} className="text-primary" />
            <span>🔥 #1 Trusted SMM Reseller Panel in Bangladesh & Worldwide</span>
          </div>

          <h1 className="hero-title">
            Scale Your Social Growth with <br />
            <span className="gradient-text">Wholesale SMM Services</span>
          </h1>

          <p className="hero-subtitle">
            Automated, high-retention social media growth for Instagram, Facebook, YouTube, TikTok, Telegram and more.
            Instant start, secure bKash/Nagad checkout, and 24/7 dedicated support.
          </p>

          <div className="hero-buttons">
            <Link to="/register" className="btn-gradient btn-lg">
              <span>Get Started Free</span>
              <ArrowRight size={18} />
            </Link>
            <Link to="/services" className="btn-outline btn-lg">
              <span>View Live Pricing</span>
            </Link>
          </div>

          {/* Stats Bar */}
          <div className="hero-stats">
            <div className="hero-stat">
              <div className="hero-stat-number"><AnimatedCounter target={5000} suffix="+" /></div>
              <div className="hero-stat-label">Active Services</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-number"><AnimatedCounter target={250000} suffix="+" /></div>
              <div className="hero-stat-label">Orders Completed</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-number"><AnimatedCounter target={50000} suffix="+" /></div>
              <div className="hero-stat-label">Happy Resellers</div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 2. SUPPORTED PLATFORMS GRID ─── */}
      <section className="section py-8 bg-bg-surface-elevated/40 border-y border-border-main">
        <div className="section-container">
          <div className="text-center mb-6">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Supported Networks</span>
          </div>
          <div className="platforms-grid">
            {platforms.map((p, i) => (
              <Link
                key={i}
                to={`/services`}
                className="platform-card glass-card hover:border-primary/50 transition-all group"
              >
                <p.icon size={36} style={{ color: p.color }} className="group-hover:scale-110 transition-transform" />
                <span className="platform-name">{p.name}</span>
                <span className="text-[10px] text-muted-foreground hidden sm:block">{p.desc}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 3. LIVE SERVICES EXPLORER PREVIEW (SMMXZ Feature) ─── */}
      <section className="section bg-bg-surface">
        <div className="section-container">
          <div className="text-center mb-8">
            <div className="hero-badge inline-flex mb-2">⚡ Live Wholesale Pricing</div>
            <h2 className="section-title">Popular <span className="gradient-text">SMM Services</span></h2>
            <p className="section-subtitle">Real-time rates and instant delivery metrics across all networks in {currentCurrency.code}</p>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 scrollbar-thin">
            <button
              onClick={() => setSelectedCat('all')}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedCat === 'all'
                  ? 'bg-primary text-white shadow-md shadow-primary/25'
                  : 'bg-bg-surface-elevated text-text-secondary hover:text-text-primary border border-border-main'
              }`}
            >
              🌟 All Services
            </button>
            {categories.slice(0, 8).map((cat) => (
              <button
                key={cat.id || cat._id || cat.name}
                onClick={() => setSelectedCat(String(cat.id || cat._id || cat.name))}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedCat === String(cat.id || cat._id || cat.name)
                    ? 'bg-primary text-white shadow-md shadow-primary/25'
                    : 'bg-bg-surface-elevated text-text-secondary hover:text-text-primary border border-border-main'
                }`}
              >
                {cat.icon || '📦'} {cat.name}
              </button>
            ))}
          </div>

          {/* Live Search & Table */}
          <div className="glass-card p-4 sm:p-6 rounded-2xl border border-border-main">
            <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-bg-surface-elevated border border-border-main mb-4">
              <Search size={18} className="text-muted-foreground" />
              <input
                type="text"
                placeholder="Search services (e.g. Instagram Followers, YouTube Views)..."
                value={serviceSearch}
                onChange={(e) => setServiceSearch(e.target.value)}
                className="w-full bg-transparent border-none text-text-primary text-xs sm:text-sm focus:outline-none"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="data-table w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr>
                    <th className="w-16">ID</th>
                    <th>Service Name</th>
                    <th className="w-32 text-right">Price / 1,000</th>
                    <th className="w-28 text-center">Min / Max</th>
                    <th className="w-24 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {filteredPreview.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-8 text-center text-muted-foreground text-xs">
                        No services found. Try another search or category.
                      </td>
                    </tr>
                  ) : (
                    filteredPreview.map((svc) => (
                      <tr key={svc.id || svc._id} className="hover:bg-bg-surface-hover/50 transition-colors">
                        <td className="font-mono text-xs font-bold text-muted-foreground">
                          #{svc.service_id || svc.id}
                        </td>
                        <td>
                          <div className="font-bold text-text-primary">{svc.name}</div>
                          <div className="flex items-center gap-2 mt-1">
                            {svc.refill ? (
                              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                <RotateCcw size={10} /> Refill
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="text-right">
                          <span className="font-mono font-bold text-emerald-400 text-sm">
                            {formatPrice(svc.rate || svc.price_per_1000 || 0)}
                          </span>
                        </td>
                        <td className="text-center font-mono text-xs text-muted-foreground">
                          {svc.min_quantity || svc.min || 10} - {(svc.max_quantity || svc.max || 10000).toLocaleString()}
                        </td>
                        <td className="text-center">
                          <Link
                            to={`/dashboard/new-order?service_id=${svc.id || svc._id}`}
                            className="btn-gradient btn-sm inline-flex items-center gap-1 px-3 py-1 text-xs"
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

            <div className="mt-5 text-center">
              <Link
                to="/services"
                className="inline-flex items-center gap-2 text-xs font-bold text-primary hover:underline"
              >
                <span>View Full Catalog of 5,000+ Services</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 4. WHY CHOOSE SMMUPER ─── */}
      <section className="section bg-bg-surface-elevated/20">
        <div className="section-container">
          <div className="text-center mb-10">
            <h2 className="section-title">Why Choose <span className="gradient-text">SMMuper</span></h2>
            <p className="section-subtitle">Engineered for creators, digital agencies, and wholesale panel resellers</p>
          </div>

          <div className="features-grid">
            {features.map((feature, i) => (
              <div className="feature-card glass-card" key={i}>
                <div className="feature-icon-wrap">
                  <feature.icon size={28} />
                </div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-desc">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 5. HOW IT WORKS ─── */}
      <section className="section bg-bg-surface">
        <div className="section-container">
          <div className="text-center mb-10">
            <h2 className="section-title">How It <span className="gradient-text">Works</span></h2>
            <p className="section-subtitle">Start growing your online presence in 4 simple steps</p>
          </div>

          <div className="steps-grid">
            {steps.map((step, i) => (
              <div className="step-card" key={i}>
                <div className="step-number">{i + 1}</div>
                <div className="step-icon-wrap">
                  <step.icon size={30} />
                </div>
                <h3 className="step-title">{step.title}</h3>
                <p className="step-desc">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 6. TESTIMONIALS ─── */}
      <section className="section bg-bg-surface-elevated/30">
        <div className="section-container">
          <div className="text-center mb-8">
            <h2 className="section-title">What Our <span className="gradient-text">Clients Say</span></h2>
            <p className="section-subtitle">Trusted by digital marketers, influencers, and resellers across the globe</p>
          </div>

          <div className="testimonial-carousel">
            <div className="testimonial-card glass-card">
              <div className="testimonial-stars">
                {[...Array(testimonials[currentTestimonial].rating)].map((_, i) => (
                  <Star key={i} size={18} fill="#f59e0b" color="#f59e0b" />
                ))}
              </div>
              <p className="testimonial-text">"{testimonials[currentTestimonial].text}"</p>
              <div className="testimonial-author">
                <div className="testimonial-avatar">
                  {testimonials[currentTestimonial].name.charAt(0)}
                </div>
                <div className="text-left">
                  <div className="testimonial-name">{testimonials[currentTestimonial].name}</div>
                  <div className="text-[11px] text-muted-foreground">{testimonials[currentTestimonial].role}</div>
                </div>
              </div>
            </div>

            <div className="testimonial-dots">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  className={`testimonial-dot ${i === currentTestimonial ? 'active' : ''}`}
                  onClick={() => setCurrentTestimonial(i)}
                  type="button"
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── 7. FAQ ACCORDION ─── */}
      <section className="section bg-bg-surface">
        <div className="section-container">
          <div className="text-center mb-10">
            <h2 className="section-title">Frequently Asked <span className="gradient-text">Questions</span></h2>
            <p className="section-subtitle">Everything you need to know about our services, payments, and delivery</p>
          </div>

          <div className="faq-list">
            {faqs.map((faq, i) => (
              <FAQItem key={i} question={faq.question} answer={faq.answer} />
            ))}
          </div>
        </div>
      </section>

      {/* ─── 8. PAYMENT PARTNERS SHOWCASE (SMMXZ Style) ─── */}
      <section className="py-12 border-t border-border-main bg-bg-surface-elevated/40 text-center">
        <div className="section-container px-4">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-4">
            Instant Deposit Methods Supported
          </span>
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 max-w-4xl mx-auto">
            <div className="px-5 py-3 rounded-2xl bg-surface border border-border-main shadow-sm flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#E2136E]"></span>
              <span className="font-extrabold text-sm text-text-primary">bKash</span>
              <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">Instant</span>
            </div>
            <div className="px-5 py-3 rounded-2xl bg-surface border border-border-main shadow-sm flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#F6921E]"></span>
              <span className="font-extrabold text-sm text-text-primary">Nagad</span>
              <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">Instant</span>
            </div>
            <div className="px-5 py-3 rounded-2xl bg-surface border border-border-main shadow-sm flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#8B3A9F]"></span>
              <span className="font-extrabold text-sm text-text-primary">Rocket</span>
            </div>
            <div className="px-5 py-3 rounded-2xl bg-surface border border-border-main shadow-sm flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#F0B90B]"></span>
              <span className="font-extrabold text-sm text-text-primary">Binance Pay</span>
              <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded">Crypto</span>
            </div>
            <div className="px-5 py-3 rounded-2xl bg-surface border border-border-main shadow-sm flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#6366F1]"></span>
              <span className="font-extrabold text-sm text-text-primary">Stripe / Cards</span>
            </div>
            <div className="px-5 py-3 rounded-2xl bg-surface border border-border-main shadow-sm flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#10B981]"></span>
              <span className="font-extrabold text-sm text-text-primary">Bank Transfer</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 9. CTA BANNER ─── */}
      <section className="section cta-section">
        <div className="section-container px-4">
          <div className="cta-card">
            <h2 className="cta-title">Ready to Elevate Your Social Presence?</h2>
            <p className="cta-desc">
              Join thousands of creators, agencies, and businesses. Create your free account in seconds and place your first order.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link to="/register" className="btn-gradient btn-lg w-full sm:w-auto">
                <span>Create Free Account</span>
                <ArrowRight size={18} />
              </Link>
              <Link to="/services" className="btn-outline btn-lg w-full sm:w-auto">
                <span>Browse All Services</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
