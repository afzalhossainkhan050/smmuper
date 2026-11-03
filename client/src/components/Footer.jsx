import React from 'react';
import { Link } from 'react-router-dom';
import Logo from './brand/Logo';
import { ShieldCheck, Zap, Headphones, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="public-footer">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
        {/* Col 1: Brand Info */}
        <div className="md:col-span-1 space-y-4">
          <Logo size="lg" to="/" />
          <p className="text-xs text-muted-foreground leading-relaxed mt-3">
            SMMuper is the #1 premier Social Media Marketing reseller panel platform.
            Automate social media growth for Instagram, YouTube, TikTok, Facebook, and Telegram with wholesale pricing.
          </p>
          <div className="flex items-center gap-2 text-xs text-primary font-bold">
            <ShieldCheck size={16} /> 100% Safe & Guaranteed Delivery
          </div>
        </div>

        {/* Col 2: Quick Links */}
        <div>
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-text-primary mb-3">
            Platform Links
          </h4>
          <ul className="space-y-2 text-xs text-muted-foreground">
            <li><Link to="/" className="hover:text-primary transition-colors">Home</Link></li>
            <li><Link to="/services" className="hover:text-primary transition-colors">Services & Pricing</Link></li>
            <li><Link to="/dashboard/new-order" className="hover:text-primary transition-colors">Place Instant Order</Link></li>
            <li><Link to="/dashboard/api-docs" className="hover:text-primary transition-colors">v2 Reseller API</Link></li>
          </ul>
        </div>

        {/* Col 3: Support & Client Services */}
        <div>
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-text-primary mb-3">
            Client Support
          </h4>
          <ul className="space-y-2 text-xs text-muted-foreground">
            <li><Link to="/dashboard/tickets" className="hover:text-primary transition-colors">24/7 Support Tickets</Link></li>
            <li><Link to="/dashboard/add-funds" className="hover:text-primary transition-colors">Payment Methods</Link></li>
            <li><a href="mailto:support@smmuper.com" className="hover:text-primary transition-colors">support@smmuper.com</a></li>
            <li><span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1"><Zap size={12} /> Server Status: All Systems Operational</span></li>
          </ul>
        </div>

        {/* Col 4: Payment Partners */}
        <div>
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-text-primary mb-3">
            Supported Gateways
          </h4>
          <p className="text-xs text-muted-foreground mb-3">
            Instant deposit via local & global merchant channels:
          </p>
          <div className="flex flex-wrap gap-1.5">
            <span className="px-2 py-1 rounded bg-bg-surface-elevated border border-border-main text-[11px] font-bold text-pink-400">bKash</span>
            <span className="px-2 py-1 rounded bg-bg-surface-elevated border border-border-main text-[11px] font-bold text-orange-400">Nagad</span>
            <span className="px-2 py-1 rounded bg-bg-surface-elevated border border-border-main text-[11px] font-bold text-purple-400">Rocket</span>
            <span className="px-2 py-1 rounded bg-bg-surface-elevated border border-border-main text-[11px] font-bold text-amber-400">Binance Pay</span>
            <span className="px-2 py-1 rounded bg-bg-surface-elevated border border-border-main text-[11px] font-bold text-indigo-400">Stripe / Cards</span>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="max-w-7xl mx-auto pt-6 border-t border-border-main flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground gap-3">
        <div>
          &copy; {new Date().getFullYear()} <span className="font-bold text-text-primary">SMMuper</span> (smmuper.com). All rights reserved.
        </div>
        <div className="flex items-center gap-4">
          <Link to="/page/terms-and-conditions" className="hover:text-primary">Terms of Service</Link>
          <Link to="/page/privacy-policy" className="hover:text-primary">Privacy Policy</Link>
          <Link to="/page/refund-policy" className="hover:text-primary">Refund Policy</Link>
          <span className="opacity-50">v1.0.0</span>
        </div>
      </div>
    </footer>
  );
}
