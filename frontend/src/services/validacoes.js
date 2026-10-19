// src/services/validacoes.js

/**
 * Remove tudo que não for dígito.
 */
export function apenasDigitos(valor) {
  return (valor || '').replace(/\D/g, '');
}

/**
 * Aplica máscara de telefone brasileiro enquanto digita.
 *  - Até 10 dígitos → (99) 9999-9999  (telefone fixo)
 *  - 11 dígitos     → (99) 99999-9999 (celular)
 */
export function mascararTelefone(valor) {
  const d = apenasDigitos(valor).slice(0, 11);

  if (d.length === 0) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  }
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/**
 * Valida se o telefone está completo no formato brasileiro.
 * Aceita fixo (10 dígitos) ou celular (11 dígitos).
 */
export function telefoneValido(valor) {
  const d = apenasDigitos(valor);
  if (d.length !== 10 && d.length !== 11) return false;

  const ddd = parseInt(d.slice(0, 2), 10);
  if (ddd < 11 || ddd > 99) return false;

  // Celular (11 dígitos): 3º dígito deve ser 9
  if (d.length === 11 && d.charAt(2) !== '9') return false;

  // Fixo (10 dígitos): 3º dígito deve ser 2, 3, 4 ou 5
  if (d.length === 10 && !['2', '3', '4', '5'].includes(d.charAt(2))) return false;

  return true;
}

export const MSG_TELEFONE_INVALIDO =
  'Telefone inválido. Use o formato (63) 99999-9999 (celular) ou (63) 3222-1234 (fixo).';