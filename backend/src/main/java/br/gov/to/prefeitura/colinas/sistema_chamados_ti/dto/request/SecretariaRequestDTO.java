package br.gov.to.prefeitura.colinas.sistema_chamados_ti.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class SecretariaRequestDTO {

    @NotBlank(message = "Nome é obrigatório")
    @Size(max = 100, message = "Nome deve ter no máximo 100 caracteres")
    private String nome;

    @NotBlank(message = "Sigla é obrigatória")
    @Size(max = 20, message = "Sigla deve ter no máximo 20 caracteres")
    private String sigla;

    @Size(max = 255, message = "Descrição deve ter no máximo 255 caracteres")
    private String descricao;
}