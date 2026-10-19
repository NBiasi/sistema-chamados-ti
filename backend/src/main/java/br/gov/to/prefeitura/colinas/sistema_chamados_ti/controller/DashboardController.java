package br.gov.to.prefeitura.colinas.sistema_chamados_ti.controller;

import br.gov.to.prefeitura.colinas.sistema_chamados_ti.service.DashboardService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/dashboard")
@CrossOrigin(origins = "*")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping("/secretarias-demanda")
    public ResponseEntity<List<Object[]>> obterDemandaPorSecretaria() {
        return ResponseEntity.ok(dashboardService.obterDemandaPorSecretaria());
    }

    @GetMapping("/tecnicos-desempenho")
    public ResponseEntity<List<Object[]>> obterDesempenhoTecnicos() {
        return ResponseEntity.ok(dashboardService.obterDesempenhoTecnicos());
    }
}