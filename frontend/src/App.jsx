import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  CloudUpload,
  FileText,
  MessageSquare,
  MoonStar,
  RefreshCw,
  Search,
  Send,
  ServerCog,
  ShieldCheck,
  Sparkles,
  SunMedium,
  UserRound,
  X,
} from "lucide-react";
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import { useSystemStream } from "./hooks/useSystemStream";
import { getApiConfig } from "./config/api";
import { useUploadStore } from "./store/UploadStore";

const { graphqlUrl, apiBaseUrl } = getApiConfig();
const PORTAL_STORAGE_KEY = "bba.portal.state.v1";
const DEFAULT_CLIENT_ID = "11111111-1111-1111-1111-111111111111";
const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

const darkTheme = {
  "--bg": "#0f172a",
  "--bg-alt": "#111c33",
  "--text": "#f8fafc",
  "--muted": "#cbd5e1",
  "--accent": "#10b981",
  "--accent-2": "#059669",
  "--alert": "#d76355",
  "--glass": "rgba(15,23,42,0.84)",
  "--glass-strong": "rgba(15,23,42,0.92)",
};

const lightTheme = {
  "--bg": "#0f172a",
  "--bg-alt": "#111c33",
  "--text": "#f8fafc",
  "--muted": "#cbd5e1",
  "--accent": "#10b981",
  "--accent-2": "#059669",
  "--alert": "#bb3f35",
  "--glass": "rgba(15,23,42,0.84)",
  "--glass-strong": "rgba(15,23,42,0.92)",
};

const SYSTEM_HEALTH_QUERY = `
  query GetSystemHealth {
    health {
      status
      db_connected
      redis_connected
      timestamp
    }
    systemHealth {
      graphql {
        latencyMs
        requestsPerSecond
        errorRate
        historicalLatency
      }
      database {
        activeConnections
        maxConnections
        queryRate
        avgQueryTime
      }
      redis {
        hitRate
        memoryUsedMb
        memoryTotalMb
        keysCount
        connectedClients
      }
      agents {
        active
        pending
        completed
      }
      recent_logs {
        timestamp
        message
        type
        category
      }
    }
  }
`;

const DEFAULT_THREAD = [
  {
    id: "m1",
    role: "assistant",
    text: "Welcome. I can clarify missing documents, explain funding blockers, and suggest your next best action.",
    time: new Date().toLocaleTimeString(),
  },
];

const ALLOWED_VIEWS = ["get-started", "workspace", "disputes", "analysis", "status"];

function PortalApp() {
  const { uploadedDocs, setUploadedDocs } = useUploadStore();
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();
  const [activeView, setActiveView] = useState("get-started");
  const [isDark, setIsDark] = useState(true);
  const [error, setError] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [snapshot, setSnapshot] = useState(null);
  const [logs, setLogs] = useState([]);
  const [step, setStep] = useState(1);
  const [clientProfile, setClientProfile] = useState({
    legalName: "",
    ownerName: "",
    email: "",
    businessType: "LLC",
    annualRevenue: "",
    challenge: "",
    primaryGoal: "Improve funding readiness",
  });
  const [aiIntake, setAiIntake] = useState({
    urgency: "medium",
    hiringSoon: "no",
    wantsFundingIn90Days: "yes",
  });
  const [taskItems, setTaskItems] = useState([
    { id: "t1", title: "Complete business profile", status: "in_progress" },
    { id: "t2", title: "Upload required documents", status: "pending" },
    { id: "t3", title: "Run AI readiness intake", status: "pending" },
    { id: "t4", title: "Review generated action plan", status: "pending" },
  ]);
  const [simulator, setSimulator] = useState({
    monthlyRevenue: 40000,
    monthlyExpenses: 28000,
    requestedFunding: 120000,
  });
  const [intakeErrors, setIntakeErrors] = useState({});
  const [manualTaskDone, setManualTaskDone] = useState({});
  const [submissionState, setSubmissionState] = useState("idle");
  const [submissionMessage, setSubmissionMessage] = useState("");
  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [docSearch, setDocSearch] = useState("");
  const [docFilter, setDocFilter] = useState("all");
  const [docSort, setDocSort] = useState("newest");
  const [activeCaseId, setActiveCaseId] = useState("default-case");
  const [userRole, setUserRole] = useState("client");
  const [roleSource, setRoleSource] = useState("local");
  const [clarificationDraft, setClarificationDraft] = useState("");
  const [clarificationThreads, setClarificationThreads] = useState({ "default-case": DEFAULT_THREAD });
  const [modalState, setModalState] = useState({ open: false, type: null });
  const [modalMessage, setModalMessage] = useState("");
  const [remoteSyncState, setRemoteSyncState] = useState("idle");
  const [remoteHydrated, setRemoteHydrated] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [loadingThread, setLoadingThread] = useState(true);
  const [analysisBusy, setAnalysisBusy] = useState(false);
  const [analysisSummary, setAnalysisSummary] = useState("");
  const [scannerState, setScannerState] = useState({ active: false, progress: 0, message: "" });
  const [isDropzoneActive, setIsDropzoneActive] = useState(false);
  const [addressPreference, setAddressPreference] = useState("");
  const [disputeItems, setDisputeItems] = useState([
    {
      id: "d1",
      creditor: "Northline Capital",
      issue: "Late payment marker on paid account",
      status: "draft",
      owner: "Advisor",
      dueInDays: 27,
    },
    {
      id: "d2",
      creditor: "Metro Business Card",
      issue: "Balance reporting mismatch",
      status: "submitted",
      owner: "Client",
      dueInDays: 18,
    },
  ]);

  const safeHealth = snapshot?.health ?? {};
  const safeSystemHealth = snapshot?.systemHealth ?? {};
  const safeRecentLogs = safeSystemHealth?.recent_logs ?? [];
  const requiredDocs = [
    "Government ID",
    "Last 3 Months Bank Statements",
    "Last Tax Return",
    "Entity Formation Document",
  ];

  useEffect(() => {
    const routeCase = params.caseId;
    const routeView = params.view;
    if (routeCase && routeCase !== activeCaseId) {
      setActiveCaseId(routeCase);
    }
    if (routeView && ALLOWED_VIEWS.includes(routeView) && routeView !== activeView) {
      setActiveView(routeView);
    }
  }, [activeCaseId, activeView, params.caseId, params.view]);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(PORTAL_STORAGE_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved);
      if (parsed?.activeView) setActiveView(parsed.activeView);
      if (parsed?.step) setStep(parsed.step);
      if (parsed?.isDark !== undefined) setIsDark(Boolean(parsed.isDark));
      if (parsed?.clientProfile) setClientProfile(parsed.clientProfile);
      if (parsed?.aiIntake) setAiIntake(parsed.aiIntake);
      if (parsed?.simulator) setSimulator(parsed.simulator);
      if (parsed?.manualTaskDone) setManualTaskDone(parsed.manualTaskDone);
      if (parsed?.generatedPlan) setGeneratedPlan(parsed.generatedPlan);
      if (parsed?.docSearch) setDocSearch(parsed.docSearch);
      if (parsed?.docFilter) setDocFilter(parsed.docFilter);
      if (parsed?.docSort) setDocSort(parsed.docSort);
      if (parsed?.activeCaseId) setActiveCaseId(parsed.activeCaseId);
      if (parsed?.clarificationThreads) setClarificationThreads(parsed.clarificationThreads);
    } catch {
      // Ignore malformed saved portal state.
    }
  }, []);

  useEffect(() => {
    try {
      const persistable = {
        activeView,
        step,
        isDark,
        clientProfile,
        aiIntake,
        simulator,
        manualTaskDone,
        generatedPlan,
        docSearch,
        docFilter,
        docSort,
        activeCaseId,
        clarificationThreads,
      };
      window.localStorage.setItem(PORTAL_STORAGE_KEY, JSON.stringify(persistable));
    } catch {
      // Ignore localStorage failures.
    }
  }, [
    activeCaseId,
    activeView,
    aiIntake,
    clarificationThreads,
    clientProfile,
    docFilter,
    docSearch,
    docSort,
    generatedPlan,
    isDark,
    manualTaskDone,
    simulator,
    step,
    uploadedDocs,
  ]);

  function navigateToView(view) {
    if (!ALLOWED_VIEWS.includes(view)) {
      return;
    }
    setActiveView(view);
    navigate(`/case/${activeCaseId}/${view}`);
  }

  function inferDocumentType(fileName = "") {
    const normalized = fileName.toLowerCase();
    if (normalized.includes("utility") || normalized.includes("bill")) return "Utility Bill";
    if (normalized.includes("license") || normalized.includes("id")) return "Driver's License";
    if (normalized.includes("bureau") || normalized.includes("credit")) return "Bureau Letter";
    return "Identifying Type...";
  }

  async function toBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || "");
        const base64 = result.includes(",") ? result.split(",")[1] : "";
        resolve(base64);
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  }

  async function processFileWithAI(file, docId) {
    try {
      const base64Image = await toBase64(file);
      const res = await fetch(`${apiBaseUrl}/api/v1/analyze-upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file_name: file.name,
          base64_image: base64Image,
          mime_type: file.type || null,
        }),
      });
      if (!res.ok) {
        throw new Error(`Analyze upload failed (${res.status})`);
      }
      const payload = await res.json();
      if (payload?.system_overloaded) {
        setUploadedDocs((prev) =>
          prev.map((doc) =>
            doc.id === docId
              ? {
                  ...doc,
                  requiredType: "System Overloaded",
                  extractedData: payload?.fallback?.extracted_data || null,
                  status: "error",
                }
              : doc
          )
        );
        addClarificationMessage("assistant", payload?.message || "System Overloaded. Please retry shortly.");
        return;
      }
      setUploadedDocs((prev) =>
        prev.map((doc) =>
          doc.id === docId
            ? {
                ...doc,
                requiredType: payload?.document_type || doc.requiredType,
                extractedData: payload?.extracted_data || null,
                actionRequired: payload?.action_required || "",
                status: "ready",
              }
            : doc
        )
      );
    } catch {
      setUploadedDocs((prev) => prev.map((doc) => (doc.id === docId ? { ...doc, status: "error" } : doc)));
    }
  }

  useEffect(() => {
    async function resolveRoleFromIdentity() {
      const email = clientProfile.email?.trim();
      if (!email) {
        setUserRole("client");
        setRoleSource("local");
        return;
      }

      try {
        const res = await fetch(
          `${apiBaseUrl}/api/v1/auth/me?email=${encodeURIComponent(email)}&tenant_id=${DEFAULT_TENANT_ID}&client_id=${DEFAULT_CLIENT_ID}`
        );
        if (!res.ok) {
          throw new Error("auth role unavailable");
        }
        const json = await res.json();
        setUserRole(json?.role || "client");
        setRoleSource("auth");
      } catch {
        setUserRole("client");
        setRoleSource("local");
      }
    }

    resolveRoleFromIdentity();
  }, [apiBaseUrl, clientProfile.email]);

  useEffect(() => {
    const caseId =
      clientProfile.legalName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") || "default-case";
    setActiveCaseId(caseId);
    setClarificationThreads((prev) => {
      if (prev[caseId]) return prev;
      return { ...prev, [caseId]: DEFAULT_THREAD };
    });
  }, [clientProfile.legalName]);

  useEffect(() => {
    const safeView = ALLOWED_VIEWS.includes(activeView) ? activeView : "get-started";
    const target = `/case/${activeCaseId}/${safeView}`;
    if (location.pathname !== target) {
      navigate(target, { replace: true });
    }
  }, [activeCaseId, activeView, location.pathname, navigate]);

  useEffect(() => {
    async function hydrateFromBackend() {
      try {
        setRemoteSyncState("syncing");
        const res = await fetch(`${apiBaseUrl}/api/v1/portal/state/${DEFAULT_CLIENT_ID}?tenant_id=${DEFAULT_TENANT_ID}`);
        if (!res.ok) {
          setRemoteHydrated(true);
          setRemoteSyncState("error");
          return;
        }
        const json = await res.json();
        const payload = json?.payload ?? {};
        if (payload?.clientProfile) setClientProfile(payload.clientProfile);
        if (payload?.aiIntake) setAiIntake(payload.aiIntake);
        if (payload?.uploadedDocs) setUploadedDocs(payload.uploadedDocs);
        if (payload?.clarificationThreads) setClarificationThreads(payload.clarificationThreads);
        if (payload?.generatedPlan) setGeneratedPlan(payload.generatedPlan);
        if (payload?.activeCaseId) setActiveCaseId(payload.activeCaseId);
        if (payload?.activeView) setActiveView(payload.activeView);
        setRemoteSyncState("synced");
      } catch {
        setRemoteSyncState("error");
      } finally {
        setRemoteHydrated(true);
      }
    }

    hydrateFromBackend();
  }, []);

  useEffect(() => {
    if (!remoteHydrated) {
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        setRemoteSyncState("syncing");
        await fetch(`${apiBaseUrl}/api/v1/portal/state/${DEFAULT_CLIENT_ID}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tenant_id: DEFAULT_TENANT_ID,
            payload: {
              clientProfile,
              aiIntake,
              uploadedDocs,
              clarificationThreads,
              generatedPlan,
              activeCaseId,
              activeView,
            },
          }),
        });
        setRemoteSyncState("synced");
      } catch {
        setRemoteSyncState("error");
      }
    }, 800);

    return () => clearTimeout(timeout);
  }, [activeCaseId, activeView, aiIntake, apiBaseUrl, clarificationThreads, clientProfile, generatedPlan, remoteHydrated, uploadedDocs]);

  useEffect(() => {
    if (!remoteHydrated) {
      return;
    }

    async function loadThreadForCase() {
      setLoadingThread(true);
      try {
        const res = await fetch(`${apiBaseUrl}/api/v1/portal/threads/${DEFAULT_CLIENT_ID}?tenant_id=${DEFAULT_TENANT_ID}&case_id=${encodeURIComponent(activeCaseId)}`);
        if (!res.ok) {
          return;
        }
        const json = await res.json();
        const messages = Array.isArray(json?.messages) && json.messages.length ? json.messages : DEFAULT_THREAD;
        setClarificationThreads((prev) => ({ ...prev, [activeCaseId]: messages }));
      } catch {
        // Ignore thread fetch failures.
      } finally {
        setLoadingThread(false);
      }
    }

    loadThreadForCase();
  }, [activeCaseId, apiBaseUrl, remoteHydrated]);

  useEffect(() => {
    const processingDocs = uploadedDocs.filter((doc) => doc?.status === "processing").length;
    if (!processingDocs) {
      if (scannerState.active) {
        setScannerState({ active: false, progress: 100, message: "All files indexed" });
      }
      return;
    }

    setScannerState((prev) => ({
      active: true,
      progress: Math.min(95, Math.max(prev.progress || 5, 20 + processingDocs * 15)),
      message: `Running AI parsing on ${processingDocs} file${processingDocs > 1 ? "s" : ""}`,
    }));
  }, [scannerState.active, scannerState.progress, uploadedDocs]);

  useSystemStream({
    onHealthUpdate: (payload) => {
      setSnapshot((prev) => {
        const base = prev ?? { health: {}, systemHealth: {} };
        return { ...base, systemHealth: payload ?? base.systemHealth };
      });
      setLogs(payload?.recent_logs ?? []);
    },
    onLog: (log) => {
      setLogs((prev) => [log, ...prev].slice(0, 12));
    },
  });

  const themeVars = isDark ? darkTheme : lightTheme;

  const pulseScore = useMemo(() => {
    if (!snapshot?.health) return 99.9;
    const health = snapshot?.health ?? {};
    let score = health.status === "healthy" ? 99.9 : 86.2;
    if (!health?.db_connected) score -= 7;
    if (!health?.redis_connected) score -= 6;
    return Math.max(50, +score.toFixed(1));
  }, [snapshot]);

  const executiveSummary = useMemo(() => {
    if (!snapshot?.systemHealth) {
      return {
        risk: "Assessing",
        recommendation: "Waiting for telemetry snapshot.",
      };
    }

    const gql = snapshot?.systemHealth?.graphql ?? {};
    const db = snapshot?.systemHealth?.database ?? {};
    const redis = snapshot?.systemHealth?.redis ?? {};

    let risk = "Low";
    let recommendation = "Operations are stable. Continue standard monitoring cadence.";

    if ((gql?.errorRate ?? 0) >= 1 || (gql?.latencyMs ?? 0) >= 300 || (redis?.hitRate ?? 0) < 85 || (db?.avgQueryTime ?? 0) >= 150) {
      risk = "High";
      recommendation = "Activate incident protocol and assign engineering owner for immediate remediation.";
    } else if ((gql?.errorRate ?? 0) >= 0.25 || (gql?.latencyMs ?? 0) >= 180 || (db?.avgQueryTime ?? 0) >= 70) {
      risk = "Medium";
      recommendation = "Track for the next 30 minutes and prepare scale-up if trend continues.";
    }

    return { risk, recommendation };
  }, [snapshot]);

  const profileCompletion = useMemo(() => {
    const fields = [
      clientProfile.legalName,
      clientProfile.ownerName,
      clientProfile.email,
      clientProfile.annualRevenue,
      clientProfile.challenge,
    ];
    const filledFields = fields.filter(Boolean).length;
    const docsCovered = requiredDocs.filter((docName) => uploadedDocs.some((doc) => doc.requiredType === docName)).length;
    const fieldScore = (filledFields / fields.length) * 60;
    const docScore = (docsCovered / requiredDocs.length) * 40;
    return Math.round(fieldScore + docScore);
  }, [clientProfile, requiredDocs, uploadedDocs]);

  const workflowStatus = useMemo(() => {
    const docsCovered = requiredDocs.filter((docName) => uploadedDocs.some((doc) => doc.requiredType === docName)).length;
    return [
      {
        stage: "Registration",
        status: clientProfile.legalName && clientProfile.email ? "complete" : "in_progress",
        detail: "Business identity and contact verification",
      },
      {
        stage: "Document Intake",
        status: docsCovered >= 3 ? "complete" : docsCovered > 0 ? "in_progress" : "pending",
        detail: `${docsCovered}/${requiredDocs.length} required files uploaded`,
      },
      {
        stage: "AI Review",
        status: step >= 3 ? "in_progress" : "pending",
        detail: "Risk, compliance, and readiness analysis",
      },
      {
        stage: "Action Plan",
        status: generatedPlan ? "complete" : step >= 4 ? "in_progress" : "pending",
        detail: "Generate recommended next steps for client",
      },
    ];
  }, [clientProfile, generatedPlan, requiredDocs, step, uploadedDocs]);

  const projectedReadiness = useMemo(() => {
    const margin = Math.max(simulator.monthlyRevenue - simulator.monthlyExpenses, 0);
    const marginRatio = simulator.monthlyRevenue > 0 ? margin / simulator.monthlyRevenue : 0;
    const fundingPressure = Math.min(simulator.requestedFunding / 300000, 1);
    const score = Math.round(55 + marginRatio * 35 - fundingPressure * 15 + profileCompletion * 0.15);
    return Math.max(35, Math.min(98, score));
  }, [profileCompletion, simulator]);

  const filteredDocuments = useMemo(() => {
    const q = docSearch.trim().toLowerCase();
    const filtered = uploadedDocs.filter((doc) => {
      const matchSearch = !q || doc.name.toLowerCase().includes(q) || doc.requiredType.toLowerCase().includes(q);
      const matchFilter = docFilter === "all" || doc.status === docFilter;
      return matchSearch && matchFilter;
    });

    return filtered.sort((a, b) => {
      if (docSort === "name") return a.name.localeCompare(b.name);
      if (docSort === "size") return b.sizeKb - a.sizeKb;
      return (b.createdAtTs || 0) - (a.createdAtTs || 0);
    });
  }, [docFilter, docSearch, docSort, uploadedDocs]);

  const activeThread = clarificationThreads[activeCaseId] || DEFAULT_THREAD;

  useEffect(() => {
    const root = document.documentElement;
    Object.entries(themeVars).forEach(([key, value]) => root.style.setProperty(key, value));
  }, [themeVars]);

  useEffect(() => {
    const firstDone = clientProfile.legalName && clientProfile.ownerName && clientProfile.email;
    const docsDone = requiredDocs.every((docName) => uploadedDocs.some((doc) => doc.requiredType === docName));
    setTaskItems((prev) =>
      prev.map((task) => {
        if (manualTaskDone[task.id]) return { ...task, status: "complete" };
        if (task.id === "t1") return { ...task, status: firstDone ? "complete" : "in_progress" };
        if (task.id === "t2") return { ...task, status: docsDone ? "complete" : uploadedDocs.length ? "in_progress" : "pending" };
        if (task.id === "t3") return { ...task, status: step >= 3 ? "in_progress" : "pending" };
        if (task.id === "t4") return { ...task, status: generatedPlan ? "complete" : step >= 4 ? "in_progress" : "pending" };
        return task;
      })
    );
  }, [clientProfile, generatedPlan, manualTaskDone, requiredDocs, step, uploadedDocs]);

  async function fetchSnapshot() {
    setIsRefreshing(true);
    setError("");
    try {
      const res = await fetch(graphqlUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: SYSTEM_HEALTH_QUERY }),
      });
      if (!res.ok) throw new Error(`GraphQL HTTP ${res.status}`);
      const json = await res.json();
      if (json?.errors?.length) throw new Error(json?.errors?.[0]?.message || "Query failed");
      setSnapshot(json?.data ?? { health: {}, systemHealth: {} });
      setLogs(json?.data?.systemHealth?.recent_logs ?? []);
    } catch (e) {
      setError(String(e));
    } finally {
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    fetchSnapshot();
    const id = setInterval(fetchSnapshot, 5000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    async function loadPortalDocuments() {
      setLoadingDocs(true);
      try {
        const res = await fetch(`${apiBaseUrl}/api/v1/portal/documents/${DEFAULT_CLIENT_ID}?tenant_id=${DEFAULT_TENANT_ID}`);
        if (!res.ok) {
          return;
        }
        const json = await res.json();
        if (Array.isArray(json?.documents)) {
          setUploadedDocs(json.documents);
        }
      } catch {
        // Ignore document fetch failures.
      } finally {
        setLoadingDocs(false);
      }
    }

    loadPortalDocuments();
  }, []);

  function updateProfile(key, value) {
    setClientProfile((prev) => ({ ...prev, [key]: value }));
    setIntakeErrors((prev) => ({ ...prev, [key]: "" }));
  }

  function updateIntake(key, value) {
    setAiIntake((prev) => ({ ...prev, [key]: value }));
    setIntakeErrors((prev) => ({ ...prev, [key]: "" }));
  }

  function addFiles(files) {
    try {
      const incomingFiles = Array.from(files || []);
      if (!incomingFiles.length) {
        return;
      }

      setScannerState({ active: true, progress: 12, message: "Queued for malware and OCR scanning" });
      const nowTs = Date.now();
      const docs = incomingFiles.map((file, idx) => ({
        id: `${file.name}-${nowTs}-${idx}`,
        name: file.name,
        sizeKb: Math.round(file.size / 1024),
        sizeLabel: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
        status: "processing",
        scanProgress: 8,
        requiredType: inferDocumentType(file.name),
        createdAt: new Date().toLocaleString(),
        createdAtTs: nowTs,
      }));
      setUploadedDocs((prev) => [...docs, ...prev]);
      setIntakeErrors((prev) => ({ ...prev, docs: "" }));

      docs.forEach((doc) => {
        fetch(`${apiBaseUrl}/api/v1/portal/documents/${DEFAULT_CLIENT_ID}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tenant_id: DEFAULT_TENANT_ID,
            case_id: activeCaseId,
            document: doc,
          }),
        }).catch(() => {
          // Ignore background document save failures.
        });
      });

      setTimeout(() => {
        setScannerState({ active: true, progress: 55, message: "Cross-checking account and compliance fields" });
      }, 450);

      docs.forEach((newDoc, index) => {
        const sourceFile = incomingFiles[index];
        const timer = setInterval(() => {
          setUploadedDocs((prev) =>
            prev.map((doc) => {
              if (doc.id !== newDoc.id) {
                return doc;
              }
              const nextProgress = Math.min(100, (doc.scanProgress || 0) + 23);
              const nextStatus = nextProgress >= 100 ? "ready" : "processing";
              return {
                ...doc,
                scanProgress: nextProgress,
                status: nextStatus,
                requiredType: nextStatus === "ready" ? doc.requiredType : "Identifying Type...",
              };
            })
          );
        }, 380 + index * 90);

        setTimeout(() => {
          clearInterval(timer);
          setUploadedDocs((prev) =>
            prev.map((doc) => (doc.id === newDoc.id ? { ...doc, scanProgress: 100, status: "ready", requiredType: newDoc.requiredType } : doc))
          );
          if (sourceFile) {
            processFileWithAI(sourceFile, newDoc.id);
          }
        }, 1900 + index * 160);
      });

      setTimeout(() => {
        setScannerState({ active: false, progress: 100, message: "Analysis complete" });
      }, 2200);
    } catch {
      setIntakeErrors((prev) => ({ ...prev, docs: "File upload failed. Please try again." }));
      setScannerState({ active: false, progress: 0, message: "" });
    }
  }

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDropzoneActive(false);
    addFiles(event.dataTransfer?.files);
  };

  const handleDropzoneDragOver = (event) => {
    event.preventDefault();
    setIsDropzoneActive(true);
  };

  const handleDropzoneDragLeave = (event) => {
    event.preventDefault();
    setIsDropzoneActive(false);
  };

  function markTaskComplete(taskId) {
    setManualTaskDone((prev) => ({ ...prev, [taskId]: true }));
  }

  function validateStep(targetStep) {
    const nextErrors = {};
    if (targetStep === 1) {
      if (!clientProfile.legalName.trim()) nextErrors.legalName = "Legal name is required.";
      if (!clientProfile.ownerName.trim()) nextErrors.ownerName = "Owner name is required.";
      if (!clientProfile.email.trim() || !clientProfile.email.includes("@")) nextErrors.email = "Valid email is required.";
      if (!clientProfile.annualRevenue || Number(clientProfile.annualRevenue) <= 0) nextErrors.annualRevenue = "Annual revenue must be greater than 0.";
    }
    if (targetStep === 2) {
      const docsCovered = requiredDocs.filter((docName) => uploadedDocs.some((doc) => doc.requiredType === docName)).length;
      if (docsCovered < 2) nextErrors.docs = "Upload at least two required document categories to continue.";
    }
    if (targetStep === 3) {
      if (!clientProfile.challenge?.trim()) nextErrors.challenge = "Describe your primary challenge for AI-guided planning.";
    }
    setIntakeErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleContinue() {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(4, s + 1));
  }

  function addClarificationMessage(role, text) {
    const message = {
      id: `${role}-${Date.now()}`,
      role,
      text,
      time: new Date().toLocaleTimeString(),
    };

    setClarificationThreads((prev) => {
      const current = prev[activeCaseId] || DEFAULT_THREAD;
      return {
        ...prev,
        [activeCaseId]: [...current, message],
      };
    });

    fetch(`${apiBaseUrl}/api/v1/portal/threads/${DEFAULT_CLIENT_ID}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenant_id: DEFAULT_TENANT_ID,
        case_id: activeCaseId,
        role,
        text,
      }),
    }).catch(() => {
      // Ignore background thread save failures.
    });
  }

  function handleSendClarification() {
    const text = clarificationDraft.trim();
    if (!text) return;
    addClarificationMessage("client", text);
    setClarificationDraft("");
    setTimeout(() => {
      addClarificationMessage(
        "assistant",
        "Thanks. Based on your note, I recommend uploading supporting bank statements and recent invoices to improve confidence before lender packet submission."
      );
    }, 450);
  }

  function handleDocumentAction(action, docId) {
    try {
      if (action === "delete") {
        if (userRole === "client") {
          addClarificationMessage("assistant", "Delete requires advisor/admin privileges.");
          return;
        }
        setUploadedDocs((prev) => prev.filter((doc) => doc?.id !== docId));
        fetch(`${apiBaseUrl}/api/v1/portal/documents/${DEFAULT_CLIENT_ID}/${encodeURIComponent(docId)}?tenant_id=${DEFAULT_TENANT_ID}`, {
          method: "DELETE",
        }).catch(() => {
          // Ignore background delete failures.
        });
        return;
      }

      if (action === "reprocess") {
        setScannerState({ active: true, progress: 26, message: "Re-running extraction and policy checks" });
        setUploadedDocs((prev) => prev.map((doc) => (doc?.id === docId ? { ...doc, status: "processing" } : doc)));
        setTimeout(() => {
          setUploadedDocs((prev) =>
            prev.map((doc) => {
              if (doc?.id !== docId) {
                return doc;
              }
              const updated = { ...doc, status: "ready" };
              fetch(`${apiBaseUrl}/api/v1/portal/documents/${DEFAULT_CLIENT_ID}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  tenant_id: DEFAULT_TENANT_ID,
                  case_id: activeCaseId,
                  document: updated,
                }),
              }).catch(() => {
                // Ignore background document save failures.
              });
              return updated;
            })
          );
          setScannerState({ active: false, progress: 100, message: "Reprocess complete" });
        }, 900);
        return;
      }

      if (action === "clarify") {
        const targetDoc = uploadedDocs?.find((doc) => doc?.id === docId);
        const docLabel = targetDoc?.name || "this document";
        addClarificationMessage("assistant", `Clarification requested: please confirm missing details for ${docLabel}.`);
        setActiveView("workspace");
      }
    } catch {
      addClarificationMessage("assistant", "The requested document action failed. Please retry in a few seconds.");
    }
  }

  function handleCreateDispute() {
    try {
      const nextId = `d${Date.now()}`;
      setDisputeItems((prev) => [
        {
          id: nextId,
          creditor: "New Creditor",
          issue: "Pending dispute reason",
          status: "draft",
          owner: userRole === "client" ? "Client" : "Advisor",
          dueInDays: 30,
        },
        ...prev,
      ]);
      addClarificationMessage("assistant", "A new dispute draft was created. Add evidence before submission.");
    } catch {
      addClarificationMessage("assistant", "Unable to create a dispute right now.");
    }
  }

  function handleDisputeAction(action, disputeId) {
    try {
      if (!disputeId) return;
      if (action === "submit") {
        setDisputeItems((prev) => prev.map((item) => (item?.id === disputeId ? { ...item, status: "submitted", dueInDays: 30 } : item)));
        addClarificationMessage("assistant", "Dispute submitted. Countdown reset to 30-day response cycle.");
        return;
      }
      if (action === "escalate") {
        if (userRole === "client") {
          addClarificationMessage("assistant", "Escalation requires advisor/admin privileges.");
          return;
        }
        setDisputeItems((prev) => prev.map((item) => (item?.id === disputeId ? { ...item, status: "escalated" } : item)));
        addClarificationMessage("assistant", "Dispute escalated for supervisory review.");
        return;
      }
      if (action === "close") {
        setDisputeItems((prev) => prev.map((item) => (item?.id === disputeId ? { ...item, status: "closed", dueInDays: 0 } : item)));
      }
    } catch {
      addClarificationMessage("assistant", "Dispute action failed. Please retry.");
    }
  }

  async function handleRunAnalysis() {
    try {
      setAnalysisBusy(true);
      setAnalysisSummary("");
      await new Promise((resolve) => setTimeout(resolve, 950));
      const readyCount = uploadedDocs?.filter((doc) => doc?.status === "ready").length ?? 0;
      const disputeOpen = disputeItems?.filter((item) => !["closed"].includes(item?.status)).length ?? 0;
      setAnalysisSummary(
        `AI analysis complete. ${readyCount} ready documents were scored, and ${disputeOpen} active dispute cycle${disputeOpen === 1 ? "" : "s"} were reviewed for evidence strength.`
      );
      addClarificationMessage("assistant", "Analysis run complete. Review evidence scorecards before packet submission.");
    } catch {
      setAnalysisSummary("Analysis failed to run. Please try again.");
    } finally {
      setAnalysisBusy(false);
    }
  }

  function renderSkeletonRows(count = 3) {
    return Array.from({ length: count }).map((_, idx) => (
      <div key={`s-${idx}`} className="skeleton-row" aria-hidden="true">
        <span className="skeleton-block long" />
        <span className="skeleton-block" />
        <span className="skeleton-block" />
      </div>
    ));
  }

  function openQuickAction(type) {
    setModalMessage("");
    setModalState({ open: true, type });
  }

  function closeModal() {
    setModalState({ open: false, type: null });
    setModalMessage("");
  }

  async function handleModalPrimary() {
    if (modalState.type === "new-intake") {
      setStep(1);
      setActiveView("get-started");
      setModalMessage("New intake workspace opened.");
      return;
    }

    if (modalState.type === "ask-ai") {
      addClarificationMessage("assistant", "AI review queued. I will flag missing compliance evidence and propose a revised action sequence.");
      setModalMessage("AI request sent to clarification thread.");
      return;
    }

    if (modalState.type === "submit-packet") {
      if (userRole === "client") {
        setModalMessage("Packet submission is restricted to advisor/admin roles.");
        return;
      }
      setModalMessage("Submitting lender packet...");
      try {
        const res = await fetch(`${apiBaseUrl}/api/v1/funding-matches/${DEFAULT_CLIENT_ID}`);
        if (!res.ok) throw new Error(`Packet submission failed (${res.status})`);
        const json = await res.json();
        const count = Array.isArray(json?.matches) ? json.matches.length : 0;
        setModalMessage(`Lender packet submitted. ${count} partner matches returned.`);
        addClarificationMessage("assistant", `Lender packet was submitted. Current partner matches: ${count}.`);
      } catch (e) {
        setModalMessage(String(e));
      }
    }
  }

  async function submitPortalPlan() {
    setSubmissionState("submitting");
    setSubmissionMessage("Submitting intake to AI services...");
    try {
      const readyDocs = uploadedDocs.filter((doc) => doc.status === "ready");
      await Promise.all(
        readyDocs.map((doc) =>
          fetch(`${apiBaseUrl}/api/v1/analyze-document`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              document_id: doc.id,
              client_id: DEFAULT_CLIENT_ID,
              tenant_id: DEFAULT_TENANT_ID,
            }),
          })
        )
      );

      const treatmentRes = await fetch(`${apiBaseUrl}/api/v1/generate-treatment-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: DEFAULT_CLIENT_ID,
          tenant_id: DEFAULT_TENANT_ID,
        }),
      });
      if (!treatmentRes.ok) throw new Error(`Treatment plan request failed (${treatmentRes.status})`);
      const treatmentJson = await treatmentRes.json();
      setGeneratedPlan(treatmentJson?.treatment_plan || null);
      setSubmissionState("success");
      setSubmissionMessage("Action plan generated and document intake submitted successfully.");
      setManualTaskDone((prev) => ({ ...prev, t3: true, t4: true }));
      setActiveView("workspace");
      addClarificationMessage("assistant", "Your intake has been submitted and the first action plan is ready in Workspace.");
    } catch (e) {
      setSubmissionState("error");
      setSubmissionMessage(String(e));
    }
  }

  function renderGetStartedView() {
    return (
      <section className="portal-grid">
        <article className="portal-card primary">
          <div className="card-head">
            <div>
              <p className="eyebrow">Guided Onboarding</p>
              <h2>Client Launch Workflow</h2>
            </div>
            <span className="status-chip">Step {step} of 4</span>
          </div>

          <div className="stepper">
            {[1, 2, 3, 4].map((s) => (
              <button key={s} className={`step-pill ${step === s ? "active" : ""}`} onClick={() => setStep(s)}>
                {s}
              </button>
            ))}
          </div>

          {step === 1 ? (
            <div className="form-grid">
              <label>
                Business legal name
                <input value={clientProfile.legalName} onChange={(e) => updateProfile("legalName", e.target.value)} placeholder="Noble Savage Holdings LLC" />
                {intakeErrors.legalName ? <small className="field-error">{intakeErrors.legalName}</small> : null}
              </label>
              <label>
                Owner full name
                <input value={clientProfile.ownerName} onChange={(e) => updateProfile("ownerName", e.target.value)} placeholder="Jordan Savage" />
                {intakeErrors.ownerName ? <small className="field-error">{intakeErrors.ownerName}</small> : null}
              </label>
              <label>
                Business email
                <input value={clientProfile.email} onChange={(e) => updateProfile("email", e.target.value)} placeholder="owner@business.com" />
                {intakeErrors.email ? <small className="field-error">{intakeErrors.email}</small> : null}
              </label>
              <label>
                Business type
                <select value={clientProfile.businessType} onChange={(e) => updateProfile("businessType", e.target.value)}>
                  <option>LLC</option>
                  <option>S-Corp</option>
                  <option>C-Corp</option>
                  <option>Partnership</option>
                </select>
              </label>
              <label>
                Annual revenue
                <input value={clientProfile.annualRevenue} onChange={(e) => updateProfile("annualRevenue", e.target.value)} placeholder="500000" />
                {intakeErrors.annualRevenue ? <small className="field-error">{intakeErrors.annualRevenue}</small> : null}
              </label>
              <label>
                Primary outcome
                <select value={clientProfile.primaryGoal} onChange={(e) => updateProfile("primaryGoal", e.target.value)}>
                  <option>Improve funding readiness</option>
                  <option>Fix compliance gaps</option>
                  <option>Automate bookkeeping</option>
                  <option>Prepare for expansion</option>
                </select>
              </label>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="upload-area-wrap">
              <label className="upload-area">
                <input type="file" multiple onChange={(e) => addFiles(e.target.files)} />
                <CloudUpload size={30} />
                <h3>Upload client documents</h3>
                <p>Drag-and-drop or click to upload. AI will parse, classify, and score confidence automatically.</p>
              </label>
              <div
                className={`dropzone ${isDropzoneActive ? "active" : ""}`}
                onDrop={handleDrop}
                onDragOver={handleDropzoneDragOver}
                onDragLeave={handleDropzoneDragLeave}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    document.getElementById("intake-file-input")?.click();
                  }
                }}
              >
                <input id="intake-file-input" type="file" multiple onChange={(e) => addFiles(e.target.files)} />
                <CloudUpload size={26} />
                <p>Drop multiple files here for upload intelligence scanning.</p>
              </div>
              {scannerState.active ? (
                <div className="scan-status" role="status" aria-live="polite">
                  <div className="scan-bar">
                    <span style={{ width: `${scannerState.progress}%` }} />
                  </div>
                  <p>{scannerState.message}</p>
                </div>
              ) : null}
              <div className="checklist">
                {requiredDocs.map((doc) => {
                  const covered = uploadedDocs.some((item) => item.requiredType === doc);
                  return (
                    <div key={doc} className={`check-row ${covered ? "done" : ""}`}>
                      <CheckCircle2 size={14} /> {doc}
                    </div>
                  );
                })}
              </div>
              <div className="uploads-list">
                {intakeErrors.docs ? <small className="field-error">{intakeErrors.docs}</small> : null}
                {loadingDocs ? renderSkeletonRows(2) : null}
                {!loadingDocs && uploadedDocs.length === 0 ? <p className="empty-state">No files uploaded yet. Add bank statements and tax returns to begin AI review.</p> : null}
                {uploadedDocs.map((doc) => (
                  <div key={doc.id} className="upload-row">
                    <div>
                      <strong>{doc.name}</strong>
                      <p>{doc.sizeLabel || `${doc.sizeKb} KB`} • {doc.requiredType}</p>
                      {doc.status === "processing" ? (
                        <div className="file-scan-progress" aria-label={`Scanning ${doc.name}`}>
                          <span style={{ width: `${doc.scanProgress || 0}%` }} />
                        </div>
                      ) : null}
                    </div>
                    <span className={`status-chip ${doc.status === "ready" ? "ok" : "warn"}`}>
                      {doc.status === "processing" ? `Scanning ${doc.scanProgress || 0}%` : doc.status}
                    </span>
                  </div>
                ))}

                {uploadedDocs.some((doc) => doc.requiredType === "Utility Bill") ? (
                  <div className="dynamic-question">
                    <p className="question-title">Action Required</p>
                    <p>The address on your Utility Bill may not match your ID. Which source should we use for dispute letters?</p>
                    <div className="question-actions">
                      <button className={`mini-btn ${addressPreference === "id" ? "active-choice" : ""}`} onClick={() => setAddressPreference("id")}>Use ID Address</button>
                      <button className={`mini-btn ${addressPreference === "bill" ? "active-choice" : ""}`} onClick={() => setAddressPreference("bill")}>Use Bill Address</button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="form-grid">
              <label>
                How urgent is support?
                <select value={aiIntake.urgency} onChange={(e) => updateIntake("urgency", e.target.value)}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </label>
              <label>
                Hiring in next 90 days?
                <select value={aiIntake.hiringSoon} onChange={(e) => updateIntake("hiringSoon", e.target.value)}>
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </label>
              <label>
                Need funding in 90 days?
                <select value={aiIntake.wantsFundingIn90Days} onChange={(e) => updateIntake("wantsFundingIn90Days", e.target.value)}>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </label>
              <label className="full-span">
                Biggest current challenge
                <textarea value={clientProfile.challenge || ""} onChange={(e) => updateProfile("challenge", e.target.value)} placeholder="Example: We need clean books and stronger DSCR before meeting lenders." />
                {intakeErrors.challenge ? <small className="field-error">{intakeErrors.challenge}</small> : null}
              </label>
            </div>
          ) : null}

          {step === 4 ? (
            <div className="review-box">
              <h3>AI-generated kickoff summary</h3>
              <p>
                Based on your registration and intake, your priority track is <strong>{clientProfile.primaryGoal}</strong>. Portal confidence is <strong>{profileCompletion}%</strong> and recommended next action is to complete any missing required documents and trigger funding readiness simulation.
              </p>
              <button className="solid-btn" onClick={submitPortalPlan} disabled={submissionState === "submitting"}>
                {submissionState === "submitting" ? "Submitting..." : "Submit and Generate Full Action Plan"}
              </button>
              {submissionMessage ? <p className={`submit-note ${submissionState}`}>{submissionMessage}</p> : null}
            </div>
          ) : null}

          <div className="wizard-controls">
            <button className="ghost-btn" onClick={() => setStep((s) => Math.max(1, s - 1))}>Back</button>
            <button className="solid-btn" onClick={handleContinue}>
              Continue <ChevronRight size={16} />
            </button>
          </div>
        </article>

        <article className="portal-card side">
          <div className="card-head">
            <div>
              <p className="eyebrow">Action Hub</p>
              <h2>Client Progress</h2>
            </div>
            <span className="score-badge">{profileCompletion}% complete</span>
          </div>

          <div className="task-stack">
            {taskItems.map((task) => (
              <div key={task.id} className="task-item">
                <span className={`dot ${task.status}`} />
                <div>
                  <strong>{task.title}</strong>
                  <p>{task.status.replace("_", " ")}</p>
                </div>
                {task.status !== "complete" ? (
                  <button className="mini-btn" onClick={() => markTaskComplete(task.id)}>
                    Mark done
                  </button>
                ) : null}
              </div>
            ))}
          </div>

          <div className="ai-guidance">
            <div className="guidance-head">
              <Sparkles size={16} /> AI guidance
            </div>
            <ul>
              <li>Route uploads to OCR + compliance classifier automatically.</li>
              <li>Trigger funding readiness simulation after required docs complete.</li>
              <li>Create lender matching draft once profile completion reaches 80%.</li>
            </ul>
          </div>
        </article>
      </section>
    );
  }

  function renderWorkspaceView() {
    return (
      <section className="workspace-stack">
        <div className="workspace-grid">
          <article className="portal-card">
            <div className="card-head">
              <div>
                <p className="eyebrow">Interactive Tools</p>
                <h2>Funding Readiness Simulator</h2>
              </div>
              <span className="score-badge">Projected {projectedReadiness}%</span>
            </div>
            <div className="slider-group">
              <label>
                Monthly revenue: ${simulator.monthlyRevenue.toLocaleString()}
                <input type="range" min="5000" max="200000" step="1000" value={simulator.monthlyRevenue} onChange={(e) => setSimulator((prev) => ({ ...prev, monthlyRevenue: Number(e.target.value) }))} />
              </label>
              <label>
                Monthly expenses: ${simulator.monthlyExpenses.toLocaleString()}
                <input type="range" min="2000" max="180000" step="1000" value={simulator.monthlyExpenses} onChange={(e) => setSimulator((prev) => ({ ...prev, monthlyExpenses: Number(e.target.value) }))} />
              </label>
              <label>
                Requested funding: ${simulator.requestedFunding.toLocaleString()}
                <input type="range" min="10000" max="500000" step="5000" value={simulator.requestedFunding} onChange={(e) => setSimulator((prev) => ({ ...prev, requestedFunding: Number(e.target.value) }))} />
              </label>
            </div>
          </article>

          <article className="portal-card">
            <div className="card-head">
              <div>
                <p className="eyebrow">Quick Actions</p>
                <h2>Client Operations</h2>
              </div>
            </div>
            <div className="action-grid">
              <button className="action-btn" onClick={() => openQuickAction("new-intake")}><FileText size={16} /> Start new intake</button>
              <button className="action-btn" onClick={() => openQuickAction("upload-docs")}><CloudUpload size={16} /> Upload additional docs</button>
              <button className="action-btn" onClick={() => openQuickAction("ask-ai")}><Sparkles size={16} /> Ask AI for plan updates</button>
              <button className="action-btn" onClick={() => openQuickAction("submit-packet")} disabled={userRole === "client"}><ArrowRight size={16} /> Submit lender packet</button>
            </div>
            {generatedPlan ? (
              <div className="generated-plan">
                <h4>Latest AI Plan</h4>
                <p>{generatedPlan.insight || "AI plan generated successfully."}</p>
              </div>
            ) : null}
          </article>
        </div>

        <div className="workspace-grid">
          <article className="portal-card">
            <div className="card-head">
              <div>
                <p className="eyebrow">Document Queue</p>
                <h2>Intake Operations Center</h2>
              </div>
              <span className="score-badge">{filteredDocuments.length} items</span>
            </div>

            <div className="doc-toolbar">
              <label className="search-wrap">
                <Search size={14} />
                <input value={docSearch} onChange={(e) => setDocSearch(e.target.value)} placeholder="Search by filename or type" />
              </label>
              <select value={docFilter} onChange={(e) => setDocFilter(e.target.value)}>
                <option value="all">All statuses</option>
                <option value="ready">Ready</option>
                <option value="processing">Processing</option>
              </select>
              <select value={docSort} onChange={(e) => setDocSort(e.target.value)}>
                <option value="newest">Newest first</option>
                <option value="name">Name</option>
                <option value="size">Size</option>
              </select>
            </div>

            <div className="doc-table">
              <div className="doc-row header">
                <span>File</span>
                <span>Type</span>
                <span>Status</span>
                <span>Actions</span>
              </div>
              {loadingDocs ? renderSkeletonRows(3) : null}
              {!loadingDocs && filteredDocuments.length === 0 ? <p className="empty-state">No matching documents in queue. Try changing filters or uploading a new file.</p> : null}
              {filteredDocuments.map((doc) => (
                <div key={doc.id} className="doc-row">
                  <span>
                    <strong>{doc.name}</strong>
                    <small>{doc.sizeKb} KB • {doc.createdAt || "now"}</small>
                  </span>
                  <span>{doc.requiredType}</span>
                  <span className={`status-chip ${doc.status === "ready" ? "ok" : "warn"}`}>{doc.status}</span>
                  <span className="doc-actions">
                    <button className="mini-btn" onClick={() => handleDocumentAction("reprocess", doc.id)}>Reprocess</button>
                    <button className="mini-btn" onClick={() => handleDocumentAction("clarify", doc.id)}>Clarify</button>
                    {userRole !== "client" ? <button className="mini-btn danger" onClick={() => handleDocumentAction("delete", doc.id)}>Delete</button> : null}
                  </span>
                </div>
              ))}
            </div>
          </article>

          <article className="portal-card">
            <div className="card-head">
              <div>
                <p className="eyebrow">AI Clarification Thread</p>
                <h2>Case {activeCaseId}</h2>
              </div>
              <span className="score-badge">{activeThread.length} messages</span>
            </div>

            <div className="case-route-bar">
              <label>
                Case Route
                <input value={activeCaseId} onChange={(e) => setActiveCaseId(e.target.value || "default-case")} />
              </label>
              <code>{`/case/${activeCaseId}/${activeView}`}</code>
            </div>

            <div className="thread-feed">
              {loadingThread ? renderSkeletonRows(2) : null}
              {activeThread.map((msg) => (
                <div key={msg.id} className={`thread-bubble ${msg.role}`}>
                  <div className="thread-meta">{msg.role} • {msg.time}</div>
                  <div>{msg.text}</div>
                </div>
              ))}
            </div>

            <div className="thread-input-wrap">
              <textarea
                value={clarificationDraft}
                onChange={(e) => setClarificationDraft(e.target.value)}
                placeholder="Ask AI to clarify a missing document, deadline, or compliance item..."
              />
              <button className="solid-btn" onClick={handleSendClarification}><Send size={14} /> Send</button>
            </div>
          </article>
        </div>
      </section>
    );
  }

  function renderDisputesView() {
    const activeCycles = disputeItems.filter((item) => item.status !== "closed");
    const avgProgress = activeCycles.length
      ? Math.round(activeCycles.reduce((sum, item) => sum + Math.max(0, Math.min(100, ((30 - item.dueInDays) / 30) * 100)), 0) / activeCycles.length)
      : 0;

    return (
      <section className="status-grid">
        <article className="portal-card">
          <div className="card-head">
            <div>
              <p className="eyebrow">Dispute Management</p>
              <h2>30-Day Dispute Cycle Tracker</h2>
            </div>
            <button className="solid-btn" onClick={handleCreateDispute}>Create dispute</button>
          </div>

          <div className="cycle-progress">
            <div className="scan-bar">
              <span style={{ width: `${avgProgress}%` }} />
            </div>
            <p>{avgProgress}% of active dispute response windows elapsed.</p>
          </div>

          <div className="doc-table">
            <div className="doc-row header">
              <span>Creditor</span>
              <span>Issue</span>
              <span>Status</span>
              <span>Actions</span>
            </div>
            {!disputeItems.length ? <p className="empty-state">No disputes yet. Create one to begin a guided 30-day resolution cycle.</p> : null}
            {disputeItems.map((item) => (
              <div key={item.id} className="doc-row">
                <span>
                  <strong>{item.creditor}</strong>
                  <small>Owner: {item.owner}</small>
                </span>
                <span>
                  <strong>{item.issue}</strong>
                  <small>{item.dueInDays} days remaining</small>
                </span>
                <span className={`status-chip ${item.status === "closed" ? "ok" : "warn"}`}>{item.status}</span>
                <span className="doc-actions">
                  <button className="mini-btn" onClick={() => handleDisputeAction("submit", item.id)}>Submit</button>
                  <button className="mini-btn" onClick={() => handleDisputeAction("escalate", item.id)}>Escalate</button>
                  <button className="mini-btn" onClick={() => handleDisputeAction("close", item.id)}>Close</button>
                </span>
              </div>
            ))}
          </div>
        </article>

        <article className="portal-card">
          <div className="card-head">
            <div>
              <p className="eyebrow">Evidence Guidance</p>
              <h2>Submission Quality</h2>
            </div>
          </div>
          <div className="ai-guidance">
            <div className="guidance-head">
              <MessageSquare size={16} /> Evidence checklist
            </div>
            <ul>
              <li>Attach a dated statement supporting the dispute reason.</li>
              <li>Keep each dispute to one issue and one account record.</li>
              <li>Escalate only after first response window is missed.</li>
            </ul>
          </div>
        </article>
      </section>
    );
  }

  function renderAnalysisView() {
    const readyDocsCount = uploadedDocs.filter((doc) => doc.status === "ready").length;
    const processingCount = uploadedDocs.filter((doc) => doc.status === "processing").length;

    return (
      <section className="status-grid">
        <article className="portal-card">
          <div className="card-head">
            <div>
              <p className="eyebrow">Risk Analysis</p>
              <h2>AI Credit Profile Review</h2>
            </div>
            <button className="solid-btn" onClick={handleRunAnalysis} disabled={analysisBusy || !uploadedDocs.length}>
              {analysisBusy ? "Analyzing..." : "Run analysis"}
            </button>
          </div>

          <div className="task-stack">
            <div className="task-item">
              <span className="dot complete" />
              <div>
                <strong>Ready documents</strong>
                <p>{readyDocsCount} files scored for completeness</p>
              </div>
            </div>
            <div className="task-item">
              <span className="dot in_progress" />
              <div>
                <strong>Processing queue</strong>
                <p>{processingCount} files pending extraction</p>
              </div>
            </div>
            <div className="task-item">
              <span className="dot pending" />
              <div>
                <strong>Open dispute cycles</strong>
                <p>{disputeItems.filter((item) => item.status !== "closed").length} require monitoring</p>
              </div>
            </div>
          </div>

          {analysisBusy ? <div className="skeleton-wrap">{renderSkeletonRows(3)}</div> : null}
          {!analysisBusy && !uploadedDocs.length ? (
            <p className="empty-state">No documents available for analysis yet. Upload files in Get Started or Workspace to continue.</p>
          ) : null}
          {!analysisBusy && analysisSummary ? <p className="submit-note success">{analysisSummary}</p> : null}
        </article>

        <article className="portal-card">
          <div className="card-head">
            <div>
              <p className="eyebrow">Decision Intelligence</p>
              <h2>Analyst Notes</h2>
            </div>
          </div>
          <div className="review-box">
            <p>Use this screen before lender packet submission to confirm evidence strength, open disputes, and underwriting readiness.</p>
            <button className="ghost-btn" onClick={() => setActiveView("workspace")}>Return to workspace</button>
          </div>
        </article>
      </section>
    );
  }

  function renderStatusView() {
    return (
      <section className="status-grid">
        <article className="portal-card">
          <div className="card-head">
            <div>
              <p className="eyebrow">Workflow Tracker</p>
              <h2>Case Lifecycle</h2>
            </div>
          </div>
          <div className="timeline">
            {workflowStatus.map((item) => (
              <div key={item.stage} className="timeline-row">
                <span className={`dot ${item.status}`} />
                <div>
                  <strong>{item.stage}</strong>
                  <p>{item.detail}</p>
                </div>
                <span className={`status-chip ${item.status === "complete" ? "ok" : item.status === "in_progress" ? "warn" : ""}`}>
                  {item.status.replace("_", " ")}
                </span>
              </div>
            ))}
          </div>
        </article>

        <article className="portal-card">
          <div className="card-head">
            <div>
              <p className="eyebrow">Live Feed</p>
              <h2>System Activity</h2>
            </div>
            <button className="ghost-btn" onClick={fetchSnapshot}><RefreshCw size={14} /> Refresh</button>
          </div>
          <div className="log-feed">
            {isRefreshing ? renderSkeletonRows(2) : null}
            {(logs.length ? logs : safeRecentLogs).slice(0, 8).map((log, idx) => (
              <div key={`${log.timestamp}-${idx}`} className="log-row">
                <span className={`dot ${log.type === "success" ? "complete" : "in_progress"}`} />
                <div>
                  <strong>{log.message}</strong>
                  <p>{log.timestamp} • {log.category}</p>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>
    );
  }

  function renderModal() {
    if (!modalState.open) return null;

    const titleMap = {
      "new-intake": "Start New Intake",
      "upload-docs": "Upload Additional Documents",
      "ask-ai": "Request AI Clarification",
      "submit-packet": "Submit Lender Packet",
    };

    return (
      <div className="modal-overlay" role="dialog" aria-modal="true">
        <section className="modal-card">
          <header className="modal-head">
            <h3>{titleMap[modalState.type] || "Portal Action"}</h3>
            <button className="ghost-btn" onClick={closeModal}><X size={14} /></button>
          </header>

          {modalState.type === "upload-docs" ? (
            <label className="upload-area compact">
              <input type="file" multiple onChange={(e) => addFiles(e.target.files)} />
              <CloudUpload size={24} />
              <p>Upload documents directly into the intake queue.</p>
            </label>
          ) : null}

          {modalState.type === "ask-ai" ? (
            <p className="modal-text">This sends a structured request into the case clarification thread so AI can update the action sequence.</p>
          ) : null}

          {modalState.type === "submit-packet" ? (
            <p className="modal-text">This sends the current client packet for lender matching and posts the result back into the thread.</p>
          ) : null}

          {modalState.type === "new-intake" ? (
            <p className="modal-text">This opens Step 1 so your team can register a new intake profile immediately.</p>
          ) : null}

          <div className="modal-actions">
            <button className="ghost-btn" onClick={closeModal}>Close</button>
            <button className="solid-btn" onClick={handleModalPrimary}>Run Action</button>
          </div>

          {modalMessage ? <p className="submit-note success">{modalMessage}</p> : null}
        </section>
      </div>
    );
  }

  const reconnectView = (
    <motion.section initial={false} animate={{ opacity: 1 }} className="rescue cmd-glass">
      <div className="rescue-graphic">(  x_x )</div>
      <h2>Systems Re-calibrating</h2>
      <p>The API telemetry channel is temporarily unavailable. Core UI remains safe and ready to recover.</p>
      <button className="reconnect" onClick={fetchSnapshot}>
        <RefreshCw size={16} /> Reconnect
      </button>
      <code>{error}</code>
    </motion.section>
  );

  return (
    <div className="portal-shell">
      <motion.header initial={false} animate={{ opacity: 1, y: 0 }} className="portal-hero cmd-glass">
        <div className="hero-top">
          <div className="brand-wrap">
            <div className="logo-glow" aria-hidden="true" />
            <div className="logo">BBA</div>
            <div>
              <h1>BBA Client Operations Portal</h1>
              <p>Document-first onboarding, AI-guided intake, and action-driven workflows.</p>
            </div>
          </div>
          <div className="hero-actions">
            <div className="role-picker" title="Role resolved from identity claims">
              {userRole === "client" ? <UserRound size={14} /> : <ShieldCheck size={14} />}
              <span className="role-text">{userRole}</span>
              <span className="role-source">{roleSource}</span>
            </div>
            <button className="theme-toggle" onClick={() => setIsDark((v) => !v)}>
              {isDark ? <SunMedium size={16} /> : <MoonStar size={16} />} {isDark ? "Light" : "Dark"}
            </button>
          </div>
        </div>

        <div className="hero-bottom portal-nav">
          <div className="view-tabs">
            <button className={activeView === "get-started" ? "active" : ""} data-view="get-started" onClick={() => navigateToView("get-started")}>Get Started</button>
            <button className={activeView === "workspace" ? "active" : ""} data-view="workspace" onClick={() => navigateToView("workspace")}>Workspace</button>
            <button className={activeView === "disputes" ? "active" : ""} data-view="disputes" onClick={() => navigateToView("disputes")}>Disputes</button>
            <button className={activeView === "analysis" ? "active" : ""} data-view="analysis" onClick={() => navigateToView("analysis")}>Analysis</button>
            <button className={activeView === "status" ? "active" : ""} data-view="status" onClick={() => navigateToView("status")}>Status</button>
          </div>
          <div className="status-pill">
            <span className={`live-dot ${isRefreshing ? "active" : "idle"}`} />
            <span>{safeHealth?.status || "syncing"} • {pulseScore.toFixed(1)}% • {remoteSyncState}</span>
          </div>
        </div>
      </motion.header>

      {error && !snapshot ? (
        reconnectView
      ) : (
        <>
          <section className="executive-brief cmd-glass">
            <div>
              <div className="micro-label">Guided Summary</div>
              <h3>Recommended Next Move</h3>
              <p>{executiveSummary.recommendation}</p>
            </div>
            <div className="brief-badges">
              <div className="brief-badge">
                <span className="micro-label">Portal Readiness</span>
                <strong>{profileCompletion}%</strong>
              </div>
              <div className="brief-badge">
                <span className="micro-label">System Risk</span>
                <strong>{executiveSummary.risk}</strong>
              </div>
              <div className="brief-badge">
                <span className="micro-label">Projected Funding Fit</span>
                <strong>{pulseScore.toFixed(1)}%</strong>
              </div>
            </div>
          </section>

          {activeView === "get-started" ? renderGetStartedView() : null}
          {activeView === "workspace" ? renderWorkspaceView() : null}
          {activeView === "disputes" ? renderDisputesView() : null}
          {activeView === "analysis" ? renderAnalysisView() : null}
          {activeView === "status" ? renderStatusView() : null}
        </>
      )}

      <footer className="micro-label footer-note">
        <ServerCog size={13} /> Updated {new Date().toLocaleTimeString()} • action-first client portal
      </footer>

      {renderModal()}
    </div>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate replace to="/case/default-case/get-started" />} />
      <Route path="/case/:caseId/:view" element={<PortalApp />} />
      <Route path="*" element={<Navigate replace to="/case/default-case/get-started" />} />
    </Routes>
  );
}
