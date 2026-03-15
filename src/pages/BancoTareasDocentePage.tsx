import { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import TeacherLayout from '../components/TeacherLayout';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import FormFieldInput from '../components/ui/FormFieldInput';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useToast } from '../components/ui/ToastGlobal';
import EmptyState404 from '../components/ui/EmptyState404';
import { listarBancoTareas, listarBancoTareasDocenteInstitucion, listarCursos, listarPeriodos, crearAsignacion, crearAsignacionOrientador, updateBancoTarea, deleteBancoTarea, crearAsignacionEspecial, crearAsignacionOrientadorEspecial, listarEstudiantesDocente, type BancoTareaBackend, type CursoBackend, type PeriodoBackend } from '../api/docentes';
import { getCursosPorInstitucion, getGradosPublic, getEstudiantesInstitucionOrientador } from '../api/endpointsDocente-orinetador';
import { getSession } from '../api/endpoints';

export default function BancoTareasDocentePage(){
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [items, setItems] = useState<BancoTareaBackend[]>([]);
  const [institutionTaskIds, setInstitutionTaskIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [categoriaId, setCategoriaId] = useState<number | ''>('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(12);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [soloConRecurso, setSoloConRecurso] = useState<boolean>(false);
  const [orden, setOrden] = useState<'recientes' | 'usos' | 'titulo'>('recientes');
  const [bankTab, setBankTab] = useState<'mias' | 'otras'>('mias');

  const [cursos, setCursos] = useState<CursoBackend[]>([]);
  const [periodos, setPeriodos] = useState<PeriodoBackend[]>([]);

  const [selected, setSelected] = useState<BancoTareaBackend | null>(null);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<BancoTareaBackend | null>(null);
  const session = getSession();

  // Campos del modal
  const [cursoIds, setCursoIds] = useState<number[]>([]); // usaremos solo 1 curso (cursoId)
  const [periodoId, setPeriodoId] = useState<number | ''>('');
  const [fechaInicio, setFechaInicio] = useState<string>('');
  const [fechaVencimiento, setFechaVencimiento] = useState<string>('');
  const [frecuencia, setFrecuencia] = useState<'unica'|'semanal'|'mensual'>('unica');
  const [incluirEnBoletin, setIncluirEnBoletin] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [descripcionExtra, setDescripcionExtra] = useState('');
  const [enlaces, setEnlaces] = useState<string[]>(['']);
  // Modal especial
  const [especialOpen, setEspecialOpen] = useState(false);
  const [especialTarea, setEspecialTarea] = useState<BancoTareaBackend | null>(null);
  const [especialPeriodoId, setEspecialPeriodoId] = useState<number | ''>('');
  const [especialFechaInicio, setEspecialFechaInicio] = useState<string>('');
  const [especialFechaVenc, setEspecialFechaVenc] = useState<string>('');
  const [especialTitulo, setEspecialTitulo] = useState<string>('');
  const [especialInBoletin, setEspecialInBoletin] = useState(false);
  const [especialTema, setEspecialTema] = useState<string>('');
  const [especialSaving, setEspecialSaving] = useState(false);
  const [estudiantes, setEstudiantes] = useState<Array<{id:number; nombre:string}>>([]);
  const [selEstudiantes, setSelEstudiantes] = useState<number[]>([]);
  const [qEst, setQEst] = useState('');
  // Edición de plantilla
  const [editTitulo, setEditTitulo] = useState('');
  const [editDescripcion, setEditDescripcion] = useState('');
  const [editTema, setEditTema] = useState('');
  const [editFile, setEditFile] = useState<File | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState<BancoTareaBackend | null>(null);

  const normalizeHref = (url?: string) => {
    if (!url) return '#';
    return url.startsWith('http') ? url : `${window.location.origin}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const normalizeCursos = (raw: any): CursoBackend[] => {
    const list = Array.isArray(raw)
      ? raw
      : Array.isArray(raw?.data)
        ? raw.data
        : Array.isArray(raw?.cursos)
          ? raw.cursos
          : Array.isArray(raw?.items)
            ? raw.items
            : Array.isArray(raw?.data?.data)
              ? raw.data.data
              : Array.isArray(raw?.data?.cursos)
                ? raw.data.cursos
                : [];

    return list
      .map((c: any) => {
        const idRaw =
          c?.id ??
          c?.cursoId ??
          c?.curso_id ??
          c?.idCurso ??
          c?.id_curso ??
          c?.curso?.id ??
          c?.pivot?.cursoId ??
          0;
        const id = Number(idRaw) || 0;
        const gradoNombre = c?.grado?.nombre || c?.gradoNombre || c?.grado_nombre || c?.gradoDescripcion || c?.grado?.descripcion || c?.grado;
        const grupo = c?.grupo?.nombre || c?.grupoNombre || c?.grupo || c?.letra || c?.paralelo || c?.seccion;
        const nombreDerivado = [gradoNombre, grupo].filter(Boolean).join(' ');
        const nombre = c?.nombre || c?.nombreCurso || c?.nombre_curso || c?.nombreCompleto || c?.nombre_completo || c?.name || c?.curso?.nombre || nombreDerivado || (gradoNombre || grupo) || (id ? `Curso #${id}` : 'Curso');
        return {
          ...c,
          id,
          nombre
        };
      })
      .filter((c: any) => Number.isFinite(c.id) && c.id > 0)
      .filter((c: any, index: number, arr: any[]) => arr.findIndex((x: any) => x.id === c.id) === index);
  };

  const normalizeBancoTareas = (raw: any): BancoTareaBackend[] => {
    if (Array.isArray(raw)) return raw as BancoTareaBackend[];
    if (Array.isArray(raw?.data?.data)) return raw.data.data as BancoTareaBackend[];
    if (Array.isArray(raw?.data)) return raw.data as BancoTareaBackend[];
    if (Array.isArray(raw?.items)) return raw.items as BancoTareaBackend[];
    if (Array.isArray(raw?.tareas)) return raw.tareas as BancoTareaBackend[];
    if (Array.isArray(raw?.data?.tareas)) return raw.data.tareas as BancoTareaBackend[];
    return [];
  };

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const instId = (session as any)?.user?.institucionId || (session as any)?.context?.institucionId || 0;
    const institutionSet = new Set(institutionTaskIds);
    const isDocente = session?.user?.rol === 'docente_aula';
    const baseInst = items.filter((t: any) => {
      if (isDocente) {
        const belongsToInstitution = institutionSet.has(Number((t as any)?.id));
        return bankTab === 'mias' ? belongsToInstitution : !belongsToInstitution;
      }
      const rawTid = (t as any)?.institucionId ?? (t as any)?.institucion_id ?? (t as any)?.institucion?.id ?? null;
      const tid = rawTid == null || rawTid === '' ? null : Number(rawTid);
      if (!instId) return bankTab === 'mias';
      if (bankTab === 'mias') return tid === Number(instId);
      return tid == null || tid !== Number(instId);
    });
    const base = baseInst.filter(t => {
      const byQ = term ? (`${t.titulo} ${t.descripcion} ${t.tema ?? ''}`).toLowerCase().includes(term) : true;
      const byCat = categoriaId ? t.categoriaId === categoriaId : true;
      const hasRecurso = Boolean((t as any)?.enlace);
      const byRec = soloConRecurso ? hasRecurso : true;
      return byQ && byCat && byRec;
    });
    const arr = [...base];
    arr.sort((a: any, b: any) => {
      if (orden === 'titulo') return String(a?.titulo || '').localeCompare(String(b?.titulo || ''));
      if (orden === 'usos') {
        const ua = (a?.vecesUtilizada ?? a?.veces_utilizada ?? 0) as number;
        const ub = (b?.vecesUtilizada ?? b?.veces_utilizada ?? 0) as number;
        return ub - ua;
      }
      const fa = a?.updatedAt ? new Date(a.updatedAt).getTime() : (a?.createdAt ? new Date(a.createdAt).getTime() : 0);
      const fb = b?.updatedAt ? new Date(b.updatedAt).getTime() : (b?.createdAt ? new Date(b.createdAt).getTime() : 0);
      return fb - fa;
    });
    return arr;
  }, [items, q, categoriaId, soloConRecurso, orden, bankTab, session, institutionTaskIds]);

  const IconEye = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"></path>
      <circle cx="12" cy="12" r="3"></circle>
    </svg>
  );
  const IconEdit = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
  const IconTrash = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a2 2 0 012-2h2a2 2 0 012 2v2" />
    </svg>
  );

  const paginated = useMemo(() => {
    const start = (page - 1) * limit;
    return filtered.slice(start, start + limit);
  }, [filtered, page, limit]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / limit));

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const isOrientador = session?.user?.rol === 'orientador';
      const isDocente = session?.user?.rol === 'docente_aula';
      const instId = (session as any)?.user?.institucionId || (session as any)?.context?.institucionId || 0;

      const [tareasRes, cursosRes, periodosRes] = await Promise.all([
        (async () => {
          if (isDocente) {
            const [generalTasksRes, institucionRes] = await Promise.all([
              listarBancoTareas().catch(() => [] as any[]),
              listarBancoTareasDocenteInstitucion().catch(() => ({ docente: undefined, institucion: undefined, totalTareas: 0, tareas: [] as any[] }))
            ]);

            const generalTasks = normalizeBancoTareas(generalTasksRes);
            const institucionTasks = Array.isArray(institucionRes?.tareas) ? institucionRes.tareas : [];
            const institucionInfo = institucionRes?.institucion;
            const institucionTaskIds = new Set(institucionTasks.map((t: any) => Number(t?.id)).filter((id: number) => Number.isFinite(id)));
            setInstitutionTaskIds(Array.from(institucionTaskIds));

            const mergedTasks = [
              ...institucionTasks,
              ...generalTasks.filter((t: any) => !institucionTaskIds.has(Number(t?.id)))
            ];

            return mergedTasks.map((t: any) => {
              const rawTid = t?.institucionId ?? t?.institucion_id ?? t?.institucion?.id;
              if (rawTid != null && rawTid !== '') return t;
              if (institucionTaskIds.has(Number(t?.id))) {
                const resolvedInstId = institucionInfo?.id ?? Number(instId) ?? undefined;
                return {
                  ...t,
                  institucionId: resolvedInstId,
                  institucion_id: resolvedInstId,
                  institucion: institucionInfo,
                  institucion_nombre: institucionInfo?.nombre ?? t?.institucion_nombre
                };
              }
              return t;
            });
          }
          setInstitutionTaskIds([]);
          return await listarBancoTareas();
        })(),
        (async () => {
          if (isOrientador) {
            // 1) Preferir /grados y aplanar cursos
            try {
              const gradosRes = await getGradosPublic();
              if (gradosRes.success && Array.isArray(gradosRes.data) && gradosRes.data.length) {
                const flat = gradosRes.data
                  .flatMap((g: any) => {
                    const cursosGrado = normalizeCursos(g?.cursos ?? g?.data?.cursos ?? []);
                    return cursosGrado.map((c: any) => ({ ...c, institucionId: g?.institucionId ?? g?.institucion_id ?? c?.institucionId }));
                  })
                  .filter((c: any) => !instId || !c.institucionId || Number(c.institucionId) === Number(instId)) as CursoBackend[];
                if (flat.length) return flat;
              }
            } catch {}
            // 2) Fallback: /cursos/institucion/:id
            try {
              const r = await getCursosPorInstitucion(Number(instId || 0));
              const data = normalizeCursos(r?.data);
              if (data.length) return data;
            } catch {}
          }
          // Docente o fallback
          return normalizeCursos(await listarCursos());
        })(),
        listarPeriodos(),
      ]);
      setItems(Array.isArray(tareasRes) ? tareasRes : []);
      setCursos(Array.isArray(cursosRes) ? cursosRes : []);
      setPeriodos(Array.isArray(periodosRes) ? periodosRes : []);
    } catch (e: any) {
      setError(e?.message || 'Error al cargar banco de tareas');
    } finally {
      setLoading(false);
    }
  };

  const openEspecial = async (t: BancoTareaBackend) => {
    setEspecialTarea(t);
    setEspecialTitulo(t.titulo || '');
    setEspecialTema(t.tema || '');
    setEspecialPeriodoId('');
    setEspecialFechaInicio('');
    setEspecialFechaVenc('');
    setEspecialInBoletin(false);
    setSelEstudiantes([]);
    setQEst('');
    setEspecialOpen(true);
    // cargar estudiantes según rol
    try {
      const isOrientador = session?.user?.rol === 'orientador';
      if (isOrientador) {
        const data: any = await getEstudiantesInstitucionOrientador();
        const list = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
        setEstudiantes(list.map((e:any)=>({ id: Number(e.id), nombre: `${e?.nombres || e?.nombre || ''} ${e?.apellidos || ''}`.trim() })));        
      } else {
        const list: any = await listarEstudiantesDocente();
        const arr = Array.isArray(list) ? list : (Array.isArray(list?.data) ? list.data : []);
        setEstudiantes(arr.map((e:any)=>({ id: Number(e.id), nombre: `${e?.nombres || e?.nombre || ''} ${e?.apellidos || ''}`.trim() })));
      }
    } catch (e:any) {
      showToast(e?.message || 'No se pudieron cargar estudiantes', 'error');
      setEstudiantes([]);
    }
  };

  const toggleEst = (id:number) => {
    setSelEstudiantes(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id]);
  };

  const onAsignarEspecial = async () => {
    if (!especialTarea) return;
    if (!especialPeriodoId || selEstudiantes.length===0) { showToast('Selecciona período y al menos un estudiante', 'error'); return; }
    setEspecialSaving(true);
    try {
      const isOrientador = session?.user?.rol === 'orientador';
      const today = new Date().toISOString().slice(0,10);
      const payload: any = {
        bancoTareaId: Number(especialTarea.id),
        periodoId: Number(especialPeriodoId),
        estudianteIds: selEstudiantes,
        fechaInicio: especialFechaInicio || today,
        fechaVencimiento: especialFechaVenc || undefined,
        frecuencia: 'unica',
        incluirEnBoletin: especialInBoletin,
        titulo: especialTitulo || especialTarea.titulo,
        descripcion: especialTarea.descripcion,
        tema: especialTema || especialTarea.tema,
      };
      const res = isOrientador
        ? await crearAsignacionOrientadorEspecial(payload)
        : await crearAsignacionEspecial(payload);
      const ok = (res as any)?.success !== false;
      if (!ok) { showToast((res as any)?.message || 'No se pudo asignar especial', 'error'); return; }
      // Incrementar usos localmente
      setItems(prev => prev.map(it => it.id === (especialTarea as any).id
        ? ({
            ...(it as any),
            vecesUtilizada: ((it as any)?.vecesUtilizada ?? (it as any)?.veces_utilizada ?? 0) + 1,
            veces_utilizada: ((it as any)?.veces_utilizada ?? (it as any)?.vecesUtilizada ?? 0) + 1
          }) as any
        : it
      ));
      setEspecialOpen(false);
      showToast('Asignación especial creada', 'success');
    } catch (e:any) {
      showToast(e?.message || 'Error al crear especial', 'error');
    } finally { setEspecialSaving(false); }
  };

  useEffect(() => { load(); }, []);

  const openAsignar = (t: BancoTareaBackend) => {
    setSelected(t);
    setTitulo(t.titulo);
    setCursoIds([]);
    setPeriodoId('');
    setFechaInicio('');
    setFechaVencimiento('');
    setFrecuencia('unica');
    setIncluirEnBoletin(false);
    setDescripcionExtra('');
    setEnlaces(['']);
  };

  const addEnlace = () => setEnlaces(prev => [...prev, '']);
  const removeEnlace = (idx: number) => setEnlaces(prev => prev.filter((_, i) => i !== idx));
  const updateEnlace = (idx: number, val: string) => setEnlaces(prev => prev.map((v, i) => i === idx ? val : v));

  const onAsignar = async () => {
    if (!selected) return;
    if (!periodoId || (cursoIds.length === 0)) { showToast('Selecciona período y un curso', 'error'); return; }
    if (cursoIds.length !== 1) { showToast('Por ahora solo se permite asignar a un curso a la vez', 'error'); return; }

    setSaving(true);
    try {
      // Empaquetar enlaces/notas en descripcion adicional si no hay campo dedicado
      const extra = buildExtraDescripcion();
      const descripcion = extra ? `${selected.descripcion}\n\n${extra}` : selected.descripcion;

      const isOrientador = session?.user?.rol === 'orientador';
      const today = new Date().toISOString().slice(0,10);
      const payload = {
        bancoTareaId: selected.id,
        cursoId: cursoIds[0],
        periodoId: Number(periodoId),
        fechaInicio: fechaInicio || today,
        fechaVencimiento: fechaVencimiento || undefined,
        frecuencia,
        incluirEnBoletin,
        titulo: titulo || selected.titulo,
        descripcion,
        tema: selected.tema,
        institucionId: session?.user?.institucionId,
      } as any;

      // Debug
      // eslint-disable-next-line no-console
      console.log('crearAsignacion payload:', payload);

      const result = isOrientador
        ? await crearAsignacionOrientador(payload)
        : await crearAsignacion(payload);

      const ok = (result as any)?.success !== false; // asumir éxito si backend no envía bandera
      if (!ok) {
        showToast((result as any)?.message || 'No se pudo asignar la tarea', 'error');
        return;
      }
      // Incrementar usos localmente
      setItems(prev => prev.map(it => it.id === selected.id
        ? ({
            ...(it as any),
            vecesUtilizada: ((it as any)?.vecesUtilizada ?? (it as any)?.veces_utilizada ?? 0) + 1,
            veces_utilizada: ((it as any)?.veces_utilizada ?? (it as any)?.vecesUtilizada ?? 0) + 1
          }) as any
        : it
      ));
      const createdId = (result as any)?.id || (result as any)?.data?.id;
      setSelected(null);
      showToast('Tarea asignada correctamente', 'success');
      navigate('/docente/asignaciones', { state: createdId ? { highlightId: createdId } : undefined });
    } catch (e: any) {
      console.error('crearAsignacion error:', e);
      const msg = e?.response?.data?.message || e?.message || 'No se pudo asignar la tarea. Intenta de nuevo.';
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const buildExtraDescripcion = () => {
    const lines: string[] = [];
    if (descripcionExtra.trim()) {
      lines.push(`Nota del docente: ${descripcionExtra.trim()}`);
    }
    const links = enlaces.map(e => e.trim()).filter(Boolean);
    if (links.length) {
      lines.push('Recursos de apoyo:');
      links.forEach((l, i) => lines.push(`- ${l}`));
    }
    return lines.join('\n');
  };

  const toggleCurso = (id: number) => {
    setCursoIds(prev => (prev.includes(id) ? [] : [id]));
  };

  return (
    <TeacherLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-teal-50/40 to-emerald-50/30 rounded-2xl p-6 border border-teal-100/50">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-teal-200/20 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-display font-bold text-slate-800">Banco de Tareas</h1>
              <p className="text-slate-600 mt-1 text-sm">Selecciona una tarea y asígnala a tus cursos, agregando recursos de apoyo.</p>
              <div className="mt-3 inline-flex rounded-xl border-2 border-slate-200 overflow-hidden">
                <button
                  className={`px-4 py-2 text-sm font-medium ${bankTab==='mias' ? 'bg-white text-teal-700' : 'bg-slate-100 text-slate-700'} hover:bg-white`}
                  onClick={()=> { setBankTab('mias'); setQ(''); setCategoriaId(''); setSoloConRecurso(false); setPage(1); }}
                >
                  Mi institución
                </button>
                <button
                  className={`px-4 py-2 text-sm font-medium border-l-2 border-slate-200 ${bankTab==='otras' ? 'bg-white text-teal-700' : 'bg-slate-100 text-slate-700'} hover:bg-white`}
                  onClick={()=> { setBankTab('otras'); setQ(''); setCategoriaId(''); setSoloConRecurso(false); setPage(1); }}
                >
                  Otras instituciones
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <input
                value={q}
                onChange={(e) => { setQ(e.target.value); setPage(1); }}
                placeholder="Buscar por título/tema"
                className="px-3 py-2 rounded-xl border-2 border-slate-200 focus:border-teal-500 outline-none w-64"
              />
              <select className="px-3 py-2 rounded-xl border-2 border-slate-200 focus:border-teal-500 outline-none" value={limit} onChange={(e)=>{setLimit(Number(e.target.value)); setPage(1);}}>
                <option value={8}>8</option>
                <option value={12}>12</option>
                <option value={24}>24</option>
              </select>
              <label className="flex items-center gap-2 text-xs text-slate-700 bg-white px-2 py-1 rounded-lg border border-slate-200">
                <input type="checkbox" className="h-4 w-4" checked={soloConRecurso} onChange={(e)=> { setSoloConRecurso(e.target.checked); setPage(1); }} />
                Solo con recurso
              </label>
              <select className="px-3 py-2 rounded-xl border-2 border-slate-200 focus:border-teal-500 outline-none text-sm" value={orden} onChange={(e)=> setOrden(e.target.value as any)}>
                <option value="recientes">Más recientes</option>
                <option value="usos">Más usadas</option>
                <option value="titulo">Por título</option>
              </select>
              <div className="hidden md:flex items-center rounded-xl border-2 border-slate-200 overflow-hidden">
                <button
                  className={`px-3 py-2 text-sm ${viewMode==='grid' ? 'bg-white text-teal-700' : 'bg-slate-100 text-slate-700'} hover:bg-white`}
                  onClick={()=> setViewMode('grid')}
                  title="Vista de grilla"
                >
                  Grilla
                </button>
                <button
                  className={`px-3 py-2 text-sm ${viewMode==='table' ? 'bg-white text-teal-700' : 'bg-slate-100 text-slate-700'} hover:bg-white border-l-2 border-slate-200`}
                  onClick={()=> setViewMode('table')}
                  title="Vista de tabla"
                >
                  Tabla
                </button>
              </div>
              <Button variant="secondary" onClick={load}>Recargar</Button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48"><LoadingSpinner size="lg" text="Cargando..."/></div>
        ) : error ? (
          <EmptyState404 title="Error" message={error} action={<Button onClick={load}>Reintentar</Button>} />
        ) : (
          <>
            {viewMode === 'grid' ? (
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-8">
                {paginated.map(t => {
                  const hasRecurso = Boolean((t as any)?.enlace);
                  const usos = (t as any)?.vecesUtilizada ?? (t as any)?.veces_utilizada ?? 0;
                  return (
                    <div key={t.id} className="relative bg-white rounded-2xl border border-slate-100 hover:border-teal-200 hover:shadow-xl transition-all p-6 flex flex-col gap-4 min-h-[240px]">
                      {/* Rail utilitario */}
                      <div className="absolute top-3 right-3 hidden md:flex flex-col gap-2">
                        <button
                          className="p-2 rounded-xl border-2 border-gray-200 hover:border-teal-300 text-slate-600"
                          aria-label="Ver"
                          title="Vista previa"
                          onClick={()=> { setPreviewItem(t); setPreviewOpen(true); }}
                        >
                          <IconEye />
                        </button>
                        <button
                          className="p-2 rounded-xl border-2 border-gray-200 hover:border-teal-300 text-slate-600"
                          aria-label="Editar"
                          title="Editar"
                          onClick={()=> { setEditing(t); setEditTitulo(t.titulo || ''); setEditDescripcion(t.descripcion || ''); setEditTema(t.tema || ''); setEditFile(null); }}
                        >
                          <IconEdit />
                        </button>
                        <button
                          className="p-2 rounded-xl border-2 border-rose-200 hover:border-rose-400 text-rose-600"
                          aria-label="Eliminar"
                          title="Eliminar"
                          onClick={async ()=>{
                            try {
                              await deleteBancoTarea(Number(t.id));
                              showToast('Plantilla eliminada', 'success');
                              load();
                            } catch (e: any) {
                              const status = e?.status || e?.response?.status;
                              const msg = status === 409 ? 'No se puede eliminar: está referenciada por asignaciones.' : (e?.message || 'Error al eliminar');
                              showToast(msg, 'error');
                            }
                          }}
                        >
                          <IconTrash />
                        </button>
                      </div>

                      <div className="flex items-start justify-between gap-3 pr-12">
                        <div className="min-w-0">
                          <h3 className="text-lg font-semibold text-slate-900 leading-snug line-clamp-2">{t.titulo}</h3>
                          <div className="mt-1 flex items-center gap-2 text-xs">
                            {t.tema && (
                              <span className="px-2 py-1 rounded bg-purple-100 text-purple-700 font-medium">{t.tema}</span>
                            )}
                            {(t as any)?.institucion?.nombre && (
                              <span className="px-2 py-1 rounded bg-sky-100 text-sky-700 font-medium">{(t as any).institucion.nombre}</span>
                            )}
                            {hasRecurso && (
                              <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-700 font-medium">Recurso sugerido</span>
                            )}
                          </div>
                        </div>
                        <span className="shrink-0 px-2 py-1 rounded border border-teal-200 bg-teal-50 text-teal-700 text-xs font-semibold">{usos} usos</span>
                      </div>

                      <p className="text-sm text-slate-700 line-clamp-3">{t.descripcion}</p>

                      {hasRecurso && (
                        <button className="text-teal-600 text-sm underline" onClick={() => { setPreviewItem(t); setPreviewOpen(true); }}>Ver recurso</button>
                      )}

                      <div className="mt-auto -mx-6 px-6 pt-4 border-t border-slate-100 bg-slate-50/60 rounded-b-2xl grid grid-cols-1 md:grid-cols-2 gap-2">
                        <Button onClick={()=> { openAsignar(t); }}>Asignar a curso</Button>
                        <Button variant="secondary" onClick={()=> openEspecial(t)}>Asignar especial</Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">Título</th>
                        <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">Tema</th>
                        <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">Institución</th>
                        <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">Descripción</th>
                        <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">Recurso</th>
                        <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">Usos</th>
                        <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.map(t => {
                        const hasRecurso = Boolean((t as any)?.enlace);
                        const usos = (t as any)?.vecesUtilizada ?? (t as any)?.veces_utilizada ?? 0;
                        return (
                          <tr key={t.id} className="border-t border-slate-100">
                            <td className="px-4 py-3 font-medium text-slate-800">{t.titulo}</td>
                            <td className="px-4 py-3 text-slate-700">{t.tema ? <span className="px-2 py-0.5 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 text-xs">{t.tema}</span> : '-'}</td>
                            <td className="px-4 py-3 text-slate-700">{(t as any)?.institucion?.nombre || '-'}</td>
                            <td className="px-4 py-3 text-slate-600"><div className="line-clamp-2 max-w-[380px]">{t.descripcion}</div></td>
                            <td className="px-4 py-3 text-slate-700">{hasRecurso ? <button className="text-teal-600 underline" onClick={()=> { setPreviewItem(t); setPreviewOpen(true); }}>Ver recurso</button> : '-'}</td>
                            <td className="px-4 py-3 text-slate-700">{usos}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <button
                                  className="p-2 rounded-xl border-2 border-gray-200 hover:border-teal-300 text-slate-600"
                                  aria-label="Ver"
                                  title="Vista previa"
                                  onClick={()=> { setPreviewItem(t); setPreviewOpen(true); }}
                                >
                                  <IconEye />
                                </button>
                                <Button size="sm" onClick={()=> { openAsignar(t); }}>Asignar</Button>
                                <Button size="sm" variant="secondary" onClick={()=> openEspecial(t)}>Asignar especial</Button>
                                <button
                                  className="p-2 rounded-xl border-2 border-gray-200 hover:border-teal-300 text-slate-600"
                                  aria-label="Editar"
                                  title="Editar"
                                  onClick={()=> { setEditing(t); setEditTitulo(t.titulo || ''); setEditDescripcion(t.descripcion || ''); setEditTema(t.tema || ''); setEditFile(null); }}
                                >
                                  <IconEdit />
                                </button>
                                <button
                                  className="p-2 rounded-xl border-2 border-rose-200 hover:border-rose-400 text-rose-600"
                                  aria-label="Eliminar"
                                  title="Eliminar"
                                  onClick={async ()=>{
                                    try {
                                      await deleteBancoTarea(Number(t.id));
                                      showToast('Plantilla eliminada', 'success');
                                      load();
                                    } catch (e: any) {
                                      const status = e?.status || e?.response?.status;
                                      const msg = status === 409 ? 'No se puede eliminar: está referenciada por asignaciones.' : (e?.message || 'Error al eliminar');
                                      showToast(msg, 'error');
                                    }
                                  }}
                                >
                                  <IconTrash />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between px-1 py-3">
              <div className="text-sm text-slate-600">Página {page} de {totalPages}</div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={()=> setPage(1)} disabled={page===1}>«</Button>
                <Button size="sm" variant="ghost" onClick={()=> setPage(p=> Math.max(1, p-1))} disabled={page===1}>Anterior</Button>
                <Button size="sm" variant="ghost" onClick={()=> setPage(p=> Math.min(totalPages, p+1))} disabled={page===totalPages}>Siguiente</Button>
                <Button size="sm" variant="ghost" onClick={()=> setPage(totalPages)} disabled={page===totalPages}>»</Button>
              </div>
            </div>
            {filtered.length === 0 && (
              <EmptyState404 title="Sin resultados" message="No encontramos tareas con tus filtros. Ajusta la búsqueda o quita ‘Solo con recurso’." />
            )}
          </>
        )}

        <Modal isOpen={!!selected} onClose={()=> setSelected(null)} title="Asignar tarea" size="lg">
          {!!selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormFieldInput label="Título" name="titulo" value={titulo} onChange={(e)=> setTitulo(e.target.value)} />
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Periodo</label>
                  <select className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-teal-500" value={periodoId} onChange={(e)=> setPeriodoId(e.target.value ? Number(e.target.value) : '')}>
                    <option value="">Selecciona periodo</option>
                    {periodos.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                  {periodos.length === 0 && (
                    <div className="mt-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">No hay períodos disponibles. Configura un período activo para poder asignar.</div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Fecha inicio</label>
                  <input type="date" className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-teal-500" value={fechaInicio} onChange={(e)=> setFechaInicio(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Fecha vencimiento</label>
                  <input type="date" className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-teal-500" value={fechaVencimiento} onChange={(e)=> setFechaVencimiento(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Frecuencia</label>
                  <select className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-teal-500" value={frecuencia} onChange={(e)=> setFrecuencia(e.target.value as any)}>
                    <option value="unica">Única</option>
                    <option value="semanal">Semanal</option>
                    <option value="mensual">Mensual</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 mt-6">
                  <input id="boletin" type="checkbox" className="w-4 h-4" checked={incluirEnBoletin} onChange={(e)=> setIncluirEnBoletin(e.target.checked)} />
                  <label htmlFor="boletin" className="text-sm text-slate-700">Incluir en boletín</label>
                </div>
              </div>

              <div>
                <div className="text-sm font-semibold text-gray-700 mb-2">Selecciona curso(s)</div>
                <div className="grid sm:grid-cols-2 gap-2">
                  {cursos.map(c => (
                    <label key={c.id} className={`px-3 py-2 rounded-xl border-2 text-sm cursor-pointer ${cursoIds.includes(c.id) ? 'border-teal-500 bg-teal-50' : 'border-gray-200 hover:border-teal-300'}`}>
                      <input type="checkbox" className="mr-2" checked={cursoIds.includes(c.id)} onChange={()=> toggleCurso(c.id)} />
                      {c.nombre}
                    </label>
                  ))}
                </div>
                {cursos.length === 0 && (
                  <div className="mt-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">No hay cursos visibles para tu institución. Verifica que existan grados/cursos.</div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Nota adicional</label>
                <textarea className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-teal-500 min-h-[90px]" value={descripcionExtra} onChange={(e)=> setDescripcionExtra(e.target.value)} placeholder="Mensaje para las familias o instrucciones extras" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-semibold text-gray-700">Enlaces de apoyo</div>
                  <Button size="sm" variant="secondary" onClick={addEnlace}>Añadir enlace</Button>
                </div>
                <div className="space-y-2">
                  {enlaces.map((v, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input className="flex-1 px-3 py-2 rounded-xl border-2 border-gray-200" placeholder="https://..." value={v} onChange={(e)=> updateEnlace(idx, e.target.value)} />
                      <Button size="sm" variant="ghost" onClick={()=> removeEnlace(idx)} disabled={enlaces.length===1}>Quitar</Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={()=> setSelected(null)}>Cancelar</Button>
                <Button onClick={onAsignar} disabled={saving || !periodoId || cursoIds.length===0}>{saving ? 'Asignando...' : 'Asignar'}</Button>
              </div>
            </div>
          )}
        </Modal>

        {/* Modal Vista previa */}
        <Modal isOpen={previewOpen} onClose={()=> { setPreviewOpen(false); setPreviewItem(null); }} title={previewItem?.titulo || 'Vista previa'} size="xl">
          {!!previewItem && (
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                <div className="text-sm text-slate-600">
                  {previewItem.tema && (
                    <div className="mb-2 inline-block px-2 py-0.5 rounded-lg border bg-purple-50 text-purple-700 border-purple-200 text-xs">{previewItem.tema}</div>
                  )}
                  <div className="whitespace-pre-wrap text-slate-800">{previewItem.descripcion}</div>
                </div>
                <div className="shrink-0 flex gap-2">
                  <Button size="sm" onClick={()=> { setPreviewOpen(false); openAsignar(previewItem); }}>Asignar</Button>
                  <Button size="sm" variant="secondary" onClick={()=> { setPreviewOpen(false); openEspecial(previewItem); }}>Especial</Button>
                </div>
              </div>

              {(previewItem as any)?.enlace ? (
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="px-3 py-2 text-xs text-slate-600 bg-slate-50 border-b border-slate-200">Recurso</div>
                  <div className="aspect-video bg-slate-50">
                    <iframe src={normalizeHref((previewItem as any).enlace)} title="Recurso" className="w-full h-96" />
                  </div>
                  <div className="px-3 py-2 bg-slate-50 border-t border-slate-200 text-right">
                    <a className="text-teal-700 underline text-sm" href={normalizeHref((previewItem as any).enlace)} target="_blank" rel="noreferrer">Abrir en nueva pestaña</a>
                  </div>
                </div>
              ) : (
                <div className="py-2">
                  <EmptyState404 title="Recurso no disponible" message="Esta plantilla no tiene recurso adjunto o no es accesible actualmente." />
                </div>
              )}
            </div>
          )}
        </Modal>

        {/* Modal Asignación Especial */}
        <Modal isOpen={especialOpen} onClose={()=> setEspecialOpen(false)} title="Asignar especial" size="lg">
          {!!especialTarea && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormFieldInput label="Título" name="espTitulo" value={especialTitulo} onChange={(e)=> setEspecialTitulo(e.target.value)} />
                <FormFieldInput label="Tema" name="espTema" value={especialTema} onChange={(e)=> setEspecialTema(e.target.value)} />
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Periodo</label>
                  <select className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-teal-500" value={especialPeriodoId} onChange={(e)=> setEspecialPeriodoId(e.target.value ? Number(e.target.value) : '')}>
                    <option value="">Selecciona periodo</option>
                    {periodos.map(p => (<option key={p.id} value={p.id}>{p.nombre}</option>))}
                  </select>
                </div>
                <div className="flex items-center gap-2 pt-7">
                  <input id="espBoletin" type="checkbox" className="w-4 h-4" checked={especialInBoletin} onChange={(e)=> setEspecialInBoletin(e.target.checked)} />
                  <label htmlFor="espBoletin" className="text-sm text-slate-700">Incluir en boletín</label>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Fecha inicio</label>
                  <input type="date" className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-teal-500" value={especialFechaInicio} onChange={(e)=> setEspecialFechaInicio(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Fecha vencimiento</label>
                  <input type="date" className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-teal-500" value={especialFechaVenc} onChange={(e)=> setEspecialFechaVenc(e.target.value)} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-semibold text-gray-700">Selecciona estudiantes</div>
                  <input className="px-3 py-2 rounded-xl border-2 border-gray-200" placeholder="Buscar..." value={qEst} onChange={(e)=> setQEst(e.target.value)} />
                </div>
                <div className="grid sm:grid-cols-2 gap-2 max-h-64 overflow-auto pr-1">
                  {estudiantes
                    .filter(e => !qEst || e.nombre.toLowerCase().includes(qEst.toLowerCase()))
                    .map(e => (
                      <label key={e.id} className={`px-3 py-2 rounded-xl border-2 text-sm cursor-pointer ${selEstudiantes.includes(e.id) ? 'border-teal-500 bg-teal-50' : 'border-gray-200 hover:border-teal-300'}`}>
                        <input type="checkbox" className="mr-2" checked={selEstudiantes.includes(e.id)} onChange={()=> toggleEst(e.id)} />
                        {e.nombre}
                      </label>
                    ))}
                  {estudiantes.length === 0 && (
                    <div className="col-span-2 text-sm text-slate-500">No hay estudiantes visibles.</div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={()=> setEspecialOpen(false)}>Cancelar</Button>
                <Button onClick={onAsignarEspecial} loading={especialSaving} disabled={especialSaving || !especialPeriodoId || selEstudiantes.length===0}>
                  {especialSaving ? 'Asignando...' : 'Asignar especial'}
                </Button>
              </div>
            </div>
          )}
        </Modal>

        <Modal isOpen={!!editing} onClose={()=> setEditing(null)} title="Editar plantilla" size="lg">
          {!!editing && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormFieldInput label="Título" name="editTitulo" value={editTitulo} onChange={(e)=> setEditTitulo(e.target.value)} />
                <FormFieldInput label="Tema" name="editTema" value={editTema} onChange={(e)=> setEditTema(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Descripción</label>
                <textarea className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-teal-500 min-h-[100px]" value={editDescripcion} onChange={(e)=> setEditDescripcion(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Reemplazar archivo (opcional)</label>
                <input type="file" onChange={(e)=> setEditFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={()=> setEditing(null)}>Cancelar</Button>
                <Button onClick={async ()=>{
                  try {
                    setSavingEdit(true);
                    if (!editing) return;
                    if (editFile) {
                      const fd = new FormData();
                      if (editTitulo) fd.append('titulo', editTitulo);
                      if (editDescripcion) fd.append('descripcion', editDescripcion);
                      if (editTema) fd.append('tema', editTema);
                      fd.append('archivo', editFile);
                      await updateBancoTarea(Number(editing.id), fd as any, 'PUT');
                    } else {
                      await updateBancoTarea(Number(editing.id), {
                        titulo: editTitulo || undefined,
                        descripcion: editDescripcion || undefined,
                        tema: editTema || undefined,
                      }, 'PATCH');
                    }
                    showToast('Plantilla actualizada', 'success');
                    setEditing(null);
                    load();
                  } catch (e: any) {
                    showToast(e?.message || 'No se pudo actualizar la plantilla', 'error');
                  } finally { setSavingEdit(false); }
                }} loading={savingEdit}>{savingEdit ? 'Guardando...' : 'Guardar'}</Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </TeacherLayout>
  );
}
