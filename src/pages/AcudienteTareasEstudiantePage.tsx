import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AcudienteLayout from '../components/AcudienteLayout';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Button from '../components/ui/Button';
import { listarTareasEstudiante, type TareaAsignadaMovil } from '../api/acudiente';

export default function AcudienteTareasEstudiantePage(){
  const { id } = useParams();
  const estudianteId = Number(id);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const [items, setItems] = useState<TareaAsignadaMovil[]>([]);
  const [periodo, setPeriodo] = useState<string|number>('');
  const [soloEspeciales, setSoloEspeciales] = useState(false);
  const [orden, setOrden] = useState<'recientes_envio'|'recientes'|'antiguas'|'pendientes_primero'>('recientes_envio');

  const load = async () => {
    if (!estudianteId) return;
    setLoading(true);
    setError(null);
    try {
      const list = await listarTareasEstudiante(estudianteId, { periodo: periodo || undefined });
      setItems(Array.isArray(list) ? list : []);
    } catch (e: any) {
      setError(e?.message || 'Error al cargar tareas');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [estudianteId, periodo]);
  useEffect(() => {
    if (estudianteId) {
      try { localStorage.setItem('acudiente_estudiante_id', String(estudianteId)); } catch {}
    }
  }, [estudianteId]);

  const itemsFiltrados = items.filter(t => {
    const esInd = (t as any)?.esIndividual ?? (t as any)?.es_individual ?? false;
    return !soloEspeciales || Boolean(esInd);
  });

  const itemsOrdenados = useMemo(() => {
    const arr = [...itemsFiltrados];
    const ts = (d?: string | null) => d ? new Date(d).getTime() : 0;
    const asignTs = (t: any) => {
      const flat = ts(t?.fechaAsignacion) || ts(t?.asignadaEn) || ts(t?.asignada_el) || ts(t?.asignacionFecha) || ts(t?.fechaAsignada) || ts(t?.createdAt) || ts(t?.created_at) || ts(t?.updatedAt) || ts(t?.updated_at) || ts(t?.fechaCreacion) || ts(t?.fecha_creacion);
      if (flat) return flat;
      const nested = (t?.asignacion || t?.assignment || {}) as any;
      return ts(nested?.fechaAsignacion) || ts(nested?.asignadaEn) || ts(nested?.createdAt) || ts(nested?.created_at) || ts(nested?.updatedAt) || ts(nested?.updated_at) || 0;
    };
    if (orden === 'recientes_envio') arr.sort((a:any,b:any)=> asignTs(b) - asignTs(a));
    if (orden === 'recientes') arr.sort((a,b)=> ts(b.fechaVencimiento as any) - ts(a.fechaVencimiento as any));
    if (orden === 'antiguas') arr.sort((a,b)=> ts(a.fechaVencimiento as any) - ts(b.fechaVencimiento as any));
    if (orden === 'pendientes_primero') arr.sort((a,b)=> {
      const pa = a.estado === 'pendiente' ? 0 : 1;
      const pb = b.estado === 'pendiente' ? 0 : 1;
      if (pa !== pb) return pa - pb;
      return asignTs(b as any) - asignTs(a as any);
    });
    return arr;
  }, [itemsFiltrados, orden]);

  return (
    <AcudienteLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-slate-800">Tareas del estudiante</h1>
          <div className="flex items-center gap-2 flex-wrap">
            <select className="px-3 py-2 rounded-xl border-2 border-gray-200" value={periodo} onChange={(e)=>setPeriodo(e.target.value)}>
              <option value="">Todos los periodos</option>
              {/* Si se requiere, poblar periodos desde API */}
            </select>
            <label className="flex items-center gap-2 text-sm px-3 py-2 rounded-xl border-2 border-gray-200">
              <input type="checkbox" checked={soloEspeciales} onChange={(e)=> setSoloEspeciales(e.target.checked)} />
              Solo especiales
            </label>
            <select className="px-3 py-2 rounded-xl border-2 border-gray-200" value={orden} onChange={(e)=> setOrden(e.target.value as any)}>
              <option value="recientes_envio">Más recientes (enviadas)</option>
              <option value="recientes">Más recientes (vencimiento)</option>
              <option value="pendientes_primero">Pendientes primero</option>
              <option value="antiguas">Más antiguas</option>
            </select>
            <Button variant="secondary" onClick={load}>Actualizar</Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48"><LoadingSpinner size="lg" text="Cargando..."/></div>
        ) : error ? (
          <div className="p-4 bg-red-50 text-red-700 rounded-xl">{error}</div>
        ) : itemsOrdenados.length === 0 ? (
          <div className="p-4 bg-amber-50 text-amber-700 rounded-xl">No hay tareas para mostrar.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {itemsOrdenados.map(t => {
              const badgeClass = t.estado === 'calificada'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : t.estado === 'entregada' 
                  ? 'bg-sky-50 text-sky-700 border-sky-200'
                  : t.estado === 'entregada_tardia'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-slate-50 text-slate-700 border-slate-200';
              const esInd = (t as any)?.esIndividual ?? (t as any)?.es_individual ?? false;
              const btnText = t.estado === 'pendiente' ? 'Ver detalle / Entregar' : 'Ver detalle';
              const vence = (t as any)?.fechaVencimiento || (t as any)?.vence || (t as any)?.fechaFin || (t as any)?.fecha_fin || (t as any)?.deadline || '';
              const venceMostrar = vence && String(vence).trim().length > 0 ? String(vence) : '-';
              return (
                <div key={t.id} className="bg-white border rounded-2xl p-5 hover:shadow-md transition-all">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-900 text-base leading-snug line-clamp-2">{t.titulo}</h3>
                      {esInd && (
                        <span className="text-[11px] px-2 py-0.5 rounded-md bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200">Especial</span>
                      )}
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-lg border ${badgeClass}`} data-status={t.estado}>{t.estado.replace('_', ' ')}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-700 line-clamp-3">{t.descripcion}</p>
                  <div className="mt-2 text-xs text-slate-500">Vence: {venceMostrar}</div>
                  <div className="mt-4 text-right">
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
