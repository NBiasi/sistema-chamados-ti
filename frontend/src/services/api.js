// src/services/api.js

const API_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

async function request(endpoint, options = {}) {
  let token = localStorage.getItem('token');
  
  if (token) {
    token = token.replace(/^"|"$/g, '').trim();
  }

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const formattedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  const response = await fetch(`${API_URL}${formattedEndpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401 || response.status === 403) {
    localStorage.removeItem('token');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw { 
      status: response.status, 
      response: { data: errorData },
      message: errorData.message || `Erro na requisição: ${response.status}`
    };
  }

  if (response.status === 204) {
    return { data: null };
  }

  const text = await response.text();
  return { data: text ? JSON.parse(text) : null };
}

const api = {
  get: (endpoint, options) => request(endpoint, { method: 'GET', ...options }),
  post: (endpoint, body, options) => request(endpoint, { method: 'POST', body: JSON.stringify(body), ...options }),
  put: (endpoint, body, options) => request(endpoint, { method: 'PUT', body: JSON.stringify(body), ...options }),
  patch: (endpoint, body, options) => request(endpoint, { method: 'PATCH', body: JSON.stringify(body), ...options }),
  delete: (endpoint, options) => request(endpoint, { method: 'DELETE', ...options }),
};

// ==========================================
// LISTA CENTRALIZADA DE CATEGORIAS (Sincronizada com o ENUM do Backend)
// ==========================================
export const CATEGORIAS_CHAMADO = [
  { id: 'HARDWARE', nome: 'Hardware (Computadores, Peças)' },
  { id: 'SOFTWARE', nome: 'Sistemas / Software' },
  { id: 'REDE', nome: 'Rede / Internet' },
  { id: 'IMPRESSORA', nome: 'Impressoras / Scanners' },
  { id: 'OUTROS', nome: 'Outros Assuntos' }
];

// ==========================================
// PAGINAÇÃO E FILTROS DO USUÁRIO
// ==========================================
export async function buscarMeusChamados(page = 0, size = 20, status = 'TODOS', busca = '', dataInicio = '', dataFim = '') {
  const params = new URLSearchParams({
    page: page.toString(),
    size: size.toString(),
    status: status,
    busca: busca
  });

  if (dataInicio) params.append('dataInicio', dataInicio);
  if (dataFim) params.append('dataFim', dataFim);

  const response = await api.get(`/chamados/meus?${params.toString()}`);
  return response.data; 
}

// ==========================================
// PAGINAÇÃO E FILTROS COM DATAS (ADMIN / TÉCNICO)
// ==========================================
export async function buscarHistoricoGlobal(page = 0, size = 20, status = 'TODOS', busca = '', dataInicio = '', dataFim = '') {
  const params = new URLSearchParams({ 
    page: page.toString(), 
    size: size.toString(), 
    status, 
    busca 
  });
  
  if (dataInicio) params.append('dataInicio', dataInicio);
  if (dataFim) params.append('dataFim', dataFim);
  
  const response = await api.get(`/chamados/historico-global?${params.toString()}`);
  return response.data;
}

export async function buscarChamadosVisitante(visitorId) {
  const response = await api.get(`/chamados/visitante/${visitorId}`);
  return response.data;
}

export async function criarChamado(dadosChamado) {
  const response = await api.post('/chamados', dadosChamado);
  return response.data;
}

export async function listarLocais() {
  const response = await api.get('/locais');
  return response.data;
}

export async function listarLocaisPorSecretaria(secretariaId) {
  const response = await api.get(`/locais/secretaria/${secretariaId}`);
  return response.data;
}

export async function listarSecretarias() {
  const response = await api.get('/secretarias');
  return response.data;
}

export async function avaliarChamado(chamadoId, avaliacaoData) {
  const response = await api.patch(`/chamados/${chamadoId}/avaliar`, avaliacaoData);
  return response.data;
}

export async function recuperarSenha(email, novaSenha) {
  const response = await api.post('/auth/recuperar-senha', { email, novaSenha });
  return response.data;
}

// ==================== ENDPOINTS LGPD ====================

export async function verificarAceiteLgpd(visitorId) {
  const params = visitorId ? `?visitorId=${visitorId}` : '';
  const response = await api.get(`/lgpd/aceite/verificar${params}`);
  return response.data;
}

export async function aceitarTermosLgpd(visitorId) {
  const params = visitorId ? `?visitorId=${visitorId}` : '';
  const response = await api.post(`/lgpd/aceite${params}`);
  return response.data;
}

export async function exportarMeusDados() {
  const response = await api.get('/lgpd/meus-dados/exportar');
  return response.data;
}

export async function anonimizarMeusDados() {
  const response = await api.delete('/lgpd/meus-dados/anonimizar');
  return response.data;
}

export async function obterContatoDpo() {
  const response = await api.get('/lgpd/dpo');
  return response.data;
}

export default api;