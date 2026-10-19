package br.gov.to.prefeitura.colinas.sistema_chamados_ti.repository;

import br.gov.to.prefeitura.colinas.sistema_chamados_ti.entity.Local;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LocalRepository extends JpaRepository<Local, Long> {
    List<Local> findByAtivoTrueOrderByNomeAsc();
    List<Local> findBySecretariaIdAndAtivoTrueOrderByNomeAsc(Long secretariaId);
}