import { useState, useRef } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';
import { useNavigate, Link } from 'react-router-dom';
import { setPreviewRole } from '../api/endpoints';
import { loginUnicoMultiRol } from '../api/endpointsDocente-orinetador';
import FormFieldInput from '../components/ui/FormFieldInput';
import Button from '../components/ui/Button';
import ForgotPasswordModal from '../components/ForgotPasswordModal';
import ForceChangePasswordModal from '../components/ForceChangePasswordModal';
import { isBypassValidationsEnabled } from '../utils/dev';

// Componente Mock de reCAPTCHA (en producción usar react-google-recaptcha)
const ReCAPTCHAMock = ({ onChange }: { onChange: (token: string | null) => void }) => {
  const [checked, setChecked] = useState(false);
  
  const handleCheck = () => {
    const newChecked = !checked;
    setChecked(newChecked);
    onChange(newChecked ? 'mock-recaptcha-token' : null);
  };

  return (
    <div 
      className="border border-gray-300 rounded-lg p-3 bg-gray-50 flex items-center gap-3 cursor-pointer hover:bg-gray-100 transition-colors"
      onClick={handleCheck}
      data-cy="recaptcha"
    >
      <div className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-colors ${
        checked ? 'bg-teal-600 border-teal-600' : 'border-gray-400 bg-white'
      }`}>
        {checked && (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      <span className="text-sm text-gray-700 select-none">No soy un robot</span>
      <div className="ml-auto flex items-center gap-1">
        <svg className="w-6 h-6 text-gray-400" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
        </svg>
        <span className="text-[10px] text-gray-400">reCAPTCHA</span>
      </div>
    </div>
  );
};

// Dominios válidos para cada rol
const DOMINIOS_ADMIN = ['@educacionpopayan.gov.co', '@secretariaed.gov.co'];
const DOMINIOS_INSTITUCIONAL = ['.edu.co', '@educativo.gov.co'];

export default function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const siteKey = (import.meta as any).env?.VITE_RECAPTCHA_SITE_KEY as string | undefined;
  const [formData, setFormData] = useState({
    correo: '',
    password: '',
    recordar: false,
  });
  const bypassValidations = isBypassValidationsEnabled();
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showForceChange, setShowForceChange] = useState(false);
  const [userToChange, setUserToChange] = useState<{id: number; nombre: string} | null>(null);

  // Detectar tipo de dominio del correo
  const getDomainType = (email: string): 'admin' | 'institucional' | 'otro' => {
    const emailLower = email.toLowerCase();
    if (DOMINIOS_ADMIN.some(d => emailLower.endsWith(d))) return 'admin';
    if (DOMINIOS_INSTITUCIONAL.some(d => emailLower.includes(d))) return 'institucional';
    return 'otro';
  };

  const domainType = getDomainType(formData.correo);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const target = e.target;
    const name = target.name;
    const value = target.value;
    const checked = (target as HTMLInputElement).type === 'checkbox' ? (target as HTMLInputElement).checked : false;
    setFormData(prev => ({
      ...prev,
      [name]: (target as HTMLInputElement).type === 'checkbox' ? checked : value,
    }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar reCAPTCHA (se puede bypassear en modo desarrollo)
    if (!bypassValidations && !captchaToken) {
      setError('Por favor, completa el reCAPTCHA');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      try {
        console.log('[UI][LOGIN] Enviando credenciales', {
          correo: formData.correo,
          recordar: formData.recordar,
          tieneCaptcha: Boolean(captchaToken),
          captchaLen: captchaToken ? String(captchaToken).length : 0,
          domainType
        });
      } catch {}
      // En bypass, enviar un token dummy para satisfacer backends que lo requieren
      const captchaToSend = bypassValidations ? (captchaToken || 'dev-bypass-token') : captchaToken;
      const result = await loginUnicoMultiRol(formData.correo, formData.password, captchaToSend);

      if (result.success && result.user) {
        try {
          console.log('[UI][LOGIN] Login exitoso', {
            rol: result.user.rol,
            id: result.user.id,
            nombre: result.user.nombre
          });
        } catch {}
        // Verificar si debe cambiar contraseña
        if (result.user.debe_cambiar_contrasena) {
          setUserToChange({
            id: result.user.id,
            nombre: result.user.nombre
          });
          setShowForceChange(true);
          setLoading(false);
          return;
        }
        
        // Redirigir según el rol
        const rol = result.user.rol;
        switch (rol) {
          case 'admin':
          case 'admin_sistema':
            navigate('/dashboard/admin');
            break;
          case 'rector':
            navigate('/dashboard/rector');
            break;
          case 'coordinador':
            navigate('/dashboard/coordinador');
            break;
          case 'orientador':
            navigate('/dashboard/orientador');
            break;
          case 'docente_aula':
            navigate('/dashboard/docente');
            break;
          case 'acudiente':
            navigate('/dashboard/acudiente');
            break;
          default:
            navigate('/dashboard/docente');
        }
      } else {
        try {
          console.warn('[UI][LOGIN] Fallo login', {
            error: result.error || result.message,
            correo: formData.correo
          });
        } catch {}
        setError(result.error || result.message || 'Error al iniciar sesión');
      }
    } catch (err) {
      try {
        console.error('[UI][LOGIN] Excepción en login', err);
      } catch {}
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-brand-50/30 to-blue-50/20 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo y título */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-3 mb-4">
            <img 
              src="/src/assets/logo.jpg" 
              alt="Logo Cátedra de Familia" 
              className="w-16 h-16 rounded-xl shadow-lg object-cover" 
            />
          </Link>
          <h1 className="text-3xl font-display font-bold text-gray-900">
            Bienvenido a <span className="text-teal-600">Cátedra de Familia</span>
          </h1>
          <p className="text-gray-600 mt-2">Ingresa a tu cuenta para continuar</p>
        </div>

        {/* Formulario */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <FormFieldInput
                label="Correo electrónico"
                name="correo"
                type="text"
                placeholder="tu@correo.com o 3001234567"
                value={formData.correo}
                onChange={handleChange}
                required
              />
              {/* Indicador de tipo de dominio */}
              {formData.correo && formData.correo.includes('@') && (
                <div className={`mt-1 text-xs flex items-center gap-1 ${
                  domainType === 'admin' ? 'text-purple-600' :
                  domainType === 'institucional' ? 'text-teal-600' :
                  'text-gray-500'
                }`}>
                  {domainType === 'admin' && (
                    <>
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Acceso Secretaría de Educación
                    </>
                  )}
                  {domainType === 'institucional' && (
                    <>
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                      </svg>
                      Acceso institucional
                    </>
                  )}
                </div>
              )}
            </div>

            <FormFieldInput
              label="Contraseña"
              name="password"
              type="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              required
            />

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="recordar"
                  checked={formData.recordar}
                  onChange={handleChange}
                  className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm text-gray-600">Recordarme</span>
              </label>
              <a 
                href="#" 
                onClick={(e) => {
                  e.preventDefault();
                  setShowForgotPassword(true);
                }}
                className="text-sm text-teal-600 hover:text-teal-700 font-medium"
              >
                ¿Olvidaste tu contraseña?
              </a>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            {/* reCAPTCHA - Obligatorio según HU-05 */}
            {!bypassValidations && (
              siteKey ? (
                <div className="flex justify-center">
                  <ReCAPTCHA sitekey={siteKey} onChange={(token) => setCaptchaToken(token)} />
                </div>
              ) : (
                <ReCAPTCHAMock onChange={setCaptchaToken} />
              )
            )}

            <Button 
              type="submit" 
              fullWidth 
              loading={loading}
              disabled={(!bypassValidations && !captchaToken) || loading}
            >
              Iniciar Sesión
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600 text-sm">
              ¿Eres padre de familia?{' '}
              <span className="text-teal-600 font-semibold">
                Descarga la app móvil 📱
              </span>
            </p>
          </div>

          {/* Modo Demo */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-center text-xs text-gray-500 mb-3">
              O prueba con credenciales de demo:
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => { setFormData({ ...formData, correo: 'coordinador@instituciontest.edu.co', password: 'Coord123!' }); setCaptchaToken('demo-token'); }}
                className="p-2 bg-gray-50 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors"
              >
                📋 Coordinador
              </button>
              <button
                type="button"
                onClick={() => { setFormData({ ...formData, correo: 'rector@instituciontest.edu.co', password: 'Rector123!' }); setCaptchaToken('demo-token'); }}
                className="p-2 bg-gray-50 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors"
              >
                🏛️ Rector
              </button>
              <button
                type="button"
                onClick={() => { setFormData({ ...formData, correo: 'admin@educacionpopayan.gov.co', password: 'Admin123!' }); setCaptchaToken('demo-token'); }}
                className="p-2 bg-purple-50 rounded-lg hover:bg-purple-100 text-purple-700 transition-colors col-span-2 font-medium"
              >
                🏛️ Admin Secretaría
              </button>
            </div>
          </div>

          {/* Modo Desarrollo: Saltar directamente como rol (preview) */}
          {bypassValidations && (
            <div className="mt-4 pt-4 border-t border-dashed border-gray-200">
              <p className="text-center text-xs text-gray-500 mb-2">Modo Desarrollo: entrar como rol</p>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => { setPreviewRole('admin'); window.location.href = '/dashboard/admin'; }}
                  className="p-2 bg-purple-50 rounded-lg hover:bg-purple-100 text-purple-700 transition-colors"
                >
                  Admin
                </button>
                <button
                  type="button"
                  onClick={() => { setPreviewRole('rector'); window.location.href = '/dashboard/rector'; }}
                  className="p-2 bg-gray-50 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors"
                >
                  Rector
                </button>
                <button
                  type="button"
                  onClick={() => { setPreviewRole('docente_aula'); window.location.href = '/dashboard/docente'; }}
                  className="p-2 bg-gray-50 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors"
                >
                  Docente
                </button>
                <button
                  type="button"
                  onClick={() => { setPreviewRole('orientador'); window.location.href = '/dashboard/orientador'; }}
                  className="p-2 bg-gray-50 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors"
                >
                  Orientador
                </button>
                <button
                  type="button"
                  onClick={() => { setPreviewRole('coordinador'); window.location.href = '/dashboard/coordinador'; }}
                  className="p-2 bg-gray-50 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors"
                >
                  Coordinador
                </button>
                <button
                  type="button"
                  onClick={() => { setPreviewRole('acudiente'); window.location.href = '/dashboard'; }}
                  className="p-2 bg-gray-50 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors"
                >
                  Acudiente
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Link a landing */}
        <div className="mt-6 text-center">
          <Link to="/" className="text-gray-500 hover:text-gray-700 text-sm inline-flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Volver al inicio
          </Link>
        </div>
      </div>
      
      {/* Modal Recuperar Contraseña */}
      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
      />
      
      {/* Modal Cambio Forzado de Contraseña */}
      {userToChange && (
        <ForceChangePasswordModal
          isOpen={showForceChange}
          userId={userToChange.id}
          userName={userToChange.nombre}
          onSuccess={() => {
            setShowForceChange(false);
            // Recargar la sesión actualizada
            window.location.href = '/dashboard';
          }}
        />
      )}
    </div>
  );
}
