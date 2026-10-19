package br.gov.to.prefeitura.colinas.sistema_chamados_ti.repository;

import br.gov.to.prefeitura.colinas.sistema_chamados_ti.entity.Secretaria;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SecretariaRepository extends JpaRepository<Secretaria, Long> {
    
    Optional<Secretaria> findBySigla(String sigla);
    
    boolean existsByNomeOrSigla(String nome, String sigla);
    
    List<Secretaria> findByAtivoTrueOrderByNomeAsc();
}