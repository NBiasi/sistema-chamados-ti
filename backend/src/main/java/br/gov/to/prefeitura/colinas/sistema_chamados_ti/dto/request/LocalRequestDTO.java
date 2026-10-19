package br.gov.to.prefeitura.colinas.sistema_chamados_ti.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class LocalRequestDTO {

    @NotBlank(message = "O nome do local é obrigatório")
    private String nome;

    @NotNull(message = "A secretaria é obrigatória")
    private Long secretariaId;

    private String cep;

    @NotBlank(message = "O logradouro é obrigatório")
    private String logradouro;

    private String numero;

    @NotBlank(message = "O bairro é obrigatório")
    private String bairro;

    private String complemento;
}