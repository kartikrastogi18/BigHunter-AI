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
  FlaskConical,
  GitPullRequest,
  ExternalLink,
  Key,
  ShieldCheck,
  GitFork,
  Eye,
  EyeOff,
  Trash2,
  Database,
  BookOpen,
  FileCheck,
  Play,
  ShieldAlert,
  XCircle,
  Clock,
  Activity,
  History,
  BrainCircuit,
  RotateCcw
} from 'lucide-react';
import './App.css';

const NODE_API = import.meta.env.VITE_NODE_API_URL || 'http://127.0.0.1:5000';
const PYTHON_API = import.meta.env.VITE_PYTHON_API_URL || 'http://127.0.0.1:8000';

export default function App() {
  const [activeTab, setActiveTab] = useState('investigate'); // 'repo', 'investigate', 'patch', 'search'

  // Service Health Statuses
  const [nodeHealth, setNodeHealth] = useState({ online: false, checking: true });
  const [pythonHealth, setPythonHealth] = useState({
    online: false,
    geminiConfigured: false,
    defectModelLoaded: false,
    checking: true
  });

  // Global Indexed Repositories & Investigation History
  const [repositories, setRepositories] = useState([]);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [currentInvestigationId, setCurrentInvestigationId] = useState(null);
  const [investigationHistory, setInvestigationHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // CodeXGLUE PyTorch ML Defect Detection State
  const [defectScan, setDefectScan] = useState(null);
  const [isScanningDefect, setIsScanningDefect] = useState(false);
  const [defectScanError, setDefectScanError] = useState('');
  const [defectModelInfo, setDefectModelInfo] = useState(null);

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
  const [cleanPatchCode, setCleanPatchCode] = useState('');
  const [patchViewMode, setPatchViewMode] = useState('code'); // 'code' or 'report'
  const [patchError, setPatchError] = useState('');
  const [copiedPatch, setCopiedPatch] = useState(false);

  // Sandbox Patch Verification State
  const [isVerifyingPatch, setIsVerifyingPatch] = useState(false);
  const [verificationReport, setVerificationReport] = useState(null);
  const [verificationError, setVerificationError] = useState('');

  // Reproduction Test Generator State
  const [testCode, setTestCode] = useState('');
  const [testDescription, setTestDescription] = useState('');
  const [testFramework, setTestFramework] = useState('auto');
  const [isGeneratingTest, setIsGeneratingTest] = useState(false);
  const [generatedTest, setGeneratedTest] = useState(null);
  const [cleanTestCode, setCleanTestCode] = useState('');
  const [testFileName, setTestFileName] = useState('');
  const [testViewMode, setTestViewMode] = useState('code'); // 'code' or 'report'
  const [testError, setTestError] = useState('');
  const [copiedTest, setCopiedTest] = useState(false);

  // Tab 4: Code Search State
  const [searchRepoId, setSearchRepoId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchError, setSearchError] = useState('');

  // Tab 5: GitHub PR Automation State
  const [githubToken, setGithubToken] = useState(() => localStorage.getItem('bughunter_github_token') || '');
  const [showToken, setShowToken] = useState(false);
  const [githubUser, setGithubUser] = useState(null);
  const [isValidatingToken, setIsValidatingToken] = useState(false);
  const [tokenError, setTokenError] = useState('');

  const [prRepoUrl, setPrRepoUrl] = useState('');
  const [prBaseBranch, setPrBaseBranch] = useState('main');
  const [prBranchName, setPrBranchName] = useState('');
  const [prFilePath, setPrFilePath] = useState('src/index.js');
  const [prFileContent, setPrFileContent] = useState('');
  const [includeTest, setIncludeTest] = useState(true);
  const [prTestFilePath, setPrTestFilePath] = useState('tests/reproduction.test.js');
  const [prTestContent, setPrTestContent] = useState('');
  const [prTitle, setPrTitle] = useState('');
  const [prBody, setPrBody] = useState('');
  const [isGeneratingPrSummary, setIsGeneratingPrSummary] = useState(false);
  const [isCreatingPr, setIsCreatingPr] = useState(false);
  const [prResult, setPrResult] = useState(null);
  const [prError, setPrError] = useState('');

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
        defectModelLoaded: Boolean(data.defect_model_loaded),
        checking: false
      });
    } catch {
      setPythonHealth({ online: false, geminiConfigured: false, defectModelLoaded: false, checking: false });
    }
  };

  // Validate GitHub Token
  const validateToken = async (tokenToValidate) => {
    const t = (tokenToValidate !== undefined ? tokenToValidate : githubToken).trim();
    if (!t) {
      setTokenError('Please enter a GitHub Personal Access Token.');
      return;
    }
    setIsValidatingToken(true);
    setTokenError('');
    try {
      const res = await fetch(`${NODE_API}/api/github/validate-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: t })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Token validation failed');
      }
      setGithubUser(data.user);
      localStorage.setItem('bughunter_github_token', t);
    } catch (err) {
      setGithubUser(null);
      setTokenError(err.message);
    } finally {
      setIsValidatingToken(false);
    }
  };

  // Client-side clean code extraction (strips markdown code blocks)
  const extractCleanCodeClient = (text) => {
    if (!text || typeof text !== 'string') return text || '';
    const trimmed = text.trim();
    const codeBlockRegex = /```(?:[a-zA-Z0-9_\-\+]+)?\r?\n([\s\S]*?)```/g;
    const matches = [...trimmed.matchAll(codeBlockRegex)];
    if (matches.length > 0) {
      const largest = matches.reduce((prev, curr) =>
        curr[1].length > prev[1].length ? curr : prev
      );
      return largest[1].trim();
    }
    if (trimmed.startsWith('```') && trimmed.endsWith('```')) {
      return trimmed.replace(/^```[a-zA-Z0-9_\-\+]*\r?\n/, '').replace(/```$/, '').trim();
    }
    return trimmed;
  };

  // Fetch all indexed repositories from backend
  const loadRepositories = async () => {
    setIsLoadingRepos(true);
    try {
      const res = await fetch(`${NODE_API}/api/repositories`);
      const data = await res.json();
      if (res.ok && data.success) {
        const list = data.repositories || [];
        setRepositories(list);
        if (list.length > 0 && !selectedRepoId) {
          setSelectedRepoId(list[0].id);
          setSearchRepoId(list[0].id);
          setPrRepoUrl(list[0].githubUrl);
          setPrBaseBranch(list[0].defaultBranch || 'main');
        }
      }
    } catch (err) {
      console.warn('⚠️ Could not load repositories list:', err.message);
    } finally {
      setIsLoadingRepos(false);
    }
  };

  // Delete repository and indexed code chunks
  const handleDeleteRepository = async (repoId, repoName, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete indexed repository "${repoName}"? All code chunks will be removed.`)) {
      return;
    }
    try {
      const res = await fetch(`${NODE_API}/api/repositories/${repoId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to delete repository');
      }
      setRepositories(prev => prev.filter(r => r.id !== repoId));
      if (selectedRepoId === repoId) setSelectedRepoId('');
      if (searchRepoId === repoId) setSearchRepoId('');
      if (repoData?.id === repoId) setRepoData(null);
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  // Fetch investigation history from PostgreSQL
  const loadInvestigationHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch(`${NODE_API}/api/bugs/history`);
      const data = await res.json();
      if (res.ok && data.success) {
        setInvestigationHistory(data.history || []);
      }
    } catch (err) {
      console.warn('⚠️ Could not load investigation history:', err.message);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Fetch CodeXGLUE PyTorch model info & benchmark metrics
  const loadDefectModelInfo = async () => {
    try {
      const res = await fetch(`${NODE_API}/api/bugs/defect-model-info`);
      const data = await res.json();
      if (res.ok && data.success) {
        setDefectModelInfo(data);
      }
    } catch {
      // ignore if service offline
    }
  };

  // Run PyTorch CodeXGLUE Bi-GRU Defect Risk Scan
  const handleScanDefect = async (targetCode) => {
    const codeToScan = targetCode || codeSnippet;
    if (!codeToScan || !codeToScan.trim()) return;

    setIsScanningDefect(true);
    setDefectScan(null);
    setDefectScanError('');

    try {
      const res = await fetch(`${NODE_API}/api/bugs/detect-defect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: codeToScan,
          investigationId: currentInvestigationId || undefined
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Defect risk scan failed');
      }
      setDefectScan(data);
      if (currentInvestigationId) loadInvestigationHistory();
    } catch (err) {
      setDefectScanError(err.message);
    } finally {
      setIsScanningDefect(false);
    }
  };

  // Delete an investigation history item
  const handleDeleteHistoryItem = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      const res = await fetch(`${NODE_API}/api/bugs/history/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        setInvestigationHistory(prev => prev.filter(item => item.id !== id));
        if (currentInvestigationId === id) setCurrentInvestigationId(null);
      }
    } catch (err) {
      alert(`Failed to delete history item: ${err.message}`);
    }
  };

  // Restore a saved investigation back into the active workspace
  const handleRestoreInvestigation = (item) => {
    setCurrentInvestigationId(item.id);
    setInvestigationMode(item.mode === 'repo' && item.repositoryId ? 'repo' : 'snippet');
    if (item.repositoryId) {
      setSelectedRepoId(item.repositoryId);
      setSearchRepoId(item.repositoryId);
      const repoMatch = repositories.find(r => r.id === item.repositoryId);
      if (repoMatch) {
        setPrRepoUrl(repoMatch.githubUrl);
        setPrBaseBranch(repoMatch.defaultBranch || 'main');
      }
    }
    if (item.codeContext) {
      setCodeSnippet(item.codeContext);
      setPatchCode(item.codeContext);
      setTestCode(item.codeContext);
    }
    setIssueDescription(item.issueDescription || '');
    setErrorMessage(item.errorMessage || '');
    setPatchDescription(item.issueDescription || '');
    setTestDescription(item.issueDescription || '');

    setBugReport({
      success: true,
      investigationId: item.id,
      issueDescription: item.issueDescription,
      analysis: item.analysis,
      codeContext: item.codeContext,
      relevantFiles: item.relevantFiles || []
    });

    if (item.generatedPatch || item.cleanPatch) {
      setGeneratedPatch(item.generatedPatch || item.cleanPatch);
      setCleanPatchCode(item.cleanPatch || extractCleanCodeClient(item.generatedPatch));
    } else {
      setGeneratedPatch(null);
      setCleanPatchCode('');
    }

    if (item.generatedTest) {
      setGeneratedTest(item.generatedTest);
      setCleanTestCode(extractCleanCodeClient(item.generatedTest));
    } else {
      setGeneratedTest(null);
      setCleanTestCode('');
    }

    setVerificationReport(item.verificationReport || null);
    setDefectScan(
      item.defectScore !== null && item.defectScore !== undefined
        ? {
            model_loaded: true,
            architecture: 'BugHunterBiGRU (PyTorch Bidirectional GRU)',
            defect_probability: item.defectScore,
            defect_percentage: Math.round(item.defectScore * 1000) / 10,
            risk_level: item.defectRiskLevel || 'MEDIUM',
            is_defective: item.defectScore >= 0.5
          }
        : null
    );

    setActiveTab('investigate');
  };

  useEffect(() => {
    checkHealth();
    loadRepositories();
    loadInvestigationHistory();
    loadDefectModelInfo();
    const savedToken = localStorage.getItem('bughunter_github_token');
    if (savedToken) {
      validateToken(savedToken);
    }
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
      setPrRepoUrl(data.repository.githubUrl);
      setPrBaseBranch(data.repository.defaultBranch || 'main');
      setPrBranchName(`bughunter/fix-${Date.now().toString().slice(-6)}`);
      setInvestigationMode('repo');
      setIssueDescription('');
      await loadRepositories();
    } catch (err) {
      setRepoError(err.message);
    } finally {
      setIsAnalyzingRepo(false);
    }
  };

  // Generate PR Title & Description with AI
  const handleGeneratePrSummary = async () => {
    setIsGeneratingPrSummary(true);
    setPrError('');
    try {
      const res = await fetch(`${NODE_API}/api/github/generate-pr-summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repositoryId: selectedRepoId || undefined,
          repoUrl: prRepoUrl || repoUrl,
          issueDescription: patchDescription || issueDescription,
          analysis: bugReport?.analysis,
          patch: prFileContent,
          test: includeTest ? prTestContent : undefined
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to generate PR summary');
      }
      setPrTitle(data.title);
      let finalBody = data.description;
      if (verificationReport) {
        finalBody += `\n\n### 🛡️ Autonomous Sandbox Verification Proof\n`;
        finalBody += `- **Verdict**: \`${verificationReport.verdict}\`\n`;
        finalBody += `- **Stage 1 (Original Buggy Code)**: ${verificationReport.buggyRun?.passed ? 'PASSED' : '❌ FAILED (Bug Reproduced)'} (${verificationReport.buggyRun?.durationMs}ms)\n`;
        finalBody += `- **Stage 2 (Patched Code)**: ${verificationReport.patchedRun?.passed ? '✅ PASSED (All Assertions Green)' : '❌ FAILED'} (${verificationReport.patchedRun?.durationMs}ms)\n`;
      }
      setPrBody(finalBody);
    } catch (err) {
      setPrError(err.message);
    } finally {
      setIsGeneratingPrSummary(false);
    }
  };

  // Submit Pull Request to GitHub
  const handleCreatePullRequest = async (e) => {
    if (e) e.preventDefault();
    if (!prRepoUrl) {
      setPrError('Target repository URL is required.');
      return;
    }
    if (!prFileContent) {
      setPrError('Patched file content cannot be empty.');
      return;
    }

    setIsCreatingPr(true);
    setPrError('');
    setPrResult(null);

    try {
      const filesToCommit = [
        {
          path: prFilePath || 'src/fix.js',
          content: prFileContent,
          message: `fix(BugHunter): patch ${prFilePath || 'code'}`
        }
      ];

      if (includeTest && prTestContent) {
        filesToCommit.push({
          path: prTestFilePath || 'tests/reproduction.test.js',
          content: prTestContent,
          message: `test(BugHunter): add reproduction unit test`
        });
      }

      const res = await fetch(`${NODE_API}/api/github/create-pr`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-github-token': githubToken
        },
        body: JSON.stringify({
          investigationId: currentInvestigationId || undefined,
          repositoryId: selectedRepoId || undefined,
          repoUrl: prRepoUrl,
          baseBranch: prBaseBranch || 'main',
          branchName: prBranchName || `bughunter/fix-${Date.now().toString().slice(-6)}`,
          title: prTitle || `fix: resolve issue reported to BugHunter AI`,
          body: prBody,
          files: filesToCommit
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to create Pull Request');
      }

      setPrResult(data.pullRequest);
      loadInvestigationHistory();
    } catch (err) {
      setPrError(err.message);
    } finally {
      setIsCreatingPr(false);
    }
  };

  // Bridge from Patch tab to PR tab
  const sendToPrTab = () => {
    const targetUrl = repoData?.githubUrl || repoUrl || prRepoUrl || '';
    setPrRepoUrl(targetUrl);
    setPrBaseBranch(repoData?.defaultBranch || 'main');
    setPrBranchName(`bughunter/fix-${Date.now().toString().slice(-6)}`);
    
    const fileHint = bugReport?.relevantFiles?.[0]?.filePath || (repoData ? 'src/index.js' : 'src/fixed-code.js');
    setPrFilePath(fileHint);

    // Always commit pure executable code (not markdown fences or explanations)
    const cleanCode = cleanPatchCode || extractCleanCodeClient(generatedPatch) || patchCode;
    setPrFileContent(cleanCode);

    if (generatedTest) {
      const cleanTest = cleanTestCode || extractCleanCodeClient(generatedTest) || testCode;
      setPrTestContent(cleanTest);
      if (testFileName) {
        setPrTestFilePath(testFileName);
      }
      setIncludeTest(true);
    } else if (verificationReport?.testAssertions) {
      setPrTestContent(verificationReport.testAssertions);
      setPrTestFilePath(verificationReport.language === 'python' ? 'tests/test_reproduction.py' : 'tests/reproduction.test.js');
      setIncludeTest(true);
    }

    setPrTitle(`fix: autonomous resolution for "${(patchDescription || issueDescription || 'bug').slice(0, 45)}"`);
    setActiveTab('pr');
  };

  // Bridge from Test tab to PR tab
  const sendTestToPrTab = () => {
    const cleanTest = cleanTestCode || extractCleanCodeClient(generatedTest) || testCode;
    setPrTestContent(cleanTest);
    if (testFileName) {
      setPrTestFilePath(testFileName);
    }
    setIncludeTest(true);
    setActiveTab('pr');
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
      if (data.investigationId) {
        setCurrentInvestigationId(data.investigationId);
      }
      loadInvestigationHistory();
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
    setVerificationReport(null);
    setVerificationError('');
    setPatchError('');

    try {
      const res = await fetch(`${NODE_API}/api/bugs/patch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          investigationId: currentInvestigationId || undefined,
          code: patchCode,
          issueDescription: patchDescription
        })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Patch generation failed');
      }

      setGeneratedPatch(data.patch);
      setCleanPatchCode(data.cleanCode || extractCleanCodeClient(data.patch));
      setPatchViewMode('code');
      loadInvestigationHistory();
    } catch (err) {
      setPatchError(err.message);
    } finally {
      setIsPatching(false);
    }
  };

  // Handle Dual-Stage Sandbox Verification (Buggy FAIL -> Patched PASS)
  const handleVerifyPatch = async (overrideBuggy, overridePatched, overrideDesc) => {
    const buggy = overrideBuggy || patchCode || codeSnippet;
    const patched = overridePatched || cleanPatchCode || extractCleanCodeClient(generatedPatch);
    const desc = overrideDesc || patchDescription || issueDescription;

    if (!buggy || !patched) {
      setVerificationError('Both original buggy code and patched code are required for sandbox verification.');
      return;
    }

    setIsVerifyingPatch(true);
    setVerificationReport(null);
    setVerificationError('');

    try {
      const res = await fetch(`${NODE_API}/api/bugs/verify-patch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          investigationId: currentInvestigationId || undefined,
          buggyCode: buggy,
          patchedCode: patched,
          issueDescription: desc,
          testCode: cleanTestCode || generatedTest || undefined
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || 'Sandbox verification failed');
      }

      setVerificationReport(data);
      loadInvestigationHistory();
    } catch (err) {
      setVerificationError(err.message);
    } finally {
      setIsVerifyingPatch(false);
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
          investigationId: currentInvestigationId || undefined,
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
      setCleanTestCode(data.cleanTest || extractCleanCodeClient(data.test));
      if (data.testFileName) {
        setTestFileName(data.testFileName);
        setPrTestFilePath(data.testFileName);
      }
      setTestViewMode('code');
      loadInvestigationHistory();
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
          <div className="status-pill">
            <BrainCircuit size={14} color={pythonHealth.defectModelLoaded ? '#34d399' : '#fbbf24'} />
            PyTorch Bi-GRU: {pythonHealth.defectModelLoaded ? 'Ready' : 'Not Loaded'}
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
        <button
          className={`tab-btn ${activeTab === 'pr' ? 'active' : ''}`}
          onClick={() => setActiveTab('pr')}
        >
          <GitPullRequest size={17} />
          GitHub PR Automation
        </button>
        <button
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('history');
            loadInvestigationHistory();
          }}
        >
          <History size={17} />
          History ({investigationHistory.length})
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label className="form-label" style={{ marginBottom: 0 }}>Select Indexed Repository</label>
                      <button
                        type="button"
                        onClick={loadRepositories}
                        className="btn-secondary"
                        style={{ padding: '2px 8px', fontSize: '0.72rem' }}
                        title="Reload Repositories"
                      >
                        <RefreshCw size={11} className={isLoadingRepos ? 'animate-spin' : ''} /> Refresh
                      </button>
                    </div>

                    <select
                      className="form-select"
                      value={selectedRepoId}
                      onChange={(e) => {
                        const id = e.target.value;
                        setSelectedRepoId(id);
                        const chosen = repositories.find(r => r.id === id);
                        if (chosen) {
                          setSearchRepoId(chosen.id);
                          setPrRepoUrl(chosen.githubUrl);
                          setPrBaseBranch(chosen.defaultBranch || 'main');
                        }
                      }}
                      required
                    >
                      <option value="">-- Choose an Indexed Repository --</option>
                      {repositories.map(repo => (
                        <option key={repo.id} value={repo.id}>
                          {repo.name} ({repo.owner || 'GitHub'}) • {repo.totalFiles} files
                        </option>
                      ))}
                    </select>

                    {repositories.length === 0 && !isLoadingRepos ? (
                      <small style={{ color: 'var(--accent-amber)', fontSize: '0.75rem', display: 'block', marginTop: '6px' }}>
                        ⚠️ No repositories indexed yet. <a href="#" onClick={(e) => { e.preventDefault(); setActiveTab('repo'); }} style={{ color: 'var(--accent-cyan)', textDecoration: 'underline' }}>Index a repository in Repository Intelligence</a>.
                      </small>
                    ) : (
                      <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block', marginTop: '4px' }}>
                        {selectedRepoId ? `Selected: ${repositories.find(r => r.id === selectedRepoId)?.name || selectedRepoId}` : 'RAG will search the indexed vector store for this repository.'}
                      </small>
                    )}
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

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={isHunting || (!pythonHealth.online && !nodeHealth.online)}
                    style={{ flex: 2, minWidth: '200px', justifyContent: 'center' }}
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
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={isScanningDefect || (investigationMode === 'snippet' && !codeSnippet.trim()) || (investigationMode === 'repo' && !bugReport?.codeContext)}
                    onClick={() => handleScanDefect(investigationMode === 'repo' ? bugReport?.codeContext : codeSnippet)}
                    title="Run local CodeXGLUE PyTorch Bi-GRU defect classifier"
                    style={{ flex: 1, minWidth: '170px', justifyContent: 'center', borderColor: 'rgba(56, 189, 248, 0.4)' }}
                  >
                    {isScanningDefect ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        Scanning...
                      </>
                    ) : (
                      <>
                        <BrainCircuit size={16} color="#38bdf8" />
                        ML Defect Scan
                      </>
                    )}
                  </button>
                </div>

                {defectScanError && (
                  <div className="toast-msg toast-error" style={{ marginTop: '12px' }}>
                    <AlertCircle size={18} />
                    <span>{defectScanError}</span>
                  </div>
                )}
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
                    AI diagnostic breakdown, ML defect score, and reproduction test scenarios.
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

              {/* CodeXGLUE PyTorch ML Defect Risk Card */}
              {defectScan && (
                <div className="defect-scan-card animate-fade-in" style={{ marginBottom: '18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                      <BrainCircuit size={18} color="#38bdf8" />
                      <span>PyTorch Bi-GRU Defect Risk Score</span>
                    </div>
                    <span className={`stage-pill ${
                      defectScan.risk_level === 'HIGH'
                        ? 'pill-fail'
                        : defectScan.risk_level === 'MEDIUM'
                        ? 'pill-warn'
                        : 'pill-pass'
                    }`}>
                      {defectScan.risk_level} RISK ({defectScan.defect_percentage}%)
                    </span>
                  </div>

                  <div className="risk-bar-track">
                    <div
                      className="risk-bar-fill"
                      style={{
                        width: `${Math.min(100, Math.max(4, defectScan.defect_percentage || 0))}%`,
                        background:
                          defectScan.risk_level === 'HIGH'
                            ? 'linear-gradient(90deg, #f59e0b, #f43f5e)'
                            : defectScan.risk_level === 'MEDIUM'
                            ? 'linear-gradient(90deg, #38bdf8, #f59e0b)'
                            : 'linear-gradient(90deg, #10b981, #38bdf8)'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginTop: '10px', fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                    <span>Model: <strong>{defectScan.architecture}</strong></span>
                    <span>Tokens Analyzed: <strong>{defectScan.token_count || '—'}</strong></span>
                    {(defectScan.training_metrics || defectModelInfo?.training_metrics) && (
                      <span>
                        CodeXGLUE Benchmark Acc:{' '}
                        <strong>
                          {((defectScan.training_metrics || defectModelInfo?.training_metrics).accuracy * 100).toFixed(1)}%
                        </strong>{' '}
                        • F1:{' '}
                        <strong>
                          {(defectScan.training_metrics || defectModelInfo?.training_metrics).f1.toFixed(2)}
                        </strong>
                      </span>
                    )}
                  </div>
                </div>
              )}

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

              {!isHunting && !bugReport && !defectScan && (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                  <Bug size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
                  <p>No investigation run yet.</p>
                  <p style={{ fontSize: '0.82rem', marginTop: '4px' }}>
                    Enter code or select a repository and click "Hunt & Investigate Bug" or "ML Defect Scan".
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
                  {/* Clean Code vs AI Report Switcher */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div className="sub-tab-group">
                      <button
                        type="button"
                        className={`sub-tab-btn ${patchViewMode === 'code' ? 'active' : ''}`}
                        onClick={() => setPatchViewMode('code')}
                      >
                        <FileCode2 size={13} /> Pure Fixed Code (PR-Ready)
                      </button>
                      <button
                        type="button"
                        className={`sub-tab-btn ${patchViewMode === 'report' ? 'active' : ''}`}
                        onClick={() => setPatchViewMode('report')}
                      >
                        <BookOpen size={13} /> AI Explanation & Diff
                      </button>
                    </div>

                    <span style={{ fontSize: '0.72rem', color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <FileCheck size={13} /> Sanitized For Git
                    </span>
                  </div>

                  <div className="code-container">
                    <div className="code-header">
                      <span>{patchViewMode === 'code' ? '⚡ Clean Executable Source Code' : '🛠️ Full AI Analysis & Reasoning'}</span>
                      <button
                        className="btn-secondary"
                        style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                        onClick={() => {
                          const textToCopy = patchViewMode === 'code'
                            ? (cleanPatchCode || extractCleanCodeClient(generatedPatch))
                            : generatedPatch;
                          copyToClipboard(textToCopy);
                        }}
                      >
                        {copiedPatch ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                        {patchViewMode === 'code' ? 'Copy Pure Code' : 'Copy Report'}
                      </button>
                    </div>
                    <div className={`code-content ${patchViewMode === 'code' ? 'code-block' : 'markdown-report'}`}>
                      {patchViewMode === 'code'
                        ? (cleanPatchCode || extractCleanCodeClient(generatedPatch))
                        : generatedPatch}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '14px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn-primary"
                      style={{
                        flex: 1,
                        minWidth: '180px',
                        justifyContent: 'center',
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                      }}
                      disabled={isVerifyingPatch}
                      onClick={() => handleVerifyPatch()}
                    >
                      {isVerifyingPatch ? (
                        <>
                          <RefreshCw size={16} className="animate-spin" />
                          Running Sandbox...
                        </>
                      ) : (
                        <>
                          <Play size={16} />
                          Verify Patch in Sandbox
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      className="btn-primary"
                      style={{ flex: 1, minWidth: '180px', justifyContent: 'center' }}
                      onClick={sendToPrTab}
                    >
                      <GitPullRequest size={16} /> Open GitHub Pull Request
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={sendToTestTab}
                      style={{ padding: '8px 14px' }}
                    >
                      <FlaskConical size={16} /> Test
                    </button>
                  </div>

                  {/* Verification Error */}
                  {verificationError && (
                    <div className="toast-msg toast-error" style={{ marginTop: '14px' }}>
                      <AlertCircle size={18} />
                      <span>{verificationError}</span>
                    </div>
                  )}

                  {/* Dual-Stage Sandbox Verification Panel */}
                  {verificationReport && (
                    <div className="sandbox-report-card animate-fade-in" style={{ marginTop: '18px' }}>
                      <div className={`sandbox-verdict-banner ${
                        verificationReport.verdict === 'VERIFIED_PASS'
                          ? 'verdict-pass'
                          : verificationReport.verdict === 'DID_NOT_REPRODUCE'
                          ? 'verdict-warn'
                          : 'verdict-fail'
                      }`}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '0.9rem' }}>
                          {verificationReport.verdict === 'VERIFIED_PASS' ? (
                            <ShieldCheck size={18} />
                          ) : (
                            <ShieldAlert size={18} />
                          )}
                          <span>
                            {verificationReport.verdict === 'VERIFIED_PASS'
                              ? 'SWE-VERIFIED FIX: Bug Reproduced & Resolved'
                              : verificationReport.verdict === 'DID_NOT_REPRODUCE'
                              ? 'WARNING: Patched Passed, Baseline Also Passed'
                              : 'VERIFICATION FAILED: Patched Code Failed Tests'}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.75rem', opacity: 0.9, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={12} /> {verificationReport.totalDurationMs}ms ({verificationReport.language})
                        </span>
                      </div>

                      <div className="sandbox-stages-grid">
                        {/* Stage 1: Buggy Baseline */}
                        <div className="sandbox-stage-box">
                          <div className="sandbox-stage-header">
                            <span style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                              Stage 1: Original Buggy Code
                            </span>
                            <span className={`stage-pill ${!verificationReport.buggyRun?.passed ? 'pill-expected-fail' : 'pill-warn'}`}>
                              {!verificationReport.buggyRun?.passed ? '❌ FAILED (Reproduced)' : '⚠️ PASSED'}
                            </span>
                          </div>
                          <div className="sandbox-test-list">
                            {(verificationReport.buggyRun?.testResults || []).map((t, i) => (
                              <div key={i} className="sandbox-test-item">
                                {t.passed ? (
                                  <CheckCircle2 size={14} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
                                ) : (
                                  <XCircle size={14} color="#f43f5e" style={{ flexShrink: 0, marginTop: '2px' }} />
                                )}
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: '0.76rem', color: 'var(--text-primary)' }}>{t.name}</div>
                                  {t.error && (
                                    <div style={{ fontSize: '0.7rem', color: '#fda4af', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                                      {t.error}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                            Exit Code: {verificationReport.buggyRun?.exitCode} • {verificationReport.buggyRun?.durationMs}ms
                          </div>
                        </div>

                        {/* Stage 2: Patched Fix */}
                        <div className="sandbox-stage-box">
                          <div className="sandbox-stage-header">
                            <span style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                              Stage 2: Patched Fixed Code
                            </span>
                            <span className={`stage-pill ${verificationReport.patchedRun?.passed ? 'pill-pass' : 'pill-fail'}`}>
                              {verificationReport.patchedRun?.passed ? '✅ PASSED (Fixed)' : '❌ FAILED'}
                            </span>
                          </div>
                          <div className="sandbox-test-list">
                            {(verificationReport.patchedRun?.testResults || []).map((t, i) => (
                              <div key={i} className="sandbox-test-item">
                                {t.passed ? (
                                  <CheckCircle2 size={14} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
                                ) : (
                                  <XCircle size={14} color="#f43f5e" style={{ flexShrink: 0, marginTop: '2px' }} />
                                )}
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: '0.76rem', color: 'var(--text-primary)' }}>{t.name}</div>
                                  {t.error && (
                                    <div style={{ fontSize: '0.7rem', color: '#fda4af', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                                      {t.error}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                            Exit Code: {verificationReport.patchedRun?.exitCode} • {verificationReport.patchedRun?.durationMs}ms
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
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
                  {/* Clean Test vs Full Report Switcher */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div className="sub-tab-group">
                      <button
                        type="button"
                        className={`sub-tab-btn ${testViewMode === 'code' ? 'active' : ''}`}
                        onClick={() => setTestViewMode('code')}
                      >
                        <FileCode2 size={13} /> Runnable Test Code
                      </button>
                      <button
                        type="button"
                        className={`sub-tab-btn ${testViewMode === 'report' ? 'active' : ''}`}
                        onClick={() => setTestViewMode('report')}
                      >
                        <BookOpen size={13} /> Full Instructions
                      </button>
                    </div>

                    {testFileName && (
                      <span className="branch-pill" style={{ fontSize: '0.72rem', color: '#a78bfa' }}>
                        📁 {testFileName}
                      </span>
                    )}
                  </div>

                  <div className="code-container">
                    <div className="code-header">
                      <span>{testViewMode === 'code' ? '🧪 Executable Reproduction Test' : '📋 Assertion Details & Setup'}</span>
                      <button
                        className="btn-secondary"
                        style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                        onClick={() => {
                          const textToCopy = testViewMode === 'code'
                            ? (cleanTestCode || extractCleanCodeClient(generatedTest))
                            : generatedTest;
                          navigator.clipboard.writeText(textToCopy);
                          setCopiedTest(true);
                          setTimeout(() => setCopiedTest(false), 2000);
                        }}
                      >
                        {copiedTest ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                        {testViewMode === 'code' ? 'Copy Pure Test' : 'Copy Report'}
                      </button>
                    </div>
                    <div className={`code-content ${testViewMode === 'code' ? 'code-block' : 'markdown-report'}`}>
                      {testViewMode === 'code'
                        ? (cleanTestCode || extractCleanCodeClient(generatedTest))
                        : generatedTest}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
                    <button
                      type="button"
                      className="btn-primary"
                      style={{ flex: 1, justifyContent: 'center' }}
                      onClick={sendTestToPrTab}
                    >
                      <GitPullRequest size={16} /> Attach Test to GitHub PR
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={sendToPatchTab}
                      style={{ padding: '8px 14px' }}
                    >
                      <Zap size={16} /> Generate Patch
                    </button>
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

            {/* Indexed Repositories Library */}
            <div style={{ marginTop: '30px', borderTop: '1px solid var(--border-subtle)', paddingTop: '22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                    <Database size={18} color="var(--accent-cyan)" />
                    Indexed Repositories Library ({repositories.length})
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
                    Codebases parsed, chunked, and vector-embedded in PostgreSQL pgvector.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={loadRepositories}
                  className="btn-secondary"
                  disabled={isLoadingRepos}
                  style={{ fontSize: '0.78rem', padding: '6px 12px' }}
                >
                  <RefreshCw size={14} className={isLoadingRepos ? 'animate-spin' : ''} /> Refresh Library
                </button>
              </div>

              {repositories.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', background: 'rgba(15, 23, 42, 0.4)', borderRadius: 'var(--radius-md)' }}>
                  No repositories indexed yet. Enter a GitHub URL above to clone and index your first repository!
                </div>
              ) : (
                <div className="repo-library-grid">
                  {repositories.map(repo => (
                    <div key={repo.id} className="repo-library-card">
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <h4 style={{ fontSize: '1rem', color: 'var(--text-primary)', margin: 0, fontWeight: 700 }}>
                            {repo.name}
                          </h4>
                          <span className="branch-pill">{repo.defaultBranch || 'main'}</span>
                        </div>
                        <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '4px', wordBreak: 'break-all' }}>
                          {repo.githubUrl}
                        </p>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '10px' }}>
                          <span className="lang-badge">📁 {repo.totalFiles} files</span>
                          {repo.languages && Object.keys(repo.languages).slice(0, 2).map((lang, lIdx) => (
                            <span key={lIdx} className="lang-badge">
                              {lang}: {repo.languages[lang]}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', marginTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px' }}>
                        <button
                          type="button"
                          className="btn-primary"
                          style={{ flex: 1, fontSize: '0.75rem', padding: '6px 10px', justifyContent: 'center' }}
                          onClick={() => {
                            setSelectedRepoId(repo.id);
                            setSearchRepoId(repo.id);
                            setPrRepoUrl(repo.githubUrl);
                            setPrBaseBranch(repo.defaultBranch || 'main');
                            setInvestigationMode('repo');
                            setActiveTab('investigate');
                          }}
                        >
                          <Bug size={13} /> Investigate
                        </button>
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ fontSize: '0.75rem', padding: '6px 10px' }}
                          title="Semantic Search"
                          onClick={() => {
                            setSearchRepoId(repo.id);
                            setActiveTab('search');
                          }}
                        >
                          <Search size={13} /> Search
                        </button>
                        <button
                          type="button"
                          className="btn-danger"
                          title="Delete Repository and Chunks"
                          onClick={(e) => handleDeleteRepository(repo.id, repo.name, e)}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>Target Indexed Repository</label>
                  <button
                    type="button"
                    onClick={loadRepositories}
                    className="btn-secondary"
                    style={{ padding: '2px 8px', fontSize: '0.72rem' }}
                    title="Reload Repositories"
                  >
                    <RefreshCw size={11} className={isLoadingRepos ? 'animate-spin' : ''} /> Refresh
                  </button>
                </div>
                <select
                  className="form-select"
                  value={searchRepoId}
                  onChange={(e) => setSearchRepoId(e.target.value)}
                  required
                >
                  <option value="">-- Choose an Indexed Repository to Search --</option>
                  {repositories.map(repo => (
                    <option key={repo.id} value={repo.id}>
                      {repo.name} ({repo.owner || 'GitHub'}) • {repo.totalFiles} files
                    </option>
                  ))}
                </select>
                {repositories.length === 0 && !isLoadingRepos && (
                  <small style={{ color: 'var(--accent-amber)', fontSize: '0.75rem', display: 'block', marginTop: '6px' }}>
                    ⚠️ No repositories indexed yet. <a href="#" onClick={(e) => { e.preventDefault(); setActiveTab('repo'); }} style={{ color: 'var(--accent-cyan)', textDecoration: 'underline' }}>Index one first</a>.
                  </small>
                )}
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

        {/* ======================================================== */}
        {/* TAB 5: GITHUB PULL REQUEST AUTOMATION */}
        {/* ======================================================== */}
        {activeTab === 'pr' && (
          <div>
            {/* PR Success Hero Banner */}
            {prResult && (
              <div className="pr-success-hero animate-fade-in">
                <div className="pr-hero-header">
                  <div className="pr-hero-title">
                    <CheckCircle2 size={28} color="#10b981" />
                    <div>
                      <div>Pull Request #{prResult.number} Successfully Created!</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-secondary)', marginTop: '4px' }}>
                        {prResult.title}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <a
                      href={prResult.htmlUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="pr-link-btn"
                    >
                      <ExternalLink size={16} />
                      View Pull Request on GitHub
                    </a>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setPrResult(null)}
                    >
                      Create Another PR
                    </button>
                  </div>
                </div>

                <div className="pr-meta-row">
                  <div className="pr-meta-item">
                    <span>Base:</span>
                    <span className="branch-pill">{prResult.base}</span>
                  </div>
                  <ArrowRight size={14} color="var(--text-muted)" />
                  <div className="pr-meta-item">
                    <span>Head:</span>
                    <span className="branch-pill">{prResult.head}</span>
                  </div>
                  <div className="pr-meta-item">
                    <span>Status:</span>
                    <span className="brand-tag" style={{ color: '#34d399', borderColor: 'rgba(16, 185, 129, 0.4)' }}>
                      {prResult.state.toUpperCase()}
                    </span>
                  </div>
                  {prResult.isFork && (
                    <div className="pr-meta-item">
                      <GitFork size={14} color="#a855f7" />
                      <span style={{ color: '#c084fc' }}>Forked to {prResult.forkRepo}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Sandbox Verification Badge Banner in PR Tab */}
            {verificationReport && (
              <div
                className={`sandbox-verdict-banner animate-fade-in ${
                  verificationReport.verdict === 'VERIFIED_PASS'
                    ? 'verdict-pass'
                    : verificationReport.verdict === 'DID_NOT_REPRODUCE'
                    ? 'verdict-warn'
                    : 'verdict-fail'
                }`}
                style={{ marginBottom: '18px', borderRadius: 'var(--radius-md)' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '0.88rem' }}>
                  <ShieldCheck size={18} />
                  <span>
                    {verificationReport.verdict === 'VERIFIED_PASS'
                      ? 'Patch Verified in Isolated Sandbox: Baseline Failed (Reproduced) ➔ Patched Passed'
                      : `Sandbox Verdict: ${verificationReport.verdictSummary}`}
                  </span>
                </div>
                <span style={{ fontSize: '0.75rem', opacity: 0.9 }}>
                  {verificationReport.totalDurationMs}ms ({verificationReport.language})
                </span>
              </div>
            )}

            <div className="grid-2">
              {/* Left Column: Repository & Files Configuration */}
              <div className="glass-panel card-padding">
                <div className="section-header">
                  <div className="section-title">
                    <GitPullRequest size={20} color="#10b981" />
                    Target Repository & Credentials
                  </div>
                  <div className="section-desc">
                    Authenticate with GitHub and specify the destination repository, branch, and files to commit.
                  </div>
                </div>

                {/* GitHub Authentication Box */}
                <div className="form-group" style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label className="form-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Key size={14} color="#818cf8" />
                      GitHub Personal Access Token (PAT)
                    </label>
                    {githubUser && (
                      <div className="pr-badge-auth">
                        {githubUser.avatarUrl && <img src={githubUser.avatarUrl} alt={githubUser.login} className="pr-avatar" />}
                        <ShieldCheck size={14} />
                        <span>@{githubUser.login}</span>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <input
                        type={showToken ? 'text' : 'password'}
                        className="form-input"
                        style={{ paddingRight: '40px' }}
                        value={githubToken}
                        onChange={(e) => setGithubToken(e.target.value)}
                        placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                      />
                      <button
                        type="button"
                        onClick={() => setShowToken(!showToken)}
                        style={{
                          position: 'absolute',
                          right: '10px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>

                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => validateToken()}
                      disabled={isValidatingToken || !githubToken}
                      style={{ minWidth: '95px', justifyContent: 'center' }}
                    >
                      {isValidatingToken ? <RefreshCw size={14} className="animate-spin" /> : 'Verify'}
                    </button>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                    Token needs <code>repo</code> permissions. Stored securely in your browser.
                  </div>
                  {tokenError && (
                    <div className="toast-msg toast-error" style={{ marginTop: '10px', padding: '8px 12px', fontSize: '0.8rem' }}>
                      <AlertCircle size={14} />
                      <span>{tokenError}</span>
                    </div>
                  )}
                </div>

                {/* Target Repository URL */}
                <div className="form-group">
                  <label className="form-label">Destination Repository URL</label>
                  <input
                    type="text"
                    className="form-input"
                    value={prRepoUrl}
                    onChange={(e) => setPrRepoUrl(e.target.value)}
                    placeholder="https://github.com/owner/repository"
                    required
                  />
                </div>

                {/* Branch Configuration */}
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Base Branch</label>
                    <input
                      type="text"
                      className="form-input"
                      value={prBaseBranch}
                      onChange={(e) => setPrBaseBranch(e.target.value)}
                      placeholder="main"
                      required
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1.5 }}>
                    <label className="form-label">New Feature Branch</label>
                    <input
                      type="text"
                      className="form-input"
                      value={prBranchName}
                      onChange={(e) => setPrBranchName(e.target.value)}
                      placeholder="bughunter/fix-issue"
                      required
                    />
                  </div>
                </div>

                {/* Patched File */}
                <div className="form-group">
                  <label className="form-label">Patched File Path in Repository</label>
                  <input
                    type="text"
                    className="form-input"
                    value={prFilePath}
                    onChange={(e) => setPrFilePath(e.target.value)}
                    placeholder="e.g. src/utils/calculator.js or app/main.py"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Patched Source Code</label>
                  <textarea
                    className="form-textarea"
                    rows={7}
                    value={prFileContent}
                    onChange={(e) => setPrFileContent(e.target.value)}
                    placeholder="// Full corrected code to commit to this file..."
                    required
                  />
                </div>

                {/* Reproduction Test Attachment Toggle */}
                <div style={{ marginTop: '14px', padding: '14px', background: 'rgba(15, 23, 42, 0.4)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem' }}>
                    <input
                      type="checkbox"
                      checked={includeTest}
                      onChange={(e) => setIncludeTest(e.target.checked)}
                      style={{ width: '16px', height: '16px', accentColor: 'var(--accent-indigo)' }}
                    />
                    Include Executable Reproduction Unit Test in PR
                  </label>

                  {includeTest && (
                    <div style={{ marginTop: '12px' }}>
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.8rem' }}>Test File Path</label>
                        <input
                          type="text"
                          className="form-input"
                          value={prTestFilePath}
                          onChange={(e) => setPrTestFilePath(e.target.value)}
                          placeholder="e.g. tests/reproduction.test.js or test_bug.py"
                        />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.8rem' }}>Test Code</label>
                        <textarea
                          className="form-textarea"
                          rows={6}
                          value={prTestContent}
                          onChange={(e) => setPrTestContent(e.target.value)}
                          placeholder="// Executable test code that reproduces bug and verifies fix..."
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Pull Request Review & Submit */}
              <div className="glass-panel card-padding">
                <div className="section-header">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <div className="section-title">
                      <Sparkles size={20} color="#818cf8" />
                      Pull Request Summary
                    </div>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={handleGeneratePrSummary}
                      disabled={isGeneratingPrSummary}
                      style={{ fontSize: '0.78rem', padding: '6px 12px' }}
                    >
                      {isGeneratingPrSummary ? (
                        <>
                          <RefreshCw size={13} className="animate-spin" />
                          Synthesizing...
                        </>
                      ) : (
                        <>
                          <Sparkles size={13} color="#818cf8" />
                          Synthesize with AI
                        </>
                      )}
                    </button>
                  </div>
                  <div className="section-desc">
                    Review and customize the PR title and Markdown description before submitting.
                  </div>
                </div>

                <form onSubmit={handleCreatePullRequest}>
                  <div className="form-group">
                    <label className="form-label">Pull Request Title</label>
                    <input
                      type="text"
                      className="form-input"
                      value={prTitle}
                      onChange={(e) => setPrTitle(e.target.value)}
                      placeholder="fix(scope): concise description of fix"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Pull Request Description (Markdown)</label>
                    <textarea
                      className="form-textarea"
                      rows={14}
                      value={prBody}
                      onChange={(e) => setPrBody(e.target.value)}
                      placeholder="## 🐛 Bug Fix Summary&#10;&#10;### Root Cause&#10;...&#10;&#10;### Changes Implemented&#10;...&#10;&#10;### Verification Test&#10;..."
                      required
                    />
                  </div>

                  {prError && (
                    <div className="toast-msg toast-error">
                      <AlertCircle size={18} />
                      <span>{prError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={isCreatingPr || !prRepoUrl || !prFileContent}
                    style={{ width: '100%', padding: '14px', fontSize: '1rem', marginTop: '12px', justifyContent: 'center' }}
                  >
                    {isCreatingPr ? (
                      <>
                        <RefreshCw size={18} className="animate-spin" />
                        Branching, Committing & Opening Pull Request...
                      </>
                    ) : (
                      <>
                        <GitPullRequest size={18} />
                        Submit Pull Request to GitHub
                      </>
                    )}
                  </button>

                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '10px' }}>
                    If you don't have direct write access to the target repository, BugHunter AI will automatically fork the repository to your account and submit the PR upstream.
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 7: INVESTIGATION & PR HISTORY */}
        {/* ======================================================== */}
        {activeTab === 'history' && (
          <div className="glass-panel card-padding">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
              <div className="section-header" style={{ marginBottom: 0 }}>
                <div className="section-title">
                  <History size={20} color="#38bdf8" />
                  Bug Investigation & Repair History ({investigationHistory.length})
                </div>
                <div className="section-desc">
                  Persistent PostgreSQL audit trail of past investigations, ML defect scans, sandbox verifications, and opened GitHub Pull Requests.
                </div>
              </div>
              <button
                type="button"
                className="btn-secondary"
                onClick={loadInvestigationHistory}
                disabled={isLoadingHistory}
              >
                <RefreshCw size={15} className={isLoadingHistory ? 'animate-spin' : ''} /> Refresh History
              </button>
            </div>

            {investigationHistory.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                <History size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
                <p>No investigations recorded yet.</p>
                <p style={{ fontSize: '0.82rem', marginTop: '4px' }}>
                  Run a bug hunt in the Investigation Agent tab and it will automatically be saved here.
                </p>
              </div>
            ) : (
              <div className="history-list">
                {investigationHistory.map((item) => (
                  <div key={item.id} className="history-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                      <div style={{ flex: 1, minWidth: '240px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                          <span className={`stage-pill ${
                            item.status === 'PR_CREATED' || item.status === 'VERIFIED'
                              ? 'pill-pass'
                              : item.status === 'PATCHED'
                              ? 'pill-warn'
                              : 'pill-info'
                          }`}>
                            {item.status}
                          </span>
                          <span className="branch-pill">
                            {item.mode === 'repo' ? `📁 ${item.repositoryName || 'Repository RAG'}` : '⚡ Code Snippet'}
                          </span>
                          {item.defectScore !== null && item.defectScore !== undefined && (
                            <span className={`stage-pill ${
                              item.defectRiskLevel === 'HIGH' ? 'pill-fail' : item.defectRiskLevel === 'MEDIUM' ? 'pill-warn' : 'pill-pass'
                            }`}>
                              ML Defect Risk: {(item.defectScore * 100).toFixed(1)}%
                            </span>
                          )}
                          {item.verificationVerdict && (
                            <span className={`stage-pill ${item.verificationVerdict === 'VERIFIED_PASS' ? 'pill-pass' : 'pill-warn'}`}>
                              {item.verificationVerdict === 'VERIFIED_PASS' ? '🛡️ Sandbox Verified' : item.verificationVerdict}
                            </span>
                          )}
                        </div>
                        <h4 style={{ fontSize: '0.98rem', color: 'var(--text-primary)', margin: '4px 0' }}>
                          {item.issueDescription}
                        </h4>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Recorded: {new Date(item.createdAt || item.created_at).toLocaleString()}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                        {item.prUrl && (
                          <a
                            href={item.prUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-secondary"
                            style={{ fontSize: '0.76rem', padding: '6px 10px', color: '#34d399', borderColor: 'rgba(16, 185, 129, 0.35)' }}
                          >
                            <GitPullRequest size={13} /> PR #{item.prNumber}
                          </a>
                        )}
                        <button
                          type="button"
                          className="btn-primary"
                          style={{ fontSize: '0.76rem', padding: '6px 12px' }}
                          onClick={() => handleRestoreInvestigation(item)}
                        >
                          <RotateCcw size={13} /> Restore Workspace
                        </button>
                        <button
                          type="button"
                          className="btn-danger"
                          title="Delete record"
                          onClick={(e) => handleDeleteHistoryItem(item.id, e)}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
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
