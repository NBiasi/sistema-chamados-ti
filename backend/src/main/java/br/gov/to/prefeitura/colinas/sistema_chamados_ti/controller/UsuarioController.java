// backend/src/main/java/br/gov/to/prefeitura/colinas/sistema_chamados_ti/controller/UsuarioController.java
package br.gov.to.prefeitura.colinas.sistema_chamados_ti.controller;

import br.gov.to.prefeitura.colinas.sistema_chamados_ti.dto.request.UsuarioCadastroRequestDTO;
import br.gov.to.prefeitura.colinas.sistema_chamados_ti.dto.response.UsuarioResponseDTO;
import br.gov.to.prefeitura.colinas.sistema_chamados_ti.service.UsuarioService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/usuarios")
@CrossOrigin(origins = "*")
public class UsuarioController {

    private final UsuarioService usuarioService;

    public UsuarioController(UsuarioService usuarioService) {
        this.usuarioService = usuarioService;
    }

    @PostMapping("/cadastrar")
    public ResponseEntity<UsuarioResponseDTO> cadastrar(@RequestBody @Valid UsuarioCadastroRequestDTO dto) {
        UsuarioResponseDTO response = usuarioService.cadastrar(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/tecnicos")
    public ResponseEntity<List<UsuarioResponseDTO>> listarTecnicos() {
        return ResponseEntity.ok(usuarioService.listarTecnicos());
    }

    // NOVA ROTA - Lista os Usuários Normais
    @GetMapping("/comuns")
    public ResponseEntity<List<UsuarioResponseDTO>> listarUsuariosComuns() {
        return ResponseEntity.ok(usuarioService.listarUsuariosComuns());
    }

    // NOVA ROTA - Excluir / Desativar Usuário
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> excluirUsuario(@PathVariable Long id) {
        usuarioService.excluir(id);
        return ResponseEntity.noContent().build();
    }
}