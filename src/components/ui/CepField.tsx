'use client'

import { useState } from 'react'
import { Loader2, MapPin, CheckCircle, AlertCircle } from 'lucide-react'
import { maskCep, cepDigits } from '@/lib/masks'

export interface CepResult {
  logradouro: string
  bairro: string
  localidade: string
  uf: string
  erro?: boolean
}

interface CepFieldProps {
  value: string
  onChange: (value: string) => void
  onFound: (result: CepResult) => void
}

type Status = 'idle' | 'loading' | 'found' | 'error'

export default function CepField({ value, onChange, onFound }: CepFieldProps) {
  const [status, setStatus] = useState<Status>('idle')

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const masked = maskCep(e.target.value)
    onChange(masked)
    if (cepDigits(masked).length === 8) {
      lookup(cepDigits(masked))
    } else {
      setStatus('idle')
    }
  }

  async function lookup(digits: string) {
    setStatus('loading')
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
      const data: CepResult = await res.json()
      if (data.erro) {
        setStatus('error')
      } else {
        setStatus('found')
        onFound(data)
      }
    } catch {
      setStatus('error')
    }
  }

  const icon = {
    idle:    <MapPin className="w-4 h-4 text-gray-400" />,
    loading: <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />,
    found:   <CheckCircle className="w-4 h-4 text-green-500" />,
    error:   <AlertCircle className="w-4 h-4 text-red-400" />,
  }[status]

  return (
    <div>
      <label className="label">CEP</label>
      <div className="relative">
        <input
          className="input pr-9"
          placeholder="00000-000"
          value={value}
          onChange={handleChange}
          inputMode="numeric"
          maxLength={9}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          {icon}
        </span>
      </div>
      {status === 'found' && (
        <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
          <CheckCircle className="w-3 h-3" /> Endereço encontrado!
        </p>
      )}
      {status === 'error' && (
        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> CEP não encontrado
        </p>
      )}
    </div>
  )
}
