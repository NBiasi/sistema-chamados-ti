import React, { useState, useEffect } from 'react';
import api, { recuperarSenha, obterContatoDpo } from '../../services/api';
import './Login.css';

function Login({ onLoginSucesso, onIrParaCadastro, onEntrarSemConta }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  // Estados do modal de recuperação de senha
  const [modalRecuperarAberto, setModalRecuperarAberto] = useState(false);
  const [emailRecuperar, setEmailRecuperar] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [erroRecuperar, setErroRecuperar] = useState('');
  const [sucessoRecuperar, setSucessoRecuperar] = useState('');
  const [carregandoRecuperar, setCarregandoRecuperar] = useState(false);

  // Fecha o modal de recuperação de senha ao pressionar 'Esc'
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && modalRecuperarAberto && !carregandoRecuperar) {
        fecharModalRecuperar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalRecuperarAberto, carregandoRecuperar]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');
    setCarregando(true);

    try {
      const response = await api.post('/auth/login', { email, senha });
      const { token, usuario } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('usuario', JSON.stringify(usuario));
      
      onLoginSucesso(usuario);
    } catch (err) {
      console.error('Erro de autenticação:', err);
      const msg = err.response?.data?.erro || 'E-mail ou senha incorretos.';
      setErro(msg);
    } finally {
      setCarregando(false);
    }
  };

  const handleEntrarComoVisitante = async () => {
    setErro('');
    setCarregando(true);

    try {
      const visitorIdSalvo = localStorage.getItem('visitor_id');
      const response = await api.post('/auth/visitante', { visitorId: visitorIdSalvo });
      const { token, usuario } = response.data;
      
      if (!visitorIdSalvo && usuario.provedorId) {
        localStorage.setItem('visitor_id', usuario.provedorId);
      }

      localStorage.setItem('token', token);
      localStorage.setItem('usuario', JSON.stringify(usuario));

      onEntrarSemConta();
    } catch (err) {
      console.error('Erro ao acessar como visitante:', err);
      setErro('Falha ao iniciar sessão de visitante. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  };

  const abrirModalRecuperar = () => {
    setEmailRecuperar('');
    setNovaSenha('');
    setConfirmarSenha('');
    setErroRecuperar('');
    setSucessoRecuperar('');
    setModalRecuperarAberto(true);
  };

  const fecharModalRecuperar = () => {
    if (carregandoRecuperar) return;
    setModalRecuperarAberto(false);
  };

  const handleRecuperarSenha = async (e) => {
    e.preventDefault();
    setErroRecuperar('');
    setSucessoRecuperar('');

    if (novaSenha.length < 6) {
      setErroRecuperar('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (novaSenha !== confirmarSenha) {
      setErroRecuperar('As senhas não coincidem.');
      return;
    }

    setCarregandoRecuperar(true);
    try {
      await recuperarSenha(emailRecuperar, novaSenha);
      setSucessoRecuperar('Senha atualizada com sucesso! Você já pode fazer login.');
      
      setTimeout(() => {
        setModalRecuperarAberto(false);
        setEmail(emailRecuperar);
        setSenha('');
        setEmailRecuperar('');
        setNovaSenha('');
        setConfirmarSenha('');
        setSucessoRecuperar('');
      }, 2000);
    } catch (err) {
      console.error('Erro ao recuperar senha:', err);
      const msg = 
        err.response?.data?.erro || 
        err.response?.data?.message || 
        'Não foi possível atualizar a senha. Verifique o e-mail informado.';
      setErroRecuperar(msg);
    } finally {
      setCarregandoRecuperar(false);
    }
  };

  const handleVerDpo = async () => {
    try {
      const dpo = await obterContatoDpo();
      alert(`🛡️ Privacidade e LGPD\n\nContacto do Encarregado de Dados (DPO):\nNome: ${dpo.nome}\nE-mail: ${dpo.email}\nTelefone: ${dpo.telefone}\n\nPara solicitar informações ou exercer os seus direitos, contacte este endereço.`);
    } catch (e) {
      alert('Não foi possível carregar os dados do DPO no momento.');
    }
  };

  return (
    <main className="login-container" aria-label="Página de Autenticação">
      <div className="login-card" role="region" aria-labelledby="login-heading">
        <header className="login-header">
          <h1 id="login-heading" style={{ fontSize: '1.5rem', margin: '0 0 6px 0', fontWeight: '700', color: '#0f172a' }}>
            Sistema de Chamados
          </h1>
          <p>Prefeitura Municipal de Colinas do Tocantins</p>
        </header>

        <div aria-live="polite" aria-atomic="true">
          {erro && <div className="alert-error" role="alert">{erro}</div>}
        </div>

        <form onSubmit={handleSubmit} className="login-form" noValidate>
          <div className="input-group">
            <label htmlFor="email">E-mail</label>
            <input 
              id="email"
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="digite.seu@email.com"
              required 
              aria-required="true"
            />
          </div>

          <div className="input-group">
            <label htmlFor="senha">Senha</label>
            <input 
              id="senha"
              type="password" 
              value={senha} 
              onChange={(e) => setSenha(e.target.value)} 
              placeholder="Sua senha"
              required 
              aria-required="true"
            />
          </div>

          <button 
            type="submit" 
            className="btn-submit" 
            disabled={carregando}
            aria-busy={carregando}
          >
            {carregando ? 'A entrar...' : 'Entrar'}
          </button>
        </form>

        <div className="recuperar-senha-wrapper">
          <button
            type="button"
            className="btn-link-recuperar"
            onClick={abrirModalRecuperar}
            aria-label="Clique aqui se esqueceu a sua palavra-passe"
          >
            Esqueceu a senha?
          </button>
        </div>

        <div className="login-divider" aria-hidden="true">
          <span>ou</span>
        </div>

        <button 
          type="button" 
          className="btn-guest" 
          onClick={handleEntrarComoVisitante}
          disabled={carregando}
          aria-label="Entrar como visitante sem necessidade de registo"
        >
          <span className="btn-guest-icon" aria-hidden="true">👤</span>
          {carregando ? 'Gerando sessão...' : 'Entrar sem conta (Acesso Visitante)'}
        </button>

        <footer className="login-footer">
          <p>Ainda não tem uma conta?</p>
          <button type="button" className="btn-link" onClick={onIrParaCadastro} aria-label="Página de registo de nova conta">
            Criar uma nova conta
          </button>
          
          <div style={{marginTop: '25px', paddingTop: '15px', borderTop: '1px solid #e2e8f0'}}>
            <button 
              type="button" 
              onClick={handleVerDpo} 
              style={{background: 'none', border: 'none', color: '#64748b', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline'}}
              aria-label="Visualizar termos de privacidade e contacto do responsável pela proteção de dados"
            >
              Termos de Privacidade e Contacto DPO (LGPD)
            </button>
          </div>
        </footer>
      </div>

      {modalRecuperarAberto && (
        <div 
          className="modal-backdrop" 
          onClick={fecharModalRecuperar}
          role="dialog"
          aria-modal="true"
          aria-labelledby="recuperar-titulo"
        >
          <div 
            className="modal-card-recuperar" 
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="btn-close-recuperar"
              onClick={fecharModalRecuperar}
              disabled={carregandoRecuperar}
              aria-label="Fechar janela de recuperação de senha"
            >
              ×
            </button>

            <div className="recuperar-icon" aria-hidden="true">🔐</div>
            <h2 id="recuperar-titulo" className="recuperar-titulo">Recuperar Senha</h2>
            <p className="recuperar-subtitulo">
              Informe o e-mail da sua conta e defina uma nova senha.
            </p>

            <div aria-live="polite" aria-atomic="true">
              {erroRecuperar && <div className="alert-error" role="alert">{erroRecuperar}</div>}
              {sucessoRecuperar && <div className="alert-success-modal" role="status">{sucessoRecuperar}</div>}
            </div>

            <form onSubmit={handleRecuperarSenha} className="recuperar-form" noValidate>
              <div className="input-group">
                <label htmlFor="emailRecuperar">E-mail cadastrado</label>
                <input
                  id="emailRecuperar"
                  type="email"
                  value={emailRecuperar}
                  onChange={(e) => setEmailRecuperar(e.target.value)}
                  placeholder="seu.email@exemplo.com"
                  required
                  disabled={carregandoRecuperar}
                  aria-required="true"
                />
              </div>

              <div className="input-group">
                <label htmlFor="novaSenha">Nova senha</label>
                <input
                  id="novaSenha"
                  type="password"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                  disabled={carregandoRecuperar}
                  aria-required="true"
                />
              </div>

              <div className="input-group">
                <label htmlFor="confirmarSenha">Confirmar nova senha</label>
                <input
                  id="confirmarSenha"
                  type="password"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  placeholder="Repita a nova senha"
                  required
                  disabled={carregandoRecuperar}
                  aria-required="true"
                />
              </div>

              <div className="recuperar-acoes">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={fecharModalRecuperar}
                  disabled={carregandoRecuperar}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-submit"
                  disabled={carregandoRecuperar}
                  aria-busy={carregandoRecuperar}
                >
                  {carregandoRecuperar ? 'A atualizar...' : 'Atualizar Senha'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

export default Login;