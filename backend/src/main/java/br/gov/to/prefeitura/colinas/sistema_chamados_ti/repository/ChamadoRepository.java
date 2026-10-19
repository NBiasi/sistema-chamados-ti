package br.gov.to.prefeitura.colinas.sistema_chamados_ti.repository;

import br.gov.to.prefeitura.colinas.sistema_chamados_ti.entity.Chamado;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.List;

@Repository
public interface ChamadoRepository extends JpaRepository<Chamado, Long> {

    Optional<Chamado> findByProtocolo(String protocolo);
    Optional<Chamado> findByProtocoloAndChaveAcesso(String protocolo, String chaveAcesso);

    List<Chamado> findByUsuarioIdOrderByDataAberturaDesc(Long usuarioId);
    List<Chamado> findByTecnicoIdOrderByDataAberturaDesc(Long tecnicoId);
    List<Chamado> findByStatusOrderByDataAberturaDesc(String status);
    List<Chamado> findByVisitorIdOrderByDataAberturaDesc(String visitorId);

    @Query("SELECT c FROM Chamado c WHERE c.usuario.id = :usuarioId " +
           "AND (:status IS NULL OR c.status = :status) " +
           "AND (:busca IS NULL OR LOWER(c.titulo) LIKE LOWER(CONCAT('%', :busca, '%')) " +
           "OR LOWER(c.protocolo) LIKE LOWER(CONCAT('%', :busca, '%')) " +
           "OR LOWER(CAST(c.categoria AS string)) LIKE LOWER(CONCAT('%', :busca, '%')))")
    Page<Chamado> buscarMeusChamadosPaginado(
            @Param("usuarioId") Long usuarioId,
            @Param("status") String status,
            @Param("busca") String busca,
            Pageable pageable
    );

    // ==========================================
    // NOVA QUERY: PAGINAÇÃO GLOBAL COM DATAS (ADMIN E TÉCNICO)
    // ==========================================
    @Query("SELECT c FROM Chamado c WHERE c.status IN ('CONCLUIDO', 'CANCELADO') " +
           "AND (:status IS NULL OR c.status = :status) " +
           "AND (:dataInicio IS NULL OR c.dataAbertura >= :dataInicio) " +
           "AND (:dataFim IS NULL OR c.dataAbertura <= :dataFim) " +
           "AND (:busca IS NULL OR LOWER(c.protocolo) LIKE LOWER(CONCAT('%', :busca, '%')) " +
           "OR LOWER(c.titulo) LIKE LOWER(CONCAT('%', :busca, '%')) " +
           "OR LOWER(CAST(c.categoria AS string)) LIKE LOWER(CONCAT('%', :busca, '%')) " +
           "OR LOWER(c.nomeVisitante) LIKE LOWER(CONCAT('%', :busca, '%')) " +
           "OR LOWER(c.usuario.nome) LIKE LOWER(CONCAT('%', :busca, '%')))")
    Page<Chamado> buscarTodosFinalizadosPaginado(
            @Param("status") String status,
            @Param("busca") String busca,
            @Param("dataInicio") LocalDateTime dataInicio,
            @Param("dataFim") LocalDateTime dataFim,
            Pageable pageable
    );

    @Query("SELECT COALESCE(u.secretaria.nome, s.nome) as secretaria, COUNT(c) as total " +
           "FROM Chamado c " +
           "LEFT JOIN c.usuario u " +
           "LEFT JOIN c.secretariaVisitante s " +
           "GROUP BY COALESCE(u.secretaria.nome, s.nome) " +
           "ORDER BY total DESC")
    List<Object[]> countChamadosPorSecretaria();

    @Query("SELECT t.nome as tecnico, COUNT(c) as concluidos, AVG(c.notaAvaliacao) as notaMedia " +
           "FROM Chamado c " +
           "JOIN c.tecnico t " +
           "WHERE c.status = 'CONCLUIDO' AND c.notaAvaliacao IS NOT NULL " +
           "GROUP BY t.id, t.nome " +
           "ORDER BY notaMedia DESC")
    List<Object[]> getDesempenhoTecnicos();
    
    List<Chamado> findByPrioridadeInAndStatusInOrderByDataAberturaAsc(List<String> prioridades, List<String> status);
}