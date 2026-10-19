package br.gov.to.prefeitura.colinas.sistema_chamados_ti.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "log_auditoria")
@Data
public class LogAuditoria {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Long usuarioId;
    private String acao; // LOGIN_OK, LOGIN_FAIL, RESET_SENHA
    private String ip;
    private String userAgent;
    private LocalDateTime dataHora = LocalDateTime.now();
}