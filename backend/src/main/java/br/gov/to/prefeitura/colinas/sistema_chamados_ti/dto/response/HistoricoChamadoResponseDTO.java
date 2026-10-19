package br.gov.to.prefeitura.colinas.sistema_chamados_ti.dto.response;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class HistoricoChamadoResponseDTO {
    private Long id;
    private String acao;
    private String statusAnterior;
    private String statusNovo;
    private String observacao;
    private LocalDateTime dataAcao;
    private String nomeResponsavelAcao; // Quem fez a alteração
}