import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Breadcrumbs from '../components/ui/Breadcrumbs';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import {
  Code, Copy, Key, Globe, ShoppingCart, Search, AlertCircle,
  Check, RefreshCw, Eye, EyeOff, Terminal, Sparkles, BookOpen, Layers
} from 'lucide-react';

export default function ApiDocsPage() {
  const { user, showToast, regenerateApiKey, fetchProfile } = useAuth();

  const [showKey, setShowKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState('');
  const [selectedAction, setSelectedAction] = useState('add');
  const [selectedLang, setSelectedLang] = useState('curl');
  const [regenerating, setRegenerating] = useState(false);

  const apiKey = user?.api_key || 'YOUR_API_KEY';
  const apiUrl = 'https://smmuper.com/api/v2';

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === 'key') {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2500);
      showToast('API key copied to clipboard!');
    } else {
      setCopiedSnippet(type);
      setTimeout(() => setCopiedSnippet(''), 2500);
      showToast('Code snippet copied!');
    }
  };

  const handleRegenerate = async () => {
    if (!window.confirm('Regenerating your API key will immediately invalidate the current one. Continue?')) {
      return;
    }
    setRegenerating(true);
    try {
      await regenerateApiKey();
      await fetchProfile();
    } catch (err) {
      showToast(err.message || 'Failed to regenerate key', 'error');
    } finally {
      setRegenerating(false);
    }
  };

  const actionDetails = {
    add: {
      name: 'Add Order',
      method: 'POST',
      action: 'add',
      desc: 'Submit a new single social media marketing order to the wholesale processing engine.',
      params: [
        { name: 'key', type: 'string', required: 'Yes', desc: 'Your secret reseller API key' },
        { name: 'action', type: 'string', required: 'Yes', desc: 'Must be "add"' },
        { name: 'service', type: 'number', required: 'Yes', desc: 'Numeric Service ID from service catalog' },
        { name: 'link', type: 'string', required: 'Yes', desc: 'Target profile, post or channel URL' },
        { name: 'quantity', type: 'number', required: 'Yes', desc: 'Number of items to deliver' },
        { name: 'runs', type: 'number', required: 'No', desc: 'Drip-feed iterations (optional)' },
        { name: 'interval', type: 'number', required: 'No', desc: 'Drip-feed interval in minutes (optional)' },
      ],
      sampleReq: {
        key: apiKey,
        action: 'add',
        service: 1,
        link: 'https://instagram.com/example',
        quantity: 1000
      },
      sampleRes: {
        order: 14029
      }
    },
    status: {
      name: 'Order Status',
      method: 'POST',
      action: 'status',
      desc: 'Query real-time delivery state, start count, and remaining count for one or multiple orders.',
      params: [
        { name: 'key', type: 'string', required: 'Yes', desc: 'Your secret reseller API key' },
        { name: 'action', type: 'string', required: 'Yes', desc: 'Must be "status"' },
        { name: 'order', type: 'number', required: 'Yes*', desc: 'Single Order ID (use "order" OR "orders")' },
        { name: 'orders', type: 'string', required: 'Yes*', desc: 'Comma-separated order IDs: "101,102,103"' },
      ],
      sampleReq: {
        key: apiKey,
        action: 'status',
        order: 14029
      },
      sampleRes: {
        charge: '1.20',
        start_count: '2450',
        status: 'processing',
        remains: '400',
        currency: 'USD'
      }
    },
    services: {
      name: 'Service Catalog',
      method: 'POST / GET',
      action: 'services',
      desc: 'Retrieve all wholesale active services, rates, categories, minimums, and maximums.',
      params: [
        { name: 'key', type: 'string', required: 'Yes', desc: 'Your secret reseller API key' },
        { name: 'action', type: 'string', required: 'Yes', desc: 'Must be "services"' },
      ],
      sampleReq: {
        key: apiKey,
        action: 'services'
      },
      sampleRes: [
        {
          service: 1,
          name: 'Instagram High Quality Followers [Non Drop] [30 Days Refill]',
          type: 'default',
          category: 'Instagram Followers',
          rate: '0.85',
          min: '100',
          max: '50000',
          refill: true,
          cancel: false
        },
        {
          service: 2,
          name: 'TikTok Video Views [Instant Delivery]',
          type: 'default',
          category: 'TikTok Views',
          rate: '0.12',
          min: '500',
          max: '1000000',
          refill: false,
          cancel: false
        }
      ]
    },
    refill: {
      name: 'Refill Request',
      method: 'POST',
      action: 'refill',
      desc: 'Request automated refill restoration for eligible completed drop orders.',
      params: [
        { name: 'key', type: 'string', required: 'Yes', desc: 'Your secret reseller API key' },
        { name: 'action', type: 'string', required: 'Yes', desc: 'Must be "refill"' },
        { name: 'order', type: 'number', required: 'Yes', desc: 'Target Order ID to refill' },
      ],
      sampleReq: {
        key: apiKey,
        action: 'refill',
        order: 14029
      },
      sampleRes: {
        refill: 8472
      }
    },
    refill_status: {
      name: 'Refill Status',
      method: 'POST',
      action: 'refill_status',
      desc: 'Check the delivery state of an active refill request.',
      params: [
        { name: 'key', type: 'string', required: 'Yes', desc: 'Your secret reseller API key' },
        { name: 'action', type: 'string', required: 'Yes', desc: 'Must be "refill_status"' },
        { name: 'refill', type: 'number', required: 'Yes', desc: 'Refill ID returned from action=refill' },
      ],
      sampleReq: {
        key: apiKey,
        action: 'refill_status',
        refill: 8472
      },
      sampleRes: {
        status: 'completed'
      }
    },
    balance: {
      name: 'Account Balance',
      method: 'POST',
      action: 'balance',
      desc: 'Fetch current customer wallet balance and default platform currency.',
      params: [
        { name: 'key', type: 'string', required: 'Yes', desc: 'Your secret reseller API key' },
        { name: 'action', type: 'string', required: 'Yes', desc: 'Must be "balance"' },
      ],
      sampleReq: {
        key: apiKey,
        action: 'balance'
      },
      sampleRes: {
        balance: '48.50',
        currency: 'USD'
      }
    }
  };

  const curr = actionDetails[selectedAction];

  // Code Snippets
  const getCodeSnippet = (lang) => {
    switch (lang) {
      case 'curl':
        return `curl -X POST "${apiUrl}" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(curr.sampleReq, null, 2)}'`;

      case 'javascript':
        return `// Node.js / JavaScript Fetch
const response = await fetch("${apiUrl}", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(${JSON.stringify(curr.sampleReq, null, 2)})
});
const data = await response.json();
console.log(data);`;

      case 'python':
        return `# Python 3 (requests)
import requests

url = "${apiUrl}"
payload = ${JSON.stringify(curr.sampleReq, null, 4)}

response = requests.post(url, json=payload)
data = response.json()
print(data)`;

      case 'php':
        return `<?php
// PHP cURL
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "${apiUrl}");
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(${JSON.stringify(curr.sampleReq, null, 2)}));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);

$response = curl_exec($ch);
curl_close($ch);
$result = json_decode($response, true);
print_r($result);
?>`;
      default:
        return '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="dashboard-page-header">
        <div>
          <Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'API Documentation' }]} />
          <h1 className="dashboard-page-title mt-1 flex items-center gap-2">
            <Terminal size={24} className="text-primary" />
            <span>Reseller <span className="gradient-text">API v2 Documentation</span></span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Standard SMM Protocol v2 specification for connecting child panels, Telegram bots, or custom ordering systems.
          </p>
        </div>
      </div>

      {/* Live API Key & Base URL Hero */}
      <div className="rounded-2xl bg-surface border border-border-main p-6 shadow-xl space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Base URL */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Globe size={14} className="text-indigo-400" />
              <span>Standard SMM v2 HTTP Endpoint</span>
            </label>
            <div className="flex items-center gap-2 bg-bg-surface-elevated p-2.5 rounded-xl border border-border-main">
              <span className="font-mono text-xs font-bold text-primary flex-1 select-all">
                {apiUrl}
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard(apiUrl, 'endpoint')}
                className="btn btn-secondary btn-sm py-1 px-3 text-xs flex items-center gap-1"
              >
                {copiedSnippet === 'endpoint' ? <Check size={13} /> : <Copy size={13} />}
                <span>{copiedSnippet === 'endpoint' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* User API Key */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Key size={14} className="text-cyan-400" />
              <span>Your Personal API Key</span>
            </label>
            <div className="flex items-center gap-2 bg-bg-surface-elevated p-2.5 rounded-xl border border-border-main">
              <input
                type={showKey ? 'text' : 'password'}
                readOnly
                className="bg-transparent border-0 font-mono text-xs text-text-primary flex-1 outline-none select-all"
                value={user?.api_key || 'No API key generated'}
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="p-1.5 text-muted-foreground hover:text-text-primary rounded-lg hover:bg-bg-surface"
                title={showKey ? 'Hide Key' : 'Reveal Key'}
              >
                {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
              <button
                type="button"
                onClick={() => copyToClipboard(user?.api_key || '', 'key')}
                className={`btn btn-sm py-1 px-3 text-xs flex items-center gap-1 ${
                  copiedKey ? 'bg-emerald-600 text-white' : 'btn-secondary'
                }`}
              >
                {copiedKey ? <Check size={13} /> : <Copy size={13} />}
                <span>{copiedKey ? 'Copied' : 'Copy'}</span>
              </button>
              <button
                type="button"
                onClick={handleRegenerate}
                disabled={regenerating}
                className="p-1.5 text-amber-400 hover:text-amber-300 rounded-lg hover:bg-bg-surface"
                title="Regenerate API Key"
              >
                <RefreshCw size={14} className={regenerating ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
        </div>

        <div className="text-[11px] text-muted-foreground flex flex-wrap items-center gap-x-6 gap-y-1 pt-1 border-t border-border-subtle">
          <span>Format: <strong>JSON</strong> or <strong>x-www-form-urlencoded</strong></span>
          <span>HTTP Method: <strong>POST</strong> (GET supported for services)</span>
          <span>Success Response: <strong>HTTP 200 JSON</strong></span>
        </div>
      </div>

      {/* Protocol Action Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-border-main">
        {Object.entries(actionDetails).map(([key, item]) => (
          <button
            key={key}
            onClick={() => setSelectedAction(key)}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 flex-shrink-0 ${
              selectedAction === key
                ? 'bg-primary text-white shadow-md'
                : 'bg-bg-surface hover:bg-bg-surface-elevated text-muted-foreground hover:text-text-primary border border-border-main'
            }`}
          >
            <span>{item.name}</span>
            <span className="text-[10px] font-mono opacity-80">({item.action})</span>
          </button>
        ))}
      </div>

      {/* Action Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Parameters & Info */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono text-xs font-bold">
                    {curr.method}
                  </span>
                  <span>{curr.name}</span>
                </CardTitle>
                <span className="text-xs font-mono font-bold text-primary">
                  action={curr.action}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {curr.desc}
              </p>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-bg-surface-elevated text-muted-foreground uppercase tracking-wider text-[10px] border-y border-border-main">
                    <tr>
                      <th className="px-4 py-2.5">Parameter</th>
                      <th className="px-4 py-2.5">Type</th>
                      <th className="px-4 py-2.5">Required</th>
                      <th className="px-4 py-2.5">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {curr.params.map((p, idx) => (
                      <tr key={idx} className="hover:bg-bg-surface-hover/50">
                        <td className="px-4 py-2.5 font-mono font-bold text-text-primary">
                          {p.name}
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground font-mono text-[11px]">
                          {p.type}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            p.required === 'Yes' || p.required === 'Yes*'
                              ? 'bg-rose-500/15 text-rose-400'
                              : 'bg-muted/30 text-muted-foreground'
                          }`}>
                            {p.required}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground text-[11px]">
                          {p.desc}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Expected Response */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Example Response (200 OK)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="p-3.5 rounded-xl bg-slate-950 text-emerald-400 font-mono text-xs overflow-x-auto border border-slate-800">
                {JSON.stringify(curr.sampleRes, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </div>

        {/* Code Generator */}
        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Code size={16} className="text-primary" />
              <span>Implementation Code Snippet</span>
            </CardTitle>
            <div className="flex items-center gap-1 bg-bg-surface-elevated p-1 rounded-lg border border-border-main">
              {['curl', 'javascript', 'python', 'php'].map((lang) => (
                <button
                  key={lang}
                  onClick={() => setSelectedLang(lang)}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded capitalize transition-all ${
                    selectedLang === lang
                      ? 'bg-primary text-white shadow'
                      : 'text-muted-foreground hover:text-text-primary'
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col pt-0">
            <div className="relative flex-1">
              <pre className="h-full min-h-[300px] p-4 rounded-xl bg-slate-950 text-slate-200 font-mono text-xs overflow-x-auto border border-slate-800">
                {getCodeSnippet(selectedLang)}
              </pre>
              <button
                type="button"
                onClick={() => copyToClipboard(getCodeSnippet(selectedLang), selectedLang)}
                className="absolute top-3 right-3 btn btn-secondary btn-sm py-1 px-2.5 text-[11px] flex items-center gap-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200"
              >
                {copiedSnippet === selectedLang ? <Check size={13} /> : <Copy size={13} />}
                <span>{copiedSnippet === selectedLang ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
