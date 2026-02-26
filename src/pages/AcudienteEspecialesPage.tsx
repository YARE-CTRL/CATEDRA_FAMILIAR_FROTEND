import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import AcudienteLayout from '../components/AcudienteLayout';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { getMisEstudiantesAcudiente, listarTareasEspeciales, type TareaAsignadaMovil } from '../api/acudiente';

export default function AcudienteEspecialesPage(){
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);
  const [estudiantes, setEstudiantes] = useState<Array<{ id: number; nombres?: string; apellidos?: string }>>([]);
  const [estudianteId, setEstudianteId] = useState<number | ''>('');
  const [periodo, setPeriodo] = useState<string|number>('');
  const [estado, setEstado] = useState<string>('');
  const [items, setItems] = useState<TareaAsignadaMovil[]>([]);
  const effectiveId = typeof estudianteId === 'number' && estudianteId > 0 ? estudianteId : (estudiantes[0]?.id || null);

  // Inicializar estudianteId desde query (?estudianteId=) o localStorage si existe
  useEffect(() => {
    const qId = searchParams.get('estudianteId');
    if (qId) {
      const nid = Number(qId);
      if (nid && !Number.isNaN(nid)) { setEstudianteId(nid); return; }
    }
    try {
      const v = localStorage.getItem('acudiente_estudiante_id');
      if (v) {
        const nid = Number(v);
        if (nid && !Number.isNaN(nid)) setEstudianteId(nid);
      }
    } catch {}
  }, [searchParams]);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      // cargar hijos (para selector) y elegir por defecto
      try {
        const es = await getMisEstudiantesAcudiente();
        if (Array.isArray(es)) setEstudiantes(es);
        // preferir id proveniente de query/localStorage/estado actual
        const fromState = (typeof estudianteId === 'number' && estudianteId > 0) ? estudianteId : null;
        const eidLocal = fromState ?? (Array.isArray(es) && es[0]?.id ? Number(es[0].id) : null);
        if (!fromState && eidLocal) setEstudianteId(eidLocal);
        if (eidLocal) {
          const listNow = await listarTareasEspeciales(eidLocal, { periodo: periodo || undefined });
          setItems(Array.isArray(listNow) ? listNow : []);
          setLoading(false);
          return;
        }
      } catch {}
      // Cargar especiales con id numérico si existe; si no, 'me'
      if (effectiveId) {
        const list = await listarTareasEspeciales(effectiveId, { periodo: periodo || undefined });
        setItems(Array.isArray(list) ? list : []);
      } else {
        setItems([]);
      }
    } catch (e: any) {
      setError(e?.message || 'Error al cargar especiales');
      setItems([]);
    } finally { setLoading(false); }
  };

  useEffect(()=>{ load(); }, [periodo, estudianteId]);

  const itemsFiltrados = useMemo(()=>{
    return items
      .filter((t)=> {
        const esInd = (t as any)?.esIndividual ?? (t as any)?.es_individual ?? false;
        if (!esInd) return false;
        if (!estado) return true;
        return t.estado === estado;
      });
  }, [items, estado]);

  return (
    <AcudienteLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-800">Entregas especiales</h1>
            <p className="text-slate-600 text-sm">Tareas asignadas individualmente a tu hijo(a).</p>
          </div>
          <div className="flex items-center gap-2">
            {estudiantes.length > 0 && (
              <select className="px-3 py-2 rounded-xl border-2 border-gray-200" value={estudianteId} onChange={(e)=> setEstudianteId(e.target.value ? Number(e.target.value) : '')}>
                <option value="">Selecciona estudiante</option>
                {estudiantes.map(e => (
                  <option key={e.id} value={e.id}>{`${e.nombres || ''} ${e.apellidos || ''}`.trim() || `Estudiante #${e.id}`}</option>
                ))}
              </select>
            )}
            <select className="px-3 py-2 rounded-xl border-2 border-gray-200" value={periodo} onChange={(e)=> setPeriodo(e.target.value)}>
              <option value="">Todos los periodos</option>
            </select>
            <select className="px-3 py-2 rounded-xl border-2 border-gray-200" value={estado} onChange={(e)=> setEstado(e.target.value)}>
              <option value="">Todos</option>
              <option value="pendiente">Pendiente</option>
              <option value="entregada">Entregada</option>
              <option value="calificada">Calificada</option>
              <option value="vencida">Vencida</option>
            </select>
            <Button variant="secondary" onClick={load}>Actualizar</Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48"><LoadingSpinner size="lg" text="Cargando..."/></div>
        ) : error ? (
          <div className="p-4 bg-red-50 text-red-700 rounded-xl">{error}</div>
        ) : itemsFiltrados.length === 0 ? (
          <div className="p-4 bg-amber-50 text-amber-700 rounded-xl">
            {estudiantes.length === 0
              ? 'No hay estudiantes asociados a tu cuenta.'
              : 'No hay entregas especiales para mostrar.'}
          </div>
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
              const btnText = t.estado === 'pendiente' ? 'Ver detalle / Entregar' : 'Ver detalle';
              return (
                <div key={t.id} className="bg-white border rounded-2xl p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-800">{t.titulo}</h3>
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200">Especial</span>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-lg border ${badgeClass}`} data-status={t.estado}>{t.estado.replace('_', ' ')}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600 line-clamp-3">{t.descripcion}</p>
                  <div className="mt-2 text-xs text-slate-500">Vence: {t.fechaVencimiento || '-'}</div>
                  <div className="mt-3 text-right">
                    <Link to={`/acudiente/asignaciones/${t.id}${effectiveId ? `?estudianteId=${effectiveId}` : ''}`} state={{ asignacion: t }}>
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
