import React, { useState, useEffect } from 'react';
import api, { listarSecretarias } from '../../services/api';
import { mascararTelefone, telefoneValido, MSG_TELEFONE_INVALIDO } from '../../services/validacoes';
import './Cadastro.css';

function Cadastro({ onVoltarLogin, onCadastroSucesso }) {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [telefone, setTelefone] = useState('');
  const [secretaria, setSecretaria] = useState('');
  
  const [secretariasList, setSecretariasList] = useState([]);
  
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    async function carregarSecretarias() {
      try {
        const dados = await listarSecretarias();
        setSecretariasList(dados);
      } catch (err) {
        console.error('Erro ao carregar secretarias:', err);
      }
    }
    carregarSecretarias();
  }, []);

  const handleTelefoneChange = (e) => {
    setTelefone(mascararTelefone(e.target.value));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');
    setSucesso('');

    if (!telefoneValido(telefone)) {
      setErro(MSG_TELEFONE_INVALIDO);
      return;
    }

    setCarregando(true);

    try {
      await api.post('/usuarios/cadastrar', { 
        nome, 
        email, 
        senha, 
        telefone, 
        secretariaId: secretaria ? Number(secretaria) : null,
        tipo: 'USER'
      });
      
      setSucesso('Conta criada com sucesso! A redirecionar para o login...');
      setTimeout(() => {
        onCadastroSucesso();
      }, 2000);
    } catch (err) {
      console.error('Erro detalhado do backend:', err);
      
      const dadosErro = err.response?.data;
      let mensagemErro = 'Erro ao realizar o registo. Verifique os dados ou tente novamente.';

      if (typeof dadosErro === 'string') {
        mensagemErro = dadosErro;
      } else if (dadosErro?.message) {
        mensagemErro = dadosErro.message;
      } else if (dadosErro?.errors && Array.isArray(dadosErro.errors)) {
        mensagemErro = dadosErro.errors.map(e => e.defaultMessage).join(', ');
      }

      setErro(mensagemErro);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <main className="cadastro-container" aria-label="Página de Registo de Conta">
      <form onSubmit={handleSubmit} className="cadastro-form" aria-labelledby="cadastro-titulo" noValidate>
        <header className="cadastro-header">
          <h1 id="cadastro-titulo" className="cadastro-titulo">Criar Conta</h1>
          <p>Preencha os dados abaixo para se registar no sistema.</p>
        </header>

        <div aria-live="polite" aria-atomic="true">
          {erro && <div className="alert-error" role="alert">{erro}</div>}
          {sucesso && <div className="alert-success" role="status">{sucesso}</div>}
        </div>

        <div className="input-group">
          <label htmlFor="cadastro-nome">Nome Completo *</label>
          <input 
            id="cadastro-nome"
            type="text" 
            value={nome} 
            onChange={(e) => setNome(e.target.value)} 
            placeholder="Digite o seu nome"
            required 
            aria-required="true"
            disabled={carregando}
          />
        </div>

        <div className="input-group">
          <label htmlFor="cadastro-email">E-mail *</label>
          <input 
            id="cadastro-email"
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            placeholder="seu.email@exemplo.com"
            required 
            aria-required="true"
            disabled={carregando}
          />
        </div>

        <div className="input-group">
          <label htmlFor="cadastro-telefone">Telefone / Contato *</label>
          <input 
            id="cadastro-telefone"
            type="tel" 
            value={telefone} 
            onChange={handleTelefoneChange} 
            placeholder="(63) 99999-9999"
            maxLength={15}
            inputMode="numeric"
            required 
            aria-required="true"
            disabled={carregando}
          />
        </div>

        <div className="input-group">
          <label htmlFor="cadastro-secretaria">Secretaria / Departamento *</label>
          <select 
            id="cadastro-secretaria"
            value={secretaria} 
            onChange={(e) => setSecretaria(e.target.value)}
            required
            aria-required="true"
            disabled={carregando}
          >
            <option value="">Selecione a sua secretaria...</option>
            {secretariasList.map((sec) => {
              const idVal = sec.id !== undefined ? sec.id : sec;
              const nomeVal = sec.nome !== undefined ? sec.nome : sec;
              return (
                <option key={idVal} value={idVal}>
                  {nomeVal}
                </option>
              );
            })}
          </select>
        </div>

        <div className="input-group">
          <label htmlFor="cadastro-senha">Palavra-passe (Senha) *</label>
          <input 
            id="cadastro-senha"
            type="password" 
            value={senha} 
            onChange={(e) => setSenha(e.target.value)} 
            placeholder="Crie uma senha forte"
            required 
            aria-required="true"
            disabled={carregando}
          />
        </div>

        <button 
          type="submit" 
          className="btn-submit" 
          disabled={carregando}
          aria-busy={carregando}
        >
          {carregando ? 'A registar...' : 'Cadastrar'}
        </button>

        <button 
          type="button" 
          className="btn-link" 
          onClick={onVoltarLogin}
          aria-label="Já tem uma conta? Voltar para a página de login"
        >
          Já tem uma conta? Faça login
        </button>
      </form>
    </main>
  );
}

export default Cadastro;