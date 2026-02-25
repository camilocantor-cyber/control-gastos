import { useState, useEffect } from 'react';
import { MainLayout } from './components/Layout';
import { WorkflowList } from './components/WorkflowManagement';
import { WorkflowBuilder } from './components/WorkflowBuilder';
import { Auth } from './components/Auth';
import { ResetPassword } from './components/ResetPassword';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { Info } from 'lucide-react';
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

function AppContent() {
  const { user, loading } = useAuth();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [shouldOpenForm, setShouldOpenForm] = useState(false);
  const [showStartProcess, setShowStartProcess] = useState(false);
  const [executingProcessId, setExecutingProcessId] = useState<string | null>(null);
  const [dashboardRefreshKey, setDashboardRefreshKey] = useState(0);
  const [isResetPasswordPage, setIsResetPasswordPage] = useState(false);

  // Check if we're on the reset password page
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
      setIsResetPasswordPage(true);
    }
  }, []);

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
        onSectionChange={(section) => {
          setActiveSection(section);
          setSelectedWorkflow(null);
        }}
      >
        <WorkflowBuilder
          workflow={selectedWorkflow}
          onBack={() => setSelectedWorkflow(null)}
        />
      </MainLayout>
    );
  }

  return (
    <MainLayout
      activeSection={activeSection}
      onSectionChange={(section) => {
        setActiveSection(section);
        setShouldOpenForm(false);
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
      {activeSection === 'settings' && (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[2rem] border border-dashed border-slate-200">
          <div className="p-4 bg-slate-50 rounded-full mb-4">
            <Info className="w-8 h-8 text-slate-400" />
          </div>
          <p className="text-slate-500 font-medium">Configuración del sistema en desarrollo...</p>
        </div>
      )}
      {activeSection === 'search' && (
        <div className="h-[calc(100vh-9rem)]">
          <ProcessSearch onAttendTask={(id) => setExecutingProcessId(id)} />
        </div>
      )}
      {activeSection === 'providers' && <Providers />}
      {activeSection === 'reports' && <Reports />}
      {activeSection === 'calendar' && <Calendar />}
      {activeSection === 'orgchart' && user?.organization_id && (
        <OrganizationalChart organizationId={user.organization_id} />
      )}
      {activeSection === 'accounts' && <SystemAccounts />}
      {activeSection === 'monitor' && <IntegrationMonitor />}

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
    </MainLayout>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
