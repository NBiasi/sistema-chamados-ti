package br.gov.to.prefeitura.colinas.sistema_chamados_ti.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class TokenResponseDTO {
    private String token;
    private UsuarioResponseDTO usuario;
}