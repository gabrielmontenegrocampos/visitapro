/** Remove todos os caracteres não-numéricos */
export function onlyDigits(value: string) {
  return value.replace(/\D/g, '')
}

/** Máscara de telefone: (11) 9 9999-9999 ou (11) 9999-9999 */
export function maskPhone(value: string): string {
  const d = onlyDigits(value).slice(0, 11)
  if (d.length === 0) return ''
  if (d.length <= 2)  return `(${d}`
  if (d.length <= 6)  return `(${d.slice(0,2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
}

/** Máscara de CEP: 12345-678 */
export function maskCep(value: string): string {
  const d = onlyDigits(value).slice(0, 8)
  if (d.length <= 5) return d
  return `${d.slice(0, 5)}-${d.slice(5)}`
}

/** Retorna só os dígitos do CEP (para chamar a API) */
export function cepDigits(value: string): string {
  return onlyDigits(value)
}
