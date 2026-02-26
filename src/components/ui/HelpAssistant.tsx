import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

type Msg = { id: string; from: 'bot' | 'user'; text: string; actions?: Array<{label:string; onClick:()=>void}> }

export default function HelpAssistant(){
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [msgs, setMsgs] = useState<Msg[]>([])
  const scRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const location = useLocation()

  const RobotIcon = ({className='h-5 w-5'}:{className?:string}) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 2v4" />
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M8 10h.01" />
      <path d="M16 10h.01" />
      <path d="M7 16h10" />
    </svg>
  )

  const normalize = (s: string) => s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quitar acentos
    .replace(/[^a-z0-9ñáéíóúü\s]/gi, '') // quitar signos
    .replace(/\s+/g, ' ') // espacios
    .trim();

  const routes = useMemo(() => ([
    { k: ['asignar','asignación','banco','curso','cursos'], a: 'Para asignar tareas, ve a Banco de Tareas, elige una plantilla y pulsa “Asignar a curso”.', go: () => navigate('/docente/banco-tareas') },
    { k: ['entrega','entregas','evidencia','evidencias'], a: 'Para ver lo que entregaron tus estudiantes, entra a Entregas.', go: () => navigate('/docente/entregas') },
    { k: ['asignaciones','listado','lista'], a: 'Tu listado de asignaciones está en Asignaciones.', go: () => navigate('/docente/asignaciones') },
    { k: ['especial','individual','estudiante'], a: 'Para crear una asignación especial, usa “Asignar especial” en Banco de Tareas o entra a Asignaciones especiales.', go: () => navigate('/docente/especiales') },
    { k: ['nueva especial','desde cero'], a: 'Para crear una especial desde cero, usa Nueva especial.', go: () => navigate('/docente/especiales/nueva') },
    { k: ['editar','plantilla','banco'], a: 'Para editar una plantilla, entra a Banco de Tareas y usa el ícono de lápiz.', go: () => navigate('/docente/banco-tareas') },
    { k: ['de que se trata','de qué se trata','que es','qué es','ayuda','guia','guía','acerca de'], a: 'Esta aplicación te permite asignar tareas a tus cursos, recibir evidencias, calificarlas y ver reportes. Como docente, usa Banco de Tareas para crear o reutilizar plantillas y “Entregas” para revisar lo que enviaron tus estudiantes.' },
    { k: ['nueva tarea','crear tarea','tarea nueva'], a: 'Para crear/asignar una nueva tarea rápidamente, entra a Banco de Tareas y usa “Asignar a curso”.', go: () => navigate('/docente/banco-tareas') },
    { k: ['ver tareas','donde las veo','dónde las veo','mis tareas'], a: 'Tus tareas asignadas aparecen en Asignaciones. Desde allí puedes abrir el resumen y ver el estado.', go: () => navigate('/docente/asignaciones') },
    { k: ['estudiantes','mis estudiantes','lista estudiantes'], a: 'Puedes ver tus estudiantes desde “Estudiantes (mis cursos)”.', go: () => navigate('/docente/estudiantes') },
  ]), [navigate])

  const greet = () => {
    setMsgs([
      { id: 'greet', from: 'bot', text: '¡Hola! Soy tu asistente. Pregúntame cosas como: “¿Dónde asigno tareas?”, “¿Dónde veo entregas?” o “¿Cómo crear especial?”.' },
    ])
  }

  useEffect(() => {
    if (open) greet()
  }, [open])

  useEffect(() => {
    scRef.current?.scrollTo({ top: scRef.current.scrollHeight })
  }, [msgs])

  const reply = (q: string) => {
    const termN = normalize(q)

    // Small talk
    if (/(^|\s)(hola|buenas|buenos dias|buen dia|hey)(\s|$)/.test(termN)) {
      setMsgs(prev => ([...prev, { id: `bot-${Date.now()}`, from: 'bot', text: '¡Hola! Soy tu asistente de Cátedra de Familia. ¿En qué te ayudo hoy?' }]))
      return
    }
    if (/(^|\s)(gracias|muchas gracias|grac)(\s|$)/.test(termN)) {
      setMsgs(prev => ([...prev, { id: `bot-${Date.now()}`, from: 'bot', text: '¡Con gusto! Si necesitas algo más, aquí estoy.' }]))
      return
    }
    if (/(^|\s)(adios|hasta luego|chao)(\s|$)/.test(termN)) {
      setMsgs(prev => ([...prev, { id: `bot-${Date.now()}`, from: 'bot', text: '¡Hasta luego! Que tengas un excelente día.' }]))
      return
    }

    const hit = routes.find(r => r.k.some(k => termN.includes(normalize(k))))
    if (hit) {
      setMsgs(prev => ([
        ...prev,
        { id: `bot-${Date.now()}`, from: 'bot', text: hit.a, actions: [{ label: 'Ir ahora', onClick: () => { hit.go(); setOpen(false) } }] }
      ]))
      return
    }
    // sugerencias
    const sug = routes.slice(0,3)
    setMsgs(prev => ([
      ...prev,
      { id: `bot-${Date.now()}`, from: 'bot', text: 'No estoy seguro, pero puedo guiarte a estas secciones:', actions: sug.map(s => ({ label: s.a.includes('Banco') ? 'Banco de Tareas' : (s.a.includes('Entregas') ? 'Entregas' : 'Asignaciones'), onClick: () => { s.go(); setOpen(false) } })) }
    ]))
  }

  const onSend = () => {
    const val = input.trim()
    if (!val) return
    setMsgs(prev => ([...prev, { id: `u-${Date.now()}`, from: 'user', text: val }]))
    setInput('')
    setTimeout(() => reply(val), 150)
  }

  const ask = (text: string) => {
    setMsgs(prev => ([...prev, { id: `u-${Date.now()}`, from: 'user', text }] ))
    setTimeout(() => reply(text), 120)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 inline-flex items-center gap-2 px-4 py-3 rounded-2xl shadow-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold"
        title="Ayuda rápida"
        aria-label="Abrir ayuda"
      >
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-xl bg-white/20">
          <RobotIcon className="h-5 w-5" />
        </span>
        <span>Ayuda</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-slate-900/40" onClick={()=> setOpen(false)} />
          <div className="relative w-full sm:max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 m-0 sm:m-4 flex flex-col overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-teal-600 text-white"><RobotIcon className="h-4 w-4"/></span>
                <div>
                  <div className="text-sm font-bold text-slate-900">Asistente</div>
                  <div className="text-[11px] text-slate-500">Parchando juntos</div>
                </div>
              </div>
              <button className="p-2 rounded-xl border border-slate-200 hover:border-teal-300" onClick={()=> setOpen(false)} aria-label="Cerrar">×</button>
            </div>

            {/* Sugerencias rápidas */}
            <div className="px-3 pt-3">
              <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-2">Básicos</div>
              <div className="flex flex-wrap gap-2">
                <button onClick={()=> ask('¿De qué se trata la aplicación?')} className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs hover:border-teal-300">¿De qué se trata?</button>
                <button onClick={()=> ask('¿Dónde hago una tarea nueva?')} className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs hover:border-teal-300">¿Nueva tarea?</button>
                <button onClick={()=> ask('¿Dónde las veo?')} className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs hover:border-teal-300">¿Dónde las veo?</button>
                <button onClick={()=> ask('¿Dónde veo mis estudiantes?')} className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs hover:border-teal-300">¿Mis estudiantes?</button>
              </div>
            </div>

            <div ref={scRef} className="px-3 py-3 max-h-96 overflow-auto space-y-3">
              {msgs.map(m => (
                <div key={m.id} className={`flex ${m.from==='user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`${m.from==='user' ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-800'} px-3 py-2 rounded-2xl max-w-[80%] shadow-sm`}>
                    <div className="text-sm whitespace-pre-wrap">{m.text}</div>
                    {!!m.actions?.length && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {m.actions.map((a, idx) => (
                          <button key={idx} onClick={a.onClick} className={`text-xs px-2 py-1 rounded-xl border ${m.from==='user' ? 'border-white/70 text-white/90 hover:bg-white/10' : 'border-slate-300 text-slate-700 hover:bg-white'}`}>{a.label}</button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {msgs.length===0 && (
                <div className="text-center text-slate-500 text-sm">Escríbeme una pregunta. Ej: “¿Dónde asigno tareas?”</div>
              )}
            </div>

            <div className="px-3 py-3 border-t border-slate-200 flex items-center gap-2">
              <input
                value={input}
                onChange={(e)=> setInput(e.target.value)}
                onKeyDown={(e)=> { if(e.key==='Enter') onSend() }}
                placeholder="Escribe tu pregunta..."
                className="flex-1 px-3 py-2 rounded-xl border-2 border-slate-200 focus:border-teal-500 outline-none"
              />
              <button onClick={onSend} className="px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold">Enviar</button>
            </div>

            <div className="px-3 pb-3 text-[11px] text-slate-500">Ubicación actual: {location.pathname}</div>
          </div>
        </div>
      )}
    </>
  )
}
