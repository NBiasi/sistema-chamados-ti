# Termo de Referência (TR)

## 1. Objeto
Contratação de empresa ou profissional especializado para o desenvolvimento, licenciamento e implantação de um Sistema Web de Gestão de Chamados de TI.

## 2. Especificações Técnicas Mínimas
* **Arquitetura:** Backend em API REST (Java/Spring Boot) e Frontend SPA (React/Vite).
* **Base de Dados:** MySQL relacional.
* **Segurança:** Autenticação via JWT, senhas com hash BCrypt, proteção contra brute-force (Rate Limiting).
* **Conformidade Legal:** 
  * Ferramenta de exportação e anonimização de dados pessoais (Lei 13.709/2018 - LGPD).
  * Acessibilidade digital para utilizadores com deficiência visual/motora (WCAG 2.1 Nível AA e eMAG).

## 3. Prazos e Cronograma
* **Desenvolvimento e Entrega:** 30 dias após a assinatura do contrato.
* **Homologação e Treinamento:** 15 dias.

## 4. Critérios de Aceitação
O sistema só será dado como entregue mediante:
1. Validação de zero vulnerabilidades críticas (OWASP).
2. Validação da adequação semântica e leitura por software de voz (NVDA/VoiceOver).
3. Relatório de testes de integração com a base de dados.