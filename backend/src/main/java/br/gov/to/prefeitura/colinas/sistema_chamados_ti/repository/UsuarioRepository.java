package br.gov.to.prefeitura.colinas.sistema_chamados_ti.repository;

import br.gov.to.prefeitura.colinas.sistema_chamados_ti.entity.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.List;

@Repository
public interface UsuarioRepository extends JpaRepository<Usuario, Long> {
    
    Optional<Usuario> findByEmail(String email);
    
    Optional<Usuario> findByProvedorId(String provedorId);
    
    boolean existsByEmail(String email);
    
    List<Usuario> findByRoleAndAtivoTrue(String role);
}