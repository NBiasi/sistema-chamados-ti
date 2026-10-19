package br.gov.to.prefeitura.colinas.sistema_chamados_ti.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "usuario")
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String nome;

    @Column(length = 150, unique = true)
    private String email;

    @Column(nullable = false, length = 20)
    private String telefone;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "secretaria_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Secretaria secretaria;

    @JsonIgnore
    @Column(name = "senha")
    private String senha; // Deixou de ser nullable = false

    @Column(name = "provedor_auth", length = 20)
    private String provedorAuth = "LOCAL";

    @Column(name = "provedor_id", length = 100, unique = true)
    private String provedorId;

    @Column(nullable = false, length = 20)
    private String role;

    private Boolean ativo = true;

    @Column(name = "data_cadastro")
    private LocalDateTime dataCadastro;

    @PrePersist
    protected void onCreate() {
        dataCadastro = LocalDateTime.now();
        if (ativo == null) ativo = true;
        if (provedorAuth == null) provedorAuth = "LOCAL";
    }
}