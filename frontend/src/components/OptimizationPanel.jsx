import React, { useState, useEffect } from 'react';
import { Shield, ShieldAlert, Cpu, CheckCircle2, Play, RefreshCw, History, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export default function OptimizationPanel() {
    const { authFetch } = useAuth();
    const { showSuccess, showError } = useToast();

    const [statusData, setStatusData] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [evaluating, setEvaluating] = useState(false);
    const [testResult, setTestResult] = useState(null);
    const [activeTab, setActiveTab] = useState('policy'); // policy | history

    const fetchStatus = async () => {
        try {
            const res = await authFetch(`${API_URL}/optimization/status`);
            if (res.ok) {
                const data = await res.json();
                setStatusData(data);
            }
        } catch (err) {
            console.error('Failed to load status', err);
        }
    };

    const fetchHistory = async () => {
        try {
            const res = await authFetch(`${API_URL}/optimization/history?limit=10`);
            if (res.ok) {
                const data = await res.json();
                setHistory(data);
            }
        } catch (err) {
            console.error('Failed to load history', err);
        }
    };

    const loadData = async () => {
        setLoading(true);
        await Promise.all([fetchStatus(), fetchHistory()]);
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, []);

    const runSimulationTest = async () => {
        setEvaluating(true);
        setTestResult(null);
        try {
            const res = await authFetch(`${API_URL}/optimization/evaluate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider: 'google_ads',
                    account_id: 'test_account',
                    action: 'campaign.pause',
                    payload: { campaign_id: '12345' },
                    today_spend_micros: 50000000,
                    today_action_count: 1
                })
            });
            const data = await res.json();
            setTestResult(data);
            if (data.ok) {
                showSuccess('Auto-mode policy test passed (Mode: AUTO)');
            } else {
                showSuccess(`Policy evaluated (Mode: MANUAL, Reason: ${data.reason})`);
            }
            fetchHistory();
        } catch (err) {
            showError('Failed to evaluate policy simulation');
        } finally {
            setEvaluating(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-white rounded-lg border border-gray-200 p-6 flex items-center justify-center text-gray-500">
                <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading optimization panel...
            </div>
        );
    }

    if (!statusData) return null;

    return (
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                        <Cpu className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">Agentic Optimization & Auto-Mode</h2>
                        <p className="text-sm text-gray-500">Guardrail-protected autonomous campaign management</p>
                    </div>
                </div>

                <div className="flex items-center space-x-2">
                    {statusData.kill_switch_active ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <ShieldAlert className="w-3.5 h-3.5 mr-1" /> Kill-Switch Active
                        </span>
                    ) : statusData.auto_enabled ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Auto-Mode ON
                        </span>
                    ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                            <Shield className="w-3.5 h-3.5 mr-1" /> Manual Guardrail Only
                        </span>
                    )}
                </div>
            </div>

            {/* Sub-tabs */}
            <div className="flex space-x-4 border-b border-gray-100 pb-2 text-sm font-medium">
                <button
                    onClick={() => setActiveTab('policy')}
                    className={`pb-1 flex items-center space-x-1.5 ${activeTab === 'policy' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <Shield className="w-4 h-4" />
                    <span>Guardrail Policy</span>
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`pb-1 flex items-center space-x-1.5 ${activeTab === 'history' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <History className="w-4 h-4" />
                    <span>Decision Audit History ({history.length})</span>
                </button>
            </div>

            {activeTab === 'policy' ? (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                            <span className="text-gray-500 block text-xs uppercase font-semibold">Allowed Auto Actions</span>
                            <div className="mt-2 flex flex-wrap gap-1">
                                {statusData.allowed_actions.map(act => (
                                    <span key={act} className="px-2 py-0.5 bg-white border border-gray-200 rounded text-xs text-gray-700 font-mono">
                                        {act}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                            <span className="text-gray-500 block text-xs uppercase font-semibold">Safety Ceilings</span>
                            <div className="mt-2 space-y-1 text-xs text-gray-700">
                                <div>Max Budget: <span className="font-semibold">{statusData.max_budget_micros ? `$${(statusData.max_budget_micros / 1000000).toFixed(2)}` : 'Unlimited'}</span></div>
                                <div>Max Daily Spend: <span className="font-semibold">{statusData.max_daily_spend_micros ? `$${(statusData.max_daily_spend_micros / 1000000).toFixed(2)}` : 'Unlimited'}</span></div>
                            </div>
                        </div>

                        <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                            <span className="text-gray-500 block text-xs uppercase font-semibold">Operating Window</span>
                            <div className="mt-2 text-xs text-gray-700">
                                {statusData.operating_hours.start_wib !== null && statusData.operating_hours.end_wib !== null ? (
                                    <span>{statusData.operating_hours.start_wib}:00 - {statusData.operating_hours.end_wib}:00 WIB</span>
                                ) : (
                                    <span>24/7 Monitored</span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                        <button
                            onClick={runSimulationTest}
                            disabled={evaluating}
                            className="inline-flex items-center px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50"
                        >
                            {evaluating ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                            Simulate Rule Evaluation
                        </button>

                        {testResult && (
                            <div className="text-xs font-mono px-3 py-1.5 bg-gray-100 rounded border border-gray-200">
                                Verdict: <span className={testResult.ok ? "text-green-600 font-bold" : "text-amber-600 font-bold"}>{testResult.mode.toUpperCase()}</span> ({testResult.reason || 'policy-pass'})
                            </div>
                        )}
                    </div>
                </>
            ) : (
                <div className="space-y-3">
                    {history.length === 0 ? (
                        <p className="text-xs text-gray-500 text-center py-4">No optimization decisions recorded yet.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 text-xs">
                                <thead>
                                    <tr className="text-left text-gray-500 font-semibold uppercase tracking-wider">
                                        <th className="py-2">Time</th>
                                        <th className="py-2">Platform</th>
                                        <th className="py-2">Action</th>
                                        <th className="py-2">Mode</th>
                                        <th className="py-2">Reason</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {history.map((row) => (
                                        <tr key={row.id}>
                                            <td className="py-2 text-gray-500 whitespace-nowrap">
                                                {row.created_at ? new Date(row.created_at).toLocaleTimeString() : '—'}
                                            </td>
                                            <td className="py-2 font-medium text-gray-900">{row.provider}</td>
                                            <td className="py-2 font-mono text-indigo-600">{row.action}</td>
                                            <td className="py-2">
                                                <span className={`px-1.5 py-0.5 rounded font-semibold text-[10px] ${row.mode === 'auto' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                                    {row.mode.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="py-2 text-gray-500">{row.verdict_reason || '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
