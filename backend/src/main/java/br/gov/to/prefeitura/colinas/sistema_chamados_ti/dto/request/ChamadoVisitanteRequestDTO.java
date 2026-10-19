package br.gov.to.prefeitura.colinas.sistema_chamados_ti.dto.request;

import br.gov.to.prefeitura.colinas.sistema_chamados_ti.entity.CategoriaChamado;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ChamadoVisitanteRequestDTO {

    private String visitorId; // Vincula o chamado ao navegador do visitante

    @NotBlank(message = "O nome é obrigatório")
    private String nomeVisitante;

    @NotBlank(message = "O contato é obrigatório")
    private String contatoVisitante;

    @NotNull(message = "A secretaria é obrigatória")
    private Long secretariaVisitanteId;

    private Long localId;

    private String localVisitante;

    @NotBlank(message = "O título é obrigatório")
    private String titulo;

    @NotBlank(message = "A descrição é obrigatória")
    private String descricao;

    @NotNull(message = "A categoria é obrigatória")
    private CategoriaChamado categoria;
}