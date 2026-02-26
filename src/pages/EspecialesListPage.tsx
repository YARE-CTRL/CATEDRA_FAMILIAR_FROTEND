import { useEffect, useMemo, useState } from 'react';
import TeacherLayout from '../components/TeacherLayout';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { getSession } from '../api/endpoints';
import { listarAsignaciones, listarAsignacionesOrientador, listarEntregasDocente, listarEntregasOrientador, listarPeriodos, type AsignacionBackend, type PeriodoBackend } from '../api/docentes';
import { Link } from 'react-router-dom';

export default function EspecialesListPage(){
  const session = getSession();
  const user = session?.user;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);
  const [items, setItems] = useState<AsignacionBackend[]>([]);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [estado, setEstado] = useState<string>('');
  const [periodos, setPeriodos] = useState<PeriodoBackend[]>([]);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const isOrientador = user?.rol === 'orientador';
      const [res, pers] = await Promise.all([
        isOrientador
          ? listarAsignacionesOrientador({ page, perPage, estado: estado as any })
          : listarAsignaciones({ page, perPage, estado: estado as any }),
        listarPeriodos().catch(()=> [])
      ]);
      const resAny: any = res as any;
      const list = Array.isArray(resAny?.data) ? resAny.data : (Array.isArray(resAny?.data?.data) ? resAny.data.data : (Array.isArray(resAny) ? resAny : []));
      const specials = (list as any[]).filter((a: any) => a?.esIndividual === true);
      if (Array.isArray(pers)) setPeriodos(pers as PeriodoBackend[]);

      const parseDate = (s?: string) => {
        if (!s) return null as Date | null;
        const d = new Date(s);
        return isNaN(d.getTime()) ? null : d;
      };
      const normalizeDeadline = (s?: string) => {
        const d = parseDate(s);
        if (!d) return null as Date | null;
        const isMidnightUTC = d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0 && d.getUTCMilliseconds() === 0;
        if (isMidnightUTC) {
          const local = new Date(d);
          local.setHours(23, 59, 59, 999);
          return local;
        }
        return d;
      };

      // Enriquecer estado/entregas por asignación especial
      const enriched = await Promise.all((specials as any[]).map(async (a: any) => {
        try {
          const ent = isOrientador
            ? await listarEntregasOrientador({ asignacionId: Number(a.id), soloPendientes: false })
            : await listarEntregasDocente({ asignacionId: Number(a.id), soloPendientes: false });
          const entAny: any = ent as any;
          const listEnt = Array.isArray(entAny?.data) ? entAny.data : (Array.isArray(entAny) ? entAny : []);
          const metaEnt = entAny?.meta || {};
          const total = (typeof metaEnt?.total === 'number' && metaEnt.total > 0) ? metaEnt.total : listEnt.length;
          const realizadas = listEnt.filter((e: any) => !!e.calificacion || e.estado === 'calificada').length;
          const now = new Date();
          const end = a.fechaVencimiento ? normalizeDeadline(a.fechaVencimiento) : null;
          const isPast = end ? end.getTime() < now.getTime() : false;
          let estadoVis = a.estado || '';
          if (total > 0 && realizadas >= total) estadoVis = 'calificada';
          else if (total > 0) estadoVis = 'entregada';
          else estadoVis = end ? (isPast ? 'vencida' : 'pendiente') : 'pendiente';
          return { ...a, entregas: { realizadas, total }, estado: estadoVis };
        } catch {
          return a;
        }
      }));

      setItems(enriched as any);
    } catch (e: any) {
      setError(e?.message || 'Error al cargar especiales');
    } finally { setLoading(false); }
  };

  useEffect(()=>{ load(); }, [page, perPage, estado, user?.rol]);

  const total = items.length; // sin backend total específico por ahora

  return (
    <TeacherLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-teal-50/40 to-emerald-50/30 rounded-2xl p-6 border border-teal-100/50">
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-display font-bold text-slate-800">Asignaciones especiales</h1>
              <p className="text-slate-600 mt-1 text-sm">Solo aquellas dirigidas a estudiante(s) específico(s).</p>
            </div>
            <div className="flex items-center gap-2">
              <select className="px-3 py-2 rounded-xl border-2 border-slate-200 focus:border-teal-500 outline-none" value={perPage} onChange={(e)=>{setPerPage(Number(e.target.value)); setPage(1);}}>
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>
              <select className="px-3 py-2 rounded-xl border-2 border-slate-200 focus:border-teal-500 outline-none" value={estado} onChange={(e)=>{setEstado(e.target.value); setPage(1);}}>
                <option value="">Todos</option>
                <option value="pendiente">Pendiente</option>
                <option value="entregada">Entregada</option>
                <option value="calificada">Calificada</option>
                <option value="vencida">Vencida</option>
              </select>
              <Button variant="secondary" onClick={load}>Recargar</Button>
              <Link to="/docente/especiales/nueva"><Button>Nueva especial</Button></Link>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48"><LoadingSpinner size="lg" text="Cargando..."/></div>
        ) : error ? (
          <div className="p-4 bg-red-50 text-red-700 rounded-xl">{error}</div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">Título</th>
                    <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">Entregas/Total</th>
                    <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">%Entrega</th>
                    <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">Estado</th>
                    <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">Vence</th>
                    <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">Etiqueta</th>
                    <th className="px-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((a)=>{
                    const vence = a.fechaVencimiento || '-';
                    const total = (a as any)?.entregas?.total ?? 0;
                    const realizadas = (a as any)?.entregas?.realizadas ?? 0;
                    const pct = total ? Math.round((realizadas/total)*100) : 0;
                    return (
                      <tr key={a.id} className="border-t border-slate-100">
                        <td className="px-4 py-3 font-medium text-slate-800">{a.titulo}</td>
                        <td className="px-4 py-3 text-slate-700">{realizadas}/{total}</td>
                        <td className="px-4 py-3 text-slate-700">{pct}%</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-lg text-xs border ${a.estado==='calificada' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : a.estado==='entregada' ? 'bg-blue-50 text-blue-700 border-blue-200' : a.estado==='pendiente' ? 'bg-amber-50 text-amber-700 border-amber-200' : a.estado==='vencida' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-slate-50 text-slate-700 border-slate-200'}`}>{a.estado || '-'}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{vence}</td>
                        <td className="px-4 py-3"><span className="px-2 py-1 rounded-lg text-xs bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200">Especial</span></td>
                        <td className="px-4 py-3 text-right">
                          <Link to={`/docente/asignaciones/${a.id}`}><Button size="sm">Ver</Button></Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
              <div className="text-sm text-slate-600">Total {total}</div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={()=> setPage(1)} disabled={page===1}>«</Button>
                <Button size="sm" variant="ghost" onClick={()=> setPage(p=> Math.max(1, p-1))} disabled={page===1}>Anterior</Button>
                <Button size="sm" variant="ghost" onClick={()=> setPage(p=> p+1)}>Siguiente</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </TeacherLayout>
  );
}
