import React, { useState, useEffect } from 'react';
import Login from './pages/Login/Login';
import Cadastro from './pages/Cadastro/Cadastro';
import DashboardUsuario from './pages/DashboardUsuario/DashboardUsuario';
import DashboardVisitante from './pages/DashboardVisitante/DashboardVisitante';
import DashboardTecnico from './pages/DashboardTecnico/DashboardTecnico';
import DashboardAdmin from './pages/DashboardAdmin/DashboardAdmin';
import { verificarAceiteLgpd, aceitarTermosLgpd } from './services/api';

function App() {
  const [telaAtual, setTelaAtual] = useState('LOGIN');
  const [usuario, setUsuario] = useState(null);
  const [mostrarLgpd, setMostrarLgpd] = useState(false);

  // Valida o aceite da LGPD
  const validarLgpd = async (userObj) => {
    try {
      const isVisitante = userObj?.role === 'VISITANTE';
      const vId = isVisitante ? userObj.provedorId : null;
      const aceitou = await verificarAceiteLgpd(vId);
      if (!aceitou) {
        setMostrarLgpd(true);
      }
    } catch (error) {
      console.error('Erro ao verificar aceite LGPD', error);
    }
  };

  useEffect(() => {
    const usuarioSalvo = localStorage.getItem('usuario');
    const token = localStorage.getItem('token');
    
    if (usuarioSalvo && token) {
      const parsedUser = JSON.parse(usuarioSalvo);
      setUsuario(parsedUser);
      
      if (parsedUser.role === 'VISITANTE') setTelaAtual('DASH_VISITANTE');
      else if (parsedUser.role === 'TECNICO') setTelaAtual('DASH_TECNICO'); 
      else if (parsedUser.role === 'ADMIN') setTelaAtual('DASH_ADMIN');             
      else setTelaAtual('DASH_USER'); 

      validarLgpd(parsedUser);
    }
  }, []);

  const handleLoginSucesso = (user) => {
    setUsuario(user);
    validarLgpd(user);

    if (user.role === 'TECNICO') setTelaAtual('DASH_TECNICO');
    else if (user.role === 'ADMIN') setTelaAtual('DASH_ADMIN');               
    else setTelaAtual('DASH_USER');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    setUsuario(null);
    setMostrarLgpd(false);
    setTelaAtual('LOGIN');
  };

  const handleAceitarLgpd = async () => {
    try {
      const isVisitante = usuario?.role === 'VISITANTE';
      const vId = isVisitante ? usuario.provedorId : null;
      await aceitarTermosLgpd(vId);
      setMostrarLgpd(false);
    } catch (err) {
      alert('Erro ao registar o seu consentimento.');
    }
  };

  return (
    <div>
      {telaAtual === 'LOGIN' && (
        <Login 
          onLoginSucesso={handleLoginSucesso}
          onIrParaCadastro={() => setTelaAtual('CADASTRO')}
          onEntrarSemConta={() => setTelaAtual('DASH_VISITANTE')}
        />
      )}

      {telaAtual === 'CADASTRO' && (
        <Cadastro 
          onVoltarLogin={() => setTelaAtual('LOGIN')}
          onCadastroSucesso={() => setTelaAtual('LOGIN')}
        />
      )}

      {telaAtual === 'DASH_USER' && usuario && <DashboardUsuario usuario={usuario} onLogout={handleLogout} />}
      {telaAtual === 'DASH_TECNICO' && usuario && <DashboardTecnico usuario={usuario} onLogout={handleLogout} />}
      {telaAtual === 'DASH_ADMIN' && usuario && <DashboardAdmin usuario={usuario} onLogout={handleLogout} />}
      {telaAtual === 'DASH_VISITANTE' && <DashboardVisitante onVoltarLogin={handleLogout} />}

      {/* MODAL GLOBAL DA LGPD */}
      {mostrarLgpd && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.8)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div style={{
            background: '#fff', padding: '30px', borderRadius: '12px',
            maxWidth: '500px', width: '100%', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
          }}>
            <h2 style={{marginTop: 0, color: '#0f172a'}}>Termos de Uso e LGPD</h2>
            <p style={{color: '#475569', fontSize: '0.95rem', lineHeight: 1.5, textAlign: 'left'}}>
              Para utilizar o Sistema de Chamados, necessitamos do seu consentimento para o tratamento dos seus dados pessoais (Nome, E-mail, Telefone, e IP) com a finalidade exclusiva de prestação de suporte técnico, em conformidade com a <strong>Lei 13.709/2018 (LGPD)</strong>.
            </p>
            <div style={{ background: '#f1f5f9', padding: '15px', borderRadius: '8px', fontSize: '0.85rem', textAlign: 'left', marginBottom: '20px', color: '#334155' }}>
              ✓ Os seus dados não serão partilhados com terceiros.<br/>
              ✓ Pode solicitar a exportação ou anonimização dos dados no seu perfil.<br/>
              ✓ O seu histórico público será anonimizado após 90 dias do encerramento (Visitantes).
            </div>
            <button 
              onClick={handleAceitarLgpd}
              style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', width: '100%' }}
            >
              Li e Aceito os Termos
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;