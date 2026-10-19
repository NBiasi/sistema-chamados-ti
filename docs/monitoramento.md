# Monitorização e Logs Centralizados

**1. Monitorização de Saúde (Health & Metrics):**
A aplicação expõe métricas de saúde, memória e tráfego através do Spring Boot Actuator (`/actuator/health` e `/actuator/prometheus`). Em produção, estas métricas são ingeridas ativamente por um servidor Prometheus local e visualizadas através de Dashboards do Grafana.

**2. Logs Centralizados:**
Os logs da aplicação estão padronizados para o formato JSON (`logging.pattern.console` definido no Spring). Isto permite a ingestão direta pela *stack* ELK (Elasticsearch, Logstash, Kibana) ou Loki. 
* Não são registados dados sensíveis em texto puro, passwords ou tokens JWT.
* Período de retenção no servidor central: 90 dias.