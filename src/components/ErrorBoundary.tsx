import { Component, type ErrorInfo, type ReactNode } from 'react';

/*
 * Sin esto, CUALQUIER error de render en cualquier componente hace que React desmonte todo el
 * árbol y el navegador se quede en blanco, sin una sola pista de qué pasó. Ese era el síntoma
 * de "la app ni abre": no es que no arranque, es que se cae y no deja rastro visible.
 *
 * Con esto, el mismo error se muestra en pantalla, legible, y se puede copiar y pegar.
 */

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
  stack: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, stack: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] La app se cayó:', error, info);
    this.setState({ stack: info.componentStack ?? null });
  }

  render() {
    const { error, stack } = this.state;
    if (!error) return this.props.children;

    const texto = [
      `Error: ${error.message}`,
      '',
      error.stack ?? '',
      '',
      '--- Componente ---',
      stack ?? '(sin detalle)',
    ].join('\n');

    return (
      <div style={{ minHeight: '100vh', background: '#0b0f19', color: '#e6e8ee', padding: '32px', fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>
        <div style={{ maxWidth: '860px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 600, margin: '0 0 8px' }}>
            La aplicación se detuvo por un error
          </h1>
          <p style={{ fontSize: '14px', color: '#8b93a7', margin: '0 0 24px', lineHeight: 1.6 }}>
            Esto no es una pantalla en blanco: abajo está el error exacto. Copia todo el recuadro
            y pásalo tal cual para poder diagnosticarlo.
          </p>

          <div style={{ background: '#151a28', border: '1px solid #d09090', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
            <p style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#d09090' }}>{error.message}</p>
          </div>

          <pre
            style={{
              background: '#0f1421',
              border: '1px solid #232a3d',
              borderRadius: '8px',
              padding: '16px',
              fontSize: '12px',
              lineHeight: 1.6,
              color: '#9aa3b8',
              overflow: 'auto',
              maxHeight: '360px',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {texto}
          </pre>

          <div style={{ display: 'flex', gap: '10px', marginTop: '20px', flexWrap: 'wrap' }}>
            <button
              onClick={() => navigator.clipboard?.writeText(texto)}
              style={{ padding: '9px 16px', borderRadius: '6px', border: '1px solid #232a3d', background: '#151a28', color: '#e6e8ee', fontSize: '14px', cursor: 'pointer' }}
            >
              Copiar el error
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{ padding: '9px 16px', borderRadius: '6px', border: 'none', background: '#6366f1', color: '#fff', fontSize: '14px', cursor: 'pointer' }}
            >
              Recargar
            </button>
          </div>
        </div>
      </div>
    );
  }
}
