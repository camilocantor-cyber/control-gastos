import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="bg-white p-8 rounded-lg shadow-xl max-w-lg w-full border-l-4 border-red-500">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Algo salió mal</h1>
            <p className="text-gray-600 mb-4">La aplicación ha encontrado un error crítico.</p>
            <div className="bg-gray-100 p-4 rounded overflow-auto mb-4">
              <code className="text-sm text-red-600 font-mono">
                {this.state.error?.message}
              </code>
            </div>
            <p className="text-sm text-gray-500">
              Por favor revisa la consola del navegador para más detalles.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            >
              Recargar Página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
