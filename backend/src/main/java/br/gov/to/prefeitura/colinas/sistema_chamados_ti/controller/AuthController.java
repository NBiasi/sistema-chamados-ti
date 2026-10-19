package br.gov.to.prefeitura.colinas.sistema_chamados_ti.controller;

import br.gov.to.prefeitura.colinas.sistema_chamados_ti.dto.request.LoginRequestDTO;
import br.gov.to.prefeitura.colinas.sistema_chamados_ti.dto.request.RecuperarSenhaRequestDTO;
import br.gov.to.prefeitura.colinas.sistema_chamados_ti.dto.request.VisitanteRequestDTO;
import br.gov.to.prefeitura.colinas.sistema_chamados_ti.dto.response.TokenResponseDTO;
import br.gov.to.prefeitura.colinas.sistema_chamados_ti.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public ResponseEntity<TokenResponseDTO> login(@RequestBody @Valid LoginRequestDTO dto) {
        TokenResponseDTO response = authService.autenticarLocal(dto);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/visitante")
    public ResponseEntity<TokenResponseDTO> gerarTokenVisitante(@RequestBody(required = false) VisitanteRequestDTO dto) {
        TokenResponseDTO response = authService.autenticarVisitante(dto);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/recuperar-senha")
    public ResponseEntity<Map<String, String>> recuperarSenha(@RequestBody @Valid RecuperarSenhaRequestDTO dto) {
        authService.recuperarSenha(dto);
        return ResponseEntity.ok(Map.of("mensagem", "Senha atualizada com sucesso!"));
    }
}