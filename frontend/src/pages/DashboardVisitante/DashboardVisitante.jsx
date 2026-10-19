import React, { useState, useEffect } from 'react';
import api, { listarSecretarias, listarLocaisPorSecretaria, CATEGORIAS_CHAMADO } from '../../services/api';
import { mascararTelefone, telefoneValido, MSG_TELEFONE_INVALIDO } from '../../services/validacoes';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import './DashboardVisitante.css';

function DashboardVisitante({ onVoltarLogin }) {
  const [modalAberto, setModalAberto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [sucessoMsg, setSucessoMsg] = useState('');
  const [erroMsg, setErroMsg] = useState('');
  const [erroTelefone, setErroTelefone] = useState('');

  // Estados da Fila Geral de Chamados
  const [filaGeral, setFilaGeral] = useState([]);
  const [carregandoFila, setCarregandoFila] = useState(true);
  const [filtroSecretaria, setFiltroSecretaria] = useState('TODAS');
  const [protocolosVisitante, setProtocolosVisitante] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('visitante_protocolos') || '[]');
    } catch {
      return [];
    }
  });

  // Campos do Formulário de Abertura de Chamado
  const [nomeVisitante, setNomeVisitante] = useState('');
  const [contatoVisitante, setContatoVisitante] = useState('');
  const [secretariaId, setSecretariaId] = useState('');
  const [localId, setLocalId] = useState('');
  const [localVisitante, setLocalVisitante] = useState('');
  const [titulo, setTitulo] = useState('');
  const [categoria, setCategoria] = useState('');
  const [descricao, setDescricao] = useState('');

  // Listas auxiliares
  const [secretariasList, setSecretariasList] = useState([]);
  const [locaisList, setLocaisList] = useState([]);

  // Sessão persistente do visitante
  const visitorId = (() => {
    const chave = 'visitor_session';
    const salvo = localStorage.getItem(chave);
    const agora = new Date().getTime();
    if (salvo) {
      try {
        const dados = JSON.parse(salvo);
        if (agora < dados.expiresAt) return dados.id;
      } catch (e) {}
    }
    const novoId = 'vis_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    const quatroHorasEmMs = 4 * 60 * 60 * 1000;
    localStorage.setItem(chave, JSON.stringify({ id: novoId, expiresAt: agora + quatroHorasEmMs }));
    return novoId;
  })();

  const formatarDataHora = (valor) => {
    if (!valor) return '—';
    return new Date(valor).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const carregarFilaGeral = async (silencioso = false) => {
    if (!silencioso) setCarregandoFila(true);
    try {
      // Garante que o visitante possui token ativo para consultar a lista
      let token = localStorage.getItem('token');
      if (!token) {
        try {
          const res = await api.post('/auth/visitante', { visitorId });
          if (res.data?.token) {
            localStorage.setItem('token', res.data.token);
            if (res.data.usuario) {
              localStorage.setItem('usuario', JSON.stringify(res.data.usuario));
            }
          }
        } catch (authErr) {
          console.warn('Erro ao obter sessão de visitante:', authErr);
        }
      }

      const response = await api.get('/chamados');
      const todos = Array.isArray(response.data) ? response.data : [];
      const fila = todos
        .filter((c) => ['ABERTO', 'EM_ANDAMENTO'].includes(c.status))
        .sort((a, b) => new Date(a.dataAbertura) - new Date(b.dataAbertura));
      setFilaGeral(fila);
    } catch (err) {
      console.error('Erro ao carregar fila:', err);
    } finally {
      if (!silencioso) setCarregandoFila(false);
    }
  };

  useEffect(() => {
    carregarFilaGeral();

    // WebSocket / STOMP para atualização em tempo real da fila
    const socket = new SockJS('/ws-chamados');
    const stompClient = new Client({
      webSocketFactory: () => socket,
      reconnectDelay: 5000,
      onConnect: () => {
        stompClient.subscribe('/topic/chamados', () => {
          carregarFilaGeral(true);
        });
      }
    });

    stompClient.activate();
    return () => stompClient.deactivate();
  }, []);

  useEffect(() => {
    listarSecretarias().then(setSecretariasList).catch(() => setSecretariasList([]));
  }, []);

  useEffect(() => {
    if (secretariaId) {
      listarLocaisPorSecretaria(secretariaId).then(setLocaisList).catch(() => setLocaisList([]));
      setLocalId('');
    } else {
      setLocaisList([]);
      setLocalId('');
    }
  }, [secretariaId]);

  // Acessibilidade: Fechar modal ao pressionar 'Esc'
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && modalAberto && !enviando) {
        setModalAberto(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalAberto, enviando]);

  const handleContatoChange = (e) => {
    const valorMascarado = mascararTelefone(e.target.value);
    setContatoVisitante(valorMascarado);
    if (erroTelefone) setErroTelefone('');
  };

  const handleSubmitChamado = async (e) => {
    e.preventDefault();
    setErroMsg('');
    setSucessoMsg('');
    setErroTelefone('');

    if (!nomeVisitante.trim()) {
      setErroMsg('Por favor, informe o seu nome completo.');
      return;
    }

    if (!telefoneValido(contatoVisitante)) {
      setErroTelefone(MSG_TELEFONE_INVALIDO);
      return;
    }

    if (!secretariaId) {
      setErroMsg('Por favor, selecione a secretaria onde ocorre o problema.');
      return;
    }

    if (!titulo.trim() || !categoria || !descricao.trim()) {
      setErroMsg('Por favor, preencha todos os campos obrigatórios (*).');
      return;
    }

    setEnviando(true);

    const payload = {
      visitorId,
      nomeVisitante: nomeVisitante.trim(),
      contatoVisitante,
      secretariaVisitanteId: Number(secretariaId),
      localId: localId ? Number(localId) : null,
      localVisitante: localVisitante.trim(),
      titulo: titulo.trim(),
      categoria,
      descricao: descricao.trim()
    };

    try {
      const response = await api.post('/chamados/visitante', payload);
      const novoChamado = response.data;

      // Armazena o protocolo deste chamado para destaque visual na fila
      if (novoChamado?.protocolo) {
        const novos = [...protocolosVisitante, novoChamado.protocolo];
        localStorage.setItem('visitante_protocolos', JSON.stringify(novos));
        setProtocolosVisitante(novos);
      }

      setSucessoMsg(`✅ Seu chamado foi aberto com sucesso e já está na fila de espera! Anote o protocolo: ${novoChamado.protocolo}`);
      setTitulo('');
      setCategoria('');
      setDescricao('');
      setLocalVisitante('');
      setLocalId('');
      setModalAberto(false);

      // Recarrega a fila imediatamente para exibir o chamado na fila
      await carregarFilaGeral(true);
    } catch (err) {
      console.error('Erro ao abrir chamado:', err);
      setErroMsg('Erro ao registrar chamado. Verifique as informações informadas.');
    } finally {
      setEnviando(false);
    }
  };

  const filaFiltrada = filaGeral.filter((item) => {
    if (filtroSecretaria !== 'TODAS') {
      const sec = item.nomeSecretariaVisitante || '';
      if (sec !== filtroSecretaria) return false;
    }
    return true;
  });

  return (
    <main className="dash-user-container" aria-label="Painel de Atendimento do Visitante">
      <header className="dash-user-header">
        <div className="user-branding">
          <div className="user-avatar" style={{ backgroundColor: '#475569' }} aria-hidden="true">👤</div>
          <div className="user-info">
            <h1 style={{ fontSize: '1.2rem', margin: '0' }}>Central de Atendimento TI</h1>
            <p>
              <span>Acesso Visitante / Público</span>
              <span className="badge-sec">Fila de Espera</span>
            </p>
          </div>
        </div>
        <button className="btn-logout" onClick={onVoltarLogin} aria-label="Fazer Login com conta ou Sair">
          Fazer Login / Sair
        </button>
      </header>

      <div aria-live="polite" aria-atomic="true">
        {sucessoMsg && (
          <div className="alert-success-box" role="status">
            <span>{sucessoMsg}</span>
            <button 
              type="button" 
              onClick={() => setSucessoMsg('')} 
              style={{ background: 'none', border: 'none', float: 'right', cursor: 'pointer', fontSize: '1.1rem', color: '#15803d' }}
              aria-label="Fechar mensagem"
            >
              ×
            </button>
          </div>
        )}
        {erroMsg && <div className="alert-error-box" role="alert">{erroMsg}</div>}
      </div>

      <section className="action-bar fila-action-bar" aria-label="Ações e Filtros da Fila">
        <button 
          className="btn-primary-action" 
          onClick={() => {
            setSucessoMsg('');
            setErroMsg('');
            setModalAberto(true);
          }}
        >
          + Abrir Novo Chamado
        </button>

        <div className="fila-controls">
          <div className="filtro-secretaria-wrapper">
            <label htmlFor="filtro-sec-visitante" className="label-filtro-fila">Secretaria:</label>
            <select
              id="filtro-sec-visitante"
              value={filtroSecretaria}
              onChange={(e) => setFiltroSecretaria(e.target.value)}
              className="select-filter"
              aria-label="Filtrar fila por secretaria"
            >
              <option value="TODAS">Todas as Secretarias</option>
              {secretariasList.map((sec) => (
                <option key={sec.id} value={sec.nome}>{sec.nome}</option>
              ))}
            </select>
          </div>
          <button className="btn-secondary" onClick={() => carregarFilaGeral()} title="Atualizar fila agora">
            🔄 Atualizar Fila
          </button>
        </div>
      </section>

      <section className="content-section" aria-label="Fila de espera de atendimento">
        <div className="fila-info-banner">
          <span>🕒 <strong>Fila de Atendimento em Tempo Real:</strong> Acompanhe os chamados aguardando atendimento. Seus chamados registrados nesta sessão estão identificados com <strong>👤 Você</strong>.</span>
        </div>

        {carregandoFila && filaGeral.length === 0 ? (
          <div className="state-card" role="status">Carregando fila de atendimento...</div>
        ) : filaFiltrada.length === 0 ? (
          <div className="welcome-card">
            <div className="welcome-icon" aria-hidden="true">🎧</div>
            <h2>Fila Livre no Momento</h2>
            <p>
              {filtroSecretaria !== 'TODAS'
                ? 'Nenhum chamado pendente para a secretaria selecionada.'
                : 'Não há nenhum chamado na fila de espera no momento. Seja o primeiro a registrar!'}
            </p>
            <button 
              className="btn-primary-action" 
              onClick={() => setModalAberto(true)}
              style={{ marginTop: '12px' }}
            >
              + Abrir Chamado Agora
            </button>
          </div>
        ) : (
          <div className="table-responsive" tabIndex="0" aria-label="Tabela da fila geral de chamados">
            <table className="custom-table">
              <thead>
                <tr>
                  <th scope="col" style={{ width: '60px', textAlign: 'center' }}>Pos.</th>
                  <th scope="col">Protocolo</th>
                  <th scope="col">Título</th>
                  <th scope="col">Categoria</th>
                  <th scope="col">Secretaria</th>
                  <th scope="col">Data de Abertura</th>
                  <th scope="col">Status</th>
                  <th scope="col">Técnico Responsável</th>
                </tr>
              </thead>
              <tbody>
                {filaFiltrada.map((item, index) => {
                  const isMeu = protocolosVisitante.includes(item.protocolo) || 
                    (Boolean(nomeVisitante) && item.nomeVisitante === nomeVisitante);
                  return (
                    <tr key={item.id || item.protocolo} className={isMeu ? 'row-meu-chamado' : ''}>
                      <td data-label="Posição" style={{ textAlign: 'center', fontWeight: 'bold', color: '#64748b' }}>
                        #{index + 1}
                      </td>
                      <td data-label="Protocolo">
                        <span className="protocol-badge">{item.protocolo || `#${item.id}`}</span>
                        {isMeu && <span className="selo-meu-chamado" title="Chamado registrado por você">👤 Você</span>}
                      </td>
                      <td data-label="Título">
                        <strong>{item.titulo}</strong>
                      </td>
                      <td data-label="Categoria">{item.categoria || '—'}</td>
                      <td data-label="Secretaria">{item.nomeSecretariaVisitante || '—'}</td>
                      <td data-label="Data">{formatarDataHora(item.dataAbertura)}</td>
                      <td data-label="Status">
                        <span className={`badge-status status-${item.status?.toLowerCase()}`}>
                          {item.status === 'ABERTO' ? 'Aguardando' : item.status === 'EM_ANDAMENTO' ? 'Em Andamento' : item.status?.replace('_', ' ')}
                        </span>
                      </td>
                      <td data-label="Técnico">{item.nomeTecnico || 'Aguardando atribuição'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modal de Abertura de Chamado */}
      {modalAberto && (
        <div 
          className="modal-backdrop"
          onClick={() => !enviando && setModalAberto(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-titulo"
        >
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <header className="modal-header">
              <h2 id="modal-titulo" style={{ fontSize: '1.25rem', margin: 0 }}>Abrir Chamado (Visitante)</h2>
              <button 
                className="btn-close" 
                onClick={() => setModalAberto(false)}
                aria-label="Fechar janela"
                disabled={enviando}
              >
                ×
              </button>
            </header>
            
            <form onSubmit={handleSubmitChamado} className="modal-form" noValidate>
              <h3 className="form-section-title">Dados Pessoais</h3>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="nomeVisitante">Nome Completo *</label>
                  <input
                    id="nomeVisitante"
                    type="text"
                    value={nomeVisitante}
                    onChange={(e) => setNomeVisitante(e.target.value)}
                    placeholder="Seu nome"
                    required
                    aria-required="true"
                    disabled={enviando}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="contatoVisitante">Telefone / Contato *</label>
                  <input
                    id="contatoVisitante"
                    type="tel"
                    value={contatoVisitante}
                    onChange={handleContatoChange}
                    placeholder="(63) 99999-9999"
                    maxLength={15}
                    inputMode="numeric"
                    className={erroTelefone ? 'input-erro' : ''}
                    required
                    aria-required="true"
                    aria-invalid={!!erroTelefone}
                    aria-describedby={erroTelefone ? "erro-telefone-msg" : undefined}
                    disabled={enviando}
                  />
                  {erroTelefone && (
                    <span id="erro-telefone-msg" className="erro-campo" role="alert">{erroTelefone}</span>
                  )}
                </div>
              </div>

              <h3 className="form-section-title">Localização do Atendimento</h3>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="secretariaId">Secretaria *</label>
                  <select 
                    id="secretariaId" 
                    value={secretariaId} 
                    onChange={(e) => setSecretariaId(e.target.value)} 
                    required 
                    aria-required="true"
                    disabled={enviando}
                  >
                    <option value="">Selecione a secretaria...</option>
                    {secretariasList.map((sec) => (
                      <option key={sec.id} value={sec.id}>{sec.nome} ({sec.sigla})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="localId">Prédio / Unidade</label>
                  <select 
                    id="localId" 
                    value={localId} 
                    onChange={(e) => setLocalId(e.target.value)} 
                    disabled={!secretariaId || enviando}
                  >
                    <option value="">Selecione o local...</option>
                    {locaisList.map((loc) => (
                      <option key={loc.id} value={loc.id}>{loc.nome}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="localVisitante">Detalhamento do Local (Sala/Setor)</label>
                <input
                  id="localVisitante"
                  type="text"
                  value={localVisitante}
                  onChange={(e) => setLocalVisitante(e.target.value)}
                  placeholder="Ex: Sala 02, Recepção, Almoxarifado"
                  disabled={enviando}
                />
              </div>

              <h3 className="form-section-title">Dados da Solicitação</h3>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="titulo">Título *</label>
                  <input
                    id="titulo"
                    type="text"
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    placeholder="Resumo do problema"
                    required
                    aria-required="true"
                    disabled={enviando}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="categoria">Categoria *</label>
                  <select 
                    id="categoria" 
                    value={categoria} 
                    onChange={(e) => setCategoria(e.target.value)} 
                    required
                    aria-required="true"
                    disabled={enviando}
                  >
                    <option value="">Selecione a categoria...</option>
                    {CATEGORIAS_CHAMADO.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.nome}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="descricao">Descrição detalhada *</label>
                <textarea
                  id="descricao"
                  rows="3"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Descreva o problema com o máximo de detalhes possível"
                  required
                  aria-required="true"
                  disabled={enviando}
                />
              </div>

              <div className="modal-actions">
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => setModalAberto(false)}
                  disabled={enviando}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn-primary-action" 
                  disabled={enviando}
                  aria-busy={enviando}
                >
                  {enviando ? 'A enviar...' : 'Confirmar e Entrar na Fila'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

export default DashboardVisitante;