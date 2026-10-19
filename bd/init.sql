-- bd/init.sql
-- Definir charset UTF-8 para a conexão
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

CREATE DATABASE IF NOT EXISTS sistema_chamados_ti CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE sistema_chamados_ti;

-- ============================================
-- TABELAS
-- ============================================

CREATE TABLE IF NOT EXISTS secretaria (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(100) NOT NULL UNIQUE,
    sigla VARCHAR(20) NOT NULL UNIQUE,
    descricao VARCHAR(255),
    ativo BOOLEAN DEFAULT TRUE,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS local (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(150) NOT NULL,
    secretaria_id BIGINT NOT NULL,
    cep VARCHAR(10),
    logradouro VARCHAR(150) NOT NULL,
    numero VARCHAR(20),
    bairro VARCHAR(100) NOT NULL,
    complemento VARCHAR(100),
    ativo BOOLEAN DEFAULT TRUE,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (secretaria_id) REFERENCES secretaria(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS usuario (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE,
    telefone VARCHAR(20) NOT NULL,
    secretaria_id BIGINT NOT NULL,
    senha VARCHAR(255) NULL, 
    provedor_auth VARCHAR(20) DEFAULT 'LOCAL' CHECK (provedor_auth IN ('LOCAL', 'GOOGLE')),
    provedor_id VARCHAR(100) UNIQUE, 
    role VARCHAR(20) NOT NULL CHECK (role IN ('USER', 'TECNICO', 'ADMIN')),
    ativo BOOLEAN DEFAULT TRUE,
    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (secretaria_id) REFERENCES secretaria(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS chamado (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    protocolo VARCHAR(20) NOT NULL UNIQUE, 
    chave_acesso VARCHAR(255) NULL, 
    nome_visitante VARCHAR(100) NULL,
    contato_visitante VARCHAR(150) NULL,
    secretaria_visitante_id BIGINT NULL,
    local_id BIGINT NULL,                
    local_visitante VARCHAR(100) NULL,
    titulo VARCHAR(100) NOT NULL,
    descricao TEXT NOT NULL,
    categoria ENUM('HARDWARE', 'SOFTWARE', 'REDE', 'IMPRESSORA', 'OUTROS') NOT NULL,
    prioridade VARCHAR(20) NOT NULL DEFAULT 'MEDIA' CHECK (prioridade IN ('BAIXA', 'MEDIA', 'ALTA', 'URGENTE')),
    status VARCHAR(20) NOT NULL DEFAULT 'ABERTO' CHECK (status IN ('ABERTO', 'EM_ANDAMENTO', 'AGUARDANDO', 'CONCLUIDO', 'CANCELADO')),
    data_abertura TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atribuicao TIMESTAMP NULL,
    data_conclusao TIMESTAMP NULL,
    prazo_estimado TIMESTAMP NULL,
    usuario_id BIGINT NULL, 
    tecnico_id BIGINT NULL,
    observacao VARCHAR(500),
    solucao VARCHAR(1000),
    nota_avaliacao INT NULL CHECK (nota_avaliacao BETWEEN 1 AND 5),
    comentario_avaliacao VARCHAR(500) NULL,
    data_avaliacao TIMESTAMP NULL,
    FOREIGN KEY (usuario_id) REFERENCES usuario(id),
    FOREIGN KEY (tecnico_id) REFERENCES usuario(id),
    FOREIGN KEY (secretaria_visitante_id) REFERENCES secretaria(id),
    FOREIGN KEY (local_id) REFERENCES local(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS historico_chamado (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    chamado_id BIGINT NOT NULL,
    usuario_id BIGINT NULL, 
    acao VARCHAR(50) NOT NULL,
    status_anterior VARCHAR(20),
    status_novo VARCHAR(20),
    observacao VARCHAR(500),
    data_acao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chamado_id) REFERENCES chamado(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuario(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS log_auditoria (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    usuario_id BIGINT NULL,
    acao VARCHAR(50) NOT NULL,
    ip VARCHAR(50),
    user_agent VARCHAR(255),
    data_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuario(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS aceite_termo (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    usuario_id BIGINT NULL,
    visitor_id VARCHAR(255) NULL,
    versao_termo VARCHAR(20) NOT NULL DEFAULT '1.0',
    ip VARCHAR(50),
    user_agent VARCHAR(255),
    data_aceite TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuario(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- ÍNDICES
-- ============================================
CREATE INDEX idx_local_secretaria ON local(secretaria_id);
CREATE INDEX idx_usuario_role ON usuario(role);
CREATE INDEX idx_usuario_email ON usuario(email);
CREATE INDEX idx_chamado_protocolo ON chamado(protocolo);
CREATE INDEX idx_chamado_status ON chamado(status);
CREATE INDEX idx_chamado_prioridade ON chamado(prioridade);
CREATE INDEX idx_chamado_usuario ON chamado(usuario_id);
CREATE INDEX idx_chamado_tecnico ON chamado(tecnico_id);
CREATE INDEX idx_chamado_local ON chamado(local_id);
CREATE INDEX idx_chamado_data_abertura ON chamado(data_abertura);

-- ============================================
-- SEED: DADOS DE TESTE INICIAIS
-- ============================================

INSERT INTO secretaria (nome, sigla, descricao) VALUES
('Tecnologia da Informação', 'TI', 'Setor responsável pela infraestrutura de TI'),
('Secretaria de Saúde', 'SAUDE', 'Setor de saúde pública'),
('Secretaria de Educação', 'EDUCACAO', 'Setor de educação'),
('Secretaria de Finanças', 'FINANCAS', 'Setor financeiro'),
('Secretaria de Obras', 'OBRAS', 'Setor de obras e infraestrutura');

INSERT INTO local (nome, secretaria_id, cep, logradouro, numero, bairro, complemento) VALUES
('Prédio Central de TI', 1, '77700-000', 'Av. Pedro Ludovico', '100', 'Centro', 'Térreo'),
('UBS Central', 2, '77700-000', 'Rua Raul Doelho', '250', 'Centro', 'Próximo à praça'),
('Escola Municipal Paroquial', 3, '77700-000', 'Av. Tocantins', '500', 'Setor Oeste', 'Ao lado da igreja'),
('Paço Municipal', 4, '77700-000', 'Praça dos Girassóis', '1', 'Centro', 'Sede da Prefeitura');

INSERT INTO usuario (nome, email, telefone, secretaria_id, senha, provedor_auth, role) VALUES
('Administrador', 'admin@colinas.to.gov.br', '(63) 99999-9999', 1, 'admin123', 'LOCAL', 'ADMIN'), 
('João Técnico',  'joao@colinas.to.gov.br',  '(63) 98888-8888', 1, 'tecnico123', 'LOCAL', 'TECNICO'), 
('Maria Técnica', 'maria@colinas.to.gov.br', '(63) 97777-7777', 1, 'tecnico123', 'LOCAL', 'TECNICO'), 
('Carlos Silva',  'carlos@colinas.to.gov.br',  '(63) 96666-6666', 2, 'usuario123', 'LOCAL', 'USER'),
('Fernanda Costa', 'fernanda@colinas.to.gov.br', '(63) 95555-4444', 4, 'usuario123', 'LOCAL', 'USER');

-- ============================================
-- SEED: CHAMADOS EM ABERTO E ANDAMENTO
-- ============================================

INSERT INTO chamado (protocolo, titulo, descricao, categoria, prioridade, status, usuario_id, tecnico_id, local_id) VALUES
('20261001-A1B2', 'Computador não liga', 'O computador da sala 15 não liga após queda de energia', 'HARDWARE', 'ALTA', 'ABERTO', 4, NULL, 2),
('20261002-B2C3', 'Sem acesso à internet', 'Nenhum computador da recepção consegue acessar a internet', 'REDE', 'URGENTE', 'ABERTO', 5, NULL, 4),
('20261003-C3D4', 'Teclado com defeito', 'Teclas falhando na digitação', 'HARDWARE', 'BAIXA', 'ABERTO', 4, NULL, 2);

INSERT INTO chamado (protocolo, chave_acesso, nome_visitante, contato_visitante, secretaria_visitante_id, local_id, local_visitante, titulo, descricao, categoria, prioridade, status) VALUES
('20261001-X9Y8', 'senha123', 'Visitante Anônimo', '(63) 91111-2222', 3, 3, 'Sala dos Professores', 'Impressora atolando papel', 'Impressora do segundo andar', 'HARDWARE', 'MEDIA', 'ABERTO'),
('20261004-W8Z7', 'senha456', 'Visitante Dois', '(63) 92222-3333', 2, 2, 'Triagem', 'Sistema do SUS fora do ar', 'Não consigo registrar paciente', 'SOFTWARE', 'ALTA', 'ABERTO');

INSERT INTO chamado (protocolo, titulo, descricao, categoria, prioridade, status, usuario_id, tecnico_id, local_id, data_atribuicao) VALUES
('20261005-E5F6', 'Erro no LibreOffice', 'O Word gratuito não abre documentos antigos', 'SOFTWARE', 'MEDIA', 'EM_ANDAMENTO', 4, 2, 2, '2026-10-05 09:00:00'),
('20261005-G7H8', 'Troca de Toner', 'Toner da impressora acabou', 'HARDWARE', 'MEDIA', 'EM_ANDAMENTO', 5, 3, 4, '2026-10-05 10:30:00');

-- ============================================
-- SEED: 50+ CHAMADOS FINALIZADOS PARA TESTAR PAGINAÇÃO E DATAS
-- ============================================

-- ANO 2025 (Janeiro a Dezembro)
INSERT INTO chamado (protocolo, titulo, descricao, categoria, prioridade, status, usuario_id, tecnico_id, local_id, solucao, nota_avaliacao, comentario_avaliacao, data_abertura, data_atribuicao, data_conclusao, data_avaliacao) VALUES
('20250110-A001', 'Erro na Folha Jan/25', 'Erro ao emitir folha', 'SOFTWARE', 'ALTA', 'CONCLUIDO', 5, 2, 4, 'Sistema atualizado.', 5, 'Perfeito!', '2025-01-10 08:00:00', '2025-01-10 08:30:00', '2025-01-10 10:00:00', '2025-01-10 11:00:00'),
('20250215-A002', 'Monitor piscando', 'Cabo frouxo', 'HARDWARE', 'BAIXA', 'CONCLUIDO', 4, 3, 2, 'Cabo trocado.', 4, 'Muito bom.', '2025-02-15 09:00:00', '2025-02-15 09:15:00', '2025-02-15 09:40:00', '2025-02-15 10:00:00'),
('20250320-A003', 'Mouse ruim', 'Scroll não funciona', 'HARDWARE', 'BAIXA', 'CONCLUIDO', 4, 2, 2, 'Mouse novo entregue.', 5, 'Excelente atendimento.', '2025-03-20 10:00:00', '2025-03-20 11:00:00', '2025-03-20 14:00:00', '2025-03-20 15:00:00'),
('20250411-A004', 'Lentidão PC', 'Muito lento para iniciar', 'SOFTWARE', 'MEDIA', 'CONCLUIDO', 5, 3, 4, 'Limpeza de temporários.', 1, 'Não mudou nada.', '2025-04-11 08:00:00', '2025-04-11 10:00:00', '2025-04-11 11:30:00', '2025-04-11 12:00:00'),
('20250505-A005', 'Cabo de rede solto', 'Cabo quebrou a trava', 'REDE', 'MEDIA', 'CONCLUIDO', 4, 2, 2, 'Conector RJ45 refeito.', 4, 'Bom, mas demorou um pouco.', '2025-05-05 13:00:00', '2025-05-05 15:00:00', '2025-05-05 16:00:00', '2025-05-05 16:30:00'),
('20250612-A006', 'Esqueci a senha', 'Senha bloqueada', 'SOFTWARE', 'ALTA', 'CONCLUIDO', 5, 3, 4, 'Senha redefinida.', 5, 'Tudo ótimo.', '2025-06-12 08:00:00', '2025-06-12 08:10:00', '2025-06-12 08:20:00', '2025-06-12 08:30:00'),
('20250722-A007', 'Instalar PDF', 'Preciso de leitor', 'SOFTWARE', 'BAIXA', 'CONCLUIDO', 4, 2, 2, 'Instalado Foxit.', 5, 'Resolveu.', '2025-07-22 10:00:00', '2025-07-22 14:00:00', '2025-07-22 14:30:00', '2025-07-22 15:00:00'),
('20250818-A008', 'Impressora manchando', 'Folhas listradas', 'HARDWARE', 'MEDIA', 'CONCLUIDO', 5, 3, 4, 'Limpeza feita.', 3, 'Mais ou menos.', '2025-08-18 09:00:00', '2025-08-18 10:00:00', '2025-08-18 11:00:00', '2025-08-18 11:30:00'),
('20250930-A009', 'Navegador fechando', 'Chrome crasha', 'SOFTWARE', 'MEDIA', 'CONCLUIDO', 4, 2, 2, 'Atualizado.', 5, 'Obrigado!', '2025-09-30 13:00:00', '2025-09-30 13:30:00', '2025-09-30 14:00:00', '2025-09-30 14:30:00'),
('20251025-A010', 'Pasta sumiu', 'Unidade Z indisponível', 'REDE', 'ALTA', 'CONCLUIDO', 5, 3, 4, 'Mapeado.', 5, 'Top.', '2025-10-25 08:00:00', '2025-10-25 08:15:00', '2025-10-25 08:30:00', '2025-10-25 09:00:00');

-- ANO 2026 (Janeiro a Junho)
INSERT INTO chamado (protocolo, titulo, descricao, categoria, prioridade, status, usuario_id, tecnico_id, local_id, solucao, nota_avaliacao, comentario_avaliacao, data_abertura, data_atribuicao, data_conclusao, data_avaliacao) VALUES
('20260115-B001', 'Arrumar som', 'Não tem som no PC', 'HARDWARE', 'BAIXA', 'CONCLUIDO', 4, 2, 2, 'Driver reinstalado.', 2, 'Demorou 3 dias para virem arrumar.', '2026-01-15 08:00:00', '2026-01-17 10:00:00', '2026-01-18 10:00:00', '2026-01-18 11:00:00'),
('20260210-B002', 'Wi-fi caindo', 'Sinal cai toda hora', 'REDE', 'ALTA', 'CONCLUIDO', 5, 3, 4, 'Roteador reiniciado.', 1, 'Técnico só reiniciou, o problema voltou.', '2026-02-10 09:00:00', '2026-02-10 10:00:00', '2026-02-10 10:15:00', '2026-02-10 11:30:00'),
('20260305-B003', 'Vírus no pen drive', 'Arquivos atalhos', 'SOFTWARE', 'MEDIA', 'CONCLUIDO', 4, 2, 2, 'Antivírus rodado.', 2, 'Perdi meus arquivos e o técnico foi rude.', '2026-03-05 14:00:00', '2026-03-05 15:00:00', '2026-03-05 16:00:00', '2026-03-05 16:30:00'),
('20260312-B004', 'Teclado falhando', 'Letra A não pega', 'HARDWARE', 'MEDIA', 'CONCLUIDO', 5, 3, 4, 'Limpeza de contato.', 1, 'Problema continuou, deveria ter trocado a peça.', '2026-03-12 08:00:00', '2026-03-12 14:00:00', '2026-03-12 14:30:00', '2026-03-12 15:00:00'),
('20260401-B005', 'Dúvida Excel', 'Como faz soma?', 'SOFTWARE', 'BAIXA', 'CONCLUIDO', 4, 2, 2, 'Explicado função SOMA.', 5, 'Super atencioso.', '2026-04-01 09:00:00', '2026-04-01 09:30:00', '2026-04-01 09:45:00', '2026-04-01 10:00:00'),
('20260415-B006', 'Cabo cortado', 'Cadeira por cima do cabo', 'HARDWARE', 'MEDIA', 'CONCLUIDO', 5, 3, 4, 'Cabo trocado.', 5, 'Rápido!', '2026-04-15 10:00:00', '2026-04-15 11:00:00', '2026-04-15 11:30:00', '2026-04-15 12:00:00'),
('20260510-B007', 'PC não liga 2', 'Fonte queimou', 'HARDWARE', 'ALTA', 'CONCLUIDO', 4, 2, 2, 'Fonte substituída.', 5, 'Trocada na hora.', '2026-05-10 08:00:00', '2026-05-10 08:15:00', '2026-05-10 14:00:00', '2026-05-10 15:00:00'),
('20260522-B008', 'Sem acesso ERP', 'Sistema diz senha errada', 'SOFTWARE', 'MEDIA', 'CONCLUIDO', 5, 3, 4, 'Reset de senha feito no AD.', 4, '', '2026-05-22 09:00:00', '2026-05-22 09:10:00', '2026-05-22 09:20:00', '2026-05-22 09:30:00'),
('20260601-B009', 'Erro impressora', 'Piscando vermelho', 'HARDWARE', 'MEDIA', 'CONCLUIDO', 4, 2, 2, 'Tampa mal fechada.', 3, 'Era só a tampa.', '2026-06-01 14:00:00', '2026-06-01 15:00:00', '2026-06-01 15:05:00', '2026-06-01 15:10:00'),
('20260615-B010', 'Mover PC', 'Troca de mesa', 'OUTROS', 'BAIXA', 'CONCLUIDO', 5, 3, 4, 'Equipamento reposicionado.', 5, 'Ajudaram na mudança.', '2026-06-15 08:00:00', '2026-06-15 14:00:00', '2026-06-15 14:30:00', '2026-06-15 15:00:00');

-- ANO 2026 (Julho a Setembro)
INSERT INTO chamado (protocolo, titulo, descricao, categoria, prioridade, status, usuario_id, tecnico_id, local_id, solucao, data_abertura, data_atribuicao, data_conclusao) VALUES
('20260705-C001', 'Instalar Zap', 'Whatsapp Web', 'SOFTWARE', 'BAIXA', 'CONCLUIDO', 4, 2, 2, 'Configurado no navegador.', '2026-07-05 10:00:00', '2026-07-05 11:00:00', '2026-07-05 11:15:00'),
('20260710-C002', 'Tela azul', 'Windows erro fatal', 'SOFTWARE', 'ALTA', 'CONCLUIDO', 5, 3, 4, 'Feita restauração do sistema.', '2026-07-10 08:00:00', '2026-07-10 09:00:00', '2026-07-10 11:00:00'),
('20260715-C003', 'Lixeira', 'Como esvaziar', 'SOFTWARE', 'BAIXA', 'CONCLUIDO', 4, 2, 2, 'Orientado.', '2026-07-15 15:00:00', '2026-07-15 15:10:00', '2026-07-15 15:15:00'),
('20260802-C004', 'Antivírus', 'Mensagem de licença vencida', 'SOFTWARE', 'MEDIA', 'CONCLUIDO', 5, 3, 4, 'Chave de licença inserida.', '2026-08-02 09:00:00', '2026-08-02 10:00:00', '2026-08-02 10:10:00'),
('20260812-C005', 'Sem áudio no Meet', 'Reunião sem som', 'SOFTWARE', 'ALTA', 'CONCLUIDO', 4, 2, 2, 'Permissões de microfone liberadas no Chrome.', '2026-08-12 14:00:00', '2026-08-12 14:05:00', '2026-08-12 14:15:00'),
('20260820-C006', 'Teclado numérico', 'Números não funcionam', 'HARDWARE', 'BAIXA', 'CONCLUIDO', 5, 3, 4, 'Tecla NumLock ativada.', '2026-08-20 10:00:00', '2026-08-20 10:30:00', '2026-08-20 10:35:00'),
('20260901-C007', 'Atualizar SIS', 'Sistema de RH precisa de update', 'SOFTWARE', 'MEDIA', 'CONCLUIDO', 4, 2, 2, 'Update aplicado via painel.', '2026-09-01 09:00:00', '2026-09-01 09:30:00', '2026-09-01 10:00:00'),
('20260905-C008', 'Trocar IP', 'Conflito de IP na rede', 'REDE', 'ALTA', 'CONCLUIDO', 5, 3, 4, 'IP configurado como dinâmico (DHCP).', '2026-09-05 15:00:00', '2026-09-05 15:15:00', '2026-09-05 15:30:00'),
('20260910-C009', 'Nobreak apitando', 'Barulho chato', 'HARDWARE', 'MEDIA', 'CONCLUIDO', 4, 2, 2, 'Bateria do nobreak substituída.', '2026-09-10 11:00:00', '2026-09-10 13:00:00', '2026-09-10 14:00:00'),
('20260915-C010', 'Criar e-mail', 'Novo funcionário precisa de e-mail', 'OUTROS', 'BAIXA', 'CONCLUIDO', 5, 3, 4, 'E-mail criado no painel Admin.', '2026-09-15 16:00:00', '2026-09-15 16:30:00', '2026-09-15 17:00:00');

-- 15 CHAMADOS CANCELADOS
INSERT INTO chamado (protocolo, titulo, descricao, categoria, prioridade, status, usuario_id, tecnico_id, local_id, observacao, data_abertura, data_conclusao) VALUES
('20260120-D001', 'Internet caiu', 'Sem rede', 'REDE', 'MEDIA', 'CANCELADO', 4, 2, 2, 'Cancelado pois a energia da cidade caiu, não era problema local.', '2026-01-20 10:00:00', '2026-01-20 10:15:00'),
('20260225-D002', 'Lento', 'PC lento', 'SOFTWARE', 'BAIXA', 'CANCELADO', 5, 3, 4, 'Usuário abriu em duplicidade com outro chamado.', '2026-02-25 14:00:00', '2026-02-25 14:05:00'),
('20260315-D003', 'Cadeira quebrada', 'Trocar rodinha', 'OUTROS', 'BAIXA', 'CANCELADO', 4, 2, 2, 'Chamado de patrimônio, TI não atende móveis.', '2026-03-15 08:00:00', '2026-03-15 08:30:00'),
('20260405-D004', 'Instalar Jogo', 'Quero jogar paciência', 'SOFTWARE', 'BAIXA', 'CANCELADO', 5, 3, 4, 'Solicitação negada pelas políticas da prefeitura.', '2026-04-05 11:00:00', '2026-04-05 11:15:00'),
('20260512-D005', 'Lâmpada queimada', 'Trocar luz da sala', 'OUTROS', 'MEDIA', 'CANCELADO', 4, 2, 2, 'Encaminhado para a manutenção predial.', '2026-05-12 09:00:00', '2026-05-12 09:20:00'),
('20260608-D006', 'Micro-ondas não liga', 'Copa', 'HARDWARE', 'BAIXA', 'CANCELADO', 5, 3, 4, 'Equipamento não pertence à TI.', '2026-06-08 12:00:00', '2026-06-08 12:30:00'),
('20260718-D007', 'Erro no site do banco', 'Site do Bradesco fora', 'REDE', 'ALTA', 'CANCELADO', 4, 2, 2, 'Problema externo (banco), TI não tem controle.', '2026-07-18 10:00:00', '2026-07-18 10:10:00'),
('20260810-D008', 'Trocar teclado de cor', 'Quero um branco', 'HARDWARE', 'BAIXA', 'CANCELADO', 5, 3, 4, 'Não efetuamos trocas por estética.', '2026-08-10 14:00:00', '2026-08-10 14:15:00'),
('20260902-D009', 'Celular pessoal', 'Instalar app no meu iPhone', 'SOFTWARE', 'BAIXA', 'CANCELADO', 4, 2, 2, 'TI não atende aparelhos particulares.', '2026-09-02 16:00:00', '2026-09-02 16:30:00'),
('20260920-D010', 'Dúvida Facebook', 'Como cria conta?', 'OUTROS', 'BAIXA', 'CANCELADO', 5, 3, 4, 'Foge ao escopo do suporte técnico corporativo.', '2026-09-20 08:00:00', '2026-09-20 08:10:00'),
('20260922-D011', 'Ar condicionado', 'Não gela', 'OUTROS', 'MEDIA', 'CANCELADO', 4, 2, 2, 'Repassado para o setor de infraestrutura.', '2026-09-22 10:00:00', '2026-09-22 10:05:00'),
('20260925-D012', 'Falta de água', 'Bebedouro seco', 'OUTROS', 'BAIXA', 'CANCELADO', 5, 3, 4, 'Direcionado à copa.', '2026-09-25 15:00:00', '2026-09-25 15:05:00'),
('20260928-D013', 'Instalar Photoshop', 'Para edição de fotos pessoais', 'SOFTWARE', 'BAIXA', 'CANCELADO', 4, 2, 2, 'Licença não aprovada pelo chefe de setor.', '2026-09-28 11:00:00', '2026-09-28 11:30:00'),
('20261001-D014', 'Internet lenta no celular', 'Rede visitantes', 'REDE', 'BAIXA', 'CANCELADO', 5, 3, 4, 'Rede de visitantes não tem garantia de banda.', '2026-10-01 14:00:00', '2026-10-01 14:10:00'),
('20261003-D015', 'Erro 404 Google', 'Não abre a pesquisa', 'REDE', 'MEDIA', 'CANCELADO', 4, 2, 2, 'Usuário digitou o link errado (gogle.com).', '2026-10-03 09:00:00', '2026-10-03 09:05:00');

-- Mais chamados Recentes Finalizados (Outubro 2026)
INSERT INTO chamado (protocolo, titulo, descricao, categoria, prioridade, status, usuario_id, tecnico_id, local_id, solucao, nota_avaliacao, comentario_avaliacao, data_abertura, data_atribuicao, data_conclusao, data_avaliacao) VALUES
('20261001-E001', 'Sistema travando', 'O sistema financeiro trava', 'SOFTWARE', 'MEDIA', 'CONCLUIDO', 4, 2, 2, 'Serviço reiniciado.', 5, 'Atendimento muito rápido.', '2026-10-01 09:00:00', '2026-10-01 09:15:00', '2026-10-01 10:30:00', '2026-10-01 11:00:00'),
('20261002-E002', 'Cabo HD', 'Preciso de cabo HDMI', 'HARDWARE', 'BAIXA', 'CONCLUIDO', 5, 3, 4, 'Cabo entregue.', 4, 'Tudo ok.', '2026-10-02 14:00:00', '2026-10-02 14:10:00', '2026-10-02 15:00:00', '2026-10-02 16:00:00'),
('20261003-E003', 'Rato sem pilha', 'Pilha descarregou', 'HARDWARE', 'BAIXA', 'CONCLUIDO', 4, 2, 2, 'Pilha trocada.', 5, 'Excelente.', '2026-10-03 08:00:00', '2026-10-03 08:05:00', '2026-10-03 08:15:00', '2026-10-03 08:30:00'),
('20261004-E004', 'Sem acesso Teams', 'Teams não abre', 'SOFTWARE', 'MEDIA', 'CONCLUIDO', 5, 3, 4, 'Cache apagado.', 5, '', '2026-10-04 10:00:00', '2026-10-04 10:15:00', '2026-10-04 10:45:00', '2026-10-04 11:00:00');