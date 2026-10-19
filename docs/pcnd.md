# Plano de Continuidade de Negócios e Recuperação de Desastres (PCND)

**1. Objetivos de Recuperação:**
* **RPO (Recovery Point Objective):** 24 horas. A perda máxima aceitável de dados é o equivalente a um dia de trabalho (desde o último backup da madrugada).
* **RTO (Recovery Time Objective):** 4 horas úteis. O tempo máximo aceitável para o sistema voltar a operar após um desastre total do servidor.

**2. Procedimento de Recuperação em Cenário de Desastre (Disaster Recovery):**
1. **Infraestrutura:** Provisionar uma nova máquina virtual (VM) ou instância cloud.
2. **Dependências:** Instalar Git, Docker e Docker Compose.
3. **Código-fonte:** Clonar o repositório oficial do sistema de chamados.
4. **Restauração de Dados:**
   * Colocar o último ficheiro de backup `.sql.gz` na pasta `bd/`.
   * Renomeá-lo ou modificar o `docker-compose.yaml` para mapear a restauração no arranque do MySQL.
5. **Arranque:** Executar `docker compose up --build -d`.
6. **Validação:** Verificar a disponibilidade em `https://chamados.colinas.to.gov.br` e realizar um teste de Autenticação.

**3. Testes:**
O PCND deve ser testado anualmente (preferencialmente em janeiro) pela equipa de infraestrutura da Prefeitura, simulando a quebra total do servidor host.