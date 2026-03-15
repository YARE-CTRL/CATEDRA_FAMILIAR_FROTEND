import { useEffect, useState } from 'react';

import { useParams } from 'react-router-dom';

import TeacherLayout from '../components/TeacherLayout';

import LoadingSpinner from '../components/ui/LoadingSpinner';

import Button from '../components/ui/Button';

import Modal from '../components/ui/Modal';

import { getResumenAsignacion, getResumenAsignacionOrientador, listarCursos, listarEntregasDocente, listarEntregasOrientador, crearCalificacion, type ResumenAsignacionBackend, type CursoBackend } from '../api/docentes';

import { getSession } from '../api/endpoints';



export default function DocenteAsignacionResumenPage(){

  const { id } = useParams();

  const asignacionId = Number(id);

  const session = getSession();

  const user = session?.user;



  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string|null>(null);

  const [data, setData] = useState<ResumenAsignacionBackend | null>(null);

  const [cursos, setCursos] = useState<CursoBackend[]>([]);

  const [cursoId, setCursoId] = useState<number | ''>('');

  const [entregas, setEntregas] = useState<any[]>([]);

  const [filtroEntregas, setFiltroEntregas] = useState<'todas' | 'enviadas' | 'calificadas'>('todas');

  const [evidenceModal, setEvidenceModal] = useState<{ open: boolean; entrega: any | null }>({ open: false, entrega: null });

  const [savingEntregaId, setSavingEntregaId] = useState<number | null>(null);

  const [autoRan, setAutoRan] = useState<boolean>(false);

  const [buscar, setBuscar] = useState<string>('');

  const [orden, setOrden] = useState<'recientes' | 'antiguas' | 'nombre'>('recientes');

  const [expandTexto, setExpandTexto] = useState<boolean>(false);



  useEffect(() => {

    if (!evidenceModal.open) {

      setExpandTexto(false);

      return;

    }

    setExpandTexto(false);

  }, [evidenceModal.open, evidenceModal.entrega?.id]);



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



  const load = async () => {

    if (!asignacionId) return;

    setLoading(true);

    setError(null);

    try {

      const isOrientador = user?.rol === 'orientador';

      const [res, cur, ent] = await Promise.all([

        isOrientador

          ? getResumenAsignacionOrientador(asignacionId)

          : getResumenAsignacion(asignacionId, { cursoId: cursoId ? Number(cursoId) : undefined }),

        listarCursos(),

        isOrientador

          ? listarEntregasOrientador({ asignacionId, soloPendientes: false })

          : listarEntregasDocente({ asignacionId, soloPendientes: false })

      ]);

      setData(res);

      setCursos(cur);

      const entList = Array.isArray((ent as any)?.data) ? (ent as any).data : (Array.isArray(ent as any) ? (ent as any) : []);

      setEntregas(entList as any[]);



      // Auto-calificar envíos pendientes (sin calificación)

      // Ejecuta una sola vez por cambio de asignación/curso

      const pendientes = (entList as any[]).filter((e: any) => !e.calificacion);

      if (!autoRan && pendientes.length > 0) {

        setAutoRan(true);

        try {

          await Promise.all(

            pendientes.map((e: any) => crearCalificacion({

              entregaId: e.id,

              // omitimos nota para que el backend calcule y marque esAutomatica=true

              escala: '1-5',

              retroalimentacion: 'Calificación automática por regla de tiempo de entrega.'

            }))

          );

          // recargar para reflejar calificaciones

          const entRef = isOrientador

            ? await listarEntregasOrientador({ asignacionId, soloPendientes: false })

            : await listarEntregasDocente({ asignacionId, soloPendientes: false });

          const entRefList = Array.isArray((entRef as any)?.data) ? (entRef as any).data : (Array.isArray(entRef as any) ? (entRef as any) : []);

          setEntregas(entRefList as any[]);

        } catch (e) {

          // si falla, continuar sin bloquear la vista

          console.warn('Auto-calificación: algunos elementos no pudieron calificarse');

        }

      }

    } catch (e: any) {

      setError(e?.message || 'Error al cargar resumen');

    } finally {

      setLoading(false);

    }

  };



  useEffect(() => { setAutoRan(false); load(); }, [asignacionId, cursoId]);



  const total = data?.totalEstudiantes ?? 0;

  const realizadas = data?.entregasRealizadas ?? 0;

  const calif = data?.calificaciones ?? 0;

  const pendientes = data?.entregasPendientes ?? Math.max(0, total - realizadas);

  const pct = total ? Math.round((realizadas/total)*100) : 0;

  const api = '/api';

  const origin = String(api).replace(/\/$/, '').replace(/\/api$/, '');

  const absHref = (url?: string) => {

    if (!url) return '#';

    return url.startsWith('http') ? url : `${origin}${url.startsWith('/') ? '' : '/'}${url}`;

  };



  // Derivación amigable para UI si el backend no trae totales

  const uniqueEst = Array.from(new Set(entregas.map((e:any)=> e.estudianteId || e.estudiante?.id))).filter(Boolean);

  const hasEntregas = entregas.length > 0;

  const dTotal = uniqueEst.length || (hasEntregas ? 1 : 0);

  const dRealizadas = entregas.length;

  const dCalif = entregas.filter((e:any)=> !!e.calificacion).length;

  const showTotal = total === 0 && hasEntregas ? dTotal : total;

  const showRealizadas = realizadas === 0 && hasEntregas ? dRealizadas : realizadas;

  const showCalif = calif === 0 && hasEntregas ? dCalif : calif;

  const showPendientes = (data?.entregasPendientes ?? 0) === 0 && hasEntregas

    ? Math.max(0, showTotal - showRealizadas)

    : pendientes;

  const showPct = showTotal ? Math.round((showRealizadas/showTotal)*100) : 0;



  const entregasFiltradas = entregas

    .filter(e => {

      if (filtroEntregas !== 'todas') {

        const tieneCalif = !!e.calificacion;

        if (filtroEntregas === 'calificadas' && !tieneCalif) return false;

        if (filtroEntregas === 'enviadas' && tieneCalif) return false;

      }

      if (buscar.trim()) {

        const q = buscar.trim().toLowerCase();

        const nombreQ = (e.estudianteNombre || (e.estudiante ? `${e.estudiante.nombres} ${e.estudiante.apellidos}` : `#${e.estudianteId}`)).toLowerCase();

        return nombreQ.includes(q);

      }

      return true;

    })

    .sort((a, b) => {

      if (orden === 'nombre') {

        const an = (a.estudianteNombre || (a.estudiante ? `${a.estudiante.nombres} ${a.estudiante.apellidos}` : `#${a.estudianteId}`)).toLowerCase();

        const bn = (b.estudianteNombre || (b.estudiante ? `${b.estudiante.nombres} ${b.estudiante.apellidos}` : `#${b.estudianteId}`)).toLowerCase();

        return an.localeCompare(bn);

      }

      const ad = a.fechaEntrega ? new Date(a.fechaEntrega).getTime() : 0;

      const bd = b.fechaEntrega ? new Date(b.fechaEntrega).getTime() : 0;

      return orden === 'recientes' ? (bd - ad) : (ad - bd);

    });



  const copyRowLinks = async (entrega: any) => {

    const items = Array.isArray(entrega?.archivos) ? entrega.archivos : [];

    const txt = items.map((it:any)=> absHref(it.url)).join('\n');

    if (!txt) return;

    try { await navigator.clipboard.writeText(txt); } catch {}

  };

  const openAllLinks = (entrega: any) => {

    const items = Array.isArray(entrega?.archivos) ? entrega.archivos : [];

    items.forEach((it: any) => window.open(absHref(it.url), '_blank'));

  };



  const fileIcon = (name?: string, mime?: string) => {

    const n = (name || '').toLowerCase();

    const m = (mime || '').toLowerCase();

    const is = (ext: string) => n.endsWith(ext);

    if (m.includes('image') || ['.png','.jpg','.jpeg','.gif','.webp','.bmp','.svg'].some(is)) return (

      <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-emerald-50 text-emerald-600 text-[11px] font-semibold">IMG</span>

    );

    if (m.includes('pdf') || n.endsWith('.pdf')) return (

      <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-rose-50 text-rose-600 text-[11px] font-semibold">PDF</span>

    );

    if (m.includes('zip') || n.endsWith('.zip') || n.endsWith('.rar') || n.endsWith('.7z')) return (

      <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-slate-100 text-slate-600 text-[11px] font-semibold">ZIP</span>

    );

    if (m.includes('video') || ['.mp4','.mov','.avi','.mkv','.webm'].some(is)) return (

      <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-indigo-50 text-indigo-600 text-[11px] font-semibold">VID</span>

    );

    if (m.includes('audio') || ['.mp3','.wav','.m4a','.aac','.ogg'].some(is)) return (

      <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-amber-50 text-amber-600 text-[11px] font-semibold">AUD</span>

    );

    if (['.doc','.docx'].some(is)) return (

      <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-blue-50 text-blue-600 text-[11px] font-semibold">DOC</span>

    );

    if (['.xls','.xlsx','.csv'].some(is)) return (

      <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-green-50 text-green-600 text-[11px] font-semibold">XLS</span>

    );

    if (['.ppt','.pptx'].some(is)) return (

      <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-orange-50 text-orange-600 text-[11px] font-semibold">PPT</span>

    );

    return (

      <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-slate-100 text-slate-600 text-[11px] font-semibold">FILE</span>

    );

  };



  const aplicarNotaSugerida = async (entrega: any) => {

    if (!entrega?.id) return;

    try {

      setSavingEntregaId(entrega.id);

      await crearCalificacion({

        entregaId: entrega.id,

        // Omitimos nota para que el backend calcule y marque esAutomatica=true

        escala: '1-5',

        retroalimentacion: 'Calificación automática por regla de tiempo de entrega.'

      });

      // Recargar entregas y resumen

      await load();

    } catch (e: any) {

      alert(e?.message || 'No se pudo aplicar la nota sugerida');

    } finally {

      setSavingEntregaId(null);

    }

  };



  return (

    <TeacherLayout>

      <div className="max-w-6xl mx-auto space-y-6">

        <div className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-teal-50/40 to-emerald-50/30 rounded-2xl p-6 border border-teal-100/50">

          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-teal-200/20 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />

          <div className="relative flex items-end justify-between gap-3">

            <div>

              <h1 className="text-2xl md:text-3xl font-display font-bold text-slate-800">Resumen de asignación</h1>

              <p className="text-slate-600 mt-1 text-sm">{data?.titulo || `Asignación #${asignacionId}`}</p>

            </div>

            <div className="min-w-[220px]">

              <label className="block text-xs font-semibold text-slate-600 mb-1">Filtrar por curso</label>

              <select className="w-full px-3 py-2 rounded-xl border-2 border-gray-200 focus:border-teal-500" value={cursoId} onChange={(e)=> setCursoId(e.target.value ? Number(e.target.value) : '')}>

                <option value="">Todos</option>

                {cursos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}

              </select>

            </div>

          </div>

        </div>



        {loading ? (

          <div className="flex items-center justify-center h-48"><LoadingSpinner size="lg" text="Cargando..."/></div>

        ) : error ? (

          <div className="p-4 bg-red-50 text-red-700 rounded-xl">{error}</div>

        ) : (

          <>

            <div className="grid md:grid-cols-4 gap-4">

              <StatCard title="Estudiantes" value={showTotal} accent="teal" />

              <StatCard title="Entregas" value={`${showRealizadas}/${showTotal}`} subtitle={`${showPct}%`} progress={showPct} accent="emerald" />

              <StatCard title="Pendientes" value={showPendientes} accent="amber" />

              <StatCard title="Calificaciones" value={showCalif} accent="indigo" />

            </div>



            {data?.porCurso && data.porCurso.length > 0 && (

              <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">

                <div className="px-4 py-3 border-b border-slate-100 font-semibold text-slate-800">Detalle por curso</div>

                <div className="divide-y divide-slate-100">

                  {data.porCurso.map(c => {

                    const tot = c.totalEstudiantes;

                    const ent = c.entregasRealizadas;

                    const pctc = tot ? Math.round((ent/tot)*100) : 0;

                    return (

                      <div key={c.cursoId} className="px-4 py-3 flex items-center justify-between">

                        <div className="font-medium text-slate-800">{c.cursoNombre}</div>

                        <div className="text-slate-700">{ent}/{tot} • {pctc}% • Calif: {c.calificaciones}</div>

                        <div>

                          <Button size="sm" variant="secondary" onClick={()=> setCursoId(c.cursoId)}>Ver solo este</Button>

                        </div>

                      </div>

                    );

                  })}

                </div>

              </div>

            )}



            {/* Entregas con nota */}

            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">

              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">

                <div>

                  <div className="font-semibold text-slate-800">Entregas y calificaciones</div>

                  <div className="text-xs text-slate-500 mt-0.5">Regla: a tiempo = 5.0 • tarde = 5.0 - 0.1 por día (mín 1.0)</div>

                </div>

                <div className="flex items-center gap-2">

                  <div className="flex gap-1 bg-slate-100 rounded-xl p-1">

                    {(['todas','enviadas','calificadas'] as const).map(f => (

                      <button

                        key={f}

                        onClick={()=> setFiltroEntregas(f)}

                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${

                          filtroEntregas === f ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-600'

                        }`}

                      >

                        {f === 'todas' ? 'Todas' : f === 'enviadas' ? 'Enviadas' : 'Calificadas'}

                      </button>

                    ))}

                  </div>

                  <input

                    value={buscar}

                    onChange={(e)=> setBuscar(e.target.value)}

                    placeholder="Buscar estudiante..."

                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs w-44"

                  />

                  <select value={orden} onChange={(e)=> setOrden(e.target.value as any)} className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs">

                    <option value="recientes">Más recientes</option>

                    <option value="antiguas">Más antiguas</option>

                    <option value="nombre">Por nombre</option>

                  </select>

                </div>

              </div>

              {entregasFiltradas.length === 0 ? (

                <div className="px-4 py-6 text-slate-500 text-sm">No hay entregas registradas para esta asignación.</div>

              ) : (

                <div className="overflow-x-auto">

                  <table className="min-w-full text-xs md:text-sm">

                    <thead className="bg-slate-50 sticky top-0 z-10">

                      <tr className="text-left text-slate-600">

                        <th className="px-3 py-2">Estudiante</th>

                        <th className="px-3 py-2">Estado</th>

                        <th className="px-3 py-2">Fecha</th>

                        <th className="px-3 py-2">Evidencia</th>

                        <th className="px-3 py-2">Nota</th>

                        <th className="px-3 py-2">Escala</th>

                        <th className="px-3 py-2 text-right">Acciones</th>

                      </tr>

                    </thead>

                    <tbody className="divide-y divide-slate-100">

                      {entregasFiltradas.map((e) => {

                        const nombre = e.estudianteNombre || (e.estudiante ? `${e.estudiante.nombres} ${e.estudiante.apellidos}` : `#${e.estudianteId}`);

                        const fechaFmt = e.fechaEntrega ? new Date(e.fechaEntrega).toLocaleString() : '-';

                        // Preferir vencimiento de la entrega si viene; si no, usar el de la asignación (varios alias comunes)

                        const vNorm = normalizeDeadline(

                          e.fechaVencimiento || e.fecha_vencimiento ||

                          (data as any)?.fechaVencimiento || (data as any)?.fecha_vencimiento ||

                          (data as any)?.vencimiento || (data as any)?.fechas?.vencimiento

                        );

                        const fEnt = parseDate(e.fechaEntrega);

                        const tardiaCalc = vNorm && fEnt ? (fEnt.getTime() > vNorm.getTime()) : false;

                        const diasTardeCalc = (vNorm && fEnt && tardiaCalc) ? Math.max(1, Math.ceil((fEnt.getTime() - vNorm.getTime()) / (24*60*60*1000))) : 0;

                        const notaReal = e.calificacion?.nota != null ? (typeof e.calificacion.nota === 'number' ? e.calificacion.nota.toFixed(1) : e.calificacion.nota) : null;

                        const nota = notaReal ?? (e.calificacionSugerida != null ? `${Number(e.calificacionSugerida).toFixed(1)} (sugerida)` : '-');

                        const escala = e.calificacion?.escala || (notaReal == null && e.calificacionSugerida != null ? '1-5' : '-');

                        const tieneCalificacion = !!e.calificacion;

                        const archivosCount = Array.isArray(e.archivos) ? e.archivos.length : 0;

                        const tieneTexto = !!e.evidenciaTexto;

                        const evidenciaDesc = (

                          archivosCount > 0 && tieneTexto ? `Texto + ${archivosCount} archivo(s)` :

                          archivosCount > 0 ? `${archivosCount} archivo(s)` :

                          tieneTexto ? 'Texto' : '—'

                        );

                        return (

                          <tr key={e.id} className="hover:bg-slate-50/50">

                            <td className="px-3 py-1.5 text-slate-800">{nombre}</td>

                            <td className="px-3 py-1.5">

                              {tieneCalificacion ? (

                                <span className="px-2 py-0.5 rounded-lg text-xs border bg-emerald-50 text-emerald-700 border-emerald-200">Calificada</span>

                              ) : (

                                <span className="px-2 py-0.5 rounded-lg text-xs border bg-amber-50 text-amber-700 border-amber-200">Enviada • Sin calificar</span>

                              )}

                            </td>

                            <td className="px-3 py-1.5 text-slate-600">

                              <div className="flex items-center gap-2">

                                <span>{fechaFmt}</span>

                                {(e.entregadoATiempo === true || (e.entregadoATiempo == null && tardiaCalc === false)) && (

                                  <span className="px-2 py-0.5 rounded-lg text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200">A tiempo</span>

                                )}

                                {(e.entregadoATiempo === false || (e.entregadoATiempo == null && tardiaCalc === true)) && (

                                  <span className="px-2 py-0.5 rounded-lg text-[10px] bg-rose-50 text-rose-700 border border-rose-200">Tarde{(typeof e.diasTarde === 'number' ? e.diasTarde : diasTardeCalc) ? ` (${(typeof e.diasTarde === 'number' ? e.diasTarde : diasTardeCalc)} d)` : ''}</span>

                                )}

                              </div>

                            </td>

                            <td className="px-3 py-1.5 text-slate-700">{evidenciaDesc}</td>

                            <td className="px-3 py-1.5 font-semibold text-slate-800">{nota}</td>

                            <td className="px-3 py-1.5 text-slate-600">{escala}</td>

                            <td className="px-3 py-1.5 text-right space-x-3">

                              {(archivosCount > 0 || tieneTexto) ? (

                                <>

                                  <button

                                    className="text-teal-700 underline"

                                    onClick={() => setEvidenceModal({ open: true, entrega: e })}

                                  >

                                    Ver evidencia

                                  </button>

                                  {archivosCount > 0 && (

                                    <button className="text-slate-600 underline" onClick={()=> copyRowLinks(e)}>Copiar enlaces</button>

                                  )}

                                </>

                              ) : (

                                <span className="text-slate-400">—</span>

                              )}

                              {/* Botón de calificar manual removido: el sistema aplica la calificación automáticamente */}

                            </td>

                          </tr>

                        )

                      })}

                    </tbody>

                  </table>

                </div>

              )}

            </div>

            {/* Modal Ver Evidencia */}

            <Modal

              isOpen={evidenceModal.open}

              onClose={() => setEvidenceModal({ open: false, entrega: null })}

              title="Evidencia de la entrega"

              size="xl"

            >

              {evidenceModal.entrega && (

                <div className="space-y-4">

                  {/* Header enriquecido */}

                  <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-50 via-white to-slate-50 p-4">

                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">

                      <div>

                        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Estudiante</div>

                        <div className="mt-2 text-lg font-semibold text-slate-900 flex items-center gap-2 flex-wrap">

                          <span>{evidenceModal.entrega.estudianteNombre || (evidenceModal.entrega.estudiante ? `${evidenceModal.entrega.estudiante.nombres} ${evidenceModal.entrega.estudiante.apellidos}` : `#${evidenceModal.entrega.estudianteId}`)}</span>

                          {evidenceModal.entrega?.curso?.nombre && (

                            <span className="px-3 py-1 rounded-full border bg-sky-50 text-sky-700 border-sky-200 text-xs font-semibold">{evidenceModal.entrega.curso.nombre}</span>

                          )}

                          {(evidenceModal.entrega?.esIndividual === true || evidenceModal.entrega?.especial === true || evidenceModal.entrega?.asignacion?.esIndividual === true) && (

                            <span className="px-3 py-1 rounded-full border bg-purple-50 text-purple-700 border-purple-200 text-xs font-semibold">Especial</span>

                          )}

                        </div>

                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 text-sm">

                        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">

                          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Fecha</div>

                          <div className="mt-1 text-sm font-semibold text-slate-800">{evidenceModal.entrega.fechaEntrega ? new Date(evidenceModal.entrega.fechaEntrega).toLocaleString() : '-'}</div>

                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">

                          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Estado</div>

                          <div className="mt-2">

                            {evidenceModal.entrega.entregadoATiempo === true && (

                              <span className="inline-flex px-3 py-1 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-semibold">A tiempo</span>

                            )}

                            {evidenceModal.entrega.entregadoATiempo === false && (

                              <span className="inline-flex px-3 py-1 rounded-full border bg-rose-50 text-rose-700 border-rose-200 text-xs font-semibold">Tarde{typeof evidenceModal.entrega.diasTarde === 'number' ? ` (${evidenceModal.entrega.diasTarde} d)` : ''}</span>

                            )}

                            {evidenceModal.entrega.entregadoATiempo !== true && evidenceModal.entrega.entregadoATiempo !== false && (

                              <span className="inline-flex px-3 py-1 rounded-full border bg-slate-50 text-slate-700 border-slate-200 text-xs font-semibold">Sin estado</span>

                            )}

                          </div>

                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:col-span-2 xl:col-span-1">

                          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Nota</div>

                          <div className="mt-1 flex items-end gap-2">

                            <span className="text-2xl font-bold text-teal-700">{evidenceModal.entrega.calificacion ? (typeof evidenceModal.entrega.calificacion.nota === 'number' ? evidenceModal.entrega.calificacion.nota.toFixed(1) : evidenceModal.entrega.calificacion.nota) : '--'}</span>

                            <span className="pb-1 text-xs font-medium text-slate-500">{evidenceModal.entrega.calificacion?.escala || '1-5'}</span>

                          </div>

                        </div>

                      </div>

                    </div>

                  </div>



                  {/* Cuerpo en dos columnas */}

                  <div className="grid md:grid-cols-5 gap-4">

                    <div className="md:col-span-2 space-y-3">

                      <div className="text-xs font-semibold text-slate-500">Resumen</div>

                      <div className="rounded-xl border bg-white p-3 text-xs text-slate-600">

                        <div className="flex items-center justify-between py-1 border-b border-slate-100">

                          <span>Estado</span>

                          <span className={`px-2 py-0.5 rounded-lg border ${evidenceModal.entrega.calificacion ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>{evidenceModal.entrega.calificacion ? 'Calificada' : 'Enviada'}</span>

                        </div>

                        <div className="flex items-center justify-between py-1">

                          <span>Archivos</span>

                          <span className="font-medium text-slate-800">{Array.isArray(evidenceModal.entrega.archivos) ? evidenceModal.entrega.archivos.length : 0}</span>

                        </div>

                      </div>

                    </div>



                    <div className="md:col-span-3 space-y-3">

                      <div className="flex items-center justify-between">

                        <div className="text-xs font-semibold text-slate-500">Archivos</div>

                        {Array.isArray(evidenceModal.entrega.archivos) && evidenceModal.entrega.archivos.length > 0 && (

                          <div className="flex items-center gap-2">

                            <button className="px-3 py-1.5 rounded-lg border bg-white text-slate-700 text-xs" onClick={()=> copyRowLinks(evidenceModal.entrega)}>Copiar todos</button>

                            <button className="px-3 py-1.5 rounded-lg border bg-teal-600 text-white text-xs" onClick={()=> openAllLinks(evidenceModal.entrega)}>Abrir todos</button>

                          </div>

                        )}

                      </div>



                      {(!Array.isArray(evidenceModal.entrega.archivos) || evidenceModal.entrega.archivos.length === 0) ? (

                        <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-slate-500 text-sm">No se adjuntaron archivos en esta entrega.</div>

                      ) : (

                        <div className="divide-y rounded-xl border border-slate-200 bg-white">

                          {evidenceModal.entrega.archivos.map((a: any, idx: number) => {

                            const url = absHref(a.url);

                            const name = a.originalName || a.fileName || a.nombre || `Archivo ${idx+1}`;

                            return (

                              <div key={idx} className="flex items-center justify-between gap-3 px-3 py-2">

                                <div className="flex items-center gap-2 min-w-0">

                                  {fileIcon(name, a.mime)}

                                  <div className="truncate text-sm text-slate-800" title={name}>{name}</div>

                                </div>

                                <div className="flex items-center gap-2">

                                  <a className="text-teal-700 underline text-xs" href={url} target="_blank" rel="noopener noreferrer">Abrir</a>

                                  <button className="text-slate-600 text-xs underline" onClick={async ()=> { try { await navigator.clipboard.writeText(url); } catch {} }}>Copiar</button>

                                </div>

                              </div>

                            );

                          })}

                        </div>

                      )}

                    </div>



                    {evidenceModal.entrega.evidenciaTexto && (

                      <div className="md:col-span-5 space-y-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">

                        <div className="flex items-center justify-between gap-3">

                          <div className="text-xs font-semibold text-slate-500">Texto enviado</div>

                          <div className="text-xs text-slate-400">{String(evidenceModal.entrega.evidenciaTexto).trim().length} caracteres</div>

                        </div>

                        <div className={`relative rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition-all ${expandTexto ? 'max-h-none' : 'max-h-56 overflow-hidden'}`}>

                          <div className="relative z-10 min-h-[3rem] whitespace-pre-wrap break-words text-[16px] font-medium leading-7 text-slate-900 [text-shadow:0_0_0_transparent]">

                            {evidenceModal.entrega.evidenciaTexto}

                          </div>

                          {!expandTexto && (<div className="absolute bottom-0 left-0 right-0 z-20 h-12 bg-gradient-to-t from-white via-white/90 to-transparent pointer-events-none" />)}

                        </div>

                        <div className="flex justify-end">

                          <button className="inline-flex items-center rounded-full border border-teal-200 bg-white px-4 py-2 text-sm font-semibold text-teal-700 shadow-sm transition hover:bg-teal-50" onClick={()=> setExpandTexto(prev => !prev)}>{expandTexto ? 'Ver menos' : 'Ver más'}</button>

                        </div>

                      </div>

                    )}

                  </div>

                </div>

              )}

            </Modal>

          </>

        )}

      </div>

    </TeacherLayout>

  );

}



function StatCard({ title, value, subtitle, progress, accent }: { title: string; value: any; subtitle?: string; progress?: number; accent?: 'teal'|'emerald'|'amber'|'indigo'|'rose' }){

  const ring = accent === 'emerald' ? 'from-emerald-50 border-emerald-100/60' :

              accent === 'amber'   ? 'from-amber-50 border-amber-100/60'   :

              accent === 'indigo'  ? 'from-indigo-50 border-indigo-100/60' :

              'from-teal-50 border-teal-100/60';

  const barBg = 'bg-slate-100';

  const barFg = accent === 'emerald' ? 'bg-emerald-500' :

                accent === 'amber'   ? 'bg-amber-500'   :

                accent === 'indigo'  ? 'bg-indigo-500'  :

                'bg-teal-500';

  const pct = typeof progress === 'number' ? Math.max(0, Math.min(100, Math.round(progress))) : null;

  return (

    <div className={`relative overflow-hidden rounded-2xl p-4 border ${ring} bg-gradient-to-br ${ring}`}>

      <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/40" />

      <div className="relative">

        <div className="text-xs font-semibold text-slate-600">{title}</div>

        <div className="text-2xl font-bold text-slate-800">{value}</div>

        {subtitle && <div className="text-sm text-slate-600">{subtitle}</div>}

        {pct !== null && (

          <div className={`mt-2 h-2 w-full rounded-full ${barBg}`}>

            <div className={`h-2 rounded-full ${barFg}`} style={{ width: `${pct}%` }} />

          </div>

        )}

      </div>

    </div>

  );

}

