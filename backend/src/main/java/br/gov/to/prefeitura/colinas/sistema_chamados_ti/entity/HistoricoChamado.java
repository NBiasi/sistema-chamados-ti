package br.gov.to.prefeitura.colinas.sistema_chamados_ti.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "historico_chamado")
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class HistoricoChamado {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "chamado_id", nullable = false)
    private Chamado chamado;

    // A relação com o usuário tornou-se opcional
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "usuario_id")
    private Usuario usuario;

    @Column(nullable = false, length = 50)
    private String acao;

    @Column(name = "status_anterior", length = 20)
    private String statusAnterior;

    @Column(name = "status_novo", length = 20)
    private String statusNovo;

    @Column(length = 500)
    private String observacao;

    @Column(name = "data_acao")
    private LocalDateTime dataAcao;

    @PrePersist
    protected void onCreate() {
        dataAcao = LocalDateTime.now();
    }
}