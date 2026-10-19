import React, { useState, useEffect } from 'react';
import api, { exportarMeusDados, anonimizarMeusDados, buscarHistoricoGlobal } from '../../services/api';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import './DashboardAdmin.css';

export default function DashboardAdmin({ usuario, onLogout }) {
  const [abaAtiva, setAbaAtiva] = useState(window.innerWidth <= 768 ? 'CHAMADOS_ATIVOS' : 'METRICAS');
  
  // Listagens Originais Completas (Para Métricas, Gráficos e Alertas)
  const [chamados, setChamados] = useState([]);
  const [secretarias, setSecretarias] = useState([]);
  const [locais, setLocais] = useState([]);
  const [tecnicos, setTecnicos] = useState([]);
  const [usuariosNormais, setUsuariosNormais] = useState([]); 
  const [demandaSec, setDemandaSec] = useState([]);
  const [desempenhoTec, setDesempenhoTec] = useState([]);
  const [carregando, setCarregando] = useState(true);

  // Paginação Global Admin (Aba Histórico)
  const [chamadosHistorico, setChamadosHistorico] = useState([]);
  const [carregandoHistorico, setCarregandoHistorico] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  // Modais de Estado
  const [modalUsuario, setModalUsuario] = useState(false);
  const [modalSecretaria, setModalSecretaria] = useState(false);
  const [modalLocal, setModalLocal] = useState(false);
  const [modalLgpdAberto, setModalLgpdAberto] = useState(false);
  const [modalDetalhes, setModalDetalhes] = useState(null);
  const [modalConcluir, setModalConcluir] = useState(false);
  const [solucao, setSolucao] = useState('');
  const [modalCancelar, setModalCancelar] = useState(null);
  const [motivoCancelamento, setMotivoCancelamento] = useState('');
  const [cancelando, setCancelando] = useState(false);

  // Filtros
  const [filtroSecretariaLocais, setFiltroSecretariaLocais] = useState('TODAS');
  const [buscaUsuario, setBuscaUsuario] = useState('');
  const [buscaChamadoAtivo, setBuscaChamadoAtivo] = useState('');
  
  // Filtros Histórico Global
  const [buscaChamadoFinalizado, setBuscaChamadoFinalizado] = useState('');
  const [filtroStatusFinalizados, setFiltroStatusFinalizados] = useState('TODOS');
  const [filtroSecretariaFinalizados, setFiltroSecretariaFinalizados] = useState('TODAS');
  const [filtroTecnicoFinalizados, setFiltroTecnicoFinalizados] = useState('TODOS');
  const [filtroDataInicioChamados, setFiltroDataInicioChamados] = useState('');
  const [filtroDataFimChamados, setFiltroDataFimChamados] = useState('');
  const [filtroAvaliacaoFinalizados, setFiltroAvaliacaoFinalizados] = useState('TODOS');

  const [msgToast, setMsgToast] = useState({ tipo: '', texto: '' });

  const [formSecretaria, setFormSecretaria] = useState({ nome: '', sigla: '', descricao: '' });
  const [formLocal, setFormLocal] = useState({ nome: '', secretariaId: '', logradouro: '', bairro: '', numero: '', cep: '', complemento: '' });
  const [formUsuario, setFormUsuario] = useState({ nome: '', email: '', telefone: '', secretariaId: '', senha: '', tipo: 'USER' });

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768 && ['METRICAS', 'USUARIOS', 'SECRETARIAS'].includes(abaAtiva)) {
        setAbaAtiva('CHAMADOS_ATIVOS');
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [abaAtiva]);

  // Carrega todos os chamados completos para alimentar os gráficos e alertas
  const carregarDadosGlobais = async (silencioso = false) => {
    if(!silencioso) setCarregando(true);
    try {
      const [resChamados, resSec, resLocais, resTecnicos, resUsuarios, resDemanda, resDesempenho] = await Promise.all([
        api.get('/chamados'),
        api.get('/secretarias'),
        api.get('/locais'),
        api.get('/usuarios/tecnicos'),
        api.get('/usuarios/comuns'), 
        api.get('/dashboard/secretarias-demanda'),
        api.get('/dashboard/tecnicos-desempenho')
      ]);

      setChamados(Array.isArray(resChamados.data) ? resChamados.data : []);
      setSecretarias(Array.isArray(resSec.data) ? resSec.data : []);
      setLocais(Array.isArray(resLocais.data) ? resLocais.data : []);
      setTecnicos(Array.isArray(resTecnicos.data) ? resTecnicos.data : []);
      setUsuariosNormais(Array.isArray(resUsuarios.data) ? resUsuarios.data : []); 
      setDemandaSec(Array.isArray(resDemanda.data) ? resDemanda.data : []);
      setDesempenhoTec(Array.isArray(resDesempenho.data) ? resDesempenho.data : []);

    } catch (error) {
      console.error("Erro ao carregar dados do admin:", error);
      mostrarToast('erro', 'Falha ao comunicar com o servidor.');
    } finally {
      if(!silencioso) setCarregando(false);
    }
  };

  // Histórico paginado da base de dados com suporte às datas
  const carregarHistoricoGlobal = async (silencioso = false) => {
    if (!silencioso) setCarregandoHistorico(true);
    try {
      const dadosPaginados = await buscarHistoricoGlobal(
        page, 
        20, 
        filtroStatusFinalizados, 
        buscaChamadoFinalizado,
        filtroDataInicioChamados,
        filtroDataFimChamados
      );
      setChamadosHistorico(dadosPaginados.content || []);
      setTotalPages(dadosPaginados.totalPages || 0);
      setTotalElements(dadosPaginados.totalElements || 0);
    } catch (err) {
      console.error("Erro ao carregar histórico paginado:", err);
    } finally {
      if (!silencioso) setCarregandoHistorico(false);
    }
  };

  useEffect(() => {
    carregarDadosGlobais();
    carregarHistoricoGlobal();

    const socket = new SockJS('/ws-chamados');
    const stompClient = new Client({
      webSocketFactory: () => socket,
      reconnectDelay: 5000,
      onConnect: () => {
        stompClient.subscribe('/topic/chamados', () => {
          carregarDadosGlobais(true);
          carregarHistoricoGlobal(true);
        });
      }
    });

    stompClient.activate();
    return () => stompClient.deactivate();
  }, []);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      carregarHistoricoGlobal(true);
    }, 400);
    return () => clearTimeout(delayDebounce);
  }, [page, filtroStatusFinalizados, buscaChamadoFinalizado, filtroDataInicioChamados, filtroDataFimChamados]);

  const handleBuscaChange = (e) => { setBuscaChamadoFinalizado(e.target.value); setPage(0); };
  const handleStatusChange = (e) => { setFiltroStatusFinalizados(e.target.value); setPage(0); };
  const handleDataInicioChange = (e) => { setFiltroDataInicioChamados(e.target.value); setPage(0); };
  const handleDataFimChange = (e) => { setFiltroDataFimChamados(e.target.value); setPage(0); };

  // Acessibilidade: Fechar os modais ao carregar em "Esc"
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (modalLgpdAberto) setModalLgpdAberto(false);
        if (modalConcluir && !cancelando) setModalConcluir(false);
        if (modalDetalhes) setModalDetalhes(null);
        if (modalCancelar && !cancelando) setModalCancelar(null);
        if (modalUsuario) setModalUsuario(false);
        if (modalSecretaria) setModalSecretaria(false);
        if (modalLocal) setModalLocal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalLgpdAberto, modalConcluir, modalDetalhes, modalCancelar, modalUsuario, modalSecretaria, modalLocal, cancelando]);

  const mostrarToast = (tipo, texto) => {
    setMsgToast({ tipo, texto });
    setTimeout(() => setMsgToast({ tipo: '', texto: '' }), 4000);
  };

  const formatarData = (dataStr) => {
    if (!dataStr) return '—';
    return new Date(dataStr).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const handleCriarUsuario = async (e) => {
    e.preventDefault();
    try {
      await api.post('/usuarios/cadastrar', formUsuario);
      mostrarToast('sucesso', 'Usuário cadastrado com sucesso!');
      setModalUsuario(false);
      setFormUsuario({ nome: '', email: '', telefone: '', secretariaId: '', senha: '', tipo: 'USER' });
      carregarDadosGlobais(true);
    } catch (err) {
      mostrarToast('erro', 'Erro ao cadastrar usuário. O e-mail já está em uso.');
    }
  };

  const handleExcluirUsuario = async (id) => {
    if(!window.confirm("ATENÇÃO: Deseja realmente desativar o acesso deste utilizador/técnico?")) return;
    try {
      await api.delete(`/usuarios/${id}`);
      mostrarToast('sucesso', 'Utilizador excluído/desativado com sucesso.');
      carregarDadosGlobais(true);
    } catch (err) {
      mostrarToast('erro', 'Erro ao excluir utilizador.');
    }
  };

  const usuariosNormaisFiltrados = usuariosNormais.filter(u => 
    u.nome.toLowerCase().includes(buscaUsuario.toLowerCase()) || 
    u.email.toLowerCase().includes(buscaUsuario.toLowerCase())
  );

  const handleExcluirChamadoAdmin = async (id) => {
    if(!window.confirm("PERIGO: Deseja realmente APAGAR este chamado do banco de dados? Esta ação não pode ser desfeita.")) return;
    try {
      await api.delete(`/chamados/${id}`);
      mostrarToast('sucesso', 'Chamado excluído permanentemente.');
      carregarDadosGlobais(true);
      carregarHistoricoGlobal(true);
    } catch (err) {
      mostrarToast('erro', 'Erro ao excluir o chamado. Tente cancelar primeiro.');
    }
  };

  const usuarioId = Number(usuario?.id);
  const isMeu = (c) => Number(c?.tecnicoId) === usuarioId;
  const meuChamadoAtivo = chamados.find((c) => isMeu(c) && c.status === 'EM_ANDAMENTO');

  const assumirChamado = async (chamadoId) => {
    if (meuChamadoAtivo) {
      mostrarToast('erro', 'Você já possui um chamado em andamento.');
      return;
    }
    try {
      await api.patch(`/chamados/${chamadoId}/atribuir/${usuarioId}`);
      mostrarToast('sucesso', 'Você assumiu o chamado!');
      carregarDadosGlobais(true);
    } catch (err) {
      mostrarToast('erro', 'Erro ao assumir chamado.');
    }
  };

  const concluirChamado = async (e) => {
    e.preventDefault();
    try {
      await api.patch(`/chamados/${modalConcluir}/concluir?solucao=${encodeURIComponent(solucao)}`);
      mostrarToast('sucesso', 'Chamado concluído!');
      setModalConcluir(false);
      setSolucao('');
      carregarDadosGlobais(true);
      carregarHistoricoGlobal(true);
    } catch (err) {
      mostrarToast('erro', 'Erro ao concluir chamado.');
    }
  };

  const abrirModalCancelar = (chamado, origem) => {
    setMotivoCancelamento('');
    setModalCancelar({ chamado, origem });
  };

  const confirmarCancelarDevolver = async () => {
    if (!modalCancelar) return;
    const { chamado, origem } = modalCancelar;
    setCancelando(true);
    try {
      if (origem === 'FILA') {
        const motivo = motivoCancelamento.trim();
        await api.patch(`/chamados/${chamado.id}/cancelar?tecnicoId=${usuarioId}&motivo=${encodeURIComponent(motivo)}`);
        mostrarToast('sucesso', 'Chamado cancelado.');
      } else {
        await api.patch(`/chamados/${chamado.id}/desatribuir`);
        mostrarToast('sucesso', 'Devolvido para a fila.');
      }
      setModalCancelar(null);
      setMotivoCancelamento('');
      carregarDadosGlobais(true);
      carregarHistoricoGlobal(true);
    } catch (err) {
      mostrarToast('erro', 'Erro ao processar a ação.');
    } finally {
      setCancelando(false);
    }
  };

  const handleCriarSecretaria = async (e) => {
    e.preventDefault();
    try {
      await api.post('/secretarias', formSecretaria);
      mostrarToast('sucesso', 'Secretaria criada com sucesso!');
      setModalSecretaria(false);
      setFormSecretaria({ nome: '', sigla: '', descricao: '' });
      carregarDadosGlobais(true);
    } catch (err) {
      mostrarToast('erro', 'Erro ao criar secretaria. A sigla ou nome já deve existir.');
    }
  };

  const handleCriarLocal = async (e) => {
    e.preventDefault();
    try {
      await api.post('/locais', formLocal);
      mostrarToast('sucesso', 'Local criado com sucesso!');
      setModalLocal(false);
      setFormLocal({ nome: '', secretariaId: '', logradouro: '', bairro: '', numero: '', cep: '', complemento: '' });
      carregarDadosGlobais(true);
    } catch (err) {
      mostrarToast('erro', 'Erro ao criar local.');
    }
  };

  const handleDesativarSecretaria = async (id) => {
    if(!window.confirm("Deseja realmente desativar esta secretaria?")) return;
    try {
      await api.delete(`/secretarias/${id}`);
      mostrarToast('sucesso', 'Secretaria desativada.');
      carregarDadosGlobais(true);
    } catch (err) {
      mostrarToast('erro', 'Erro ao desativar secretaria.');
    }
  };

  const handleDesativarLocal = async (id) => {
    if(!window.confirm("Deseja realmente desativar este local?")) return;
    try {
      await api.delete(`/locais/${id}`);
      mostrarToast('sucesso', 'Local desativado.');
      carregarDadosGlobais(true);
    } catch (err) {
      mostrarToast('erro', 'Erro ao desativar local.');
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

  // ============================================
  // CÁLCULO DAS MÉTRICAS E ORDENAÇÕES
  // ============================================
  const totalChamados = chamados.length;
  const abertos = chamados.filter(c => c.status === 'ABERTO').length;
  const emAndamento = chamados.filter(c => c.status === 'EM_ANDAMENTO').length;
  const concluidos = chamados.filter(c => c.status === 'CONCLUIDO').length;
  const cancelados = chamados.filter(c => c.status === 'CANCELADO').length; 

  const chamadosComReclamacao = chamados.filter(c => c.status === 'CONCLUIDO' && c.notaAvaliacao != null && c.notaAvaliacao <= 2);

  const demandaPorCategoria = chamados.reduce((acc, c) => {
    const cat = c.categoria || 'Não Especificado';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});
  const categoriasGrafico = Object.entries(demandaPorCategoria).sort((a, b) => b[1] - a[1]);

  const msecToHoras = (ms) => ms > 0 ? (ms / (1000 * 60 * 60)).toFixed(1) : '0.0';

  const locaisFiltrados = locais.filter(loc => {
    if (filtroSecretariaLocais === 'TODAS') return true;
    return loc.secretariaId === Number(filtroSecretariaLocais);
  });

  // ========== LÓGICA DE ORDENAÇÃO DA FILA ATIVA (ADMIN E TÉCNICO) ==========
  const calcularPrioridade = (c) => {
    // 1º - O que o Admin/Técnico logado tem em andamento no momento (Sempre no topo)
    if (isMeu(c) && c.status === 'EM_ANDAMENTO') return 0;
    // 2º - Os chamados que ainda ninguém assumiu
    if (c.status === 'ABERTO') return 1;
    // 3º - Os chamados que estão sendo tratados por outros Técnicos
    if (c.status === 'EM_ANDAMENTO') return 2;
    return 3;
  };

  const chamadosAtivosFiltrados = chamados.filter(c => ['ABERTO', 'EM_ANDAMENTO'].includes(c.status))
    .filter(c => {
      if (!buscaChamadoAtivo.trim()) return true;
      const termo = buscaChamadoAtivo.toLowerCase();
      const alvo = [c.protocolo, c.titulo, c.nomeUsuarioLogado, c.nomeVisitante, c.nomeTecnico, c.categoria].filter(Boolean).join(' ').toLowerCase();
      return alvo.includes(termo);
    })
    .sort((a, b) => {
      const pa = calcularPrioridade(a);
      const pb = calcularPrioridade(b);
      // Se tiverem prioridades diferentes, o menor valor sobe (ex: 0 antes de 1)
      if (pa !== pb) return pa - pb;
      // Se empatarem (ex: ambos são ABERTO), o mais antigo no sistema aparece em cima
      return new Date(a.dataAbertura).getTime() - new Date(b.dataAbertura).getTime();
    });

  // Filtros aplicados sobre a página do Histórico Global
  const chamadosFinalizadosFiltrados = chamadosHistorico.filter(c => {
    if (filtroSecretariaFinalizados !== 'TODAS' && c.nomeSecretariaVisitante !== filtroSecretariaFinalizados) return false;
    if (filtroTecnicoFinalizados !== 'TODOS' && c.nomeTecnico !== filtroTecnicoFinalizados) return false;
    
    // Filtro de Avaliação
    if (filtroAvaliacaoFinalizados !== 'TODOS') {
      if (filtroAvaliacaoFinalizados === 'COM_AVALIACAO') return c.notaAvaliacao != null;
      if (filtroAvaliacaoFinalizados === 'SEM_AVALIACAO') return c.notaAvaliacao == null;
      if (filtroAvaliacaoFinalizados === 'NOTAS_BAIXAS') return c.notaAvaliacao != null && c.notaAvaliacao <= 2;
      if (filtroAvaliacaoFinalizados === 'NOTAS_ALTAS') return c.notaAvaliacao != null && c.notaAvaliacao >= 4;
      return c.notaAvaliacao === Number(filtroAvaliacaoFinalizados);
    }

    return true;
  });

  const limparFiltrosFinalizados = () => {
    setBuscaChamadoFinalizado('');
    setFiltroDataInicioChamados('');
    setFiltroDataFimChamados('');
    setFiltroStatusFinalizados('TODOS');
    setFiltroSecretariaFinalizados('TODAS');
    setFiltroTecnicoFinalizados('TODOS');
    setFiltroAvaliacaoFinalizados('TODOS');
    setPage(0);
  };

  return (
    <main className="dash-admin-container" aria-label="Painel Principal de Administração">
      <header className="dash-admin-header">
        <div className="admin-info">
          <h1 style={{fontSize: '1.6rem', margin: '0'}}>Centro de Administração de TI</h1>
          <p>Gestor Logado: <strong>{usuario?.nome || 'Administrador'}</strong></p>
        </div>
        <div style={{display: 'flex', gap: '10px', flexWrap: 'wrap'}}>
          <button
            onClick={() => setModalLgpdAberto(true)}
            style={{
              background: 'rgba(255,255,255,0.1)',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.2)',
              padding: '0.6rem 1.2rem',
              borderRadius: '6px',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '0.85rem'
            }}
            aria-label="Aceder às configurações de LGPD e Privacidade"
          >
            🛡 Meus Dados (LGPD)
          </button>
          <button className="btn-logout-admin" onClick={onLogout} aria-label="Sair do sistema de gestão">Sair do Painel</button>
        </div>
      </header>

      <nav className="abas-admin-container" aria-label="Navegação de secções">
        <button 
          className={`aba-btn-admin hide-on-mobile ${abaAtiva === 'METRICAS' ? 'ativa' : ''}`} 
          onClick={() => setAbaAtiva('METRICAS')} 
          aria-pressed={abaAtiva === 'METRICAS'}
        >
          📊 Visão Geral
        </button>
        <button 
          className={`aba-btn-admin hide-on-mobile ${abaAtiva === 'USUARIOS' ? 'ativa' : ''}`} 
          onClick={() => setAbaAtiva('USUARIOS')} 
          aria-pressed={abaAtiva === 'USUARIOS'}
        >
          👥 Equipe e Usuários
        </button>
        <button 
          className={`aba-btn-admin hide-on-mobile ${abaAtiva === 'SECRETARIAS' ? 'ativa' : ''}`} 
          onClick={() => setAbaAtiva('SECRETARIAS')} 
          aria-pressed={abaAtiva === 'SECRETARIAS'}
        >
          🏢 Locais / Secretarias
        </button>
        <button 
          className={`aba-btn-admin ${abaAtiva === 'CHAMADOS_ATIVOS' ? 'ativa' : ''}`} 
          onClick={() => setAbaAtiva('CHAMADOS_ATIVOS')} 
          aria-pressed={abaAtiva === 'CHAMADOS_ATIVOS'}
        >
          📋 Fila Ativa
        </button>
        <button 
          className={`aba-btn-admin ${abaAtiva === 'CHAMADOS_FINALIZADOS' ? 'ativa' : ''}`} 
          onClick={() => setAbaAtiva('CHAMADOS_FINALIZADOS')} 
          aria-pressed={abaAtiva === 'CHAMADOS_FINALIZADOS'}
        >
          ✅ Histórico Global
        </button>
      </nav>

      <div aria-live="polite" aria-atomic="true">
        {msgToast.texto && <div className={`toast-alerta ${msgToast.tipo}`} role="alert">{msgToast.texto}</div>}
      </div>

      <div className="dash-admin-content">
        
        {/* ================= ABA: MÉTRICAS ================= */}
        {abaAtiva === 'METRICAS' && (
          <section className="admin-section fade-in" aria-label="Métricas e Desempenho Global">
            <div className="section-header">
              <div>
                <h2>Painel de Desempenho</h2>
                <p>Resumo em tempo real de todos os atendimentos do município.</p>
              </div>
              <button className="btn-refresh" onClick={() => carregarDadosGlobais(true)} aria-label="Atualizar métricas do sistema">🔄 Atualizar Dados</button>
            </div>

            <div aria-live="polite">
              {carregando ? (
                <p className="loading-text" role="status">A carregar estatísticas do servidor...</p>
              ) : (
                <>
                  <div className="metricas-scroll-container" tabIndex="0" aria-label="Resumo numérico de chamados">
                    <div className="metricas-grid">
                      <div className="card-metrica total">
                        <span className="icone" aria-hidden="true">📥</span>
                        <div className="dados">
                          <h3>Total Registado</h3>
                          <p style={{fontSize: '2rem', margin: 0, fontWeight: 'bold'}}>{totalChamados}</p>
                        </div>
                      </div>
                      <div className="card-metrica pendentes">
                        <span className="icone" aria-hidden="true">⚠️️</span>
                        <div className="dados">
                          <h3>Fila de Espera</h3>
                          <p style={{fontSize: '2rem', margin: 0, fontWeight: 'bold'}}>{abertos}</p>
                        </div>
                      </div>
                      <div className="card-metrica andamento">
                        <span className="icone" aria-hidden="true">⚡</span>
                        <div className="dados">
                          <h3>Em Execução</h3>
                          <p style={{fontSize: '2rem', margin: 0, fontWeight: 'bold'}}>{emAndamento}</p>
                        </div>
                      </div>
                      <div className="card-metrica concluidos">
                        <span className="icone" aria-hidden="true">✅</span>
                        <div className="dados">
                          <h3>Resolvidos</h3>
                          <p style={{fontSize: '2rem', margin: 0, fontWeight: 'bold'}}>{concluidos}</p>
                        </div>
                      </div>
                      <div className="card-metrica cancelados">
                        <span className="icone" aria-hidden="true">❌</span>
                        <div className="dados">
                          <h3 style={{color: '#991b1b'}}>Cancelados</h3>
                          <p style={{fontSize: '2rem', margin: 0, fontWeight: 'bold', color: '#991b1b'}}>{cancelados}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="graficos-placeholder">
                    {/* Gráfico 1: Demanda por Secretaria */}
                    <div className="grafico-box" aria-label="Gráfico de Volume de Chamados por Secretaria">
                      <h3>Volume de Chamados por Secretaria</h3>
                      {demandaSec.length > 0 ? (
                        <div className="bar-chart-container" role="list">
                          {demandaSec.map((item, index) => {
                            const [nomeSec, total] = item;
                            const porcentagem = totalChamados > 0 ? (total / totalChamados) * 100 : 0;
                            return (
                              <div key={index} className="bar-row" role="listitem">
                                <span className="bar-label" title={nomeSec}>{nomeSec || 'Não Identificada'}</span>
                                <div className="bar-track" aria-hidden="true">
                                  <div className="bar-fill" style={{ width: `${porcentagem}%` }}></div>
                                </div>
                                <span className="bar-value" aria-label={`Total de ${total} chamados`}>{total}</span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="grafico-vazio">Sem dados de demanda.</div>
                      )}
                    </div>

                    {/* Gráfico 2: Demanda por Categoria */}
                    <div className="grafico-box" aria-label="Gráfico de Volume de Chamados por Categoria">
                      <h3>Volume de Chamados por Categoria</h3>
                      {categoriasGrafico.length > 0 ? (
                        <div className="bar-chart-container" role="list">
                          {categoriasGrafico.map((item, index) => {
                            const [categoria, total] = item;
                            const porcentagem = totalChamados > 0 ? (total / totalChamados) * 100 : 0;
                            return (
                              <div key={index} className="bar-row" role="listitem">
                                <span className="bar-label" title={categoria}>{categoria}</span>
                                <div className="bar-track" aria-hidden="true">
                                  <div className="bar-fill" style={{ width: `${porcentagem}%`, backgroundColor: '#f59e0b' }}></div>
                                </div>
                                <span className="bar-value" aria-label={`Total de ${total} chamados`}>{total}</span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="grafico-vazio">Sem dados de categoria.</div>
                      )}
                    </div>

                    {/* Gráfico 3: Ranking e SLA */}
                    <div className="grafico-box" style={{ gridColumn: '1 / -1' }}>
                      <h3>Ranking de Avaliação e Desempenho (Técnicos)</h3>
                      {desempenhoTec.length > 0 ? (
                        <div className="table-responsive" tabIndex="0" aria-label="Tabela de Ranking de Desempenho Técnico">
                          <table className="custom-table admin-table">
                            <thead>
                              <tr>
                                <th scope="col">Técnico</th>
                                <th scope="col">Concluídos</th>
                                <th scope="col">Nota Média</th>
                                <th scope="col">TMA - Resposta <span title="Tempo Médio de Atendimento (Aberto → Em Andamento)" style={{cursor:'help'}}>ℹ️</span></th>
                                <th scope="col">TMA - Resolução <span title="Tempo Médio de Atendimento (Em Andamento → Concluído)" style={{cursor:'help'}}>ℹ</span></th>
                              </tr>
                            </thead>
                            <tbody>
                              {desempenhoTec.map((item, index) => {
                                const nomeTec = item[0];
                                const chamadosDoTecnico = chamados.filter(c => c.nomeTecnico === nomeTec);
                                
                                let somaResp = 0, countResp = 0, somaReso = 0, countReso = 0;
                                chamadosDoTecnico.forEach(c => {
                                  if(c.dataAtribuicao && c.dataAbertura) {
                                    somaResp += (new Date(c.dataAtribuicao) - new Date(c.dataAbertura));
                                    countResp++;
                                  }
                                  if(c.dataConclusao && c.dataAtribuicao) {
                                    somaReso += (new Date(c.dataConclusao) - new Date(c.dataAtribuicao));
                                    countReso++;
                                  }
                                });

                                return (
                                  <tr key={index}>
                                    <td><strong>{nomeTec}</strong></td>
                                    <td>{item[1]}</td>
                                    <td style={{ color: '#d97706', fontWeight: 'bold' }}>{Number(item[2]).toFixed(1)} ⭐</td>
                                    <td>{msecToHoras(countResp > 0 ? somaResp/countResp : 0)} h</td>
                                    <td>{msecToHoras(countReso > 0 ? somaReso/countReso : 0)} h</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="grafico-vazio">Ainda não existem dados e avaliações registrados.</div>
                      )}
                    </div>

                    {/* Tabela de Reclamações */}
                    <div className="grafico-box" style={{ gridColumn: '1 / -1' }}>
                      <h3>Alertas de Qualidade (Notas 1 ou 2)</h3>
                      {chamadosComReclamacao.length > 0 ? (
                        <div style={{ maxHeight: '200px', overflowY: 'auto' }} tabIndex="0" aria-label="Lista de chamados com classificação baixa">
                          <table className="custom-table admin-table mini-table">
                            <thead>
                              <tr>
                                <th scope="col">Protocolo</th>
                                <th scope="col">Nota</th>
                                <th scope="col">Técnico</th>
                                <th scope="col">Comentário</th>
                              </tr>
                            </thead>
                            <tbody>
                              {chamadosComReclamacao.map((c) => (
                                <tr key={c.id}>
                                  <td>{c.protocolo}</td>
                                  <td style={{ color: '#dc2626', fontWeight: 'bold' }}>{c.notaAvaliacao} ⭐</td>
                                  <td>{c.nomeTecnico || '—'}</td>
                                  <td style={{ fontStyle: 'italic', fontSize: '0.85rem' }}>"{c.comentarioAvaliacao || 'Sem comentário'}"</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="grafico-vazio" style={{color: '#10b981', borderStyle: 'solid'}}>Nenhuma reclamação registrada! Excelente.</div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </section>
        )}

        {/* ================= ABA: EQUIPE E USUÁRIOS ================= */}
        {abaAtiva === 'USUARIOS' && (
          <section className="admin-section fade-in" aria-label="Controle de Equipe e Usuários">
            <div className="section-header">
              <div>
                <h2>Controle da Equipe e Usuários</h2>
                <p>Gerencie todos os membros com acesso ao sistema.</p>
              </div>
              <button className="btn-acao-admin" onClick={() => setModalUsuario(true)}>+ Criar Acesso</button>
            </div>
            
            <h3 style={{marginTop: '20px', marginBottom: '10px'}}>Equipe Técnica ({tecnicos.length})</h3>
            <div className="table-responsive" style={{marginBottom: '40px'}} tabIndex="0" aria-label="Tabela de Equipe Técnica">
              <table className="custom-table admin-table">
                <thead>
                  <tr>
                    <th scope="col">Nome</th>
                    <th scope="col">Email</th>
                    <th scope="col">Secretaria</th>
                    <th scope="col">Nível de Acesso</th>
                    <th style={{textAlign: 'center'}} scope="col">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {tecnicos.map(u => (
                    <tr key={u.id}>
                      <td><strong>{u.nome}</strong><br/><small>{u.telefone}</small></td>
                      <td>{u.email}</td>
                      <td>{u.nomeSecretaria || '—'}</td>
                      <td><span className="badge-status status-em_andamento">{u.role}</span></td>
                      <td style={{textAlign: 'center'}}>
                         <button className="btn-sm btn-cancelar" onClick={() => handleExcluirUsuario(u.id)} aria-label={`Desativar acesso do técnico ${u.nome}`}>Excluir</button>
                      </td>
                    </tr>
                  ))}
                  {tecnicos.length === 0 && <tr><td colSpan="5" className="text-center">Nenhum técnico localizado.</td></tr>}
                </tbody>
              </table>
            </div>

            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '10px', flexWrap: 'wrap'}}>
              <h3 style={{margin: 0}}>Usuários Comuns ({usuariosNormaisFiltrados.length})</h3>
              <div className="filtro-inline">
                <label htmlFor="pesquisa-utilizador" className="sr-only" style={{display:'none'}}>Pesquisar Utilizador Comum</label>
                <input 
                  id="pesquisa-utilizador"
                  type="text" 
                  placeholder="Pesquisar utilizador..." 
                  value={buscaUsuario}
                  onChange={(e) => setBuscaUsuario(e.target.value)}
                  className="input-filtro-admin"
                />
              </div>
            </div>

            <div className="table-responsive" tabIndex="0" aria-label="Tabela de Usuários Comuns">
              <table className="custom-table admin-table">
                <thead>
                  <tr>
                    <th scope="col">Nome</th>
                    <th scope="col">Email</th>
                    <th scope="col">Secretaria</th>
                    <th scope="col">Nível de Acesso</th>
                    <th style={{textAlign: 'center'}} scope="col">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {usuariosNormaisFiltrados.map(u => (
                    <tr key={u.id}>
                      <td><strong>{u.nome}</strong><br/><small>{u.telefone}</small></td>
                      <td>{u.email}</td>
                      <td>{u.nomeSecretaria || '—'}</td>
                      <td><span className="badge-status status-concluido">{u.role}</span></td>
                      <td style={{textAlign: 'center'}}>
                         <button className="btn-sm btn-cancelar" onClick={() => handleExcluirUsuario(u.id)} aria-label={`Desativar acesso do utilizador ${u.nome}`}>Excluir</button>
                      </td>
                    </tr>
                  ))}
                  {usuariosNormaisFiltrados.length === 0 && <tr><td colSpan="5" className="text-center">Nenhum usuário comum localizado.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ================= ABA: SECRETARIAS E LOCAIS ================= */}
        {abaAtiva === 'SECRETARIAS' && (
          <section className="admin-section fade-in" aria-label="Gestão de Estruturas Físicas">
            <div className="section-header">
              <div>
                <h2>Gestão de Secretarias e Estruturas Físicas</h2>
                <p>Cadastre os órgãos municipais e os seus respetivos prédios/escolas.</p>
              </div>
              <div style={{display: 'flex', gap: '10px'}}>
                <button className="btn-acao-admin" onClick={() => setModalSecretaria(true)}>+ Nova Secretaria</button>
                <button className="btn-acao-admin secondary" onClick={() => setModalLocal(true)}>+ Novo Local</button>
              </div>
            </div>
            
            <h3 style={{marginTop: '20px', marginBottom: '10px'}}>Secretarias Cadastradas ({secretarias.length})</h3>
            <div className="table-responsive" style={{marginBottom: '40px'}} tabIndex="0" aria-label="Tabela de Secretarias">
              <table className="custom-table admin-table">
                <thead>
                  <tr>
                    <th scope="col">Sigla</th>
                    <th scope="col">Nome da Secretaria</th>
                    <th scope="col">Descrição</th>
                    <th scope="col">Status</th>
                    <th scope="col">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {secretarias.map(sec => (
                    <tr key={sec.id} className={!sec.ativo ? "row-cancelado" : ""}>
                      <td><strong>{sec.sigla}</strong></td>
                      <td>{sec.nome}</td>
                      <td>{sec.descricao || '—'}</td>
                      <td>{sec.ativo ? <span className="badge-status status-concluido">Ativo</span> : <span className="badge-status status-cancelado">Inativo</span>}</td>
                      <td>
                        {sec.ativo && (
                          <button className="btn-sm btn-cancelar" onClick={() => handleDesativarSecretaria(sec.id)} aria-label={`Desativar secretaria ${sec.sigla}`}>Desativar</button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {secretarias.length === 0 && <tr><td colSpan="5" className="text-center">Nenhuma secretaria encontrada.</td></tr>}
                </tbody>
              </table>
            </div>

            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '10px', flexWrap: 'wrap'}}>
              <h3 style={{margin: 0}}>Locais / Prédios Cadastrados ({locaisFiltrados.length})</h3>
              <div className="filtro-inline">
                <label htmlFor="filtro-local-sec" style={{fontSize: '0.8rem', fontWeight: 'bold', marginRight: '8px', color: '#64748b'}}>Filtrar por Secretaria:</label>
                <select 
                  id="filtro-local-sec"
                  value={filtroSecretariaLocais} 
                  onChange={(e) => setFiltroSecretariaLocais(e.target.value)}
                  style={{padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', outline: 'none'}}
                >
                  <option value="TODAS">Todas</option>
                  {secretarias.map(sec => (
                    <option key={sec.id} value={sec.id}>{sec.nome}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="table-responsive" tabIndex="0" aria-label="Tabela de Locais e Prédios">
              <table className="custom-table admin-table">
                <thead>
                  <tr>
                    <th scope="col">Nome do Local</th>
                    <th scope="col">Secretaria Vinculada</th>
                    <th scope="col">Endereço Principal</th>
                    <th scope="col">Status</th>
                    <th scope="col">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {locaisFiltrados.map(loc => (
                    <tr key={loc.id} className={!loc.ativo ? "row-cancelado" : ""}>
                      <td><strong>{loc.nome}</strong></td>
                      <td>{loc.nomeSecretaria}</td>
                      <td>{loc.logradouro}, {loc.bairro}</td>
                      <td>{loc.ativo ? <span className="badge-status status-concluido">Ativo</span> : <span className="badge-status status-cancelado">Inativo</span>}</td>
                      <td>
                        {loc.ativo && (
                          <button className="btn-sm btn-cancelar" onClick={() => handleDesativarLocal(loc.id)} aria-label={`Desativar local ${loc.nome}`}>Desativar</button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {locaisFiltrados.length === 0 && <tr><td colSpan="5" className="text-center">Nenhum local encontrado para este filtro.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ================= ABA: CHAMADOS ATIVOS ================= */}
        {abaAtiva === 'CHAMADOS_ATIVOS' && (
          <section className="admin-section fade-in" aria-label="Fila de Chamados Ativos">
            <div className="section-header">
              <div>
                <h2>Fila Ativa</h2>
                <p className="hide-on-mobile">Acompanhe os chamados Abertos e Em Andamento.</p>
              </div>
              <button className="btn-refresh" onClick={() => carregarDadosGlobais(true)} aria-label="Atualizar lista da fila">
                <span className="hide-on-mobile">🔄 Atualizar Fila</span>
                <span className="show-on-mobile" aria-hidden="true">🔄</span>
              </button>
            </div>
            
            <div className="filtros-admin-grid">
                 <label htmlFor="busca-chamado-admin-ativo" className="sr-only" style={{display:'none'}}>Buscar na fila ativa</label>
                 <input 
                    id="busca-chamado-admin-ativo"
                    type="text" 
                    placeholder="Buscar protocolo, título, solicitante, técnico..." 
                    value={buscaChamadoAtivo}
                    onChange={(e) => setBuscaChamadoAtivo(e.target.value)}
                    className="input-filtro-admin span-2"
                  />
            </div>
            
            <div className="contador-resultados" style={{marginBottom: '10px'}} aria-live="polite">
              Mostrando <strong>{chamadosAtivosFiltrados.length}</strong> chamado(s).
            </div>
            
            <div className="table-responsive" tabIndex="0" aria-label="Tabela de gestão de chamados ativos">
              <table className="custom-table admin-table">
                <thead>
                  <tr>
                    <th style={{textAlign: 'center'}} scope="col">Ações</th>
                    <th scope="col">Protocolo</th>
                    <th scope="col">Problema / Categoria</th>
                    <th scope="col">Solicitante / Secretaria</th>
                    <th scope="col">Status / Técnico</th>
                    <th scope="col">Datas</th>
                  </tr>
                </thead>
                <tbody>
                  {chamadosAtivosFiltrados.map(c => {
                    const chamadoIsMeu = isMeu(c);
                    const isDeOutro = c.tecnicoId && !chamadoIsMeu;
                    const isAberto = c.status === 'ABERTO';
                    const isEmAndamento = c.status === 'EM_ANDAMENTO';

                    let rowClass = "";
                    if (chamadoIsMeu && isEmAndamento) rowClass = "row-meu-ativo";
                    else if (isDeOutro && isEmAndamento) rowClass = "row-bloqueado";

                    return (
                      <tr key={c.id} className={rowClass}>
                        <td className="acoes-cell">
                          <div className="botoes-coluna">
                            <button className="btn-sm btn-detalhes" onClick={() => setModalDetalhes(c)} aria-label={`Ver detalhes do chamado ${c.protocolo}`}>🔍 Detalhes</button>

                            {isAberto && (
                              <button className="btn-sm btn-assumir" disabled={!!meuChamadoAtivo} onClick={() => assumirChamado(c.id)} aria-label={`Assumir chamado ${c.protocolo}`}>
                                {meuChamadoAtivo ? "🔒 Ocupado" : "✋ Assumir"}
                              </button>
                            )}

                            <button className="btn-sm btn-cancelar" onClick={() => abrirModalCancelar(c, 'FILA')} aria-label={`Cancelar chamado ${c.protocolo}`}>✕ Cancelar</button>

                            {chamadoIsMeu && isEmAndamento && (
                              <>
                                <button className="btn-sm btn-concluir" onClick={() => setModalConcluir(c.id)}>✓ Concluir</button>
                                <button className="btn-sm btn-cancelar" onClick={() => abrirModalCancelar(c, 'DEVOLVER')} aria-label="Devolver chamado à fila">↩ Devolver</button>
                              </>
                            )}

                            {isDeOutro && isEmAndamento && (
                              <button className="btn-sm btn-cancelar" style={{background: '#64748b'}} onClick={() => abrirModalCancelar(c, 'DEVOLVER')} title="Forçar devolução" aria-label={`Forçar devolução do chamado ${c.protocolo} à fila`}>
                                ↩ Devolver
                              </button>
                            )}

                            <button className="btn-sm" style={{background: '#991b1b', color: 'white'}} onClick={() => handleExcluirChamadoAdmin(c.id)} title="Excluir do Banco de Dados" aria-label={`Eliminar chamado ${c.protocolo} permanentemente`}>
                                🗑️ Apagar
                            </button>
                          </div>
                        </td>
                        <td><span className="protocolo-badge">{c.protocolo}</span></td>
                        <td>
                          <strong>{c.titulo}</strong>
                          <div style={{fontSize: '0.8rem', color: '#64748b', marginTop: '4px'}}>
                            <span className="ticket-category">{c.categoria}</span> - <span className={`prio-tag prio-${(c.prioridade || 'MEDIA').toLowerCase()}`}>{c.prioridade || 'MÉDIA'}</span>
                          </div>
                        </td>
                        <td>
                          {c.nomeUsuarioLogado || c.nomeVisitante || 'Anônimo'}
                          <div style={{fontSize: '0.8rem', color: '#64748b', marginTop: '4px'}}>{c.nomeSecretariaVisitante || '—'}</div>
                        </td>
                        <td>
                          <span className={`badge-status status-${c.status.toLowerCase()}`}>{c.status.replace('_', ' ')}</span>
                          <div style={{fontSize: '0.8rem', marginTop: '4px'}}><strong>Tec:</strong> {c.nomeTecnico || 'Nenhum'}</div>
                        </td>
                        <td>
                          <div style={{fontSize: '0.85rem'}}><strong>Abert.:</strong> {formatarData(c.dataAbertura)}</div>
                        </td>
                      </tr>
                    );
                  })}
                  {chamadosAtivosFiltrados.length === 0 && <tr><td colSpan="6" className="text-center">Nenhum chamado ativo encontrado.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ================= ABA: HISTÓRICO GLOBAL (PAGINADO) ================= */}
        {abaAtiva === 'CHAMADOS_FINALIZADOS' && (
          <section className="admin-section fade-in" aria-label="Histórico Global de Chamados">
            <div className="section-header">
              <div>
                <h2>Histórico Global</h2>
                <p className="hide-on-mobile">Auditoria de todo o trabalho finalizado.</p>
              </div>
              <button className="btn-refresh" onClick={() => carregarHistoricoGlobal(false)} aria-label="Atualizar dados do histórico">
                <span className="hide-on-mobile">🔄 Atualizar Histórico</span>
                <span className="show-on-mobile" aria-hidden="true">🔄</span>
              </button>
            </div>

            <div className="filtros-finalizados" role="search" aria-label="Filtros do histórico de chamados">
              <div className="filtro-item">
                <label htmlFor="filtro-status-finalizados">Status</label>
                <select id="filtro-status-finalizados" value={filtroStatusFinalizados} onChange={handleStatusChange}>
                  <option value="TODOS">Todos os Status</option>
                  <option value="CONCLUIDO">Concluídos</option>
                  <option value="CANCELADO">Cancelados</option>
                </select>
              </div>

              <div className="filtro-item">
                <label htmlFor="filtro-sec-finalizados">Secretaria</label>
                <select id="filtro-sec-finalizados" value={filtroSecretariaFinalizados} onChange={e => { setFiltroSecretariaFinalizados(e.target.value); setPage(0); }}>
                  <option value="TODAS">Todas Secretarias</option>
                  {/* Utiliza a lista de secretarias carregada via DB para o filtro */}
                  {secretarias.map(s => <option key={s.id} value={s.nome}>{s.nome}</option>)}
                </select>
              </div>

              <div className="filtro-item">
                <label htmlFor="filtro-tec-finalizados">Técnico</label>
                <select id="filtro-tec-finalizados" value={filtroTecnicoFinalizados} onChange={e => { setFiltroTecnicoFinalizados(e.target.value); setPage(0); }}>
                  <option value="TODOS">Todos os Técnicos</option>
                  {/* Utiliza a lista de técnicos carregada via DB para o filtro */}
                  {tecnicos.map(t => <option key={t.id} value={t.nome}>{t.nome}</option>)}
                </select>
              </div>

              {/* NOVO FILTRO DE AVALIAÇÃO */}
              <div className="filtro-item">
                <label htmlFor="filtro-avaliacao-finalizados">Avaliação</label>
                <select 
                  id="filtro-avaliacao-finalizados" 
                  value={filtroAvaliacaoFinalizados} 
                  onChange={e => { setFiltroAvaliacaoFinalizados(e.target.value); setPage(0); }}
                >
                  <option value="TODOS">Todas as Avaliações</option>
                  <option value="COM_AVALIACAO">Apenas Avaliados</option>
                  <option value="SEM_AVALIACAO">Sem Avaliação</option>
                  <option value="5">⭐⭐⭐⭐⭐ (5 Estrelas)</option>
                  <option value="4">⭐⭐⭐⭐ (4 Estrelas)</option>
                  <option value="3">⭐⭐⭐ (3 Estrelas)</option>
                  <option value="2">⭐⭐ (2 Estrelas)</option>
                  <option value="1">⭐ (1 Estrela)</option>
                  <option value="NOTAS_BAIXAS">⚠️ Notas Baixas (1 e 2)</option>
                  <option value="NOTAS_ALTAS">⭐ Notas Altas (4 e 5)</option>
                </select>
              </div>

              <div className="filtro-item">
                <label htmlFor="admin-data-inicio">De:</label>
                <input id="admin-data-inicio" type="date" value={filtroDataInicioChamados} onChange={handleDataInicioChange} />
              </div>

              <div className="filtro-item">
                <label htmlFor="admin-data-fim">Até:</label>
                <input id="admin-data-fim" type="date" value={filtroDataFimChamados} onChange={handleDataFimChange} />
              </div>
              
              <div className="filtro-item filtro-busca">
                <label htmlFor="busca-chamado-admin-historico">Pesquisar</label>
                <input 
                  id="busca-chamado-admin-historico"
                  type="text" 
                  placeholder="Protocolo, título, solicitante..." 
                  value={buscaChamadoFinalizado}
                  onChange={handleBuscaChange}
                />
              </div>

              <div className="filtro-acoes">
                <button className="btn-limpar-filtros" onClick={limparFiltrosFinalizados}>Limpar Filtros</button>
              </div>
            </div>
            
            <div aria-live="polite">
              {carregandoHistorico ? <p>A carregar histórico da base de dados...</p> : (
                <>
                  <div className="table-responsive" tabIndex="0" aria-label="Tabela de chamados do histórico">
                    <table className="custom-table admin-table">
                      <thead>
                        <tr>
                          <th style={{textAlign: 'center'}} scope="col">Ações</th>
                          <th scope="col">Protocolo</th>
                          <th scope="col">Problema / Categoria</th>
                          <th scope="col">Solicitante / Secretaria</th>
                          <th scope="col">Status / Técnico</th>
                          <th scope="col">Avaliação</th>
                          <th scope="col">Datas</th>
                        </tr>
                      </thead>
                      <tbody>
                        {chamadosFinalizadosFiltrados.map(c => {
                          const isConcluido = c.status === 'CONCLUIDO';
                          const isCancelado = c.status === 'CANCELADO';
                          let rowClass = isCancelado ? "row-cancelado" : "row-concluido";

                          return (
                            <tr key={c.id} className={rowClass}>
                              <td className="acoes-cell">
                                <div className="botoes-coluna">
                                  <button className="btn-sm btn-detalhes" onClick={() => setModalDetalhes(c)} aria-label={`Ver detalhes do chamado ${c.protocolo}`}>🔍 Detalhes</button>
                                  <button className="btn-sm btn-cancelar" style={{background: '#64748b'}} onClick={() => abrirModalCancelar(c, 'DEVOLVER')} title="Forçar reabertura" aria-label={`Forçar devolução do chamado ${c.protocolo} finalizado à fila`}>
                                    ↩ Reabrir
                                  </button>
                                  <button className="btn-sm" style={{background: '#991b1b', color: 'white'}} onClick={() => handleExcluirChamadoAdmin(c.id)} aria-label={`Apagar o chamado ${c.protocolo} de forma permanente`}>
                                      🗑 Apagar
                                  </button>
                                </div>
                              </td>
                              <td><span className="protocolo-badge">{c.protocolo}</span></td>
                              <td>
                                <strong>{c.titulo}</strong>
                                <div style={{fontSize: '0.8rem', color: '#64748b', marginTop: '4px'}}>
                                  <span className="ticket-category">{c.categoria}</span> - <span className={`prio-tag prio-${(c.prioridade || 'MEDIA').toLowerCase()}`}>{c.prioridade || 'MÉDIA'}</span>
                                </div>
                              </td>
                              <td>
                                {c.nomeUsuarioLogado || c.nomeVisitante || 'Anônimo'}
                                <div style={{fontSize: '0.8rem', color: '#64748b', marginTop: '4px'}}>{c.nomeSecretariaVisitante || '—'}</div>
                              </td>
                              <td>
                                <span className={`badge-status status-${c.status.toLowerCase()}`}>{c.status.replace('_', ' ')}</span>
                                <div style={{fontSize: '0.8rem', marginTop: '4px'}}><strong>Tec:</strong> {c.nomeTecnico || 'Nenhum'}</div>
                              </td>
                              <td>
                                {c.notaAvaliacao ? (
                                  <span style={{ color: c.notaAvaliacao <= 2 ? '#dc2626' : '#d97706', fontWeight: 'bold', fontSize: '0.9rem', whiteSpace: 'nowrap' }} title={c.comentarioAvaliacao || ''}>
                                    {'★'.repeat(c.notaAvaliacao)}{'☆'.repeat(5 - c.notaAvaliacao)} ({c.notaAvaliacao})
                                  </span>
                                ) : (
                                  <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>—</span>
                                )}
                              </td>
                              <td>
                                <div style={{fontSize: '0.85rem'}}><strong>Abert.:</strong> {formatarData(c.dataAbertura)}</div>
                                <div style={{fontSize: '0.85rem', marginTop: '4px'}}><strong>Fim:</strong> {formatarData(c.dataConclusao)}</div>
                              </td>
                            </tr>
                          );
                        })}
                        {chamadosFinalizadosFiltrados.length === 0 && <tr><td colSpan="7" className="text-center">Nenhum chamado no histórico corresponde aos filtros.</td></tr>}
                      </tbody>
                    </table>
                  </div>

                  {/* Paginação */}
                  {totalPages > 1 && (
                    <div className="pagination-container">
                      <span className="pagination-info">Mostrando {chamadosFinalizadosFiltrados.length} de {totalElements}</span>
                      <div className="pagination-controls">
                        <button className="btn-page" onClick={() => setPage(page - 1)} disabled={page === 0}>« Anterior</button>
                        <span className="page-current">Página {page + 1} de {totalPages}</span>
                        <button className="btn-page" onClick={() => setPage(page + 1)} disabled={page >= totalPages - 1}>Seguinte »</button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>
        )}
      </div>

      {/* ================= MODAIS DE CADASTRO E AÇÃO ================= */}

      {modalUsuario && (
        <div 
          className="modal-backdrop" 
          onClick={() => setModalUsuario(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-modal-novo-user"
        >
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 id="titulo-modal-novo-user" style={{margin: '0 0 16px 0', fontSize: '1.3rem'}}>Cadastrar Novo Usuário</h2>
            <form onSubmit={handleCriarUsuario} className="admin-form" noValidate>
              <div className="form-group">
                <label htmlFor="user-nome">Nome Completo</label>
                <input id="user-nome" type="text" value={formUsuario.nome} onChange={e => setFormUsuario({...formUsuario, nome: e.target.value})} required aria-required="true" />
              </div>
              <div className="form-group">
                <label htmlFor="user-email">E-mail</label>
                <input id="user-email" type="email" value={formUsuario.email} onChange={e => setFormUsuario({...formUsuario, email: e.target.value})} required aria-required="true" />
              </div>
              <div className="form-group">
                <label htmlFor="user-telefone">Telefone</label>
                <input id="user-telefone" type="text" value={formUsuario.telefone} onChange={e => setFormUsuario({...formUsuario, telefone: e.target.value})} required aria-required="true" />
              </div>
              <div className="form-group">
                <label htmlFor="user-sec">Secretaria de Origem</label>
                <select id="user-sec" value={formUsuario.secretariaId} onChange={e => setFormUsuario({...formUsuario, secretariaId: Number(e.target.value)})} required aria-required="true">
                  <option value="">Selecione...</option>
                  {secretarias.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="user-role">Perfil de Acesso (Role)</label>
                <select id="user-role" value={formUsuario.tipo} onChange={e => setFormUsuario({...formUsuario, tipo: e.target.value})} required aria-required="true">
                  <option value="USER">Usuário Comum</option>
                  <option value="TECNICO">Técnico de TI</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="user-senha">Senha de Acesso</label>
                <input id="user-senha" type="password" value={formUsuario.senha} onChange={e => setFormUsuario({...formUsuario, senha: e.target.value})} required aria-required="true" />
              </div>
              <div className="modal-acoes">
                <button type="button" className="btn-acao-admin secondary" onClick={() => setModalUsuario(false)}>Cancelar</button>
                <button type="submit" className="btn-acao-admin">Salvar Usuário</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalSecretaria && (
        <div 
          className="modal-backdrop" 
          onClick={() => setModalSecretaria(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-modal-nova-sec"
        >
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 id="titulo-modal-nova-sec" style={{margin: '0 0 16px 0', fontSize: '1.3rem'}}>Nova Secretaria</h2>
            <form onSubmit={handleCriarSecretaria} className="admin-form" noValidate>
              <div className="form-group">
                <label htmlFor="sec-nome">Nome da Secretaria</label>
                <input id="sec-nome" type="text" value={formSecretaria.nome} onChange={e => setFormSecretaria({...formSecretaria, nome: e.target.value})} required aria-required="true" placeholder="Ex: Secretaria de Saúde" />
              </div>
              <div className="form-group">
                <label htmlFor="sec-sigla">Sigla</label>
                <input id="sec-sigla" type="text" value={formSecretaria.sigla} onChange={e => setFormSecretaria({...formSecretaria, sigla: e.target.value.toUpperCase()})} required aria-required="true" placeholder="Ex: SESAU" />
              </div>
              <div className="form-group">
                <label htmlFor="sec-desc">Descrição (Opcional)</label>
                <textarea id="sec-desc" rows="3" value={formSecretaria.descricao} onChange={e => setFormSecretaria({...formSecretaria, descricao: e.target.value})} />
              </div>
              <div className="modal-acoes">
                <button type="button" className="btn-acao-admin secondary" onClick={() => setModalSecretaria(false)}>Cancelar</button>
                <button type="submit" className="btn-acao-admin">Salvar Secretaria</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalLocal && (
        <div 
          className="modal-backdrop" 
          onClick={() => setModalLocal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-modal-novo-local"
        >
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 id="titulo-modal-novo-local" style={{margin: '0 0 16px 0', fontSize: '1.3rem'}}>Novo Local / Prédio</h2>
            <form onSubmit={handleCriarLocal} className="admin-form" noValidate>
              <div className="form-group">
                <label htmlFor="local-sec-id">Secretaria Responsável</label>
                <select id="local-sec-id" value={formLocal.secretariaId} onChange={e => setFormLocal({...formLocal, secretariaId: Number(e.target.value)})} required aria-required="true">
                  <option value="">Selecione...</option>
                  {secretarias.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="local-nome">Nome do Local (Ex: UBS Centro)</label>
                <input id="local-nome" type="text" value={formLocal.nome} onChange={e => setFormLocal({...formLocal, nome: e.target.value})} required aria-required="true" />
              </div>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px'}}>
                <div className="form-group">
                  <label htmlFor="local-rua">Rua / Logradouro</label>
                  <input id="local-rua" type="text" value={formLocal.logradouro} onChange={e => setFormLocal({...formLocal, logradouro: e.target.value})} required aria-required="true" />
                </div>
                <div className="form-group">
                  <label htmlFor="local-num">Número</label>
                  <input id="local-num" type="text" value={formLocal.numero} onChange={e => setFormLocal({...formLocal, numero: e.target.value})} />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="local-bairro">Bairro</label>
                <input id="local-bairro" type="text" value={formLocal.bairro} onChange={e => setFormLocal({...formLocal, bairro: e.target.value})} required aria-required="true" />
              </div>
              <div className="modal-acoes">
                <button type="button" className="btn-acao-admin secondary" onClick={() => setModalLocal(false)}>Cancelar</button>
                <button type="submit" className="btn-acao-admin">Salvar Local</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalConcluir && (
        <div 
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-modal-concluir-admin"
          onClick={() => !cancelando && setModalConcluir(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 id="titulo-modal-concluir-admin" style={{fontSize: '1.25rem', margin: '0 0 10px 0'}}>Concluir Chamado</h2>
            <p>Por favor, descreva a solution aplicada:</p>
            <form onSubmit={concluirChamado} noValidate>
              <label htmlFor="solucaoAdmin" className="sr-only" style={{display:'none'}}>Solução</label>
              <textarea id="solucaoAdmin" rows="4" value={solucao} onChange={(e) => setSolucao(e.target.value)} required aria-required="true" placeholder="Descreva o que foi feito..." />
              <div className="modal-acoes">
                <button type="button" className="btn-cancelar btn-sm" onClick={() => setModalConcluir(false)}>Voltar</button>
                <button type="submit" className="btn-concluir btn-sm">Finalizar Chamado</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalCancelar && (
        <div 
          className="modal-backdrop" 
          onClick={() => !cancelando && setModalCancelar(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-modal-cancel-admin"
        >
          <div className="modal-content modal-confirmacao" onClick={(e) => e.stopPropagation()}>
            <div className="confirmacao-icone" aria-hidden="true">{modalCancelar.origem === 'FILA' ? '⚠️' : '↩️'}</div>
            <h2 id="titulo-modal-cancel-admin" className="confirmacao-titulo">
              {modalCancelar.origem === 'FILA' ? 'Cancelar este chamado?' : 'Devolver este chamado para a fila?'}
            </h2>
            <p className="confirmacao-texto">
              {modalCancelar.origem === 'FILA' ? (
                <>O chamado <strong>{modalCancelar.chamado.protocolo}</strong> será marcado como <strong>CANCELADO</strong> e enviado para o histórico.</>
              ) : (
                <>O chamado <strong>{modalCancelar.chamado.protocolo}</strong> voltará para a fila como <strong>ABERTO</strong> e perderá a atual atribuição técnica.</>
              )}
            </p>
            <div className="confirmacao-resumo" aria-label="Detalhes do chamado">
              <div><small>Título</small><strong>{modalCancelar.chamado.titulo}</strong></div>
              <div><small>Prioridade</small><strong><span className={`prio-tag prio-${(modalCancelar.chamado.prioridade || 'MEDIA').toLowerCase()}`}>{modalCancelar.chamado.prioridade || 'MÉDIA'}</span></strong></div>
              <div><small>Técnico atual</small><strong>{modalCancelar.chamado.nomeTecnico || 'Nenhum'}</strong></div>
            </div>
            {modalCancelar.origem === 'FILA' && (
              <div className="confirmacao-motivo">
                <label htmlFor="motivoCancelamento">Motivo do cancelamento (opcional)</label>
                <textarea id="motivoCancelamento" rows="3" placeholder="Ex: duplicado, etc." value={motivoCancelamento} onChange={(e) => setMotivoCancelamento(e.target.value)} disabled={cancelando} />
              </div>
            )}
            <div className="confirmacao-acoes">
              <button type="button" className="btn-secondary" onClick={() => setModalCancelar(null)} disabled={cancelando}>Não, voltar</button>
              <button type="button" className={modalCancelar.origem === 'FILA' ? 'btn-perigo' : 'btn-secondary'} onClick={confirmarCancelarDevolver} disabled={cancelando} aria-busy={cancelando}>
                {cancelando ? 'Processando...' : modalCancelar.origem === 'FILA' ? 'Sim, cancelar' : 'Sim, devolver à fila'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalDetalhes && (
        <div 
          className="modal-backdrop" 
          onClick={() => setModalDetalhes(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-modal-detalhes-admin"
        >
          <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()}>
            <h2 id="titulo-modal-detalhes-admin" style={{fontSize: '1.25rem', margin: 0}}>Detalhes do Chamado: {modalDetalhes.protocolo || 'N/A'}</h2>
            <div className="detalhes-grid" aria-label="Ficha completa de detalhes do chamado">
              <div className="detalhe-item"><label>Solicitante:</label><span>{modalDetalhes.nomeUsuarioLogado || modalDetalhes.nomeVisitante || 'Não identificado'}</span></div>
              <div className="detalhe-item"><label>Contacto:</label><span>{modalDetalhes.contatoVisitante || 'Não informado'}</span></div>
              <div className="detalhe-item"><label>Secretaria:</label><span>{modalDetalhes.nomeSecretariaVisitante || 'N/A'}</span></div>
              <div className="detalhe-item"><label>Edifício / Local:</label><span>{modalDetalhes.nomeLocal || modalDetalhes.localVisitante || 'Não informado'}</span></div>
              <div className="detalhe-item"><label>Prioridade:</label><span><span className={`prio-tag prio-${(modalDetalhes.prioridade || 'MEDIA').toLowerCase()}`}>{modalDetalhes.prioridade || 'MÉDIA'}</span></span></div>
              <div className="detalhe-item"><label>Data e Hora de Abertura:</label><span>{formatarData(modalDetalhes.dataAbertura)}</span></div>
              <div className="detalhe-item"><label>Data e Hora de Conclusão:</label><span>{modalDetalhes.dataConclusao ? formatarData(modalDetalhes.dataConclusao) : 'Em andamento'}</span></div>
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
                  <p aria-label={`Avaliado com ${modalDetalhes.notaAvaliacao} estrelas`}>
                    <span aria-hidden="true">{'★'.repeat(modalDetalhes.notaAvaliacao)}{'☆'.repeat(5 - modalDetalhes.notaAvaliacao)}</span> {modalDetalhes.comentarioAvaliacao && <em>"{modalDetalhes.comentarioAvaliacao}"</em>}
                  </p>
                </div>
              )}
            </div>
            <div className="modal-acoes">
              <button type="button" className="btn-cancelar" onClick={() => setModalDetalhes(null)} aria-label="Fechar painel de detalhes">Fechar</button>
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
          aria-labelledby="titulo-lgpd-admin"
        >
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <header style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
              <h2 id="titulo-lgpd-admin" style={{margin: 0, fontSize: '1.25rem'}}>Privacidade e Direitos (LGPD)</h2>
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
                  style={{background: '#ef4444', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', width: '100%'}}
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