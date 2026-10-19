package br.gov.to.prefeitura.colinas.sistema_chamados_ti.service;

import br.gov.to.prefeitura.colinas.sistema_chamados_ti.repository.ChamadoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class DashboardService {

    private final ChamadoRepository chamadoRepository;

    public DashboardService(ChamadoRepository chamadoRepository) {
        this.chamadoRepository = chamadoRepository;
    }

    @Transactional(readOnly = true)
    public List<Object[]> obterDemandaPorSecretaria() {
        return chamadoRepository.countChamadosPorSecretaria();
    }

    @Transactional(readOnly = true)
    public List<Object[]> obterDesempenhoTecnicos() {
        return chamadoRepository.getDesempenhoTecnicos();
    }
}