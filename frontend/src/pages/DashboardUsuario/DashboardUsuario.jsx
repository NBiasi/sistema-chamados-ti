import React, { useEffect, useState } from 'react';
import { buscarMeusChamados, criarChamado, avaliarChamado, exportarMeusDados, anonimizarMeusDados, CATEGORIAS_CHAMADO } from '../../services/api';
import api from '../../services/api';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import './DashboardUsuario.css';

export default function DashboardUsuario({ onLogout }) {
  const [abaAtiva, setAbaAtiva] = useState('MEUS');
  const [filaGeral, setFilaGeral] = useState([]);
  const [carregandoFila, setCarregandoFila] = useState(false);
  const [filtroSecretariaFila, setFiltroSecretariaFila] = useState('TODAS');
  const [filtroDataAtivo, setFiltroDataAtivo] = useState('');
  const [chamados, setChamados] = useState([]);
  
  // PAGINAÇÃO ESTADOS E FILTROS
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('TODOS');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  
  const [secretarias, setSecretarias] = useState([]);
  const [locais, setLocais] = useState([]);
  const [secretariaSelecionada, setSecretariaSelecionada] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [modalNovoAberto, setModalNovoAberto] = useState(false);
  const [modalLgpdAberto, setModalLgpdAberto] = useState(false);

  const [formNovo, setFormNovo] = useState({
    titulo: '',
    categoria: '',
    prioridade: 'MEDIA',
    localId: '',
    localVisitante: '',
    descricao: ''
  });
  const [enviando, setEnviando] = useState(false);

  const [cancelandoId, setCancelandoId] = useState(null);

  const [chamadoParaAvaliar, setChamadoParaAvaliar] = useState(null);
  const [nota, setNota] = useState(5);
  const [comentarioAvaliacao, setComentarioAvaliacao] = useState('');
  const [enviandoAvaliacao, setEnviandoAvaliacao] = useState(false);

  const usuarioSalvo = JSON.parse(localStorage.getItem('usuario') || '{}');
  const usuarioId = Number(usuarioSalvo?.id);

  const formatarDataHora = (valor) => {
    if (!valor) return '—';
    return new Date(valor).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const podeCancelar = (c) => ['ABERTO', 'EM_ANDAMENTO', 'AGUARDANDO'].includes(c.status);
  const podeAvaliar = (c) => c.status === 'CONCLUIDO' && !c.notaAvaliacao;

  const extrairDataLocal = (valor) => {
    if (!valor) return null;
    const d = new Date(valor);
    if (!isNaN(d.getTime())) {
      const ano = d.getFullYear();
      const mes = String(d.getMonth() + 1).padStart(2, '0');
      const dia = String(d.getDate()).padStart(2, '0');
      return `${ano}-${mes}-${dia}`;
    }
    if (typeof valor === 'string' && valor.length >= 10) {
      return valor.substring(0, 10);
    }
    return null;
  };

  const carregarDados = async (silencioso = false) => {
    if (!silencioso) setCarregando(true);
    if (!silencioso) setErro('');
    try {
      const temFiltroData = Boolean(dataInicio || dataFim);
      // Se houver filtro de data ativo, busca um limite maior para filtrar no cliente com precisão
      const tamanhoPagina = temFiltroData ? 200 : 20;
      const paginaRequisicao = temFiltroData ? 0 : page;

      const dadosPaginados = await buscarMeusChamados(
        paginaRequisicao,
        tamanhoPagina,
        filtroStatus,
        busca,
        dataInicio,
        dataFim
      );
      
      let lista = Array.isArray(dadosPaginados?.content) ? dadosPaginados.content : [];

      if (temFiltroData) {
        lista = lista.filter((c) => {
          const dataChamado = extrairDataLocal(c.dataAbertura);
          if (!dataChamado) return false;
          if (dataInicio && dataChamado < dataInicio) return false;
          if (dataFim && dataChamado > dataFim) return false;
          return true;
        });

        const totalItens = lista.length;
        const totalPags = Math.ceil(totalItens / 20) || 1;
        setTotalPages(totalPags);
        setTotalElements(totalItens);

        const inicioSlice = page * 20;
        setChamados(lista.slice(inicioSlice, inicioSlice + 20));
      } else {
        setChamados(lista);
        setTotalPages(dadosPaginados?.totalPages || 0);
        setTotalElements(dadosPaginados?.totalElements || 0);
      }
    } catch (err) {
      if (!silencioso) setErro('Não foi possível carregar os dados. Verifique a conexão com o servidor.');
    } finally {
      if (!silencioso) setCarregando(false);
    }
  };

  const carregarFilaGeral = async (silencioso = false) => {
    if (!silencioso) setCarregandoFila(true);
    try {
      const response = await api.get('/chamados');
      const todos = Array.isArray(response.data) ? response.data : [];
      const fila = todos
        .filter(c => ['ABERTO', 'EM_ANDAMENTO'].includes(c.status))
        .sort((a, b) => new Date(a.dataAbertura) - new Date(b.dataAbertura));
      setFilaGeral(fila);
    } catch (err) {
      console.error('Erro ao carregar fila:', err);
    } finally {
      if (!silencioso) setCarregandoFila(false);
    }
  };

  useEffect(() => {
    if (abaAtiva === 'FILA') carregarFilaGeral();
  }, [abaAtiva]);

  // Carrega os dados sempre que a página, status, data ou busca mudam. Usa delay na busca (debounce).
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      carregarDados();
    }, 400); 
    return () => clearTimeout(delayDebounce);
  }, [page, filtroStatus, busca, dataInicio, dataFim]);

  const handleBuscaChange = (e) => { setBusca(e.target.value); setPage(0); };
  const handleStatusChange = (e) => { setFiltroStatus(e.target.value); setPage(0); };
  const handleDataInicioChange = (e) => { setDataInicio(e.target.value); setFiltroDataAtivo(''); setPage(0); };
  const handleDataFimChange = (e) => { setDataFim(e.target.value); setFiltroDataAtivo(''); setPage(0); };
  
  const aplicarFiltroDataRapido = (tipo) => {
    if (filtroDataAtivo === tipo) {
      setDataInicio('');
      setDataFim('');
      setFiltroDataAtivo('');
      setPage(0);
      return;
    }
    const hoje = new Date();
    const formatarISO = (d) => {
      const ano = d.getFullYear();
      const mes = String(d.getMonth() + 1).padStart(2, '0');
      const dia = String(d.getDate()).padStart(2, '0');
      return `${ano}-${mes}-${dia}`;
    };
    const fimStr = formatarISO(hoje);

    if (tipo === 'HOJE') {
      setDataInicio(fimStr);
      setDataFim(fimStr);
      setFiltroDataAtivo('HOJE');
    } else if (tipo === 'SEMANA') {
      const inicio = new Date();
      inicio.setDate(inicio.getDate() - 7);
      setDataInicio(formatarISO(inicio));
      setDataFim(fimStr);
      setFiltroDataAtivo('SEMANA');
    } else if (tipo === 'MES') {
      const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      setDataInicio(formatarISO(inicio));
      setDataFim(fimStr);
      setFiltroDataAtivo('MES');
    }
    setPage(0);
  };

  const limparFiltros = () => {
    setBusca('');
    setFiltroStatus('TODOS');
    setDataInicio('');
    setDataFim('');
    setFiltroDataAtivo('');
    setPage(0);
  };

  useEffect(() => {
    api.get('/secretarias').then(response => {
      setSecretarias(Array.isArray(response.data) ? response.data : []);
    }).catch(() => setSecretarias([]));

    if (usuarioSalvo && usuarioSalvo.secretariaId) {
      setSecretariaSelecionada(usuarioSalvo.secretariaId);
    }

    const socket = new SockJS('/ws-chamados');
    const stompClient = new Client({
      webSocketFactory: () => socket,
      reconnectDelay: 5000,
      onConnect: () => {
        stompClient.subscribe('/topic/chamados', () => {
          carregarDados(true);
          carregarFilaGeral(true);
        });
        carregarFilaGeral(true);
      }
    });

    stompClient.activate();
    return () => stompClient.deactivate();
  }, []); 

  useEffect(() => {
    if (secretariaSelecionada) {
      api.get(`/locais/secretaria/${secretariaSelecionada}`).then(response => {
        setLocais(Array.isArray(response.data) ? response.data : []);
        setFormNovo(prev => ({ ...prev, localId: '' }));
      }).catch(() => { setLocais([]); });
    } else {
      setLocais([]);
      setFormNovo(prev => ({ ...prev, localId: '' }));
    }
  }, [secretariaSelecionada]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (modalNovoAberto && !enviando) setModalNovoAberto(false);
        if (chamadoParaAvaliar && !enviandoAvaliacao) fecharModalAvaliacao();
        if (modalLgpdAberto) setModalLgpdAberto(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalNovoAberto, chamadoParaAvaliar, modalLgpdAberto, enviando, enviandoAvaliacao]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormNovo((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmeterChamado = async (e) => {
    e.preventDefault();
    if (!formNovo.titulo || !formNovo.descricao || !formNovo.localId) {
      alert('Por favor, preencha o título, a descrição e selecione o local do chamado.');
      return;
    }

    setEnviando(true);
    try {
      const payload = {
        titulo: formNovo.titulo,
        categoria: formNovo.categoria,
        prioridade: formNovo.prioridade,
        localId: Number(formNovo.localId),
        localVisitante: formNovo.localVisitante,
        descricao: formNovo.descricao
      };

      await criarChamado(payload);
      setModalNovoAberto(false);
      setFormNovo({ titulo: '', categoria: '', prioridade: 'MEDIA', localId: '', localVisitante: '', descricao: '' });
      setPage(0); 
      carregarDados(true);
      await carregarFilaGeral(true);
      setAbaAtiva('FILA');
    } catch (err) {
      alert('Erro ao abrir chamado. Verifique os campos e tente novamente.');
    } finally {
      setEnviando(false);
    }
  };

  const cancelarChamado = async (chamado) => {
    if (!window.confirm(`Deseja realmente cancelar o chamado "${chamado.titulo}"?`)) return;

    setCancelandoId(chamado.id);
    try {
      await api.patch(`/chamados/${chamado.id}/cancelar?tecnicoId=${usuarioId}`);
      await carregarDados(true);
    } catch (err) {
      alert('Não foi possível cancelar o chamado.');
    } finally {
      setCancelandoId(null);
    }
  };

  const abrirModalAvaliacao = (chamado) => {
    setChamadoParaAvaliar(chamado);
    setNota(5);
    setComentarioAvaliacao('');
  };

  const fecharModalAvaliacao = () => {
    setChamadoParaAvaliar(null);
    setNota(5);
    setComentarioAvaliacao('');
  };

  const submeterAvaliacao = async (e) => {
    e.preventDefault();
    if (!chamadoParaAvaliar) return;
    setEnviandoAvaliacao(true);
    try {
      await avaliarChamado(chamadoParaAvaliar.id, { notaAvaliacao: nota, comentarioAvaliacao });
      fecharModalAvaliacao();
      await carregarDados(true);
    } catch (err) {
      alert('Não foi possível submeter a avaliação.');
    } finally {
      setEnviandoAvaliacao(false);
    }
  };

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
    if (window.confirm('⚠️ ATENÇÃO: Esta ação é IRREVERSÍVEL. O seu acesso será bloqueado de imediato. Deseja prosseguir?')) {
      try {
        await anonimizarMeusDados();
        alert('Os seus dados foram anonimizados com sucesso. A sua sessão será encerrada.');
        onLogout();
      } catch (err) {
        alert('Erro ao anonimizar conta.');
      }
    }
  };

  const filaGeralFiltrada = filaGeral.filter(item => {
    if (filtroSecretariaFila !== 'TODAS') {
      const sec = item.nomeSecretariaVisitante || '';
      if (sec !== filtroSecretariaFila) return false;
    }
    return true;
  });

  return (
    <main className="dash-user-container" aria-label="Painel Principal do Utilizador">
      <header className="dash-user-header">
        <div className="user-branding">
          <div className="user-avatar" aria-hidden="true">
            {usuarioSalvo.nome ? usuarioSalvo.nome.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="user-info">
            <h1 style={{fontSize: '1.2rem', margin: 0}}>{usuarioSalvo.nome || 'Utilizador'}</h1>
            <p>
              <span>{usuarioSalvo.email || 'Usuário do Sistema'}</span>
              {usuarioSalvo.nomeSecretaria && (
                <span className="badge-sec">{usuarioSalvo.nomeSecretaria}</span>
              )}
            </p>
          </div>
        </div>

        <div style={{display: 'flex', gap: '10px', flexWrap: 'wrap'}}>
          <button 
            onClick={() => setModalLgpdAberto(true)} 
            className="btn-secondary" 
            style={{fontSize: '0.85rem'}}
            aria-label="Aceder às configurações de LGPD e Privacidade"
          >
            🛡️ Meus Dados (LGPD)
          </button>
          <button onClick={onLogout} className="btn-logout" aria-label="Sair do sistema">Sair</button>
        </div>
      </header>

      <nav className="abas-container" aria-label="Navegação de abas">
        <button 
          className={abaAtiva === 'MEUS' ? 'aba-btn ativa' : 'aba-btn'}
          onClick={() => setAbaAtiva('MEUS')}
          aria-pressed={abaAtiva === 'MEUS'}
        >
          📋 Meus Chamados
        </button>
        <button 
          className={abaAtiva === 'FILA' ? 'aba-btn ativa' : 'aba-btn'}
          onClick={() => setAbaAtiva('FILA')}
          aria-pressed={abaAtiva === 'FILA'}
        >
          🕐 Fila de Atendimento
        </button>
      </nav>

      {abaAtiva === 'MEUS' && (
        <>
          <section className="action-bar" aria-label="Filtros e Ações Rápidas">
        <button onClick={() => setModalNovoAberto(true)} className="btn-primary-action">
          + Novo Chamado
        </button>
        
        <div className="filters-group">
          <input
            type="text"
            placeholder="Buscar por protocolo, título..."
            value={busca}
            onChange={handleBuscaChange}
            className="input-search"
            aria-label="Campo de pesquisa"
          />
          <select
            value={filtroStatus}
            onChange={handleStatusChange}
            className="select-filter"
            aria-label="Filtro de estados"
          >
            <option value="TODOS">Todos os Status</option>
            <option value="ABERTO">Aberto</option>
            <option value="EM_ANDAMENTO">Em Andamento</option>
            <option value="AGUARDANDO">Aguardando</option>
            <option value="CONCLUIDO">Concluído</option>
            <option value="CANCELADO">Cancelado</option>
          </select>
          <div className="date-filter-group" aria-label="Filtro por data">
            <div className="date-inputs-wrapper">
              <label className="date-input-label">
                <span className="date-tag">De</span>
                <input 
                  type="date" 
                  value={dataInicio} 
                  onChange={handleDataInicioChange} 
                  className="input-date-styled" 
                  title="Data de Início"
                  aria-label="Data de Início"
                />
              </label>
              <label className="date-input-label">
                <span className="date-tag">Até</span>
                <input 
                  type="date" 
                  value={dataFim} 
                  onChange={handleDataFimChange} 
                  className="input-date-styled" 
                  title="Data de Fim"
                  aria-label="Data de Fim"
                />
              </label>
            </div>
            <div className="date-shortcuts" role="group" aria-label="Atalhos rápidos por data">
              <button 
                type="button" 
                className={`btn-date-preset ${filtroDataAtivo === 'HOJE' ? 'ativo' : ''}`}
                onClick={() => aplicarFiltroDataRapido('HOJE')}
              >
                Hoje
              </button>
              <button 
                type="button" 
                className={`btn-date-preset ${filtroDataAtivo === 'SEMANA' ? 'ativo' : ''}`}
                onClick={() => aplicarFiltroDataRapido('SEMANA')}
              >
                7 dias
              </button>
              <button 
                type="button" 
                className={`btn-date-preset ${filtroDataAtivo === 'MES' ? 'ativo' : ''}`}
                onClick={() => aplicarFiltroDataRapido('MES')}
              >
                Mês
              </button>
            </div>
          </div>
          <button onClick={limparFiltros} className="btn-secondary" style={{padding: '8px 12px'}} title="Limpar todos os filtros">Limpar</button>
        </div>
      </section>

      <section className="content-section" aria-live="polite">
        {carregando && chamados.length === 0 && <div className="state-card" role="status">Carregando os seus chamados...</div>}
        {erro && <div className="state-card error-card" role="alert">{erro}</div>}

        {!carregando && !erro && chamados.length === 0 && (
          <div className="welcome-card">
            <div className="welcome-icon" aria-hidden="true">🎧</div>
            <h2>Central de Suporte de TI</h2>
            <p>{busca || filtroStatus !== 'TODOS' || dataInicio || dataFim ? 'Nenhum chamado encontrado com estes filtros.' : 'Precisa de assistência técnica para computadores, impressoras ou rede?'}</p>
            {!busca && filtroStatus === 'TODOS' && !dataInicio && !dataFim && (
              <button onClick={() => setModalNovoAberto(true)} className="btn-primary-action" style={{marginTop: '15px'}}>
                Abrir um Chamado Agora
              </button>
            )}
          </div>
        )}

        {chamados.length > 0 && (
          <>
            <div className="table-responsive" tabIndex="0" aria-label="Tabela de chamados do utilizador">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th scope="col">Protocolo</th>
                    <th scope="col">Título / Categoria</th>
                    <th scope="col">Prioridade</th>
                    <th scope="col">Status</th>
                    <th scope="col">Técnico Responsável</th>
                    <th scope="col">Data e Hora</th>
                    <th scope="col">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {chamados.map((item) => (
                    <tr key={item.id}>
                      <td data-label="Protocolo">
                        <span className="protocol-badge">{item.protocolo || `#${item.id}`}</span>
                      </td>
                      <td data-label="Título">
                        <div className="ticket-title-cell">
                          <strong>{item.titulo || item.descricao}</strong>
                          <span className="ticket-category">{item.categoria || 'Geral'}</span>
                          {item.descricao && item.titulo && (
                            <p className="desc-text-small">{item.descricao}</p>
                          )}
                        </div>
                      </td>
                      <td data-label="Prioridade">
                        <span className={`prio-tag prio-${(item.prioridade || 'MEDIA').toLowerCase()}`}>
                          {item.prioridade || 'MÉDIA'}
                        </span>
                      </td>
                      <td data-label="Status">
                        <span className={`badge-status status-${(item.status || 'ABERTO').toLowerCase()}`}>
                          {item.status?.replace('_', ' ')}
                        </span>
                      </td>
                      <td data-label="Técnico">
                        <span className="tecnico-cell-text">
                          {item.nomeTecnico || 'Aguardando atribuição'}
                        </span>
                      </td>
                      <td data-label="Data e Hora">
                        {formatarDataHora(item.dataAbertura)}
                      </td>
                      <td data-label="Ações" className="acoes-cell">
                        <div className="botoes-coluna">
                          {podeCancelar(item) && (
                            <button
                              className="btn-cancelar btn-sm"
                              onClick={() => cancelarChamado(item)}
                              disabled={cancelandoId === item.id}
                              aria-label={`Cancelar chamado ${item.protocolo}`}
                            >
                              {cancelandoId === item.id ? 'A cancelar...' : '✕ Cancelar'}
                            </button>
                          )}

                          {podeAvaliar(item) && (
                            <button
                              className="btn-avaliar btn-sm"
                              onClick={() => abrirModalAvaliacao(item)}
                              aria-label={`Avaliar chamado concluído ${item.protocolo}`}
                            >
                              ⭐ Avaliar
                            </button>
                          )}

                          {item.status === 'CONCLUIDO' && item.notaAvaliacao && (
                            <span className="avaliado-badge" aria-label={`Avaliado com nota ${item.notaAvaliacao} de 5`}>
                              {'★'.repeat(item.notaAvaliacao)}
                              <span aria-hidden="true">{'☆'.repeat(5 - item.notaAvaliacao)}</span>
                            </span>
                          )}

                          {!podeCancelar(item) && !podeAvaliar(item) && item.status !== 'CONCLUIDO' && (
                            <span className="acoes-vazio" aria-hidden="true">—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Controlos de Paginação na Interface */}
            {totalPages > 1 && (
              <div className="pagination-container">
                <span className="pagination-info">Mostrando {chamados.length} de {totalElements}</span>
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
      </section>

      {/* ===== MODAL: NOVO CHAMADO ===== */}
      {modalNovoAberto && (
        <div 
          className="modal-backdrop" 
          role="dialog" 
          aria-modal="true" 
          aria-labelledby="titulo-novo-chamado"
          onClick={() => !enviando && setModalNovoAberto(false)}
        >
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <header className="modal-header">
              <h2 id="titulo-novo-chamado" style={{fontSize: '1.2rem', margin: 0}}>Abertura de Chamado Técnico</h2>
              <button 
                className="btn-close" 
                onClick={() => setModalNovoAberto(false)} 
                disabled={enviando}
                aria-label="Fechar formulário de novo chamado"
              >
                &times;
              </button>
            </header>

            <form onSubmit={handleSubmeterChamado} className="modal-form" noValidate>
              <div className="user-summary-box">
                <small>Solicitante:</small>
                <strong>{usuarioSalvo.nome || 'Utilizador Logado'}</strong>
              </div>
              <div className="form-group">
                <label htmlFor="input-titulo">Título / Assunto do Problema *</label>
                <input
                  id="input-titulo"
                  type="text"
                  name="titulo"
                  placeholder="Ex: Impressora do setor sem conectar"
                  value={formNovo.titulo}
                  onChange={handleInputChange}
                  required
                  aria-required="true"
                  disabled={enviando}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="select-categoria">Categoria *</label>
                  <select 
                    id="select-categoria" 
                    name="categoria" 
                    value={formNovo.categoria} 
                    onChange={handleInputChange}
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
                <div className="form-group">
                  <label htmlFor="select-prioridade">Prioridade</label>
                  <select 
                    id="select-prioridade" 
                    name="prioridade" 
                    value={formNovo.prioridade} 
                    onChange={handleInputChange}
                    disabled={enviando}
                  >
                    <option value="BAIXA">Baixa</option>
                    <option value="MEDIA">Média</option>
                    <option value="ALTA">Alta</option>
                    <option value="URGENTE">Urgente</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="select-secretaria">Secretaria *</label>
                  <select
                    id="select-secretaria"
                    value={secretariaSelecionada}
                    onChange={(e) => setSecretariaSelecionada(e.target.value)}
                    required
                    aria-required="true"
                    disabled={enviando}
                  >
                    <option value="">Selecione a secretaria...</option>
                    {secretarias.map((sec) => (
                      <option key={sec.id} value={sec.id}>{sec.nome}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="select-local">Local / Prédio *</label>
                  <select
                    id="select-local"
                    name="localId"
                    value={formNovo.localId}
                    onChange={handleInputChange}
                    disabled={!secretariaSelecionada || locais.length === 0 || enviando}
                    required
                    aria-required="true"
                  >
                    <option value="">
                      {!secretariaSelecionada
                        ? 'Primeiro selecione a secretaria...'
                        : locais.length === 0
                          ? 'Nenhum local encontrado'
                          : 'Selecione o local...'}
                    </option>
                    {locais.map((loc) => (
                      <option key={loc.id} value={loc.id}>{loc.nome}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="input-local-visitante">Sala / Mesa / Detalhamento</label>
                <input
                  id="input-local-visitante"
                  type="text"
                  name="localVisitante"
                  placeholder="Ex: Sala 04 - Recepção"
                  value={formNovo.localVisitante}
                  onChange={handleInputChange}
                  disabled={enviando}
                />
              </div>
              <div className="form-group">
                <label htmlFor="textarea-descricao">Descrição Detalhada do Problema *</label>
                <textarea
                  id="textarea-descricao"
                  rows="4"
                  name="descricao"
                  placeholder="Descreva o que está acontecendo com o máximo de detalhes..."
                  value={formNovo.descricao}
                  onChange={handleInputChange}
                  required
                  aria-required="true"
                  disabled={enviando}
                />
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setModalNovoAberto(false)}
                  disabled={enviando}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary-action" disabled={enviando} aria-busy={enviando}>
                  {enviando ? 'Abrindo Chamado...' : 'Confirmar e Abrir'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== MODAL: AVALIAR CHAMADO ===== */}
      {chamadoParaAvaliar && (
        <div 
          className="modal-backdrop" 
          onClick={() => !enviandoAvaliacao && fecharModalAvaliacao()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-avaliacao"
        >
          <div
            className="modal-card modal-avaliacao"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="btn-close-modal"
              onClick={fecharModalAvaliacao}
              disabled={enviandoAvaliacao}
              aria-label="Fechar painel de avaliação"
            >
              ×
            </button>

            <div className="avaliacao-emoji" aria-hidden="true">⭐</div>

            <h2 id="titulo-avaliacao" className="avaliacao-titulo">Avalie o atendimento</h2>
            <p className="avaliacao-subtitulo">
              Sua opinião é muito importante para melhorarmos o suporte de TI.
            </p>

            <div className="avaliacao-resumo" aria-label="Detalhes do chamado a avaliar">
              <div>
                <small>Protocolo</small>
                <strong>{chamadoParaAvaliar.protocolo || `#${chamadoParaAvaliar.id}`}</strong>
              </div>
              <div>
                <small>Técnico</small>
                <strong>{chamadoParaAvaliar.nomeTecnico || '—'}</strong>
              </div>
              <div className="full-width">
                <small>Título</small>
                <strong>{chamadoParaAvaliar.titulo}</strong>
              </div>
            </div>

            <form onSubmit={submeterAvaliacao} className="avaliacao-form" noValidate>
              <div className="avaliacao-label" id="label-nota">Qual a sua nota?</div>
              <div className="star-rating-modal" role="radiogroup" aria-labelledby="label-nota">
                {[1, 2, 3, 4, 5].map((num) => (
                  <button
                    key={num}
                    type="button"
                    role="radio"
                    aria-checked={nota === num}
                    aria-label={`Nota ${num} de 5`}
                    className={`star-btn ${num <= nota ? 'ativa' : ''}`}
                    onClick={() => setNota(num)}
                    disabled={enviandoAvaliacao}
                  >
                    ★
                  </button>
                ))}
              </div>
              <span className="avaliacao-nota-texto" aria-live="polite">
                {nota === 1 && 'Muito ruim'}
                {nota === 2 && 'Ruim'}
                {nota === 3 && 'Regular'}
                {nota === 4 && 'Bom'}
                {nota === 5 && 'Excelente'}
              </span>

              <label className="avaliacao-label" htmlFor="comentarioAvaliacao">
                Comentário (opcional)
              </label>
              <textarea
                id="comentarioAvaliacao"
                rows="3"
                placeholder="Conte como foi o atendimento..."
                value={comentarioAvaliacao}
                onChange={(e) => setComentarioAvaliacao(e.target.value)}
                disabled={enviandoAvaliacao}
              />

              <div className="avaliacao-acoes-modal">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={fecharModalAvaliacao}
                  disabled={enviandoAvaliacao}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary-action"
                  disabled={enviandoAvaliacao}
                  aria-busy={enviandoAvaliacao}
                >
                  {enviandoAvaliacao ? 'A enviar...' : 'Enviar Avaliação'}
                </button>
              </div>
            </form>
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
          aria-labelledby="titulo-lgpd"
        >
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <header className="modal-header">
              <h2 id="titulo-lgpd" style={{fontSize: '1.2rem', margin: 0}}>Privacidade e Direitos (LGPD)</h2>
              <button 
                className="btn-close" 
                onClick={() => setModalLgpdAberto(false)}
                aria-label="Fechar painel de privacidade"
              >
                &times;
              </button>
            </header>
            <div className="modal-form">
              <p style={{fontSize: '0.9rem', color: '#475569', marginBottom: '15px'}}>
                Em conformidade com o Art. 18 da Lei Geral de Proteção de Dados (13.709/2018), pode exercer os seus direitos a qualquer momento.
              </p>
              
              <div style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
                <div style={{background: '#f8fafc', padding: '15px', border: '1px solid #e2e8f0', borderRadius: '8px'}}>
                  <h3 style={{margin: '0 0 5px 0', fontSize: '1rem'}}>Exportar Dados</h3>
                  <p style={{fontSize: '0.8rem', color: '#64748b', margin: '0 0 10px 0'}}>Descarregue uma cópia dos seus dados e do seu histórico de chamados num formato estruturado (JSON).</p>
                  <button onClick={handleExportarDados} className="btn-primary-action" style={{width: '100%'}}>📥 Exportar os Meus Dados</button>
                </div>

                <div style={{background: '#fef2f2', padding: '15px', border: '1px solid #fecaca', borderRadius: '8px'}}>
                  <h3 style={{margin: '0 0 5px 0', fontSize: '1rem', color: '#dc2626'}}>Anonimizar Conta</h3>
                  <p style={{fontSize: '0.8rem', color: '#991b1b', margin: '0 0 10px 0'}}>Isto irá mascarar permanentemente o seu nome, email e telefone, mantendo os chamados para registo histórico sem o identificar. Esta ação apaga o seu acesso.</p>
                  <button onClick={handleAnonimizarDados} className="btn-cancelar btn-sm" style={{padding: '10px'}}>🗑️ Anonimizar os Meus Dados</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
        </>
      )}

      {abaAtiva === 'FILA' && (
        <section className="content-section" aria-label="Fila geral de atendimento">
          <div className="fila-header-bar">
            <div>
              <h2 style={{margin: 0, fontSize: '1.2rem'}}>Fila de Atendimento</h2>
              <span style={{fontSize: '0.85rem', color: 'var(--text-muted)'}}>
                Acompanhe o andamento geral dos chamados técnicos
              </span>
            </div>
            <div className="fila-controls">
              <div className="filtro-secretaria-wrapper">
                <label htmlFor="filtro-sec-fila" className="label-filtro-fila">Secretaria:</label>
                <select
                  id="filtro-sec-fila"
                  value={filtroSecretariaFila}
                  onChange={(e) => setFiltroSecretariaFila(e.target.value)}
                  className="select-filter"
                  aria-label="Filtrar fila por secretaria"
                >
                  <option value="TODAS">Todas as Secretarias</option>
                  {secretarias.map((sec) => (
                    <option key={sec.id} value={sec.nome}>{sec.nome}</option>
                  ))}
                </select>
              </div>
              <button className="btn-secondary" onClick={() => carregarFilaGeral()}>
                🔄 Atualizar Fila
              </button>
            </div>
          </div>

          {carregandoFila ? (
            <div className="state-card" role="status">Carregando fila...</div>
          ) : filaGeralFiltrada.length === 0 ? (
            <p className="empty-state">
              {filtroSecretariaFila !== 'TODAS'
                ? 'Nenhum chamado em aberto ou em andamento para a secretaria selecionada.'
                : 'Nenhum chamado em aberto ou em andamento no momento.'}
            </p>
          ) : (
            <div className="table-responsive" tabIndex="0" aria-label="Tabela da fila geral">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th scope="col">Protocolo</th>
                    <th scope="col">Título</th>
                    <th scope="col">Categoria</th>
                    <th scope="col">Secretaria</th>
                    <th scope="col">Data de Abertura</th>
                    <th scope="col">Status</th>
                    <th scope="col">Técnico</th>
                  </tr>
                </thead>
                <tbody>
                  {filaGeralFiltrada.map(item => {
                    const isMeu = item.nomeUsuarioLogado === usuarioSalvo.nome;
                    return (
                      <tr key={item.id} className={isMeu ? 'row-meu-chamado' : ''}>
                        <td data-label="Protocolo">
                          <span className="protocol-badge">{item.protocolo || `#${item.id}`}</span>
                          {isMeu && <span className="selo-meu-chamado" title="Seu chamado">👤 Você</span>}
                        </td>
                        <td data-label="Título">{item.titulo}</td>
                        <td data-label="Categoria">{item.categoria || '—'}</td>
                        <td data-label="Secretaria">{item.nomeSecretariaVisitante || '—'}</td>
                        <td data-label="Data">{formatarDataHora(item.dataAbertura)}</td>
                        <td data-label="Status">
                          <span className={`badge-status status-${item.status?.toLowerCase()}`}>
                            {item.status?.replace('_', ' ')}
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
      )}
    </main>
  );
}