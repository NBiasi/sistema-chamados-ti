package br.gov.to.prefeitura.colinas.sistema_chamados_ti.controller;

import br.gov.to.prefeitura.colinas.sistema_chamados_ti.entity.Usuario;
import br.gov.to.prefeitura.colinas.sistema_chamados_ti.service.LgpdService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/lgpd")
public class LgpdController {

    private final LgpdService lgpdService;

    public LgpdController(LgpdService lgpdService) {
        this.lgpdService = lgpdService;
    }

    @PostMapping("/aceite")
    public ResponseEntity<Void> registrarAceite(
            @AuthenticationPrincipal Usuario usuario,
            @RequestParam(required = false) String visitorId,
            HttpServletRequest request) {
        Long uId = (usuario != null && usuario.getId() != null) ? usuario.getId() : null;
        lgpdService.registrarAceite(uId, visitorId, request);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/aceite/verificar")
    public ResponseEntity<Boolean> verificarAceite(
            @AuthenticationPrincipal Usuario usuario,
            @RequestParam(required = false) String visitorId) {
        Long uId = (usuario != null && usuario.getId() != null) ? usuario.getId() : null;
        return ResponseEntity.ok(lgpdService.verificarAceite(uId, visitorId));
    }

    @GetMapping("/meus-dados/exportar")
    public ResponseEntity<Map<String, Object>> exportarMeusDados(@AuthenticationPrincipal Usuario usuario) {
        if (usuario == null || usuario.getId() == null) return ResponseEntity.status(403).build();
        return ResponseEntity.ok(lgpdService.exportarDadosTitular(usuario.getId()));
    }

    @DeleteMapping("/meus-dados/anonimizar")
    public ResponseEntity<Void> anonimizarMeusDados(@AuthenticationPrincipal Usuario usuario) {
        if (usuario == null || usuario.getId() == null) return ResponseEntity.status(403).build();
        lgpdService.anonimizarTitular(usuario.getId());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/dpo")
    public ResponseEntity<Map<String, String>> obterDpo() {
        return ResponseEntity.ok(Map.of(
            "nome", "Gestor de Privacidade / DPO Municipal",
            "email", "dpo@colinas.to.gov.br",
            "telefone", "(63) 3476-XXXX"
        ));
    }
}