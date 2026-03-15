import { useEffect, useState } from 'react';

import { Link, useParams } from 'react-router-dom';

import AcudienteLayout from '../components/AcudienteLayout';

import { getSession } from '../api/endpoints';

import LoadingSpinner from '../components/ui/LoadingSpinner';

import Button from '../components/ui/Button';

import { listarTareasEstudiante, type TareaAsignadaMovil } from '../api/acudiente';



export default function AcudienteTareasEstudiantePage(){

  const { id } = useParams();

  const session = getSession();

  const estudianteId = Number(id);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string|null>(null);

  const [items, setItems] = useState<TareaAsignadaMovil[]>([]);

  const [periodo, setPeriodo] = useState<string|number>('');

  const [soloEspeciales, setSoloEspeciales] = useState(false);



  const load = async () => {

    if (!estudianteId) return;

    try {
      console.log('[ACUDIENTE][TAREAS_ESTUDIANTE][LOAD]', {
        routeId: id,
        estudianteId,
        periodo,
        rol: session?.user?.rol,
        sessionUserId: session?.user?.id,
        localPreferredStudentId: localStorage.getItem('acudiente_estudiante_id')
      });
    } catch {}

    setLoading(true);

    setError(null);

    try {

      const list = await listarTareasEstudiante(estudianteId, { periodo: periodo || undefined });

      setItems(Array.isArray(list) ? list : []);

    } catch (e: any) {

      try {
        console.error('[ACUDIENTE][TAREAS_ESTUDIANTE][ERROR]', {
          routeId: id,
          estudianteId,
          periodo,
          errorMessage: e?.message,
          errorStatus: e?.status,
          rol: session?.user?.rol,
          sessionUserId: session?.user?.id,
          localPreferredStudentId: localStorage.getItem('acudiente_estudiante_id')
        });
      } catch {}

      setError(e?.message || 'Error al cargar tareas');

    } finally { setLoading(false); }

  };



  useEffect(() => { load(); }, [estudianteId, periodo]);

  useEffect(() => {

    try {
      console.log('[ACUDIENTE][TAREAS_ESTUDIANTE][MOUNT]', {
        routeId: id,
        estudianteId,
        rol: session?.user?.rol,
        sessionUserId: session?.user?.id,
        localPreferredStudentId: localStorage.getItem('acudiente_estudiante_id')
      });
    } catch {}

    if (estudianteId) {

      try { localStorage.setItem('acudiente_estudiante_id', String(estudianteId)); } catch {}

    }

  }, [estudianteId]);



  const itemsFiltrados = items.filter(t => {

    const esInd = (t as any)?.esIndividual ?? (t as any)?.es_individual ?? false;

    return !soloEspeciales || Boolean(esInd);

  });



  return (

    <AcudienteLayout>

      <div className="space-y-4">

        <div className="flex items-center justify-between">

          <h1 className="text-xl font-semibold text-slate-800">Tareas del Estudiante #{estudianteId}</h1>

          <div className="flex items-center gap-2">

            <select className="px-3 py-2 rounded-xl border-2 border-gray-200" value={periodo} onChange={(e)=>setPeriodo(e.target.value)}>

              <option value="">Todos los periodos</option>

              {/* Si se requiere, poblar periodos desde API */}

            </select>

            <label className="flex items-center gap-2 text-sm px-3 py-2 rounded-xl border-2 border-gray-200">

              <input type="checkbox" checked={soloEspeciales} onChange={(e)=> setSoloEspeciales(e.target.checked)} />

              Solo especiales

            </label>

            <Button variant="secondary" onClick={load}>Actualizar</Button>

          </div>

        </div>



        {loading ? (

          <div className="flex items-center justify-center h-48"><LoadingSpinner size="lg" text="Cargando..."/></div>

        ) : error ? (

          <div className="p-4 bg-red-50 text-red-700 rounded-xl">{error}</div>

        ) : itemsFiltrados.length === 0 ? (

          <div className="p-4 bg-amber-50 text-amber-700 rounded-xl">No hay tareas para mostrar.</div>

        ) : (

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {itemsFiltrados.map(t => {

              const badgeClass = t.estado === 'calificada'

                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'

                : t.estado === 'entregada' 

                  ? 'bg-sky-50 text-sky-700 border-sky-200'

                  : t.estado === 'entregada_tardia'

                    ? 'bg-amber-50 text-amber-700 border-amber-200'

                    : 'bg-slate-50 text-slate-700 border-slate-200';

              const esInd = (t as any)?.esIndividual ?? (t as any)?.es_individual ?? false;

              const btnText = t.estado === 'pendiente' ? 'Ver detalle / Entregar' : 'Ver detalle';

              return (

                <div key={t.id} className="bg-white border rounded-2xl p-4">

                  <div className="flex items-center justify-between gap-2">

                    <div className="flex items-center gap-2">

                      <h3 className="font-semibold text-slate-800">{t.titulo}</h3>

                      {esInd && (

                        <span className="text-[11px] px-2 py-0.5 rounded-md bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200">Especial</span>

                      )}

                    </div>

                    <span className={`text-xs px-2 py-1 rounded-lg border ${badgeClass}`} data-status={t.estado}>{t.estado.replace('_', ' ')}</span>

                  </div>

                  <p className="mt-1 text-sm text-slate-600 line-clamp-3">{t.descripcion}</p>

                  <div className="mt-2 text-xs text-slate-500">Vence: {t.fechaVencimiento || '-'}</div>

                  <div className="mt-3 text-right">

                    <Link to={`/acudiente/asignaciones/${t.id}?estudianteId=${estudianteId}`} state={{ asignacion: t }}>

                      <Button size="sm">{btnText}</Button>

                    </Link>

                  </div>

                </div>

              );

            })}

          </div>

        )}

      </div>

    </AcudienteLayout>

  );

}

