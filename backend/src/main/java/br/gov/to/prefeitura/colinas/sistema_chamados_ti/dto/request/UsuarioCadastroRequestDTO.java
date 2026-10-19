package br.gov.to.prefeitura.colinas.sistema_chamados_ti.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class UsuarioCadastroRequestDTO {

    @NotBlank(message = "Nome é obrigatório")
    private String nome;

    @Email(message = "Email inválido")
    @NotBlank(message = "Email é obrigatório")
    private String email;

    @NotBlank(message = "Telefone é obrigatório")
    private String telefone;

    @NotNull(message = "Secretaria é obrigatória")
    private Long secretariaId;

    @NotBlank(message = "Senha é obrigatória para cadastros locais")
    private String senha;

    @NotBlank(message = "Tipo de usuário é obrigatório")
    @Pattern(regexp = "USER|TECNICO|ADMIN", message = "Tipo deve ser USER, TECNICO ou ADMIN")
    private String tipo;
}