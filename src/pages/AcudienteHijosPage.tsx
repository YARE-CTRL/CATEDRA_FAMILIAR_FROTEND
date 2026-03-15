import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AcudienteLayout from '../components/AcudienteLayout';
import Button from '../components/ui/Button';

export default function AcudienteHijosPage(){
  const navigate = useNavigate();
  const [estudianteId, setEstudianteId] = useState<string>(() => {
    try { return localStorage.getItem('acudiente_estudiante_id') || ''; } catch { return ''; }
  });

  const guardar = () => {
    const val = Number(estudianteId);
    if (!val || Number.isNaN(val)) { alert('Ingresa un ID de estudiante válido'); return; }
    try { localStorage.setItem('acudiente_estudiante_id', String(val)); } catch {}
    navigate('/dashboard/acudiente');
  };

  return (
    <AcudienteLayout>
      <div className="max-w-lg space-y-4">
        <h1 className="text-xl font-semibold text-slate-800">Mis hijos</h1>
        <p className="text-sm text-slate-600">Configura qué estudiante deseas ver por defecto en el menú Tareas.</p>
        <div className="bg-white rounded-2xl border p-4 space-y-3">
          <label className="block text-xs font-semibold text-slate-600 mb-1">ID de estudiante</label>
          <input
            className="w-full px-3 py-2 rounded-xl border-2 border-gray-200"
            placeholder="Ej: 123"
            value={estudianteId}
            onChange={(e)=>setEstudianteId(e.target.value)}
          />
          <div className="pt-2">
            <Button onClick={guardar}>Guardar y abrir tareas</Button>
          </div>
        </div>
      </div>
    </AcudienteLayout>
  );
}
