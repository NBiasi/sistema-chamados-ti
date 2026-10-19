package br.gov.to.prefeitura.colinas.sistema_chamados_ti.dto.response;

import lombok.Data;

@Data
public class LocalResponseDTO {
    private Long id;
    private String nome;
    private Long secretariaId;
    private String nomeSecretaria;
    private String cep;
    private String logradouro;
    private String numero;
    private String bairro;
    private String complemento;
    private Boolean ativo;
}