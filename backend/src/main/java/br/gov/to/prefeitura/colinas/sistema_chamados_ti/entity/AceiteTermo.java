package br.gov.to.prefeitura.colinas.sistema_chamados_ti.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "aceite_termo")
@Data
public class AceiteTermo {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private Long usuarioId; // Nulo se for visitante
    private String visitorId; // Nulo se for servidor autenticado
    
    @Column(nullable = false)
    private String versaoTermo = "1.0";
    
    private String ip;
    private String userAgent;
    
    @Column(nullable = false)
    private LocalDateTime dataAceite = LocalDateTime.now();
}