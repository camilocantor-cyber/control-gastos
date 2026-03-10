import { useState, useEffect } from 'react';
import { MainLayout } from './components/Layout';
import { Toaster } from 'sonner';
import { WorkflowList } from './components/WorkflowManagement';
import { WorkflowBuilder } from './components/WorkflowBuilder';
import { Auth } from './components/Auth';
import { ResetPassword } from './components/ResetPassword';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { RoleManager } from './components/RoleManager';
import { Info, X } from 'lucide-react';
import type { Workflow } from './types';
import { Dashboard } from './components/Dashboard';
import { UserManagement } from './components/UserManagement';
import { StartProcessModal } from './components/StartProcessModal';
import { ProcessExecution } from './components/ProcessExecution';
import { ProcessSearch } from './components/ProcessSearch';
import { Reports } from './components/Reports';
import { OrganizationSettings } from './components/OrganizationSettings';
import { Providers } from './components/Providers';
import { Calendar } from './components/Calendar';
import { OrganizationalChart } from './components/OrganizationalChart';
import { SystemAccounts } from './components/SystemAccounts';
import { IntegrationMonitor } from './components/IntegrationMonitor';
import { SelfServicePortal } from './components/SelfServicePortal';
import { PublicForm } from './components/PublicForm';
import { SuperAdminPanel } from './components/SuperAdminPanel';
import { HelpCenter } from './components/HelpCenter';
import { DashboardV2 } from './components/DashboardV2';
import { KanbanBoard } from './components/KanbanBoard';
import { WorkloadMap } from './components/WorkloadMap';
import { AdvancedReports } from './components/AdvancedReports';

function AppContent() {
  const { user, loading } = useAuth();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [prevSection, setPrevSection] = useState('dashboard');
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [shouldOpenForm, setShouldOpenForm] = useState(false);
  const [showStartProcess, setShowStartProcess] = useState(false);
  const [executingProcessId, setExecutingProcessId] = useState<string | null>(null);
  const [helpArticleId, setHelpArticleId] = useState<string | undefined>(undefined);
  const [dashboardRefreshKey, setDashboardRefreshKey] = useState(0);

  const handleSectionChange = (section: string) => {
    if (activeSection !== 'help') {
      setPrevSection(activeSection);
    }
    setActiveSection(section);
    setShouldOpenForm(false);
    setHelpArticleId(undefined);
  };
  const [isResetPasswordPage] = useState(() => window.location.hash.includes('type=recovery'));
  const [publicWorkflowId] = useState(() => new URLSearchParams(window.location.search).get('public_process'));
  const [publicActivityId] = useState(() => new URLSearchParams(window.location.search).get('public_activity'));
  const [processId] = useState(() => new URLSearchParams(window.location.search).get('process_id'));
  const [isSuperadminPage] = useState(() => window.location.hash.includes('superadmin'));
  const [isV2Page] = useState(() => window.location.hash.includes('dashboard2'));

  // Close help with Escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeSection === 'help') {
        setActiveSection(prevSection);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [activeSection, prevSection]);

  if (isSuperadminPage) {
    return <SuperAdminPanel />;
  }

  if (isV2Page) {
    return <DashboardV2 />;
  }

  if (publicWorkflowId) {
    return <PublicForm workflowId={publicWorkflowId} />;
  }

  if (publicActivityId && processId) {
    return <PublicForm activityId={publicActivityId} processId={processId} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show reset password page if user clicked on recovery link
  if (isResetPasswordPage) {
    return <ResetPassword />;
  }

  if (!user) {
    return <Auth />;
  }

  const currentRole = user?.available_organizations?.find(o => o.id === user.organization_id)?.role || user?.role || 'viewer';

  if (user.role !== 'admin' && currentRole !== 'viewer') {
    return <SelfServicePortal />;
  }

  // Handle section change from Dashboard
  const handleDashboardAction = (action: string, data?: any) => {
    if (action === 'new-workflow') {
      setActiveSection('workflows');
      setShouldOpenForm(true);
    } else if (action === 'new-process') {
      setShowStartProcess(true);
    } else if (action === 'attend-task') {
      setExecutingProcessId(data);
    } else {
      setActiveSection(action);
    }
  };

  if (selectedWorkflow) {
    return (
      <MainLayout
        activeSection="workflows"
        onSectionChange={handleSectionChange}
        onOpenHelp={(articleId) => {
          setPrevSection('workflows');
          setActiveSection('help');
          setHelpArticleId(articleId);
        }}
      >
        <WorkflowBuilder
          workflow={selectedWorkflow}
          onBack={() => setSelectedWorkflow(null)}
          onOpenHelp={(articleId) => {
            setActiveSection('help');
            setHelpArticleId(articleId);
            setSelectedWorkflow(null);
          }}
        />
      </MainLayout>
    );
  }

  return (
    <MainLayout
      activeSection={activeSection}
      onSectionChange={handleSectionChange}
      onOpenHelp={(articleId: string) => {
        setPrevSection(activeSection);
        setActiveSection('help');
        setHelpArticleId(articleId);
      }}
      onNewProcess={() => setShowStartProcess(true)}
    >
      {activeSection === 'dashboard' && (
        <Dashboard
          onAction={handleDashboardAction}
          refreshTrigger={dashboardRefreshKey}
        />
      )}
      {activeSection === 'workflows' && (
        <WorkflowList
          onSelectWorkflow={setSelectedWorkflow}
          openForm={shouldOpenForm}
          onFormClose={() => setShouldOpenForm(false)}
        />
      )}
      {activeSection === 'users' && <UserManagement />}
      {activeSection === 'organization' && <OrganizationSettings />}
      {activeSection === 'parameters' && <OrganizationSettings onlyParameters />}
      {activeSection === 'settings' && (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[2rem] border border-dashed border-slate-200">
          <div className="p-4 bg-slate-50 rounded-full mb-4">
            <Info className="w-8 h-8 text-slate-400" />
          </div>
          <p className="text-slate-500 font-medium">Configuración del sistema en desarrollo...</p>
        </div>
      )}
      {activeSection === 'search' && (
        <div className="h-[calc(100vh-7rem)]">
          <ProcessSearch onAttendTask={(id) => setExecutingProcessId(id)} />
        </div>
      )}
      {activeSection === 'kanban' && (
        <div className="h-[calc(100vh-7rem)] overflow-hidden">
          <KanbanBoard onOpenProcess={(id) => setExecutingProcessId(id)} />
        </div>
      )}
      {activeSection === 'workload' && (
        <div className="h-[calc(100vh-7rem)] overflow-y-auto custom-scrollbar pr-2">
          <WorkloadMap />
        </div>
      )}
      {activeSection === 'advanced-reports' && (
        <div className="h-[calc(100vh-7rem)] overflow-y-auto custom-scrollbar pr-2">
          <AdvancedReports />
        </div>
      )}
      {activeSection === 'providers' && <Providers />}
      {activeSection === 'reports' && <Reports />}
      {activeSection === 'calendar' && <Calendar />}
      {activeSection === 'orgchart' && user?.organization_id && (
        <OrganizationalChart organizationId={user.organization_id} />
      )}
      {activeSection === 'accounts' && <SystemAccounts />}
      {activeSection === 'roles' && <RoleManager />}
      {activeSection === 'monitor' && <IntegrationMonitor />}
      {/* help section removed from here */}

      {showStartProcess && (
        <StartProcessModal
          onClose={() => setShowStartProcess(false)}
          onStarted={() => {
            setDashboardRefreshKey(prev => prev + 1);
          }}
        />
      )}

      {executingProcessId && (
        <ProcessExecution
          processId={executingProcessId}
          onClose={() => setExecutingProcessId(null)}
          onComplete={() => {
            setDashboardRefreshKey(prev => prev + 1);
          }}
        />
      )}

      {/* Help Center Overlay */}
      {activeSection === 'help' && (
        <div className="fixed inset-0 z-[200] animate-in fade-in duration-300">
          {/* Close Button - Fixed to screen */}
          <div className="absolute top-6 right-6 z-[210]">
            <button
              onClick={() => setActiveSection(prevSection)}
              className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-red-500 rounded-2xl shadow-2xl transition-all active:scale-95 group flex items-center gap-2"
              title="Cerrar ayuda (Esc)"
            >
              <span className="text-[10px] font-black uppercase tracking-widest hidden md:block">Cerrar</span>
              <X className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
            </button>
          </div>

          {/* Scrolling Content Area */}
          <div className="h-full overflow-y-auto custom-scrollbar bg-slate-100/95 dark:bg-slate-950/95 backdrop-blur-3xl pt-8 pb-20 p-4 md:p-8">
            <div className="relative">
              {/* Decorative background elements inside scrolling area */}
              <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] -translate-y-1/2" />
              <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] translate-y-1/2" />

              <HelpCenter
                initialArticleId={helpArticleId}
                onClose={() => setActiveSection(prevSection)}
              />
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}

function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" richColors />
      <AppContent />
    </AuthProvider>
  );
}

export default App;
