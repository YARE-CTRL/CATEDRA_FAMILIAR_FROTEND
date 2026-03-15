import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AcudienteLayout from '../components/AcudienteLayout';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { getMisTareasAcudiente } from '../api/acudiente';

export default function AcudienteTareasAutoPage(){
  const navigate = useNavigate();

  useEffect(() => {
    const run = async () => {
      try {
        const { estudiantes } = await getMisTareasAcudiente();
        if (Array.isArray(estudiantes) && estudiantes.length > 0) {
          const allowedIds = new Set(
            estudiantes
              .map((estudiante) => Number(estudiante?.id))
              .filter((id) => id && !Number.isNaN(id))
          );

          try {
            const v = localStorage.getItem('acudiente_estudiante_id');
            if (v) {
              const preferredId = Number(v);
              if (preferredId && !Number.isNaN(preferredId) && allowedIds.has(preferredId)) {
                navigate(`/acudiente/estudiantes/${preferredId}/tareas`, { replace: true });
                return;
              }
            }
          } catch {}

          const firstId = Number(estudiantes[0]?.id);
          if (firstId && !Number.isNaN(firstId)) {
            try { localStorage.setItem('acudiente_estudiante_id', String(firstId)); } catch {}
            navigate(`/acudiente/estudiantes/${firstId}/tareas`, { replace: true });
            return;
          }
        }
      } catch (error) {
        try {
          console.error('[ACUDIENTE][TAREAS_AUTO][ERROR]', error);
        } catch {}
      }

      navigate('/dashboard/acudiente', { replace: true });
    };
    run();
  }, [navigate]);

  return (
    <AcudienteLayout>
      <div className="h-64 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Redirigiendo a tus tareas..." />
      </div>
    </AcudienteLayout>
  );
}
