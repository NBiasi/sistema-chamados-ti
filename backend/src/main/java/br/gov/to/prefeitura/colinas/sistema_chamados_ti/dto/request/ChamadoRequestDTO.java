package br.gov.to.prefeitura.colinas.sistema_chamados_ti.dto.request;

import br.gov.to.prefeitura.colinas.sistema_chamados_ti.entity.CategoriaChamado;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ChamadoRequestDTO {

    @NotBlank(message = "O título é obrigatório")
    private String titulo;

    @NotBlank(message = "A descrição é obrigatória")
    private String descricao;

    @NotNull(message = "A categoria é obrigatória")
    private CategoriaChamado categoria;

    private String prioridade;

    private Long localId;
}