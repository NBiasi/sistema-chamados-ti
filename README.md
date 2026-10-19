# 🎫 Sistema de Chamados TI

Sistema web para gerenciamento de chamados de suporte técnico da Prefeitura de Colinas do Tocantins.

Permite que **servidores** abram chamados, **técnicos** atendam e atualizem ocorrências, e **administradores** gerenciem secretarias, usuários e acompanhem o desempenho da equipe.

---

## 🚀 Como rodar

### Pré-requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop) instalado e rodando
- (Opcional) [Git](https://git-scm.com/downloads)

### Subir tudo

Na raiz do projeto:

```bash
docker compose up --build -d
```

Isso sobe **3 containers**:

| Container | Serviço | Porta host |
|---|---|---|
| `sistema_chamados_mysql` | MySQL 8 | `3306` |
| `sistema_chamados_backend` | Spring Boot (API REST) | `8080` |
| `sistema_chamados_frontend` | Nginx (HTML/CSS/JS) | `3000` |

### Acessar

| Serviço | URL |
|---|---|
| **Front-end** | **http://localhost:3000** |
| **API** | http://localhost:8080/api |
| **Health check** | http://localhost:8080/actuator/health |
| **MySQL** | localhost:3306 |

### Verificar status

```bash
docker compose ps
```

### Ver logs

```bash
docker compose logs -f           # todos
docker compose logs -f backend   # só o backend
docker compose logs -f frontend  # só o frontend
```

### Parar

```bash
docker compose down
```

### Parar e apagar o banco

```bash
docker compose down -v
```

> ⚠️ O `-v` remove o volume do MySQL. Todos os dados são apagados e o `init.sql` será reexecutado na próxima subida.

### Rebuild após alterar o código

```bash
docker compose up --build -d frontend   # só front
docker compose up --build -d backend    # só back
docker compose up --build -d            # tudo
```

---

## 🧰 Stack

| Camada | Tecnologia |
|---|---|
| **Backend** | Spring Boot 3.3.5 + Java 21 + Spring Security + JWT (JJWT) |
| **Banco** | MySQL 8 |
| **Frontend** | HTML5 + CSS3 + JavaScript puro + Bootstrap 5 |
| **Infra** | Docker + Docker Compose + Nginx |
| **Build** | Maven |

---

## 📁 Estrutura

```
.
├── docker-compose.yaml         # Orquestração dos 3 containers
│
├── backend/                    # API Spring Boot
│   ├── Dockerfile
│   ├── pom.xml
│   └── src/main/java/...       # Controllers, Services, Entities, Security
│
├── frontend/                   # Interface web
│   ├── Dockerfile              # Nginx
│   ├── nginx.conf
│   └── public/
│       ├── *.html              # Páginas
│       ├── css/
│       ├── js/
│       │   ├── api.js          # Cliente HTTP
│       │   ├── auth.js         # Sessão
│       │   └── utils.js        # Helpers
│       └── images/
│
├── bd/
│   └── init.sql                # Schema + dados iniciais
│
└── docs/
    └── API.md                  # Documentação detalhada da API
```

---

## 🔑 Autenticação

A API usa **JWT Bearer Token**. Após o login, inclua o token em todas as requisições:

```
Authorization: Bearer <token>
```

O token é guardado no `localStorage` do navegador. Expira em **24 horas**.

---

## 🔌 Endpoints principais

**Base URL:** `http://localhost:8080/api`

### Auth

| Método | Endpoint | Descrição |
|---|---|---|
| `POST` | `/auth/login` | Login (retorna token) |
| `POST` | `/auth/cadastro` | Cadastro de usuário |
| `GET` | `/auth/me` | Usuário logado |

### Chamados

| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/chamados` | Lista todos (dashboard) |
| `GET` | `/chamados/meus` | Só os meus |
| `GET` | `/chamados/atribuidos` | Atribuídos ao técnico |
| `GET` | `/chamados/{id}` | Detalhe |
| `POST` | `/chamados` | Criar |
| `PUT` | `/chamados/{id}` | Atualizar (técnico/admin) |
| `GET` | `/chamados/status/{status}` | Filtrar por status |

### Secretarias

| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/secretarias` | Todas |
| `GET` | `/secretarias/ativas` | Só ativas |
| `POST` | `/secretarias` | Criar (ADMIN) |
| `PUT` | `/secretarias/{id}` | Atualizar (ADMIN) |
| `PATCH` | `/secretarias/{id}/status` | Ativa/desativa (ADMIN) |
| `DELETE` | `/secretarias/{id}` | Excluir (ADMIN) |

### Admin

| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/admin/dashboard` | Estatísticas |
| `GET` | `/admin/desempenho-tecnicos` | Ranking técnicos |
| `GET` | `/admin/usuarios` | Todos os usuários |
| `PATCH` | `/admin/usuarios/{id}/status` | Ativa/desativa |
| `PATCH` | `/admin/usuarios/{id}/role` | Muda role |

📖 **Documentação completa:** [docs/API.md](docs/API.md)

---

## 👥 Credenciais de teste

| Usuário | Senha | Role |
|---|---|---|
| Administrador | `admin123` | ADMIN |
| João Técnico | `tecnico123` | TECNICO |
| Maria Técnica | `tecnico123` | TECNICO |
| Carlos Silva | `usuario123` | USER |
| Ana Oliveira | `usuario123` | USER |

> ⚠️ O nome é **`Administrador`** (com "A" maiúsculo e acento), não `admin`.

---

## 🎨 Perfis de acesso

| Role | Permissões |
|---|---|
| `USER` | Criar chamado, ver seus próprios chamados |
| `TECNICO` | Tudo de USER + ver todos, atribuir a si, atualizar status |
| `ADMIN` | Tudo de TECNICO + gerenciar usuários, secretarias, ver relatórios |

---

## 📊 Enums

### Status do chamado

| Valor | Significado |
|---|---|
| `ABERTO` | Aguardando técnico |
| `EM_ANDAMENTO` | Técnico trabalhando |
| `AGUARDANDO` | Aguardando usuário |
| `CONCLUIDO` | Resolvido |
| `CANCELADO` | Cancelado |

### Prioridade

| Valor | Significado |
|---|---|
| `BAIXA` | Pode esperar |
| `MEDIA` | Normal |
| `ALTA` | Urgente |
| `URGENTE` | Crítico |

---

## 🗄️ Banco de dados

**Database:** `sistema_chamados_ti`

**Tabelas:**

- `usuario` — usuários do sistema
- `secretaria` — secretarias municipais
- `chamado` — chamados abertos
- `historico_chamado` — auditoria de alterações

**Conexão (DBeaver/Workbench):**

| Parâmetro | Valor |
|---|---|
| Host | `localhost` |
| Porta | `3306` |
| Database | `sistema_chamados_ti` |
| Usuário | `sistema_user` |
| Senha | `sistema_pass` |

---

## 🛠️ Troubleshooting

### Erro de CORS no navegador

Acesse sempre por `http://localhost:3000`. Se usar Live Server do VS Code, use `http://localhost:5500` (já liberado no backend).

### Porta 3306 já em uso

Você tem um MySQL local rodando. Pare-o ou mude a porta no `docker-compose.yaml`:

```yaml
ports:
  - "3307:3306"
```

### Token expirado (401)

Faça login novamente. O `api.js` já redireciona automaticamente.

### Backend não conecta no MySQL

Aguarde ~40 segundos após subir e reinicie o backend:

```bash
docker compose restart backend
```

### Banco corrompido / quero começar do zero

```bash
docker compose down -v
docker compose up --build -d
```

---

## 🗺️ Roadmap

- [ ] Notificações por email
- [ ] Upload de anexos
- [ ] Comentários nos chamados
- [ ] Gráficos no dashboard admin (Chart.js)
- [ ] Exportar relatório em CSV/PDF
- [ ] Filtros avançados e busca
- [ ] Paginação
- [ ] Senhas com BCrypt
- [ ] 2FA para admin

---

## 📝 Licença

Uso interno — Prefeitura de Colinas do Tocantins.

---

## 👨‍💻 Autor

**Nicolas Biasi**
GitHub: [@NBiasi](https://github.com/NBiasi)