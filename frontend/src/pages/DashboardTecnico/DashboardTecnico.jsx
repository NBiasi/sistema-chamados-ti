import React, { useState, useEffect } from 'react';
import api, { listarSecretarias, listarLocaisPorSecretaria, exportarMeusDados, anonimizarMeusDados, buscarHistoricoGlobal, CATEGORIAS_CHAMADO } from '../../services/api';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import './DashboardTecnico.css';

function DashboardTecnico({ usuario, onLogout }) {
  const [abaAtiva, setAbaAtiva] = useState('FILA');

  // Listagem - Fila Ativa
  const [chamados, setChamados] = useState([]);
  const [carregando, setCarregando] = useState(false);

  // Listagem - Histórico (Paginado Global)
  const [chamadosHistorico, setChamadosHistorico] = useState([]);
  const [carregandoHistorico, setCarregandoHistorico] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  // Modais
  const [modalConcluir, setModalConcluir] = useState(false);
  const [solucao, setSolucao] = useState('');
  const [modalDetalhes, setModalDetalhes] = useState(null);
  const [modalLgpdAberto, setModalLgpdAberto] = useState(false);

  // Cancelamento / devolução
  const [modalCancelar, setModalCancelar] = useState(null);
  const [motivoCancelamento, setMotivoCancelamento] = useState('');
  const [cancelando, setCancelando] = useState(false);

  // Criar chamado
  const [secretariasList, setSecretariasList] = useState([]);
  const [locaisList, setLocaisList] = useState([]);
  const [secretariaId, setSecretariaId] = useState('');
  const [localId, setLocalId] = useState('');
  const [titulo, setTitulo] = useState('');
  const [categoria, setCategoria] = useState('');
  const [descricao, setDescricao] = useState('');

  // Filtros (Finalizados)
  const [filtroBuscaFinalizados, setFiltroBuscaFinalizados] = useState('');
  const [filtroStatusFinalizados, setFiltroStatusFinalizados] = useState('TODOS');
  const [filtroSecretariaFinalizados, setFiltroSecretariaFinalizados] = useState('TODAS');
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');

  // Toast
  const [msgToast, setMsgToast] = useState({ tipo: '', texto: '' });

  // ID do usuário (comparação robusta)
  const usuarioId = Number(usuario?.id);
  const isMeu = (c) => Number(c?.tecnicoId) === usuarioId;

  // Helper para formatar data + hora
  const formatarDataHora = (valor) => {
    if (!valor) return '—';
    return new Date(valor).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Carrega apenas a fila ativa (não paginado para acompanhamento em tempo real)
  const carregarChamadosAtivos = async (silencioso = false) => {
    if (!silencioso) setCarregando(true);
    try {
      const { data } = await api.get('/chamados');
      setChamados(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Erro ao carregar chamados:', err);
    } finally {
      if (!silencioso) setCarregando(false);
    }
  };

  // Carrega o histórico de chamados GLOBAL (Paginado via API do Admin com datas)
  const carregarHistoricoPaginado = async (silencioso = false) => {
    if (!silencioso) setCarregandoHistorico(true);
    try {
      const dadosPaginados = await buscarHistoricoGlobal(page, 20, filtroStatusFinalizados, filtroBuscaFinalizados, filtroDataInicio, filtroDataFim);
      
      setChamadosHistorico(dadosPaginados.content || []);
      setTotalPages(dadosPaginados.totalPages || 0);
      setTotalElements(dadosPaginados.totalElements || 0);
    } catch (err) {
      console.error('Erro ao carregar histórico:', err);
    } finally {
      if (!silencioso) setCarregandoHistorico(false);
    }
  };

  // Efeito principal: carrega STOMP e dados ativos
  useEffect(() => {
    carregarChamadosAtivos();
    carregarHistoricoPaginado();

    api.get('/secretarias').then(res => setSecretariasList(res.data)).catch(console.error);

    const socket = new SockJS('/ws-chamados');
    const stompClient = new Client({
      webSocketFactory: () => socket,
      reconnectDelay: 5000,
      onConnect: () => {
        stompClient.subscribe('/topic/chamados', () => {
          carregarChamadosAtivos(true);
          carregarHistoricoPaginado(true);
        });
      }
    });

    stompClient.activate();
    return () => stompClient.deactivate();
  }, []); // Executa apenas no mount

  // Efeito para recarregar o histórico paginado quando os filtros ou página mudam
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      carregarHistoricoPaginado(true);
    }, 400); // 400ms debounce
    
    return () => clearTimeout(delayDebounce);
  }, [page, filtroStatusFinalizados, filtroBuscaFinalizados, filtroDataInicio, filtroDataFim]);

  const handleBuscaChange = (e) => {
    setFiltroBuscaFinalizados(e.target.value);
    setPage(0);
  };

  const handleStatusChange = (e) => {
    setFiltroStatusFinalizados(e.target.value);
    setPage(0);
  };

  const handleDataInicioChange = (e) => {
    setFiltroDataInicio(e.target.value);
    setPage(0);
  };

  const handleDataFimChange = (e) => {
    setFiltroDataFim(e.target.value);
    setPage(0);
  };

  useEffect(() => {
    async function fetchLocais() {
      if (!secretariaId) {
        setLocaisList([]);
        return;
      }
      try {
        const dados = await listarLocaisPorSecretaria(secretariaId);
        setLocaisList(dados);
      } catch (err) {
        console.error(err);
      }
    }
    fetchLocais();
  }, [secretariaId]);

  // Acessibilidade: Fechar modais com ESC
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (modalLgpdAberto) setModalLgpdAberto(false);
        if (modalConcluir && !cancelando) setModalConcluir(false);
        if (modalDetalhes) setModalDetalhes(null);
        if (modalCancelar && !cancelando) setModalCancelar(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalLgpdAberto, modalConcluir, modalDetalhes, modalCancelar, cancelando]);

  const mostrarToast = (tipo, texto) => {
    setMsgToast({ tipo, texto });
    setTimeout(() => setMsgToast({ tipo: '', texto: '' }), 4000);
  };

  // ===== AÇÕES =====
  const assumirChamado = async (chamadoId) => {
    if (meuChamadoAtivo) {
      mostrarToast('erro', 'Você já possui um chamado em andamento. Conclua ou devolva antes de assumir outro.');
      return;
    }
    try {
      await api.patch(`/chamados/${chamadoId}/atribuir/${usuarioId}`);
      mostrarToast('sucesso', 'Chamado atribuído a si!');
      carregarChamadosAtivos(true);
    } catch (err) {
      mostrarToast('erro', 'Erro ao assumir chamado.');
    }
  };

  const abrirModalCancelar = (chamado, origem) => {
    setMotivoCancelamento('');
    setModalCancelar({ chamado, origem });
  };

  const concluirChamado = async (e) => {
    e.preventDefault();
    try {
      await api.patch(`/chamados/${modalConcluir}/concluir?solucao=${encodeURIComponent(solucao)}`);
      mostrarToast('sucesso', 'Chamado concluído com sucesso!');
      setModalConcluir(false);
      setSolucao('');
      carregarChamadosAtivos(true);
      carregarHistoricoPaginado(true);
    } catch (err) {
      mostrarToast('erro', 'Erro ao concluir chamado.');
    }
  };

  // ===== CANCELAMENTO / DEVOLUÇÃO =====
  const confirmarAcao = async () => {
    if (!modalCancelar) return;
    const { chamado, origem } = modalCancelar;
    setCancelando(true);

    try {
      if (origem === 'FILA') {
        const motivo = motivoCancelamento.trim();
        const url = `/chamados/${chamado.id}/cancelar?tecnicoId=${usuarioId}` +
          (motivo ? `&motivo=${encodeURIComponent(motivo)}` : '');
        await api.patch(url);
        mostrarToast('sucesso', 'Chamado cancelado e enviado para Finalizados.');
      } else {
        await api.patch(`/chamados/${chamado.id}/desatribuir`);
        mostrarToast('sucesso', 'Chamado devolvido para a fila como ABERTO.');
      }
      setModalCancelar(null);
      setMotivoCancelamento('');
      carregarChamadosAtivos(true);
      carregarHistoricoPaginado(true);
    } catch (err) {
      console.error(err);
      mostrarToast('erro', 'Erro ao processar a ação.');
    } finally {
      setCancelando(false);
    }
  };

  const handleSubmitNovoChamado = async (e) => {
    e.preventDefault();
    
    // Prevenção do erro 400 antes de disparar o POST
    if (!titulo || !descricao || !categoria || !secretariaId) {
      mostrarToast('erro', 'Por favor, preencha todos os campos obrigatórios (*), incluindo a Categoria.');
      return;
    }

    try {
      await api.post('/chamados', {
        secretariaId: Number(secretariaId),
        localId: localId ? Number(localId) : null,
        titulo,
        categoria,
        descricao
      });
      mostrarToast('sucesso', 'O seu chamado foi criado com sucesso!');
      setTitulo(''); setCategoria(''); setDescricao(''); setSecretariaId(''); setLocalId('');
      setAbaAtiva('FILA');
      carregarChamadosAtivos(true);
    } catch (err) {
      mostrarToast('erro', 'Erro ao criar chamado.');
    }
  };

  // ==================== LGPD ====================
  const handleExportarDados = async () => {
    try {
      const dados = await exportarMeusDados();
      const blob = new Blob([JSON.stringify(dados, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "meus_dados_lgpd.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Erro ao exportar dados.');
    }
  };

  const handleAnonimizarDados = async () => {
    if (window.confirm('⚠️ ATENÇÃO: Esta ação é IRREVERSÍVEL. O seu nome e contactos serão anonimizados e o seu acesso ao sistema bloqueado de imediato. Deseja prosseguir?')) {
      try {
        await anonimizarMeusDados();
        alert('Os seus dados foram anonimizados com sucesso. A sua sessão será encerrada.');
        onLogout();
      } catch (err) {
        alert('Erro ao anonimizar conta.');
      }
    }
  };

  // ===== REGRAS DA FILA ATIVA =====
  const meuChamadoAtivo = chamados.find(
    (c) => isMeu(c) && c.status === 'EM_ANDAMENTO'
  );

  const chamadosFila = chamados.filter((c) =>
    ['ABERTO', 'EM_ANDAMENTO'].includes(c.status)
  );

  const calcularPrioridade = (c) => {
    const isAberto = c.status === 'ABERTO';
    const isEmAndamento = c.status === 'EM_ANDAMENTO';

    if (isMeu(c) && isEmAndamento) return 0;
    if (isAberto) return 1;
    if (isEmAndamento) return 2;
    return 3;
  };

  const chamadosOrdenados = [...chamadosFila].sort((a, b) => {
    const pa = calcularPrioridade(a);
    const pb = calcularPrioridade(b);
    if (pa !== pb) return pa - pb;
    return new Date(a.dataAbertura).getTime() - new Date(b.dataAbertura).getTime();
  });

  // Filtros Locais (Exclusivos para o array paginado da API Global)
  const chamadosFinalizadosFiltrados = chamadosHistorico.filter((c) => {
    if (filtroSecretariaFinalizados !== 'TODAS') {
      const nomeSecretaria = c.nomeSecretariaVisitante || '';
      if (nomeSecretaria !== filtroSecretariaFinalizados) return false;
    }
    return true;
  });

  const limparFiltrosFinalizados = () => {
    setFiltroBuscaFinalizados('');
    setFiltroStatusFinalizados('TODOS');
    setFiltroSecretariaFinalizados('TODAS');
    setFiltroDataInicio('');
    setFiltroDataFim('');
    setPage(0);
  };

  return (
    <main className="dash-tecnico-container" aria-label="Painel Principal do Técnico">
      <header className="dash-tecnico-header">
        <div className="tecnico-info">
          <h1 style={{ fontSize: '1.5rem', margin: '0 0 5px 0' }}>Painel do Técnico de TI</h1>
          <p>Olá, <strong>{usuario.nome}</strong></p>
        </div>
        <div style={{display: 'flex', gap: '10px', flexWrap: 'wrap'}}>
          <button
            onClick={() => setModalLgpdAberto(true)}
            style={{background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', padding: '8px 14px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontSize: '0.85rem'}}
            aria-label="Aceder às configurações de LGPD e Privacidade"
          >
            🛡️ Meus Dados (LGPD)
          </button>
          <button className="btn-logout" onClick={onLogout} aria-label="Sair do sistema">Sair</button>
        </div>
      </header>

      <nav className="abas-container" aria-label="Navegação de secções">
        <button
          className={abaAtiva === 'FILA' ? 'aba-btn ativa' : 'aba-btn'}
          onClick={() => setAbaAtiva('FILA')}
          aria-pressed={abaAtiva === 'FILA'}
        >
          📋 Fila de Chamados
        </button>
        <button
          className={abaAtiva === 'FINALIZADOS' ? 'aba-btn ativa' : 'aba-btn'}
          onClick={() => setAbaAtiva('FINALIZADOS')}
          aria-pressed={abaAtiva === 'FINALIZADOS'}
        >
          ✅ Histórico Global
        </button>
        <button
          className={abaAtiva === 'CRIAR' ? 'aba-btn ativa' : 'aba-btn'}
          onClick={() => setAbaAtiva('CRIAR')}
          aria-pressed={abaAtiva === 'CRIAR'}
        >
          ➕ Criar Meu Chamado
        </button>
      </nav>

      <div aria-live="polite" aria-atomic="true">
        {msgToast.texto && (
          <div className={`toast-alerta ${msgToast.tipo}`} role="alert">
            {msgToast.texto}
          </div>
        )}
      </div>

      <div className="dash-tecnico-content">

        {/* ===== ABA FILA ===== */}
        {abaAtiva === 'FILA' && (
          <section className="fila-section" aria-label="Secção Fila de Chamados Ativos">
            <div className="fila-header">
              <h2>Chamados Abertos e Em Andamento</h2>
              <button className="btn-refresh" onClick={() => carregarChamadosAtivos(false)}>🔄 Atualizar Fila</button>
            </div>

            <div aria-live="polite">
              {carregando ? <p>A carregar fila...</p> : (
                <div className="table-responsive" tabIndex="0" aria-label="Tabela de chamados em fila">
                  <table className="custom-table tecnico-table">
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'center' }} scope="col">Ações</th>
                        <th scope="col">Protocolo</th>
                        <th scope="col">Secretaria</th>
                        <th scope="col">Local</th>
                        <th scope="col">Solicitante</th>
                        <th scope="col">Contato</th>
                        <th scope="col">Título / Categoria / Prioridade</th>
                        <th scope="col">Data</th>
                        <th scope="col">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chamadosOrdenados.map(chamado => {
                        const chamadoIsMeu = isMeu(chamado);
                        const isDeOutro = chamado.tecnicoId && !chamadoIsMeu;
                        const isAberto = chamado.status === 'ABERTO';
                        const isEmAndamento = chamado.status === 'EM_ANDAMENTO';

                        let rowClass = "";
                        if (chamadoIsMeu && isEmAndamento) rowClass = "row-meu-ativo";
                        else if (isDeOutro && isEmAndamento) rowClass = "row-bloqueado";

                        return (
                          <tr key={chamado.id} className={rowClass}>
                            <td className="acoes-cell">
                              <div className="botoes-coluna">
                                <button
                                  className="btn-detalhes btn-sm"
                                  onClick={() => setModalDetalhes(chamado)}
                                  title="Ver todas as informações"
                                  aria-label={`Ver detalhes do chamado ${chamado.protocolo}`}
                                >
                                  🔍 Detalhes
                                </button>

                                {isAberto && (
                                  <>
                                    <button
                                      className="btn-assumir btn-sm"
                                      disabled={!!meuChamadoAtivo}
                                      onClick={() => assumirChamado(chamado.id)}
                                      title={meuChamadoAtivo ? "Você já possui um chamado em andamento." : "Pegar chamado para resolver"}
                                      aria-label={`Assumir chamado ${chamado.protocolo}`}
                                    >
                                      {meuChamadoAtivo ? "🔒 Ocupado" : "✋ Assumir"}
                                    </button>

                                    <button
                                      className="btn-cancelar btn-sm"
                                      onClick={() => abrirModalCancelar(chamado, 'FILA')}
                                      title="Cancelar este chamado"
                                      aria-label={`Cancelar chamado ${chamado.protocolo}`}
                                    >
                                      ✕ Cancelar
                                    </button>
                                  </>
                                )}

                                {chamadoIsMeu && isEmAndamento && (
                                  <>
                                    <button
                                      className="btn-concluir btn-sm"
                                      onClick={() => setModalConcluir(chamado.id)}
                                      aria-label={`Concluir chamado ${chamado.protocolo}`}
                                    >
                                      ✓ Concluir
                                    </button>

                                    <button
                                      className="btn-cancelar btn-sm"
                                      onClick={() => abrirModalCancelar(chamado, 'DEVOLVER')}
                                      title="Devolver este chamado para a fila"
                                      aria-label={`Devolver chamado ${chamado.protocolo} à fila`}
                                    >
                                      ↩ Devolver
                                    </button>
                                  </>
                                )}
                              </div>

                              {isDeOutro && isEmAndamento && (
                                <span className="alerta-outro-tecnico" style={{ marginTop: '8px' }} aria-label="Chamado em atendimento por outro técnico">
                                  🔒 Em atendimento
                                </span>
                              )}
                            </td>

                            <td>
                              <span className="protocolo-badge">
                                {chamado.protocolo || `#${chamado.id}`}
                              </span>
                            </td>

                            <td>{chamado.nomeSecretariaVisitante || '—'}</td>
                            <td>{chamado.nomeLocal || chamado.localVisitante || '—'}</td>
                            <td>{chamado.nomeUsuarioLogado || chamado.nomeVisitante || 'Não identificado'}</td>
                            <td>{chamado.contatoVisitante || '—'}</td>

                            <td>
                              <div className="ticket-title-cell">
                                <strong>{chamado.titulo}</strong>
                                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                  <span className="ticket-category">{chamado.categoria}</span>
                                  <span className={`prio-tag prio-${(chamado.prioridade || 'MEDIA').toLowerCase()}`}>
                                    {chamado.prioridade || 'MÉDIA'}
                                  </span>
                                </div>
                              </div>
                            </td>

                            <td><small>{formatarDataHora(chamado.dataAbertura)}</small></td>

                            <td>
                              <div className="status-cell-wrapper">
                                <span className={`badge-status status-${(chamado.status || 'ABERTO').toLowerCase()}`}>
                                  {chamado.status?.replace('_', ' ')}
                                </span>
                                {isEmAndamento && chamado.nomeTecnico && (
                                  <span className="nome-tecnico-responsavel" title={chamado.nomeTecnico}>
                                    👤 {chamado.nomeTecnico}
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {chamadosOrdenados.length === 0 && (
                    <p className="empty-state">Nenhum chamado em aberto ou em andamento. Excelente trabalho!</p>
                  )}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ===== ABA FINALIZADOS ===== */}
        {abaAtiva === 'FINALIZADOS' && (
          <section className="finalizados-section" aria-label="Secção de Histórico de Chamados Finalizados">
            <div className="fila-header">
              <h2>Histórico Global de Atendimentos</h2>
            </div>

            <div className="filtros-finalizados" role="search" aria-label="Filtros de pesquisa de finalizados">
              <div className="filtro-item">
                <label htmlFor="filtro-status-finalizados">Status</label>
                <select id="filtro-status-finalizados" value={filtroStatusFinalizados} onChange={handleStatusChange}>
                  <option value="TODOS">Todos</option>
                  <option value="CONCLUIDO">Concluídos</option>
                  <option value="CANCELADO">Cancelados</option>
                </select>
              </div>

              <div className="filtro-item">
                <label htmlFor="filtro-sec-finalizados">Secretaria</label>
                <select id="filtro-sec-finalizados" value={filtroSecretariaFinalizados} onChange={(e) => { setFiltroSecretariaFinalizados(e.target.value); setPage(0); }}>
                  <option value="TODAS">Todas</option>
                  {secretariasList.map((sec) => (
                    <option key={sec.id} value={sec.nome}>{sec.nome}</option>
                  ))}
                </select>
              </div>

              <div className="filtro-item">
                <label htmlFor="filtro-data-inicio">De:</label>
                <input id="filtro-data-inicio" type="date" value={filtroDataInicio} onChange={handleDataInicioChange} />
              </div>

              <div className="filtro-item">
                <label htmlFor="filtro-data-fim">Até:</label>
                <input id="filtro-data-fim" type="date" value={filtroDataFim} onChange={handleDataFimChange} />
              </div>
              
              <div className="filtro-item filtro-busca">
                <label htmlFor="filtro-busca-geral">Pesquisar</label>
                <input
                  id="filtro-busca-geral"
                  type="text"
                  placeholder="Protocolo, título, solicitante ou categoria..."
                  value={filtroBuscaFinalizados}
                  onChange={handleBuscaChange}
                />
              </div>

              <div className="filtro-item filtro-acoes">
                <button className="btn-limpar-filtros" onClick={limparFiltrosFinalizados}>Limpar filtros</button>
              </div>
            </div>

            <div aria-live="polite">
              {carregandoHistorico ? <p>A carregar histórico da base de dados...</p> : (
                <>
                  <div className="table-responsive" tabIndex="0" aria-label="Tabela de chamados finalizados">
                    <table className="custom-table tecnico-table">
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'center' }} scope="col">Ações</th>
                          <th scope="col">Protocolo</th>
                          <th scope="col">Secretaria</th>
                          <th scope="col">Local</th>
                          <th scope="col">Solicitante</th>
                          <th scope="col">Técnico</th>
                          <th scope="col">Título / Categoria / Prioridade</th>
                          <th scope="col">Data Conclusão</th>
                          <th scope="col">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {chamadosFinalizadosFiltrados.map(chamado => {
                          const isConcluido = chamado.status === 'CONCLUIDO';
                          const isCancelado = chamado.status === 'CANCELADO';

                          return (
                            <tr key={chamado.id} className={isCancelado ? "row-cancelado" : "row-concluido"}>
                              <td className="acoes-cell">
                                <div className="botoes-coluna">
                                  <button className="btn-detalhes btn-sm" onClick={() => setModalDetalhes(chamado)} aria-label={`Ver detalhes do chamado ${chamado.protocolo}`}>
                                    🔍 Detalhes
                                  </button>

                                  {(isConcluido || isCancelado) && (
                                    <button
                                      className="btn-cancelar btn-sm"
                                      style={{background: '#64748b'}}
                                      onClick={() => abrirModalCancelar(chamado, 'DEVOLVER')}
                                      aria-label={`Devolver chamado finalizado ${chamado.protocolo} à fila`}
                                    >
                                      ↩ Reabrir
                                    </button>
                                  )}
                                </div>
                              </td>
                              <td><span className="protocolo-badge">{chamado.protocolo || `#${chamado.id}`}</span></td>
                              <td>{chamado.nomeSecretariaVisitante || '—'}</td>
                              <td>{chamado.nomeLocal || chamado.localVisitante || '—'}</td>
                              <td>{chamado.nomeUsuarioLogado || chamado.nomeVisitante || 'Não identificado'}</td>
                              <td>{chamado.nomeTecnico || '—'}</td>
                              <td>
                                <div className="ticket-title-cell">
                                  <strong>{chamado.titulo}</strong>
                                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                    <span className="ticket-category">{chamado.categoria}</span>
                                    <span className={`prio-tag prio-${(chamado.prioridade || 'MEDIA').toLowerCase()}`}>
                                      {chamado.prioridade || 'MÉDIA'}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td><small>{formatarDataHora(chamado.dataConclusao || chamado.dataAbertura)}</small></td>
                              <td>
                                {isConcluido && <span className="status-finalizado">✓ Concluído</span>}
                                {isCancelado && <span className="status-cancelado-badge">✕ Cancelado</span>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    {chamadosHistorico.length === 0 && (
                      <p className="empty-state">Nenhum chamado no histórico corresponde aos filtros atuais.</p>
                    )}
                  </div>
                  
                  {/* Controlos de Paginação na Interface */}
                  {totalPages > 1 && (
                    <div className="pagination-container">
                      <span className="pagination-info">Mostrando {chamadosFinalizadosFiltrados.length} de {totalElements}</span>
                      <div className="pagination-controls">
                        <button 
                          className="btn-page" 
                          onClick={() => setPage(page - 1)} 
                          disabled={page === 0}
                        >
                          « Anterior
                        </button>
                        <span className="page-current">Página {page + 1} de {totalPages}</span>
                        <button 
                          className="btn-page" 
                          onClick={() => setPage(page + 1)} 
                          disabled={page >= totalPages - 1}
                        >
                          Seguinte »
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>
        )}

        {/* ===== ABA CRIAR ===== */}
        {abaAtiva === 'CRIAR' && (
          <section className="form-section-card" aria-label="Formulário para Registar Novo Chamado">
            <h2>Registar Novo Chamado</h2>
            <form onSubmit={handleSubmitNovoChamado} className="form-novo-chamado" noValidate>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="secIdNovo">Secretaria *</label>
                  <select id="secIdNovo" value={secretariaId} onChange={(e) => setSecretariaId(e.target.value)} required aria-required="true">
                    <option value="">Selecione...</option>
                    {secretariasList.map(sec => <option key={sec.id} value={sec.id}>{sec.nome}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="localIdNovo">Localização</label>
                  <select id="localIdNovo" value={localId} onChange={(e) => setLocalId(e.target.value)} disabled={!secretariaId}>
                    <option value="">Selecione o edifício...</option>
                    {locaisList.map(loc => <option key={loc.id} value={loc.id}>{loc.nome}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="tituloNovo">Título *</label>
                  <input id="tituloNovo" type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)} required aria-required="true" />
                </div>
                <div className="form-group">
                  <label htmlFor="categoriaNovo">Categoria *</label>
                  <select id="categoriaNovo" value={categoria} onChange={(e) => setCategoria(e.target.value)} required aria-required="true">
                    <option value="">Selecione a categoria...</option>
                    {CATEGORIAS_CHAMADO.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.nome}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="descricaoNovo">Descrição *</label>
                <textarea id="descricaoNovo" rows="4" value={descricao} onChange={(e) => setDescricao(e.target.value)} required aria-required="true"></textarea>
              </div>
              <button type="submit" className="btn-assumir">Criar Chamado</button>
            </form>
          </section>
        )}

      </div>

      {/* ===== MODAL: CONCLUIR ===== */}
      {modalConcluir && (
        <div 
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-modal-concluir"
          onClick={() => !cancelando && setModalConcluir(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 id="titulo-modal-concluir" style={{fontSize: '1.25rem', margin: '0 0 10px 0'}}>Concluir Chamado</h2>
            <p>Por favor, descreva a solução aplicada:</p>
            <form onSubmit={concluirChamado} noValidate>
              <label htmlFor="solucaoAprovada" className="sr-only" style={{display:'none'}}>Solução Aplicada</label>
              <textarea id="solucaoAprovada" rows="4" value={solucao} onChange={(e) => setSolucao(e.target.value)} required aria-required="true" placeholder="Descreva o que foi feito..." />
              <div className="modal-acoes">
                <button type="button" className="btn-cancelar btn-sm" onClick={() => setModalConcluir(false)}>Voltar</button>
                <button type="submit" className="btn-concluir btn-sm">Finalizar Chamado</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== MODAL: CONFIRMAR CANCELAMENTO / DEVOLUÇÃO ===== */}
      {modalCancelar && (
        <div 
          className="modal-backdrop" 
          onClick={() => !cancelando && setModalCancelar(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-modal-cancelar"
        >
          <div className="modal-content modal-confirmacao" onClick={(e) => e.stopPropagation()}>
            <div className="confirmacao-icone" aria-hidden="true">{modalCancelar.origem === 'FILA' ? '⚠️️' : '↩️'}</div>

            <h2 id="titulo-modal-cancelar" className="confirmacao-titulo">
              {modalCancelar.origem === 'FILA' ? 'Cancelar este chamado?' : 'Devolver este chamado para a fila?'}
            </h2>

            <p className="confirmacao-texto">
              {modalCancelar.origem === 'FILA' ? (
                <>O chamado <strong>{modalCancelar.chamado.protocolo || `#${modalCancelar.chamado.id}`}</strong> será marcado como <strong>CANCELADO</strong> e enviado para a aba <strong>Finalizados</strong>.</>
              ) : (
                <>O chamado <strong>{modalCancelar.chamado.protocolo || `#${modalCancelar.chamado.id}`}</strong> voltará para a fila como <strong>ABERTO</strong>.</>
              )}
            </p>

            <div className="confirmacao-resumo" aria-label="Resumo do chamado">
              <div><small>Título</small><strong>{modalCancelar.chamado.titulo}</strong></div>
              <div><small>Prioridade</small><strong><span className={`prio-tag prio-${(modalCancelar.chamado.prioridade || 'MEDIA').toLowerCase()}`}>{modalCancelar.chamado.prioridade || 'MÉDIA'}</span></strong></div>
              <div><small>Técnico atual</small><strong>{modalCancelar.chamado.nomeTecnico || usuario.nome}</strong></div>
            </div>

            {modalCancelar.origem === 'FILA' && (
              <div className="confirmacao-motivo">
                <label htmlFor="motivoCancelamento">Motivo do cancelamento (opcional)</label>
                <textarea
                  id="motivoCancelamento"
                  rows="3"
                  placeholder="Ex: duplicado, etc."
                  value={motivoCancelamento}
                  onChange={(e) => setMotivoCancelamento(e.target.value)}
                  disabled={cancelando}
                />
              </div>
            )}

            <p className="confirmacao-aviso">
              {modalCancelar.origem === 'FILA' ? 'Esta ação não pode ser desfeita.' : 'O chamado voltará para a fila e poderá ser assumido novamente.'}
            </p>

            <div className="confirmacao-acoes">
              <button type="button" className="btn-secondary" onClick={() => setModalCancelar(null)} disabled={cancelando}>
                Não, voltar
              </button>
              <button
                type="button"
                className={modalCancelar.origem === 'FILA' ? 'btn-perigo' : 'btn-secondary'}
                onClick={confirmarAcao}
                disabled={cancelando}
                aria-busy={cancelando}
              >
                {cancelando ? 'Processando...' : modalCancelar.origem === 'FILA' ? 'Sim, cancelar chamado' : 'Sim, devolver à fila'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL: DETALHES ===== */}
      {modalDetalhes && (
        <div 
          className="modal-backdrop" 
          onClick={() => setModalDetalhes(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-modal-detalhes"
        >
          <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()}>
            <h2 id="titulo-modal-detalhes" style={{fontSize: '1.25rem', margin: 0}}>Detalhes do Chamado: {modalDetalhes.protocolo || 'N/A'}</h2>

            <div className="detalhes-grid" aria-label="Informação completa do chamado">
              <div className="detalhe-item"><label>Solicitante:</label><span>{modalDetalhes.nomeUsuarioLogado || modalDetalhes.nomeVisitante || 'Não identificado'}</span></div>
              <div className="detalhe-item"><label>Contacto:</label><span>{modalDetalhes.contatoVisitante || 'Não informado'}</span></div>
              <div className="detalhe-item"><label>Secretaria:</label><span>{modalDetalhes.nomeSecretariaVisitante || 'N/A'}</span></div>
              <div className="detalhe-item"><label>Edifício / Local:</label><span>{modalDetalhes.nomeLocal || modalDetalhes.localVisitante || 'Não informado'}</span></div>
              <div className="detalhe-item"><label>Rua:</label><span>{modalDetalhes.rua || 'Não informada'}</span></div>
              <div className="detalhe-item"><label>Número:</label><span>{modalDetalhes.numero || 'S/N'}</span></div>
              <div className="detalhe-item"><label>Setor / Bairro:</label><span>{modalDetalhes.setor || 'Não informado'}</span></div>

              <div className="detalhe-item"><label>Prioridade:</label><span><span className={`prio-tag prio-${(modalDetalhes.prioridade || 'MEDIA').toLowerCase()}`}>{modalDetalhes.prioridade || 'MÉDIA'}</span></span></div>
              <div className="detalhe-item"><label>Data e Hora de Abertura:</label><span>{formatarDataHora(modalDetalhes.dataAbertura)}</span></div>
              <div className="detalhe-item"><label>Data e Hora de Conclusão:</label><span>{modalDetalhes.dataConclusao ? formatarDataHora(modalDetalhes.dataConclusao) : 'Em andamento'}</span></div>

              <div className="detalhe-item full-width"><label>Título do Problema:</label><span><strong>{modalDetalhes.titulo}</strong> ({modalDetalhes.categoria}) - <span className={`prio-tag prio-${(modalDetalhes.prioridade || 'MEDIA').toLowerCase()}`}>{modalDetalhes.prioridade || 'MÉDIA'}</span></span></div>
              <div className="detalhe-item full-width desc-caixa"><label>Descrição Completa:</label><p>{modalDetalhes.descricao}</p></div>

              {modalDetalhes.solucao && (
                <div className="detalhe-item full-width solucao-caixa"><label>Solução Aplicada:</label><p>{modalDetalhes.solucao}</p></div>
              )}

              {modalDetalhes.status === 'CANCELADO' && modalDetalhes.observacao && (
                <div className="detalhe-item full-width cancelamento-caixa"><label>Motivo do Cancelamento:</label><p>{modalDetalhes.observacao}</p></div>
              )}

              {modalDetalhes.notaAvaliacao && (
                <div className="detalhe-item full-width avaliacao-caixa">
                  <label>Avaliação do Usuário:</label>
                  <p aria-label={`Avaliado com nota ${modalDetalhes.notaAvaliacao} de 5`}>
                    <span aria-hidden="true">{'★'.repeat(modalDetalhes.notaAvaliacao)}{'☆'.repeat(5 - modalDetalhes.notaAvaliacao)}</span> {modalDetalhes.comentarioAvaliacao && <em>"{modalDetalhes.comentarioAvaliacao}"</em>}
                  </p>
                </div>
              )}
            </div>

            <div className="modal-acoes">
              <button type="button" className="btn-cancelar" onClick={() => setModalDetalhes(null)} aria-label="Fechar janela de detalhes">Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL: MEUS DADOS LGPD ===== */}
      {modalLgpdAberto && (
        <div 
          className="modal-backdrop" 
          onClick={() => setModalLgpdAberto(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-lgpd-tecnico"
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <header style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
              <h2 id="titulo-lgpd-tecnico" style={{margin: 0, fontSize: '1.25rem'}}>Privacidade e Direitos (LGPD)</h2>
              <button
                onClick={() => setModalLgpdAberto(false)}
                style={{background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', lineHeight: 1}}
                aria-label="Fechar painel de privacidade"
              >
                ×
              </button>
            </header>

            <p style={{fontSize: '0.9rem', color: '#475569', marginBottom: '15px'}}>
              Em conformidade com o Art. 18 da Lei Geral de Proteção de Dados (13.709/2018), pode exercer os seus direitos a qualquer momento.
            </p>

            <div style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
              <div style={{background: '#f8fafc', padding: '15px', border: '1px solid #e2e8f0', borderRadius: '8px'}}>
                <h3 style={{margin: '0 0 5px 0', fontSize: '1rem'}}>Exportar Dados</h3>
                <p style={{fontSize: '0.8rem', color: '#64748b', margin: '0 0 10px 0'}}>Descarregue uma cópia dos seus dados e do seu histórico de chamados num formato estruturado (JSON).</p>
                <button
                  onClick={handleExportarDados}
                  style={{background: '#4f46e5', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', width: '100%'}}
                >
                  📥 Exportar os Meus Dados
                </button>
              </div>

              <div style={{background: '#fef2f2', padding: '15px', border: '1px solid #fecaca', borderRadius: '8px'}}>
                <h3 style={{margin: '0 0 5px 0', fontSize: '1rem', color: '#dc2626'}}>Anonimizar Conta</h3>
                <p style={{fontSize: '0.8rem', color: '#991b1b', margin: '0 0 10px 0'}}>Isto irá mascarar permanentemente o seu nome, email e telefone, mantendo os chamados para registo histórico sem o identificar. Esta ação apaga o seu acesso.</p>
                <button
                  onClick={handleAnonimizarDados}
                  style={{background: '#ef4444', color: '#fff', border: 'nowrap', padding: '10px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', width: '100%'}}
                >
                  🗑️ Anonimizar os Meus Dados
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default DashboardTecnico;