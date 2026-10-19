package br.gov.to.prefeitura.colinas.sistema_chamados_ti.dto.response;

import lombok.Data;

@Data
public class UsuarioResponseDTO {
    private Long id;
    private String nome;
    private String email;
    private String telefone;
    private String role;
    private String provedorAuth;
    private Long secretariaId; // Adicionado para controle no frontend
    private String nomeSecretaria; 
    private String provedorId; // Adicione este atributo

    public String getProvedorId() {
        return provedorId;
    }

    public void setProvedorId(String provedorId) {
        this.provedorId = provedorId;
    }
    
}