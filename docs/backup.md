# Política de Backups

**1. Frequência e Ferramenta:**
O backup da base de dados MySQL (`sistema_chamados_ti`) é executado diariamente, às 03:00 AM, utilizando um script `bash` agendado no crontab do servidor host que invoca o `mysqldump` internamente no contentor.

**2. Retenção:**
* **Diários:** Mantidos localmente por 30 dias.
* **Mensais:** O último backup de cada mês é movido para armazenamento frio (S3/NAS) e retido por 12 meses.

**3. Validação de Restauração:**
Na primeira segunda-feira útil de cada mês, a equipa de TI deve restaurar o backup num ambiente isolado (Staging) para garantir a integridade dos ficheiros `.sql.gz`.