import React, { useState, useEffect } from 'react';
import {
  Bug,
  Search,
  GitBranch,
  Terminal,
  Cpu,
  Zap,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Code2,
  Layers,
  Sparkles,
  ArrowRight,
  RefreshCw,
  FolderTree,
  FileCode2,
  FlaskConical
} from 'lucide-react';
import './App.css';

const NODE_API = 'http://127.0.0.1:5000';
const PYTHON_API = 'http://127.0.0.1:8000';

export default function App() {
  const [activeTab, setActiveTab] = useState('investigate'); // 'repo', 'investigate', 'patch', 'search'

  // Service Health Statuses
  const [nodeHealth, setNodeHealth] = useState({ online: false, checking: true });
  const [pythonHealth, setPythonHealth] = useState({ online: false, geminiConfigured: false, checking: true });

  // Tab 1: Repo Analysis State
  const [repoUrl, setRepoUrl] = useState('');
  const [isAnalyzingRepo, setIsAnalyzingRepo] = useState(false);
  const [repoData, setRepoData] = useState(null);
  const [repoError, setRepoError] = useState('');

  // Tab 2: Bug Investigation State
  const [investigationMode, setInvestigationMode] = useState('snippet'); // 'repo' or 'snippet'
  const [selectedRepoId, setSelectedRepoId] = useState('');
  const [codeSnippet, setCodeSnippet] = useState(
`function calculateDiscount(price, discountPercent) {
  // Bug: if discountPercent is 0 or negative, or > 100
  if (!discountPercent) {
    return price;
  }
  return price - (price * (discountPercent / 100));
}

// Fails when discount is greater than 100 or negative
console.log(calculateDiscount(100, 150));`
  );
  const [issueDescription, setIssueDescription] = useState('Discount calculates negative price when discount is over 100%, and crashes if discountPercent is NaN.');
  const [errorMessage, setErrorMessage] = useState('');
  const [isHunting, setIsHunting] = useState(false);
  const [bugReport, setBugReport] = useState(null);
  const [investigationError, setInvestigationError] = useState('');

  // Tab 3: Patch Generator State
  const [patchCode, setPatchCode] = useState('');
  const [patchDescription, setPatchDescription] = useState('');
  const [isPatching, setIsPatching] = useState(false);
  const [generatedPatch, setGeneratedPatch] = useState(null);
  const [patchError, setPatchError] = useState('');
  const [copiedPatch, setCopiedPatch] = useState(false);

  // Reproduction Test Generator State
  const [testCode, setTestCode] = useState('');
  const [testDescription, setTestDescription] = useState('');
  const [testFramework, setTestFramework] = useState('auto');
  const [isGeneratingTest, setIsGeneratingTest] = useState(false);
  const [generatedTest, setGeneratedTest] = useState(null);
  const [testError, setTestError] = useState('');
  const [copiedTest, setCopiedTest] = useState(false);

  // Tab 4: Code Search State
  const [searchRepoId, setSearchRepoId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchError, setSearchError] = useState('');

  // Check backend health
  const checkHealth = async () => {
    setNodeHealth(prev => ({ ...prev, checking: true }));
    setPythonHealth(prev => ({ ...prev, checking: true }));

    // Check Node.js
    try {
      const res = await fetch(`${NODE_API}/api/health`);
      const data = await res.json();
      setNodeHealth({ online: data.success, checking: false });
    } catch {
      setNodeHealth({ online: false, checking: false });
    }

    // Check Python AI Service
    try {
      const res = await fetch(`${PYTHON_API}/health`);
      const data = await res.json();
      setPythonHealth({
        online: data.success,
        geminiConfigured: data.gemini_configured,
        checking: false
      });
    } catch {
      setPythonHealth({ online: false, geminiConfigured: false, checking: false });
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  // Handle Repo Analysis
  const handleAnalyzeRepo = async (e) => {
    e.preventDefault();
    if (!repoUrl) return;

    setIsAnalyzingRepo(true);
    setRepoError('');
    setRepoData(null);

    try {
      const res = await fetch(`${NODE_API}/api/repositories/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to analyze repository');
      }

      setRepoData(data.repository);
      setSelectedRepoId(data.repository.id);
      setSearchRepoId(data.repository.id);
      setInvestigationMode('repo');
      setIssueDescription('');
    } catch (err) {
      setRepoError(err.message);
    } finally {
      setIsAnalyzingRepo(false);
    }
  };

  // Handle Bug Investigation
  const handleInvestigateBug = async (e) => {
    e.preventDefault();
    setIsHunting(true);
    setBugReport(null);
    setInvestigationError('');

    try {
      const payload = {
        issueDescription,
        errorMessage: errorMessage.trim() || undefined
      };

      if (investigationMode === 'repo' && selectedRepoId) {
        payload.repositoryId = selectedRepoId;
      } else {
        payload.code = codeSnippet;
      }

      const res = await fetch(`${NODE_API}/api/bugs/investigate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Bug investigation failed');
      }

      setBugReport(data);
    } catch (err) {
      setInvestigationError(err.message);
    } finally {
      setIsHunting(false);
    }
  };

  // Handle Patch Generation
  const handleGeneratePatch = async (e) => {
    if (e) e.preventDefault();
    if (!patchCode || !patchDescription) return;

    setIsPatching(true);
    setGeneratedPatch(null);
    setPatchError('');

    try {
      const res = await fetch(`${NODE_API}/api/bugs/patch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: patchCode,
          issueDescription: patchDescription
        })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Patch generation failed');
      }

      setGeneratedPatch(data.patch);
    } catch (err) {
      setPatchError(err.message);
    } finally {
      setIsPatching(false);
    }
  };

  // Transfer Bug to Patch Tab
  const sendToPatchTab = () => {
    setPatchCode(bugReport?.codeContext || codeSnippet);
    setPatchDescription(bugReport?.issueDescription || issueDescription);
    setActiveTab('patch');
  };

  // Transfer Bug to Test Tab
  const sendToTestTab = () => {
    setTestCode(bugReport?.codeContext || codeSnippet);
    setTestDescription(bugReport?.issueDescription || issueDescription);
    setActiveTab('test');
  };

  // Handle Test Generation
  const handleGenerateTest = async (e) => {
    if (e) e.preventDefault();
    if (!testCode || !testDescription) return;

    setIsGeneratingTest(true);
    setGeneratedTest(null);
    setTestError('');

    try {
      const res = await fetch(`${NODE_API}/api/bugs/generate-test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: testCode,
          issueDescription: testDescription,
          framework: testFramework === 'auto' ? undefined : testFramework
        })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Test generation failed');
      }

      setGeneratedTest(data.test);
    } catch (err) {
      setTestError(err.message);
    } finally {
      setIsGeneratingTest(false);
    }
  };

  // Handle Code Search
  const handleSearchCode = async (e) => {
    e.preventDefault();
    if (!searchQuery) return;

    setIsSearching(true);
    setSearchResults([]);
    setSearchError('');

    try {
      const res = await fetch(`${NODE_API}/api/search/code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repositoryId: searchRepoId || selectedRepoId,
          query: searchQuery
        })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Search failed');
      }

      setSearchResults(data.results || []);
    } catch (err) {
      setSearchError(err.message);
    } finally {
      setIsSearching(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedPatch(true);
    setTimeout(() => setCopiedPatch(false), 2000);
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="brand-section">
          <div className="brand-icon">🐛</div>
          <div>
            <div className="brand-title">
              BugHunter <span className="gradient-text">AI</span>
              <span className="brand-tag">Autonomous</span>
            </div>
            <div className="brand-subtitle">
              Deep Code Investigation, Reproduction Tests & Verified Patches
            </div>
          </div>
        </div>

        <div className="status-badges">
          <div className="status-pill">
            <span className={`status-dot ${nodeHealth.online ? 'online' : nodeHealth.checking ? 'checking' : ''}`} />
            Node API (5000): {nodeHealth.online ? 'Online' : 'Offline'}
          </div>
          <div className="status-pill">
            <span className={`status-dot ${pythonHealth.online ? 'online' : pythonHealth.checking ? 'checking' : ''}`} />
            AI Service (8000): {pythonHealth.online ? 'Online' : 'Offline'}
          </div>
          <div className="status-pill">
            <Sparkles size={14} color="#818cf8" />
            Gemini Flash: {pythonHealth.geminiConfigured ? 'Connected' : 'Missing Key'}
          </div>
          <button className="btn-secondary" onClick={checkHealth} title="Refresh connection status" style={{ padding: '6px 10px' }}>
            <RefreshCw size={13} className={nodeHealth.checking ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      {/* Tabs Navigation */}
      <nav className="tabs-nav">
        <button
          className={`tab-btn ${activeTab === 'investigate' ? 'active' : ''}`}
          onClick={() => setActiveTab('investigate')}
        >
          <Bug size={17} />
          Bug Investigation Agent
        </button>
        <button
          className={`tab-btn ${activeTab === 'patch' ? 'active' : ''}`}
          onClick={() => setActiveTab('patch')}
        >
          <Zap size={17} />
          AI Code Patch Generator
        </button>
        <button
          className={`tab-btn ${activeTab === 'test' ? 'active' : ''}`}
          onClick={() => setActiveTab('test')}
        >
          <FlaskConical size={17} />
          Reproduction Test Generator
        </button>
        <button
          className={`tab-btn ${activeTab === 'repo' ? 'active' : ''}`}
          onClick={() => setActiveTab('repo')}
        >
          <GitBranch size={17} />
          Repository Intelligence
        </button>
        <button
          className={`tab-btn ${activeTab === 'search' ? 'active' : ''}`}
          onClick={() => setActiveTab('search')}
        >
          <Search size={17} />
          Code RAG Search
        </button>
      </nav>

      {/* Main Tabs Content */}
      <div className="tab-content animate-fade-in">
        {/* ======================================================== */}
        {/* TAB 1: BUG INVESTIGATION AGENT */}
        {/* ======================================================== */}
        {activeTab === 'investigate' && (
          <div className="grid-2">
            {/* Input Panel */}
            <div className="glass-panel card-padding">
              <div className="section-header">
                <div className="section-title">
                  <Bug size={20} color="#f43f5e" />
                  Autonomous Bug Investigator
                </div>
                <div className="section-desc">
                  Provide a code snippet or connect an indexed repository to hunt for bugs, root causes, and reproduction test cases.
                </div>
              </div>

              {/* Investigation Mode Selector */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
                <button
                  type="button"
                  className={`btn-secondary ${investigationMode === 'snippet' ? 'active' : ''}`}
                  style={{
                    flex: 1,
                    justifyContent: 'center',
                    background: investigationMode === 'snippet' ? 'rgba(99, 102, 241, 0.2)' : undefined,
                    borderColor: investigationMode === 'snippet' ? 'var(--accent-indigo)' : undefined
                  }}
                  onClick={() => setInvestigationMode('snippet')}
                >
                  <Code2 size={16} /> Direct Code Snippet
                </button>
                <button
                  type="button"
                  className={`btn-secondary ${investigationMode === 'repo' ? 'active' : ''}`}
                  style={{
                    flex: 1,
                    justifyContent: 'center',
                    background: investigationMode === 'repo' ? 'rgba(99, 102, 241, 0.2)' : undefined,
                    borderColor: investigationMode === 'repo' ? 'var(--accent-indigo)' : undefined
                  }}
                  onClick={() => setInvestigationMode('repo')}
                >
                  <FolderTree size={16} /> Repository RAG Mode
                </button>
              </div>

              <form onSubmit={handleInvestigateBug}>
                {investigationMode === 'repo' ? (
                  <div className="form-group">
                    <label className="form-label">Repository ID (UUID)</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                      value={selectedRepoId}
                      onChange={(e) => setSelectedRepoId(e.target.value)}
                      required
                    />
                    <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      {repoData ? `Using loaded repo: ${repoData.name}` : 'Analyze a repo in the "Repository Intelligence" tab first to get an ID.'}
                    </small>
                  </div>
                ) : (
                  <div className="form-group">
                    <label className="form-label">Source Code to Inspect</label>
                    <textarea
                      className="form-textarea"
                      rows={9}
                      value={codeSnippet}
                      onChange={(e) => setCodeSnippet(e.target.value)}
                      placeholder="// Paste buggy code here..."
                      required
                    />
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Issue / Symptom Description</label>
                  <input
                    type="text"
                    className="form-input"
                    value={issueDescription}
                    onChange={(e) => setIssueDescription(e.target.value)}
                    placeholder="Describe what goes wrong or expected vs actual behavior..."
                    required
                  />
                  <div className="presets-row">
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Quick Presets:</span>
                    <button
                      type="button"
                      className="preset-chip"
                      onClick={() => {
                        setCodeSnippet('function divide(a, b) {\n  return a / b;\n}\n\nconsole.log(divide(10, 0));');
                        setIssueDescription('ZeroDivisionError when denominator is zero');
                      }}
                    >
                      Zero Division
                    </button>
                    <button
                      type="button"
                      className="preset-chip"
                      onClick={() => {
                        setCodeSnippet('function getUsername(user) {\n  return user.profile.name.toUpperCase();\n}\n\ngetUsername({});');
                        setIssueDescription('Cannot read properties of undefined (reading name)');
                      }}
                    >
                      Null Pointer
                    </button>
                    <button
                      type="button"
                      className="preset-chip"
                      onClick={() => {
                        setCodeSnippet('async function fetchUser(id) {\n  const user = db.find(id);\n  // Missing await on async db query\n  return user.email;\n}');
                        setIssueDescription('Promise pending error on database call');
                      }}
                    >
                      Async / Await Bug
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Error Logs / Stack Trace (Optional)</label>
                  <textarea
                    className="form-textarea"
                    rows={2}
                    value={errorMessage}
                    onChange={(e) => setErrorMessage(e.target.value)}
                    placeholder="e.g. TypeError: Cannot read property of undefined at Line 14..."
                    style={{ minHeight: '60px' }}
                  />
                </div>

                {investigationError && (
                  <div className="toast-msg toast-error">
                    <AlertCircle size={18} />
                    <span>{investigationError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isHunting || (!pythonHealth.online && !nodeHealth.online)}
                  style={{ width: '100%' }}
                >
                  {isHunting ? (
                    <>
                      <RefreshCw size={18} className="animate-spin" />
                      Gemini Agent Investigating Bug...
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} />
                      Hunt & Investigate Bug
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Results Panel */}
            <div className="glass-panel card-padding">
              <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div className="section-title">
                    <Cpu size={20} color="#38bdf8" />
                    Investigation Report
                  </div>
                  <div className="section-desc">
                    AI diagnostic breakdown and reproduction test scenarios.
                  </div>
                </div>
                {bugReport && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn-secondary" onClick={sendToTestTab} style={{ fontSize: '0.8rem' }}>
                      <FlaskConical size={14} color="#a855f7" /> Generate Test
                    </button>
                    <button className="btn-secondary" onClick={sendToPatchTab} style={{ fontSize: '0.8rem' }}>
                      Generate Patch <ArrowRight size={14} />
                    </button>
                  </div>
                )}
              </div>

              {isHunting && (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
                  <div className="animate-spin" style={{ display: 'inline-block', marginBottom: '14px' }}>
                    <RefreshCw size={36} color="var(--accent-indigo)" />
                  </div>
                  <p style={{ fontWeight: 600 }}>Autonomous Debugging Agent Running...</p>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Analyzing code execution paths and generating reproduction unit tests with Gemini Flash.
                  </p>
                </div>
              )}

              {!isHunting && !bugReport && (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                  <Bug size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
                  <p>No investigation run yet.</p>
                  <p style={{ fontSize: '0.82rem', marginTop: '4px' }}>
                    Enter code or select a repository and click "Hunt & Investigate Bug" to see the AI report.
                  </p>
                </div>
              )}

              {bugReport && (
                <div className="animate-fade-in">
                  {bugReport.relevantFiles && bugReport.relevantFiles.length > 0 && (
                    <div style={{ marginBottom: '18px' }}>
                      <div className="form-label" style={{ marginBottom: '8px' }}>RAG Matched Source Chunks:</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {bugReport.relevantFiles.map((file, idx) => (
                          <div
                            key={idx}
                            style={{
                              padding: '8px 12px',
                              background: 'rgba(15, 23, 42, 0.8)',
                              border: '1px solid var(--border-subtle)',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: '0.8rem',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}
                          >
                            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                              {file.filePath} (L:{file.startLine}-{file.endLine})
                            </span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              Match: {(file.similarity * 100).toFixed(1)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="code-container">
                    <div className="code-header">
                      <span>🤖 Gemini Analysis & Test Generation</span>
                      <button
                        className="btn-secondary"
                        style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                        onClick={() => copyToClipboard(bugReport.analysis)}
                      >
                        {copiedPatch ? <Check size={12} color="#10b981" /> : <Copy size={12} />} Copy Report
                      </button>
                    </div>
                    <div className="code-content markdown-report">
                      {bugReport.analysis}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: AI CODE PATCH GENERATOR */}
        {/* ======================================================== */}
        {activeTab === 'patch' && (
          <div className="grid-2">
            <div className="glass-panel card-padding">
              <div className="section-header">
                <div className="section-title">
                  <Zap size={20} color="#f59e0b" />
                  Automated Code Repair
                </div>
                <div className="section-desc">
                  Provide the faulty code and fix requirements. Gemini will synthesize the exact corrected code.
                </div>
              </div>

              <form onSubmit={handleGeneratePatch}>
                <div className="form-group">
                  <label className="form-label">Faulty Code</label>
                  <textarea
                    className="form-textarea"
                    rows={8}
                    value={patchCode}
                    onChange={(e) => setPatchCode(e.target.value)}
                    placeholder="// Paste code that needs fixing..."
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Issue / Correction Requirements</label>
                  <input
                    type="text"
                    className="form-input"
                    value={patchDescription}
                    onChange={(e) => setPatchDescription(e.target.value)}
                    placeholder="e.g. Prevent negative values and validate parameters..."
                    required
                  />
                </div>

                {patchError && (
                  <div className="toast-msg toast-error">
                    <AlertCircle size={18} />
                    <span>{patchError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isPatching}
                  style={{ width: '100%' }}
                >
                  {isPatching ? (
                    <>
                      <RefreshCw size={18} className="animate-spin" />
                      Generating Verified Patch...
                    </>
                  ) : (
                    <>
                      <Zap size={18} />
                      Generate AI Patch
                    </>
                  )}
                </button>
              </form>
            </div>

            <div className="glass-panel card-padding">
              <div className="section-header">
                <div className="section-title">
                  <CheckCircle2 size={20} color="#10b981" />
                  Generated Patch Output
                </div>
                <div className="section-desc">
                  Verified replacement code ready for deployment or Pull Request.
                </div>
              </div>

              {!isPatching && !generatedPatch && (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                  <Code2 size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
                  <p>No patch generated yet.</p>
                  <p style={{ fontSize: '0.82rem', marginTop: '4px' }}>
                    Submit faulty code on the left to generate the fix.
                  </p>
                </div>
              )}

              {isPatching && (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
                  <div className="animate-spin" style={{ display: 'inline-block', marginBottom: '14px' }}>
                    <RefreshCw size={36} color="var(--accent-amber)" />
                  </div>
                  <p style={{ fontWeight: 600 }}>Synthesizing Code Patch...</p>
                </div>
              )}

              {generatedPatch && (
                <div className="animate-fade-in">
                  <div className="code-container">
                    <div className="code-header">
                      <span>🛠️ AI Patch & Diff</span>
                      <button
                        className="btn-secondary"
                        style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                        onClick={() => copyToClipboard(generatedPatch)}
                      >
                        {copiedPatch ? <Check size={12} color="#10b981" /> : <Copy size={12} />} Copy Patch
                      </button>
                    </div>
                    <div className="code-content markdown-report">
                      {generatedPatch}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB: REPRODUCTION TEST GENERATOR */}
        {/* ======================================================== */}
        {activeTab === 'test' && (
          <div className="grid-2">
            <div className="glass-panel card-padding">
              <div className="section-header">
                <div className="section-title">
                  <FlaskConical size={20} color="#a855f7" />
                  Reproduction Unit Test Generator
                </div>
                <div className="section-desc">
                  Synthesize an executable reproduction unit test (Pytest / Jest / Unittest) that asserts failure on buggy code and passes once fixed.
                </div>
              </div>

              <form onSubmit={handleGenerateTest}>
                <div className="form-group">
                  <label className="form-label">Testing Framework</label>
                  <select
                    className="form-select"
                    value={testFramework}
                    onChange={(e) => setTestFramework(e.target.value)}
                  >
                    <option value="auto">Auto-Detect Framework</option>
                    <option value="pytest">Pytest (Python)</option>
                    <option value="unittest">Unittest (Python)</option>
                    <option value="jest">Jest (JavaScript / TypeScript)</option>
                    <option value="mocha">Mocha / Chai (JavaScript)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Code Under Test (Source / Buggy Chunks)</label>
                  <textarea
                    className="form-textarea"
                    rows={8}
                    value={testCode}
                    onChange={(e) => setTestCode(e.target.value)}
                    placeholder="// Paste code to be tested..."
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Bug / Failure to Reproduce</label>
                  <input
                    type="text"
                    className="form-input"
                    value={testDescription}
                    onChange={(e) => setTestDescription(e.target.value)}
                    placeholder="e.g. Division by zero when denominator is 0..."
                    required
                  />
                </div>

                {testError && (
                  <div className="toast-msg toast-error">
                    <AlertCircle size={18} />
                    <span>{testError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isGeneratingTest}
                  style={{ width: '100%', background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)' }}
                >
                  {isGeneratingTest ? (
                    <>
                      <RefreshCw size={18} className="animate-spin" />
                      Synthesizing Reproduction Test...
                    </>
                  ) : (
                    <>
                      <FlaskConical size={18} />
                      Generate Reproduction Test
                    </>
                  )}
                </button>
              </form>
            </div>

            <div className="glass-panel card-padding">
              <div className="section-header">
                <div className="section-title">
                  <CheckCircle2 size={20} color="#10b981" />
                  Executable Test Suite
                </div>
                <div className="section-desc">
                  Self-contained test code with assertions designed to fail until the patch is applied.
                </div>
              </div>

              {!isGeneratingTest && !generatedTest && (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                  <FlaskConical size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
                  <p>No reproduction test generated yet.</p>
                  <p style={{ fontSize: '0.82rem', marginTop: '4px' }}>
                    Configure the test framework and submit the bug on the left to generate the test suite.
                  </p>
                </div>
              )}

              {isGeneratingTest && (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
                  <div className="animate-spin" style={{ display: 'inline-block', marginBottom: '14px' }}>
                    <RefreshCw size={36} color="var(--accent-violet)" />
                  </div>
                  <p style={{ fontWeight: 600 }}>Synthesizing Executable Test Suite...</p>
                </div>
              )}

              {generatedTest && (
                <div className="animate-fade-in">
                  <div className="code-container">
                    <div className="code-header">
                      <span>🧪 Reproduction Test Script</span>
                      <button
                        className="btn-secondary"
                        style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                        onClick={() => {
                          navigator.clipboard.writeText(generatedTest);
                          setCopiedTest(true);
                          setTimeout(() => setCopiedTest(false), 2000);
                        }}
                      >
                        {copiedTest ? <Check size={12} color="#10b981" /> : <Copy size={12} />} Copy Test
                      </button>
                    </div>
                    <div className="code-content markdown-report">
                      {generatedTest}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: REPOSITORY INTELLIGENCE & INDEXING */}
        {/* ======================================================== */}
        {activeTab === 'repo' && (
          <div className="glass-panel card-padding">
            <div className="section-header">
              <div className="section-title">
                <GitBranch size={20} color="#06b6d4" />
                GitHub Repository Ingestion & Code Indexing
              </div>
              <div className="section-desc">
                Clones the repository, computes AST code chunks, generates vector embeddings, and stores them in PostgreSQL for RAG.
              </div>
            </div>

            <form onSubmit={handleAnalyzeRepo} style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="url"
                  className="form-input"
                  placeholder="https://github.com/owner/repository"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  required
                />
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isAnalyzingRepo || !nodeHealth.online}
                  style={{ minWidth: '180px' }}
                >
                  {isAnalyzingRepo ? (
                    <>
                      <RefreshCw size={17} className="animate-spin" />
                      Indexing Repo...
                    </>
                  ) : (
                    <>
                      <Layers size={17} />
                      Analyze & Index
                    </>
                  )}
                </button>
              </div>

              <div className="presets-row" style={{ marginTop: '10px' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Try Sample Repositories:</span>
                <button
                  type="button"
                  className="preset-chip"
                  onClick={() => setRepoUrl('https://github.com/expressjs/express')}
                >
                  expressjs/express
                </button>
                <button
                  type="button"
                  className="preset-chip"
                  onClick={() => setRepoUrl('https://github.com/lodash/lodash')}
                >
                  lodash/lodash
                </button>
              </div>
            </form>

            {repoError && (
              <div className="toast-msg toast-error">
                <AlertCircle size={18} />
                <span>{repoError}</span>
              </div>
            )}

            {repoData && (
              <div className="animate-fade-in" style={{ marginTop: '20px' }}>
                <div className="toast-msg toast-success">
                  <CheckCircle2 size={18} />
                  <span>Repository analyzed and indexed successfully into Vector Database!</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>{repoData.name}</h3>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      Owner: <strong>{repoData.owner}</strong> • Branch: <strong>{repoData.defaultBranch}</strong> • ID: <code style={{ color: 'var(--accent-cyan)' }}>{repoData.id}</code>
                    </p>
                  </div>
                  <button
                    className="btn-primary"
                    style={{ fontSize: '0.82rem', padding: '8px 16px' }}
                    onClick={() => {
                      setSelectedRepoId(repoData.id);
                      setInvestigationMode('repo');
                      setIssueDescription('');
                      setActiveTab('investigate');
                    }}
                  >
                    Hunt Bugs in this Repo <ArrowRight size={14} />
                  </button>
                </div>

                {/* Stats */}
                <div className="stats-grid">
                  <div className="stat-box">
                    <div className="stat-value">{repoData.totalFiles || 0}</div>
                    <div className="stat-label">Total Files</div>
                  </div>
                  <div className="stat-box">
                    <div className="stat-value">{repoData.totalDirectories || 0}</div>
                    <div className="stat-label">Directories</div>
                  </div>
                  <div className="stat-box">
                    <div className="stat-value" style={{ color: 'var(--accent-emerald)' }}>Active</div>
                    <div className="stat-label">Status</div>
                  </div>
                </div>

                {/* Languages */}
                {repoData.languages && (
                  <div style={{ marginTop: '20px' }}>
                    <div className="form-label" style={{ marginBottom: '8px' }}>Detected Languages</div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {Object.keys(repoData.languages).map((lang, idx) => (
                        <div key={idx} className="lang-badge">
                          <FileCode2 size={13} />
                          {lang}: {repoData.languages[lang]} files
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: CODE RAG SEARCH */}
        {/* ======================================================== */}
        {activeTab === 'search' && (
          <div className="glass-panel card-padding">
            <div className="section-header">
              <div className="section-title">
                <Search size={20} color="#8b5cf6" />
                Semantic Code Search (RAG)
              </div>
              <div className="section-desc">
                Query indexed repository code in natural language via local SentenceTransformers embeddings & pgvector cosine similarity.
              </div>
            </div>

            <form onSubmit={handleSearchCode} style={{ marginBottom: '20px' }}>
              <div className="form-group">
                <label className="form-label">Repository ID</label>
                <input
                  type="text"
                  className="form-input"
                  value={searchRepoId}
                  onChange={(e) => setSearchRepoId(e.target.value)}
                  placeholder="Paste repositoryId UUID..."
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  className="form-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search code: e.g. 'router middleware error handler' or 'authenticate user token'"
                  required
                />
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isSearching || !nodeHealth.online}
                  style={{ minWidth: '150px' }}
                >
                  {isSearching ? <RefreshCw size={17} className="animate-spin" /> : <Search size={17} />}
                  Search Code
                </button>
              </div>
            </form>

            {searchError && (
              <div className="toast-msg toast-error">
                <AlertCircle size={18} />
                <span>{searchError}</span>
              </div>
            )}

            {searchResults.length > 0 && (
              <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="form-label">Search Matches ({searchResults.length} chunks found):</div>
                {searchResults.map((result, idx) => (
                  <div key={idx} className="code-container" style={{ margin: 0 }}>
                    <div className="code-header">
                      <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>
                        {result.file_path} (Lines {result.start_line}-{result.end_line})
                      </span>
                      <span className="brand-tag">
                        Similarity: {(result.similarity * 100).toFixed(1)}%
                      </span>
                    </div>
                    <pre className="code-content">{result.content}</pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
