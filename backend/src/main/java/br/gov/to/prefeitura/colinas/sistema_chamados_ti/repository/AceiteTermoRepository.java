package br.gov.to.prefeitura.colinas.sistema_chamados_ti.repository;

import br.gov.to.prefeitura.colinas.sistema_chamados_ti.entity.AceiteTermo;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface AceiteTermoRepository extends JpaRepository<AceiteTermo, Long> {
    Optional<AceiteTermo> findByUsuarioId(Long usuarioId);
    Optional<AceiteTermo> findByVisitorId(String visitorId);
}