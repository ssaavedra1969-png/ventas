'use client'

import { Settings, Shield, Database, Globe } from 'lucide-react'

export default function ConfiguracionPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6 text-[#6C3CE1]" />
        <div>
          <h1 className="text-2xl font-bold text-white">Configuración</h1>
          <p className="text-[#B0B0D0] text-sm">
            Reglas de seguridad y configuración del sistema
          </p>
        </div>
      </div>

      {/* Firebase Config */}
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Database className="h-5 w-5 text-[#6C3CE1]" />
          <h2 className="text-lg font-semibold text-white">
            Variables de Entorno (.env.local)
          </h2>
        </div>
        <div className="space-y-2">
          <p className="text-sm text-[#B0B0D0]">
            Configuración de Firebase para el proyecto{' '}
            <code className="px-1.5 py-0.5 rounded bg-white/5 text-[#00D4FF] text-xs">
              leafy-valor-410916
            </code>
          </p>
          <pre className="p-4 rounded-xl bg-[#0A0A1A] text-sm font-mono text-[#B0B0D0] overflow-x-auto">
{`NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=leafy-valor-410916.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=leafy-valor-410916
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=leafy-valor-410916.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id`}
          </pre>
        </div>
      </div>

      {/* Security Rules */}
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="h-5 w-5 text-[#6C3CE1]" />
          <h2 className="text-lg font-semibold text-white">
            Reglas de Seguridad (Firestore)
          </h2>
        </div>
        <div className="space-y-4">
          <p className="text-sm text-[#B0B0D0]">
            Reglas recomendadas para Firestore. Aplicar desde la consola de
            Firebase.
          </p>
          <pre className="p-4 rounded-xl bg-[#0A0A1A] text-sm font-mono text-[#B0B0D0] overflow-x-auto whitespace-pre-wrap">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Función helper: usuario autenticado
    function isAuth() {
      return request.auth != null;
    }

    // Clientes: solo usuarios autenticados
    match /clientes/{document} {
      allow read, write: if isAuth();
    }

    // Productos: solo usuarios autenticados
    match /productos/{document} {
      allow read, write: if isAuth();
    }

    // Remitos:
    // - Lectura pública para documentos individuales
    // - Escritura solo autenticada
    match /remitos/{document} {
      allow read: if true;
      allow write: if isAuth();
    }

    // Contadores: solo autenticados
    match /contadores/{document} {
      allow read, write: if isAuth();
    }
  }
}`}
          </pre>
        </div>
      </div>

      {/* Deployment */}
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Globe className="h-5 w-5 text-[#6C3CE1]" />
          <h2 className="text-lg font-semibold text-white">
            Despliegue en Vercel
          </h2>
        </div>
        <div className="space-y-3">
          <p className="text-sm text-[#B0B0D0]">
            La aplicación está lista para ser desplegada en Vercel (plan Hobby
            gratuito). Pasos:
          </p>
          <ol className="list-decimal list-inside text-sm text-[#B0B0D0] space-y-2">
            <li>
              Crear un repositorio en{' '}
              <span className="text-white">GitHub</span>
            </li>
            <li>
              Hacer push del código:{' '}
              <code className="px-1.5 py-0.5 rounded bg-white/5 text-[#00D4FF] text-xs">
                git push origin main
              </code>
            </li>
            <li>
              Conectar el repositorio en{' '}
              <span className="text-white">vercel.com</span>
            </li>
            <li>
              Configurar las variables de entorno en el panel de Vercel
            </li>
            <li>
              ¡Listo! La app se desplegará automáticamente en cada push
            </li>
          </ol>
        </div>
      </div>
    </div>
  )
}
