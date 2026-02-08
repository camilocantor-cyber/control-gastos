import { useState } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { TransactionForm } from './components/TransactionForm';
import { TransactionList } from './components/TransactionList';
import type { Transaction } from './types';
import { Reports } from './components/Reports';
import { Login } from './components/Login';
import { useTransactions } from './hooks/useTransactions';
import { calculateStats } from './utils/helpers';
import { AuthProvider, useAuth } from './context/AuthContext';

import { CategoryManager } from './components/CategoryManager';

function AuthenticatedApp() {
  const { user, loading } = useAuth();
  const { transactions, addTransaction, deleteTransaction, updateTransaction } = useTransactions(user?.id);
  const [view, setView] = useState<'dashboard' | 'transactions' | 'reports' | 'categories'>('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTransaction(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return <Login />;
  }

  // Calculate stats dynamically
  const stats = calculateStats(transactions);

  return (
    <Layout
      currentView={view}
      onNavigate={setView}
      onOpenAddModal={() => setIsModalOpen(true)}
    >
      {view === 'dashboard' && (
        <Dashboard stats={stats} recentTransactions={transactions.slice(0, 5)} />
      )}

      {view === 'transactions' && (
        <TransactionList
          transactions={transactions}
          onDelete={deleteTransaction}
          onEdit={handleEdit}
        />
      )}

      {view === 'reports' && (
        <Reports transactions={transactions} />
      )}

      {view === 'categories' && (
        <CategoryManager />
      )}

      {isModalOpen && (
        <TransactionForm
          onClose={handleCloseModal}
          onAdd={addTransaction}
          onUpdate={updateTransaction}
          initialData={editingTransaction}
        />
      )}
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  );
}

export default App;
