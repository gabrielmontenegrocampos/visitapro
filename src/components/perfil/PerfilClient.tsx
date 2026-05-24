'use client'

import { useState, useRef } from 'react'
import { User, Phone, Lock, Camera, CheckCircle, AlertCircle } from 'lucide-react'
import type { Profile } from '@/types/database'
import { ROLE_LABELS, ROLE_COLORS, type AppRole } from '@/lib/roles'
import { updatePerfil, updateSenha, uploadAvatar } from '@/app/(crm)/perfil/actions'

interface Props {
  profile: Profile
}

export default function PerfilClient({ profile }: Props) {
  const [name, setName] = useState(profile.full_name ?? '')
  const [phone, setPhone] = useState(profile.phone ?? '')
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmSenha, setConfirmSenha] = useState('')

  const [savingPerfil, setSavingPerfil] = useState(false)
  const [savingSenha, setSavingSenha] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  const [perfilMsg, setPerfilMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [senhaMsg, setSenhaMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [avatarMsg, setAvatarMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? '')
  const fileRef = useRef<HTMLInputElement>(null)

  const role = (profile.role ?? 'vendedor') as AppRole
  const initials = (profile.full_name ?? 'U')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  async function handleSavePerfil() {
    setSavingPerfil(true)
    setPerfilMsg(null)
    const res = await updatePerfil({ full_name: name, phone: phone || null })
    setSavingPerfil(false)
    if (res.error) {
      setPerfilMsg({ ok: false, text: res.error })
    } else {
      setPerfilMsg({ ok: true, text: 'Perfil atualizado com sucesso!' })
      setTimeout(() => setPerfilMsg(null), 3000)
    }
  }

  async function handleSaveSenha() {
    if (novaSenha !== confirmSenha) {
      setSenhaMsg({ ok: false, text: 'As senhas não coincidem' })
      return
    }
    if (novaSenha.length < 6) {
      setSenhaMsg({ ok: false, text: 'A nova senha deve ter pelo menos 6 caracteres' })
      return
    }
    setSavingSenha(true)
    setSenhaMsg(null)
    const res = await updateSenha(senhaAtual, novaSenha)
    setSavingSenha(false)
    if (res.error) {
      setSenhaMsg({ ok: false, text: res.error })
    } else {
      setSenhaMsg({ ok: true, text: 'Senha alterada com sucesso!' })
      setSenhaAtual('')
      setNovaSenha('')
      setConfirmSenha('')
      setTimeout(() => setSenhaMsg(null), 3000)
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingAvatar(true)
    setAvatarMsg(null)
    const fd = new FormData()
    fd.append('file', file)
    const res = await uploadAvatar(fd)
    setUploadingAvatar(false)
    if (res.error) {
      setAvatarMsg({ ok: false, text: res.error })
    } else {
      setAvatarUrl(res.url ?? '')
      setAvatarMsg({ ok: true, text: 'Foto atualizada!' })
      setTimeout(() => setAvatarMsg(null), 3000)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Avatar */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-5">Foto de Perfil</h2>
        <div className="flex items-center gap-5">
          <div className="relative">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Avatar"
                className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold border-2 border-gray-200">
                {initials}
              </div>
            )}
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute bottom-0 right-0 w-7 h-7 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-md transition-colors"
            >
              <Camera size={13} />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700">{profile.full_name}</p>
            <span className={`inline-block mt-1 text-xs font-medium px-2.5 py-0.5 rounded-full ${ROLE_COLORS[role]}`}>
              {ROLE_LABELS[role]}
            </span>
            {uploadingAvatar && (
              <p className="text-xs text-gray-500 mt-1">Enviando...</p>
            )}
            {avatarMsg && (
              <p className={`text-xs mt-1 flex items-center gap-1 ${avatarMsg.ok ? 'text-green-600' : 'text-red-600'}`}>
                {avatarMsg.ok ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                {avatarMsg.text}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Dados pessoais */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-5 flex items-center gap-2">
          <User size={18} className="text-gray-500" />
          Dados Pessoais
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome completo</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1.5">
              <Phone size={14} className="text-gray-400" />
              Telefone
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(00) 00000-0000"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
            <input
              type="email"
              value={profile.email ?? ''}
              disabled
              className="w-full border border-gray-100 rounded-xl px-3 py-2.5 text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
            />
            <p className="text-xs text-gray-400 mt-1">O e-mail não pode ser alterado</p>
          </div>
        </div>

        {perfilMsg && (
          <div className={`mt-4 flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${perfilMsg.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {perfilMsg.ok ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
            {perfilMsg.text}
          </div>
        )}

        <button
          onClick={handleSavePerfil}
          disabled={savingPerfil}
          className="mt-5 w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2.5 rounded-xl text-sm transition-colors"
        >
          {savingPerfil ? 'Salvando...' : 'Salvar alterações'}
        </button>
      </div>

      {/* Alterar senha */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-5 flex items-center gap-2">
          <Lock size={18} className="text-gray-500" />
          Alterar Senha
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha atual</label>
            <input
              type="password"
              value={senhaAtual}
              onChange={(e) => setSenhaAtual(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nova senha</label>
            <input
              type="password"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar nova senha</label>
            <input
              type="password"
              value={confirmSenha}
              onChange={(e) => setConfirmSenha(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {senhaMsg && (
          <div className={`mt-4 flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${senhaMsg.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {senhaMsg.ok ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
            {senhaMsg.text}
          </div>
        )}

        <button
          onClick={handleSaveSenha}
          disabled={savingSenha || !senhaAtual || !novaSenha || !confirmSenha}
          className="mt-5 w-full bg-gray-800 hover:bg-gray-900 disabled:bg-gray-300 text-white font-medium py-2.5 rounded-xl text-sm transition-colors"
        >
          {savingSenha ? 'Alterando...' : 'Alterar senha'}
        </button>
      </div>
    </div>
  )
}
