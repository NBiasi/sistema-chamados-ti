# Política de Retenção e Anonimização de Dados

**1. Regras de Retenção:**
* **Chamados de Visitantes:** Os dados pessoais (nome, contacto, IP) são mantidos por 90 dias após o status do chamado ser alterado para `CONCLUIDO` ou `CANCELADO`.
* **Chamados de Utilizadores Internos:** Mantidos por 5 anos por obrigações legais e de auditoria pública. Após este prazo, os dados do titular podem ser anonimizados, preservando o teor do chamado para estatísticas.
* **Logs de Auditoria:** Eliminados automaticamente ao fim de 1 ano (365 dias).

**2. Processo de Anonimização:**
A anonimização é um processo irreversível executado por uma tarefa agendada (`@Scheduled`) no servidor. 
* O `nomeVisitante` é substituído por `"ANONIMIZADO"`.
* O `contatoVisitante` é substituído por `"ANONIMIZADO"`.
* Identificadores de sessão são limpos.