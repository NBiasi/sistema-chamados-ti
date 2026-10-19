package br.gov.to.prefeitura.colinas.sistema_chamados_ti.repository;

import br.gov.to.prefeitura.colinas.sistema_chamados_ti.entity.HistoricoChamado;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface HistoricoChamadoRepository extends JpaRepository<HistoricoChamado, Long> {
    
    // Lista a linha do tempo do chamado da alteração mais antiga para a mais recente
    List<HistoricoChamado> findByChamadoIdOrderByDataAcaoAsc(Long chamadoId);
}