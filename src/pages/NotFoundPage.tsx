import React from 'react'
import Button from '../components/ui/Button'
import EmptyState404 from '../components/ui/EmptyState404'

export default function NotFoundPage(){
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-xl w-full">
        <EmptyState404
          title="404"
          message="No encontramos la página que buscas. Verifica la dirección o vuelve al inicio."
          action={(
            <div className="flex items-center justify-center gap-3">
              <a href="/" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-slate-200 bg-white text-slate-700 hover:border-teal-300">Ir al inicio</a>
              <Button onClick={()=> window.history.back()}>Volver</Button>
            </div>
          )}
        />
      </div>
    </div>
  )
}
