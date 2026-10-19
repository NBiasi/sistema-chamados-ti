package br.gov.to.prefeitura.colinas.sistema_chamados_ti.controller;

import br.gov.to.prefeitura.colinas.sistema_chamados_ti.dto.request.LocalRequestDTO;
import br.gov.to.prefeitura.colinas.sistema_chamados_ti.dto.response.LocalResponseDTO;
import br.gov.to.prefeitura.colinas.sistema_chamados_ti.service.LocalService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/locais")
@CrossOrigin(origins = "*")
public class LocalController {

    private final LocalService localService;

    public LocalController(LocalService localService) {
        this.localService = localService;
    }

    @GetMapping
    public ResponseEntity<List<LocalResponseDTO>> listarAtivos() {
        return ResponseEntity.ok(localService.listarAtivos());
    }

    @GetMapping("/secretaria/{secretariaId}")
    public ResponseEntity<List<LocalResponseDTO>> listarPorSecretaria(@PathVariable Long secretariaId) {
        return ResponseEntity.ok(localService.listarPorSecretaria(secretariaId));
    }

    @PostMapping
    public ResponseEntity<LocalResponseDTO> criar(@RequestBody @Valid LocalRequestDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(localService.criar(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<LocalResponseDTO> atualizar(@PathVariable Long id, @RequestBody @Valid LocalRequestDTO dto) {
        return ResponseEntity.ok(localService.atualizar(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> desativar(@PathVariable Long id) {
        localService.desativar(id);
        return ResponseEntity.noContent().build();
    }
}