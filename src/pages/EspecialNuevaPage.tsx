import TeacherLayout from '../components/TeacherLayout';
import Button from '../components/ui/Button';
import { Link, useSearchParams } from 'react-router-dom';

export default function EspecialNuevaPage(){
  const [search] = useSearchParams();
  const from = search.get('from') || '';
  return (
    <TeacherLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-teal-50/40 to-emerald-50/30 rounded-2xl p-6 border border-teal-100/50">
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-display font-bold text-slate-800">Nueva asignación especial</h1>
              <p className="text-slate-600 mt-1 text-sm">Crea una tarea dirigida a estudiante(s) específico(s) sin publicarla a todo un curso.</p>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/docente/especiales"><Button variant="secondary">Ver especiales</Button></Link>
              <Link to="/docente/banco-tareas"><Button>Ir a Banco de Tareas</Button></Link>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <div className="text-slate-700">
            <p className="mb-2">Esta pantalla de creación rápida estará disponible en breve.</p>
            <ul className="list-disc ml-5 text-sm space-y-1">
              <li>Selecciona una plantilla desde el <strong>Banco de Tareas</strong>.</li>
              <li>Usa la opción de <strong>Asignación especial</strong> para elegir estudiante(s) específicos.</li>
              <li>Define período, fechas y confirmas.</li>
            </ul>
            {!!from && <p className="mt-4 text-xs text-slate-500">Origen: {from}</p>}
          </div>
        </div>
      </div>
    </TeacherLayout>
  );
}
