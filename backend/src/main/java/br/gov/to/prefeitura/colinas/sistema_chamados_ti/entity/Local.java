package br.gov.to.prefeitura.colinas.sistema_chamados_ti.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "local")
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Local {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String nome;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "secretaria_id", nullable = false)
    private Secretaria secretaria;

    @Column(length = 10)
    private String cep;

    @Column(nullable = false, length = 150)
    private String logradouro;

    @Column(length = 20)
    private String numero;

    @Column(nullable = false, length = 100)
    private String bairro;

    @Column(length = 100)
    private String complemento;

    private Boolean ativo = true;

    @Column(name = "data_criacao")
    private LocalDateTime dataCriacao;

    @PrePersist
    protected void onCreate() {
        dataCriacao = LocalDateTime.now();
        if (ativo == null) ativo = true;
    }
    
    // Métodos ajustados para retornar logradouro e bairro
    public String getRua() {
        return logradouro;
    }

    public String getSetor() {
        return bairro;
    }
}