# Registo de Operações de Tratamento de Dados (ROPA)

* **Sistema:** Sistema de Chamados de TI
* **Data da Última Atualização:** [Data Atual]

**1. Categorias de Titulares:**
* Servidores Públicos (Técnicos e Utilizadores Comuns).
* Visitantes (Munícipes ou prestadores de serviço que abrem chamados sem login).

**2. Categorias de Dados Pessoais Tratados:**
* **Identificação e Autenticação:** Nome, E-mail, Palavra-passe (hash BCrypt), Identificador de Provedor OAuth2.
* **Contacto e Localização:** Telefone, Endereço IP, Localização física (Setor/Edifício).

**3. Finalidade do Tratamento:**
* Prestação de suporte técnico de TI para a manutenção da execução de políticas públicas.
* Autenticação e controlo de acessos.
* Contacto para resolução de incidentes.

**4. Base Legal (LGPD):**
* Servidores: Execução de políticas públicas (Art. 7º, III).
* Visitantes: Consentimento (Art. 7º, I).

**5. Partilha de Dados:**
* Sem partilha externa. Tratamento exclusivamente interno pela Secretaria de TI.

**6. Transferência Internacional:**
* Nenhuma. Servidores localizados em território nacional.

**7. Prazos de Retenção (Ver `politica_retencao.md`):**
* Visitantes: 90 dias após conclusão.
* Servidores/Chamados: 5 anos.
* Logs: 1 ano.

**8. Medidas de Segurança Aplicadas:**
* Criptografia em trânsito (HTTPS/TLS).
* Hash de palavras-passe (BCrypt).
* Controlo de acesso baseado em perfis (RBAC).
* Limitação de requisições (Rate Limiting).