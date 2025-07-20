// ABOUTME: Performance benchmarking UI component for baseline management and benchmark execution
// ABOUTME: Provides interface for creating baselines, running benchmarks, and viewing results

import React, { useState } from 'react';
import { 
  PlayIcon, 
  PlusIcon, 
  TrashIcon, 
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { usePerformanceBenchmark, useRegressionDetection } from '../hooks/usePerformanceBenchmark';
import { PerformanceBenchmark as BenchmarkType, ComparisonResult } from '../services/performanceBenchmark';

interface PerformanceBenchmarkProps {
  className?: string;
}

const PerformanceBenchmark: React.FC<PerformanceBenchmarkProps> = ({ className = '' }) => {
  const {
    baselines,
    benchmarks,
    isLoading,
    error,
    lastComparison,
    createBaseline,
    deleteBaseline,
    runBenchmark,
    deleteBenchmark,
    compareBenchmarks,
    detectRegression,
    exportData,
    importData,
    clearAllData,
    clearError
  } = usePerformanceBenchmark();

  const regressionStatus = useRegressionDetection(true, 30000); // Check every 30 seconds

  const [activeTab, setActiveTab] = useState<'baselines' | 'benchmarks' | 'comparison' | 'regression'>('baselines');
  const [selectedBaseline, setSelectedBaseline] = useState<string>('');
  const [selectedBenchmark, setSelectedBenchmark] = useState<string>('');
  const [newBaselineName, setNewBaselineName] = useState('');
  const [newBaselineDescription, setNewBaselineDescription] = useState('');
  const [newBenchmarkName, setNewBenchmarkName] = useState('');
  const [showCreateBaseline, setShowCreateBaseline] = useState(false);
  const [showRunBenchmark, setShowRunBenchmark] = useState(false);

  const handleCreateBaseline = async () => {
    if (!newBaselineName.trim()) return;
    
    const baseline = await createBaseline(
      newBaselineName.trim(),
      newBaselineDescription.trim() || undefined,
      ['manual']
    );
    
    if (baseline) {
      setNewBaselineName('');
      setNewBaselineDescription('');
      setShowCreateBaseline(false);
    }
  };

  const handleRunBenchmark = async () => {
    const benchmark = await runBenchmark(
      newBenchmarkName.trim() || undefined,
      selectedBaseline || undefined
    );
    
    if (benchmark) {
      setNewBenchmarkName('');
      setShowRunBenchmark(false);
    }
  };

  const handleCompare = () => {
    if (selectedBaseline && selectedBenchmark) {
      compareBenchmarks(selectedBaseline, selectedBenchmark);
    }
  };

  const handleExport = () => {
    const data = exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-benchmarks-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = e.target?.result as string;
        importData(data);
      };
      reader.readAsText(file);
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatMetric = (value: number, unit: string = 'ms') => {
    if (unit === 'ms') {
      return value < 1000 ? `${value.toFixed(1)}ms` : `${(value / 1000).toFixed(2)}s`;
    }
    if (unit === 'MB') {
      return `${(value / (1024 * 1024)).toFixed(1)}MB`;
    }
    return value.toString();
  };

  const getStatusColor = (status: 'improved' | 'degraded' | 'stable') => {
    switch (status) {
      case 'improved': return 'text-green-600';
      case 'degraded': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: 'improved' | 'degraded' | 'stable') => {
    switch (status) {
      case 'improved': return <CheckCircleIcon className="h-4 w-4 text-green-600" />;
      case 'degraded': return <ExclamationTriangleIcon className="h-4 w-4 text-red-600" />;
      default: return <ClockIcon className="h-4 w-4 text-gray-600" />;
    }
  };

  const renderBaselines = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Performance Baselines</h3>
        <button
          onClick={() => setShowCreateBaseline(true)}
          className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Create Baseline
        </button>
      </div>

      {showCreateBaseline && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium mb-3">Create New Baseline</h4>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Baseline name"
              value={newBaselineName}
              onChange={(e) => setNewBaselineName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <textarea
              placeholder="Description (optional)"
              value={newBaselineDescription}
              onChange={(e) => setNewBaselineDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
            />
            <div className="flex space-x-2">
              <button
                onClick={handleCreateBaseline}
                disabled={!newBaselineName.trim() || isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Creating...' : 'Create'}
              </button>
              <button
                onClick={() => setShowCreateBaseline(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {baselines.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No baselines created yet</p>
        ) : (
          baselines.map((baseline) => (
            <div key={baseline.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h4 className="font-medium">{baseline.name}</h4>
                  {baseline.metadata.description && (
                    <p className="text-sm text-gray-600 mt-1">{baseline.metadata.description}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-2">
                    Created: {formatTimestamp(baseline.timestamp)}
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 text-sm">
                    <div>
                      <span className="text-gray-500">Startup:</span>
                      <span className="ml-1 font-medium">{formatMetric(baseline.metrics.startupTime)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Memory:</span>
                      <span className="ml-1 font-medium">{formatMetric(baseline.metrics.memoryUsage, 'MB')}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Modules:</span>
                      <span className="ml-1 font-medium">{formatMetric(baseline.metrics.moduleLoadingTime)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Interactions:</span>
                      <span className="ml-1 font-medium">{formatMetric(baseline.metrics.interactionResponseTime)}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => deleteBaseline(baseline.id)}
                  className="text-red-600 hover:text-red-800 p-1"
                  title="Delete baseline"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const renderBenchmarks = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Performance Benchmarks</h3>
        <button
          onClick={() => setShowRunBenchmark(true)}
          className="flex items-center px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
        >
          <PlayIcon className="h-4 w-4 mr-2" />
          Run Benchmark
        </button>
      </div>

      {showRunBenchmark && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium mb-3">Run New Benchmark</h4>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Benchmark name (optional)"
              value={newBenchmarkName}
              onChange={(e) => setNewBenchmarkName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={selectedBaseline}
              onChange={(e) => setSelectedBaseline(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select baseline (optional)</option>
              {baselines.map((baseline) => (
                <option key={baseline.id} value={baseline.id}>
                  {baseline.name}
                </option>
              ))}
            </select>
            <div className="flex space-x-2">
              <button
                onClick={handleRunBenchmark}
                disabled={isLoading}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Running...' : 'Run Benchmark'}
              </button>
              <button
                onClick={() => setShowRunBenchmark(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {benchmarks.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No benchmarks run yet</p>
        ) : (
          benchmarks.map((benchmark) => (
            <div key={benchmark.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h4 className="font-medium">{benchmark.name}</h4>
                  <p className="text-xs text-gray-500 mt-1">
                    Run: {formatTimestamp(benchmark.timestamp)}
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 text-sm">
                    <div>
                      <span className="text-gray-500">Startup:</span>
                      <span className="ml-1 font-medium">{formatMetric(benchmark.metrics.startupTime)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Memory:</span>
                      <span className="ml-1 font-medium">{formatMetric(benchmark.metrics.memoryUsage, 'MB')}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Modules:</span>
                      <span className="ml-1 font-medium">{formatMetric(benchmark.metrics.moduleLoadingTime)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Interactions:</span>
                      <span className="ml-1 font-medium">{formatMetric(benchmark.metrics.interactionResponseTime)}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => deleteBenchmark(benchmark.id)}
                  className="text-red-600 hover:text-red-800 p-1"
                  title="Delete benchmark"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const renderComparison = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Performance Comparison</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Baseline
          </label>
          <select
            value={selectedBaseline}
            onChange={(e) => setSelectedBaseline(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select baseline</option>
            {baselines.map((baseline) => (
              <option key={baseline.id} value={baseline.id}>
                {baseline.name} - {formatTimestamp(baseline.timestamp)}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Benchmark
          </label>
          <select
            value={selectedBenchmark}
            onChange={(e) => setSelectedBenchmark(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select benchmark</option>
            {benchmarks.map((benchmark) => (
              <option key={benchmark.id} value={benchmark.id}>
                {benchmark.name} - {formatTimestamp(benchmark.timestamp)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button
        onClick={handleCompare}
        disabled={!selectedBaseline || !selectedBenchmark}
        className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <ChartBarIcon className="h-4 w-4 mr-2" />
        Compare Performance
      </button>

      {lastComparison && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-medium">Comparison Results</h4>
            <div className="flex items-center space-x-2">
              {getStatusIcon(lastComparison.overall)}
              <span className={`font-medium ${getStatusColor(lastComparison.overall)}`}>
                {lastComparison.overall.charAt(0).toUpperCase() + lastComparison.overall.slice(1)}
              </span>
              <span className="text-sm text-gray-500">
                Score: {lastComparison.score}/100
              </span>
            </div>
          </div>

          <p className="text-gray-600 mb-4">{lastComparison.summary}</p>

          <div className="space-y-3">
            <h5 className="font-medium">Metric Changes</h5>
            {Object.entries(lastComparison.metrics).map(([key, metric]) => (
              <div key={key} className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="font-medium capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </span>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(metric.status)}
                  <span className={`text-sm ${getStatusColor(metric.status)}`}>
                    {metric.changePercent > 0 ? '+' : ''}{metric.changePercent.toFixed(1)}%
                  </span>
                  <span className="text-xs text-gray-500">
                    ({formatMetric(metric.baseline)} → {formatMetric(metric.current)})
                  </span>
                </div>
              </div>
            ))}
          </div>

          {lastComparison.recommendations.length > 0 && (
            <div className="mt-6">
              <h5 className="font-medium mb-3">Recommendations</h5>
              <div className="space-y-3">
                {lastComparison.recommendations.map((rec) => (
                  <div key={rec.id} className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h6 className="font-medium text-blue-900">{rec.title}</h6>
                        <p className="text-sm text-blue-700 mt-1">{rec.description}</p>
                        <p className="text-xs text-blue-600 mt-2">
                          Expected improvement: {rec.expectedImprovement.improvement}
                        </p>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        rec.priority === 'critical' ? 'bg-red-100 text-red-800' :
                        rec.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                        rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {rec.priority}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderRegression = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Regression Detection</h3>
        <button
          onClick={() => detectRegression()}
          className="flex items-center px-3 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
        >
          <ExclamationTriangleIcon className="h-4 w-4 mr-2" />
          Check Regression
        </button>
      </div>

      {/* Automatic regression status */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium mb-2">Automatic Monitoring</h4>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {regressionStatus.detected ? (
              <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
            ) : (
              <CheckCircleIcon className="h-5 w-5 text-green-600" />
            )}
            <span className={regressionStatus.detected ? 'text-red-600' : 'text-green-600'}>
              {regressionStatus.detected ? 'Regression Detected' : 'No Regression'}
            </span>
            {regressionStatus.detected && (
              <span className={`px-2 py-1 text-xs rounded-full ${
                regressionStatus.severity === 'critical' ? 'bg-red-100 text-red-800' :
                regressionStatus.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                regressionStatus.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {regressionStatus.severity}
              </span>
            )}
          </div>
          {regressionStatus.lastCheck && (
            <span className="text-xs text-gray-500">
              Last check: {formatTimestamp(regressionStatus.lastCheck)}
            </span>
          )}
        </div>
      </div>

      {/* Manual regression results */}
      {/* This would show results from manual regression detection */}
    </div>
  );

  return (
    <div className={`bg-gray-50 rounded-lg p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Performance Benchmarking</h2>
        <div className="flex space-x-2">
          <button
            onClick={handleExport}
            className="flex items-center px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            title="Export benchmarks"
          >
            <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
            Export
          </button>
          <label className="flex items-center px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors cursor-pointer">
            <ArrowUpTrayIcon className="h-4 w-4 mr-2" />
            Import
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
          </label>
          <button
            onClick={clearAllData}
            className="flex items-center px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            title="Clear all data"
          >
            <TrashIcon className="h-4 w-4 mr-2" />
            Clear All
          </button>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mr-2" />
              <span className="text-red-800">{error}</span>
            </div>
            <button
              onClick={clearError}
              className="text-red-600 hover:text-red-800"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 bg-gray-100 rounded-lg p-1">
        {[
          { key: 'baselines', label: 'Baselines' },
          { key: 'benchmarks', label: 'Benchmarks' },
          { key: 'comparison', label: 'Comparison' },
          { key: 'regression', label: 'Regression' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-96">
        {activeTab === 'baselines' && renderBaselines()}
        {activeTab === 'benchmarks' && renderBenchmarks()}
        {activeTab === 'comparison' && renderComparison()}
        {activeTab === 'regression' && renderRegression()}
      </div>
    </div>
  );
};

export default PerformanceBenchmark;