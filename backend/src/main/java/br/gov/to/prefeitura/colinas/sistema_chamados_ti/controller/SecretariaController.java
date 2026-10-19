package br.gov.to.prefeitura.colinas.sistema_chamados_ti.controller;

import br.gov.to.prefeitura.colinas.sistema_chamados_ti.dto.request.SecretariaRequestDTO;
import br.gov.to.prefeitura.colinas.sistema_chamados_ti.entity.Secretaria;
import br.gov.to.prefeitura.colinas.sistema_chamados_ti.service.SecretariaService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/secretarias")
@CrossOrigin(origins = "*")
public class SecretariaController {

    private final SecretariaService secretariaService;

    public SecretariaController(SecretariaService secretariaService) {
        this.secretariaService = secretariaService;
    }

    @GetMapping
    public ResponseEntity<List<Secretaria>> listarAtivas() {
        return ResponseEntity.ok(secretariaService.listarAtivas());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Secretaria> buscarPorId(@PathVariable Long id) {
        return ResponseEntity.ok(secretariaService.buscarPorId(id));
    }

    @PostMapping
    public ResponseEntity<Secretaria> criar(@RequestBody @Valid SecretariaRequestDTO dto) {
        Secretaria criada = secretariaService.criar(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(criada);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Secretaria> atualizar(@PathVariable Long id, @RequestBody @Valid SecretariaRequestDTO dto) {
        return ResponseEntity.ok(secretariaService.atualizar(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> desativar(@PathVariable Long id) {
        secretariaService.desativar(id);
        return ResponseEntity.noContent().build();
    }
}