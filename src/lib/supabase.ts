import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/*
 * Si falta el .env, createClient() lanzaba "supabaseUrl is required" al importar este módulo —
 * es decir, ANTES de que React llegue a montarse. El ErrorBoundary no puede atrapar eso, así
 * que el resultado era una pantalla totalmente en blanco sin explicación.
 * Aquí lo detectamos y escribimos el mensaje directo en el HTML.
 */
if (!supabaseUrl || !supabaseAnonKey) {
  const faltan = [
    !supabaseUrl ? 'VITE_SUPABASE_URL' : null,
    !supabaseAnonKey ? 'VITE_SUPABASE_ANON_KEY' : null,
  ].filter(Boolean).join(' y ');

  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `
      <div style="min-height:100vh;background:#0b0f19;color:#e6e8ee;padding:32px;font-family:ui-sans-serif,system-ui,sans-serif">
        <div style="max-width:640px;margin:0 auto">
          <h1 style="font-size:20px;font-weight:600;margin:0 0 8px">Falta la configuración de Supabase</h1>
          <p style="font-size:14px;color:#8b93a7;line-height:1.6;margin:0 0 20px">
            No se encontró <strong style="color:#e6e8ee">${faltan}</strong>.
            La app necesita esos valores para conectarse a la base de datos.
          </p>
          <p style="font-size:14px;color:#8b93a7;line-height:1.6;margin:0 0 8px">Para arreglarlo:</p>
          <ol style="font-size:14px;color:#8b93a7;line-height:1.9;padding-left:20px;margin:0 0 20px">
            <li>Verifica que exista un archivo llamado <code style="background:#151a28;padding:2px 6px;border-radius:4px">.env</code> en la carpeta del proyecto (junto a <code style="background:#151a28;padding:2px 6px;border-radius:4px">package.json</code>).</li>
            <li>Que adentro tenga las dos líneas <code style="background:#151a28;padding:2px 6px;border-radius:4px">VITE_SUPABASE_URL=...</code> y <code style="background:#151a28;padding:2px 6px;border-radius:4px">VITE_SUPABASE_ANON_KEY=...</code></li>
            <li>Cierra la ventana del servidor y vuelve a ejecutar <code style="background:#151a28;padding:2px 6px;border-radius:4px">INICIAR-CRM.bat</code> — el archivo .env solo se lee al arrancar.</li>
          </ol>
          <p style="font-size:13px;color:#5d6478;line-height:1.6;margin:0">
            Ojo: si el archivo se llama <code style="background:#151a28;padding:2px 6px;border-radius:4px">.env.txt</code> Windows te lo está escondiendo. Actívale "extensiones de nombre de archivo" en el Explorador y renómbralo.
          </p>
        </div>
      </div>`;
  }
  throw new Error(`Faltan variables de entorno: ${faltan}. Revisa el archivo .env.`);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
