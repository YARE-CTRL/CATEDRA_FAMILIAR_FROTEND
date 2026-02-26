import React from 'react'

type Props = {
  title?: string
  message?: string
  action?: React.ReactNode
}

export default function EmptyState404({ title = '404', message = 'No encontramos lo que buscabas.', action }: Props){
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6 bg-white rounded-2xl border border-slate-100 shadow-sm">
      <img src="/src/assets/logo.jpg" alt="Cátedra de Familia" className="w-20 h-20 rounded-xl object-cover shadow" />
      <div className="mt-4 text-5xl font-extrabold tracking-tight text-slate-800">{title}</div>
      <div className="mt-2 text-slate-600 max-w-xl">{message}</div>
      <div className="mt-1 text-teal-700 font-semibold">Parchando juntos</div>
      {action && (
        <div className="mt-6">{action}</div>
      )}
    </div>
  )
}
