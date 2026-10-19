package br.gov.to.prefeitura.colinas.sistema_chamados_ti.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class AvaliacaoRequestDTO {

    @NotNull(message = "A nota é obrigatória")
    @Min(value = 1, message = "A nota mínima é 1")
    @Max(value = 5, message = "A nota máxima é 5")
    private Integer notaAvaliacao;

    @Size(max = 500, message = "O comentário deve ter no máximo 500 caracteres")
    private String comentarioAvaliacao;
}