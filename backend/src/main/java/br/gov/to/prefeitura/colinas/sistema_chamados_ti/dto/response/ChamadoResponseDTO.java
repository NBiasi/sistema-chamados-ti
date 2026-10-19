package br.gov.to.prefeitura.colinas.sistema_chamados_ti.dto.response;

import br.gov.to.prefeitura.colinas.sistema_chamados_ti.entity.CategoriaChamado;
import lombok.Data;
import java.time.LocalDateTime;

@Data
public class ChamadoResponseDTO {

    private Long id;
    private String protocolo;
    private String nomeVisitante;
    private String contatoVisitante;
    private String nomeSecretariaVisitante;
    private Long localId;
    private String nomeLocal;
    
    // Novos campos de endereço
    private String rua;
    private String numero;
    private String setor;
    
    private String localVisitante;
    private String titulo;
    private String descricao;
    private CategoriaChamado categoria;
    private String prioridade;
    private String status;
    
    private LocalDateTime dataAbertura;
    private LocalDateTime dataAtribuicao; // <-- CAMPO ADICIONADO PARA O CÁLCULO DO TMA
    private LocalDateTime dataConclusao;
    
    private String nomeUsuarioLogado;
    private String nomeTecnico;
    private Long tecnicoId;
    private String observacao;
    private String solucao;
    private Integer notaAvaliacao;
    private String comentarioAvaliacao;

}