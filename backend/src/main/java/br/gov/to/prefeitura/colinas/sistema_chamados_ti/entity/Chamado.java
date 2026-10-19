package br.gov.to.prefeitura.colinas.sistema_chamados_ti.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "chamado")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Chamado {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String protocolo;

    private String chaveAcesso;

    private String nomeVisitante;
    private String contatoVisitante;

    @ManyToOne
    @JoinColumn(name = "secretaria_visitante_id")
    private Secretaria secretariaVisitante;

    private String localVisitante;

    @Column(nullable = false)
    private String titulo;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String descricao;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CategoriaChamado categoria;

    private String prioridade;

    @Column(nullable = false)
    private String status;

    @ManyToOne
    @JoinColumn(name = "usuario_id")
    private Usuario usuario;

    @ManyToOne
    @JoinColumn(name = "tecnico_id")
    private Usuario tecnico;

    @Column(nullable = false)
    private LocalDateTime dataAbertura = LocalDateTime.now();

    private LocalDateTime dataAtribuicao;
    private LocalDateTime dataConclusao;

    @Column(columnDefinition = "TEXT")
    private String observacao;

    @Column(columnDefinition = "TEXT")
    private String solucao;

    @ManyToOne
    @JoinColumn(name = "local_id")
    private Local local;

    private Integer notaAvaliacao;

    @Column(columnDefinition = "TEXT")
    private String comentarioAvaliacao;

    private LocalDateTime dataAvaliacao;

    private String visitorId;
}