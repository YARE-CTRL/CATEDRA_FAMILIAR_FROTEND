import { useState, useMemo } from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import FormFieldInput from './ui/FormFieldInput';
import { IconLock, IconAlertTriangle } from './ui/Icons';
import { cambiarContrasena } from '../api/endpoints';
import { isBypassValidationsEnabled } from '../utils/dev';

// Requisitos de contraseña según HU-06
const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  requireUppercase: true,
  requireNumber: true,
  requireSpecial: true,
  specialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?'
};

// Componente de check individual
const RequirementCheck = ({ met, label }: { met: boolean; label: string }) => (
  <div className={`flex items-center gap-2 text-sm ${met ? 'text-green-600' : 'text-gray-500'}`}>
    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
      met ? 'bg-green-100' : 'bg-gray-100'
    }`}>
      {met ? (
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
        </svg>
      )}
    </div>
    <span>{label}</span>
  </div>
);

export default function ForceChangePasswordModal({
  isOpen,
  userId,
  userName,
  onSuccess
}: {
  isOpen: boolean;
  userId: number;
  userName: string;
  onSuccess: () => void;
}) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Validación de requisitos en tiempo real
  const passwordChecks = useMemo(() => {
    return {
      hasMinLength: newPassword.length >= PASSWORD_REQUIREMENTS.minLength,
      hasUppercase: /[A-Z]/.test(newPassword),
      hasNumber: /[0-9]/.test(newPassword),
      hasSpecial: /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(newPassword),
    };
  }, [newPassword]);

  const allRequirementsMet = Object.values(passwordChecks).every(Boolean);
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;
  const bypassValidations = isBypassValidationsEnabled();
  const effectiveAllRequirements = bypassValidations ? true : allRequirementsMet;
  const effectivePasswordsMatch = bypassValidations ? true : passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validaciones según HU-06 (se pueden bypassear en modo dev)
    if (!bypassValidations && !allRequirementsMet) {
      setError('La contraseña no cumple con todos los requisitos de seguridad');
      return;
    }

    if (!bypassValidations && !passwordsMatch) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (currentPassword === newPassword) {
      setError('La nueva contraseña debe ser diferente a la actual');
      return;
    }

    setLoading(true);

    try {
      const result = await cambiarContrasena(userId, currentPassword, newPassword, confirmPassword);
      
      if (result.success) {
        // Mostrar mensaje de éxito
        setSuccess('¡Contraseña cambiada exitosamente! Redirigiendo...');
        setError(null);
        
        // Limpiar formulario
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        
        // Esperar un momento y llamar a onSuccess
        setTimeout(() => {
          onSuccess();
        }, 1500);
      } else {
        setError(result.error || 'Error al cambiar contraseña');
        setSuccess(null);
      }
    } catch (err) {
      setError('Error de conexión. Intenta de nuevo.');
      setSuccess(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {}} // No se puede cerrar, es obligatorio
      title="Cambio de Contraseña Obligatorio"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Alerta */}
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
          <IconAlertTriangle className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800 mb-1">
              Actualización de Seguridad Requerida
            </p>
            <p className="text-sm text-amber-700">
              Hola <strong>{userName}</strong>, debes cambiar tu contraseña antes de continuar.
              Esta es una medida de seguridad para proteger tu cuenta.
            </p>
          </div>
        </div>

        <FormFieldInput
          name="currentPassword"
          label="Contraseña Actual"
          type="password"
          placeholder="Ingresa tu contraseña actual"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
        />

        <FormFieldInput
          name="newPassword"
          label="Nueva Contraseña"
          type="password"
          placeholder="Mínimo 8 caracteres"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
        />

        {/* Checklist de requisitos - HU-06 Criterio #3 */}
        {newPassword.length > 0 && (
          <div className="p-4 bg-slate-50 rounded-xl space-y-2">
            <p className="text-xs font-semibold text-slate-600 mb-3">Requisitos de contraseña:</p>
            <RequirementCheck 
              met={passwordChecks.hasMinLength} 
              label="Mínimo 8 caracteres" 
            />
            <RequirementCheck 
              met={passwordChecks.hasUppercase} 
              label="Al menos 1 letra mayúscula" 
            />
            <RequirementCheck 
              met={passwordChecks.hasNumber} 
              label="Al menos 1 número" 
            />
            <RequirementCheck 
              met={passwordChecks.hasSpecial} 
              label="Al menos 1 carácter especial (@#$%&*)" 
            />
          </div>
        )}

        <FormFieldInput
          name="confirmPassword"
          label="Confirmar Nueva Contraseña"
          type="password"
          placeholder="Repite la nueva contraseña"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />

        {/* Indicador de coincidencia */}
        {confirmPassword.length > 0 && (
          <div className={`flex items-center gap-2 text-sm ${
            passwordsMatch ? 'text-green-600' : 'text-red-600'
          }`}>
            {passwordsMatch ? (
              <>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Las contraseñas coinciden
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                Las contraseñas no coinciden
              </>
            )}
          </div>
        )}

        {/* Barra de fortaleza */}
        {newPassword && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600">Fortaleza:</span>
              <span className={`font-semibold ${
                !allRequirementsMet ? 'text-red-600' :
                newPassword.length < 12 ? 'text-amber-600' :
                'text-green-600'
              }`}>
                {!allRequirementsMet ? 'No cumple requisitos' :
                 newPassword.length < 12 ? 'Aceptable' :
                 'Muy fuerte'}
              </span>
            </div>
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden flex gap-0.5">
              <div className={`h-full transition-all ${
                passwordChecks.hasMinLength ? 'bg-green-500 w-1/4' : 'bg-gray-300 w-1/4'
              }`} />
              <div className={`h-full transition-all ${
                passwordChecks.hasUppercase ? 'bg-green-500 w-1/4' : 'bg-gray-300 w-1/4'
              }`} />
              <div className={`h-full transition-all ${
                passwordChecks.hasNumber ? 'bg-green-500 w-1/4' : 'bg-gray-300 w-1/4'
              }`} />
              <div className={`h-full transition-all ${
                passwordChecks.hasSpecial ? 'bg-green-500 w-1/4' : 'bg-gray-300 w-1/4'
              }`} />
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
            <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-green-800">{success}</p>
          </div>
        )}

        <div className="pt-4">
          <Button
            type="submit"
            disabled={loading || !currentPassword || !effectiveAllRequirements || !effectivePasswordsMatch}
            className="w-full"
          >
            {loading ? 'Cambiando contraseña...' : 'Cambiar Contraseña'}
          </Button>
        </div>

        <p className="text-xs text-slate-500 text-center">
          Esta acción es obligatoria. No podrás acceder al sistema sin cambiar tu contraseña.
        </p>
      </form>
    </Modal>
  );
}
