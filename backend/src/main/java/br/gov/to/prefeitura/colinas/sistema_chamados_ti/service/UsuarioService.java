package br.gov.to.prefeitura.colinas.sistema_chamados_ti.service;

import br.gov.to.prefeitura.colinas.sistema_chamados_ti.dto.request.UsuarioCadastroRequestDTO;
import br.gov.to.prefeitura.colinas.sistema_chamados_ti.dto.response.UsuarioResponseDTO;
import br.gov.to.prefeitura.colinas.sistema_chamados_ti.entity.Secretaria;
import br.gov.to.prefeitura.colinas.sistema_chamados_ti.entity.Usuario;
import br.gov.to.prefeitura.colinas.sistema_chamados_ti.repository.UsuarioRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class UsuarioService {

    private final UsuarioRepository usuarioRepository;
    private final SecretariaService secretariaService;
    private final PasswordEncoder passwordEncoder;

    public UsuarioService(UsuarioRepository usuarioRepository, SecretariaService secretariaService, PasswordEncoder passwordEncoder) {
        this.usuarioRepository = usuarioRepository;
        this.secretariaService = secretariaService;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public UsuarioResponseDTO cadastrar(UsuarioCadastroRequestDTO dto) {
        if (usuarioRepository.existsByEmail(dto.getEmail())) {
            throw new IllegalArgumentException("E-mail já cadastrado no sistema.");
        }

        Secretaria secretaria = secretariaService.buscarPorId(dto.getSecretariaId());

        Usuario usuario = new Usuario();
        usuario.setNome(dto.getNome());
        usuario.setEmail(dto.getEmail());
        usuario.setTelefone(dto.getTelefone());
        usuario.setSecretaria(secretaria);
        
        // Aplica a criptografia nativa do Spring antes de guardar na base de dados
        usuario.setSenha(passwordEncoder.encode(dto.getSenha())); 
        
        usuario.setRole(dto.getTipo());
        usuario.setProvedorAuth("LOCAL");

        Usuario salvo = usuarioRepository.save(usuario);
        return converterParaResponse(salvo);
    }

    @Transactional(readOnly = true)
    public List<UsuarioResponseDTO> listarTecnicos() {
        return usuarioRepository.findByRoleAndAtivoTrue("TECNICO").stream()
                .map(this::converterParaResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<UsuarioResponseDTO> listarUsuariosComuns() {
        return usuarioRepository.findByRoleAndAtivoTrue("USER").stream()
                .map(this::converterParaResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public void excluir(Long id) {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Usuário não encontrado."));
        
        usuario.setAtivo(false);
        usuarioRepository.save(usuario);
    }

    public UsuarioResponseDTO converterParaResponse(Usuario usuario) {
        UsuarioResponseDTO res = new UsuarioResponseDTO();
        res.setId(usuario.getId());
        res.setNome(usuario.getNome());
        res.setEmail(usuario.getEmail());
        res.setTelefone(usuario.getTelefone());
        res.setRole(usuario.getRole());
        res.setProvedorAuth(usuario.getProvedorAuth());
        if (usuario.getSecretaria() != null) {
            res.setSecretariaId(usuario.getSecretaria().getId());
            res.setNomeSecretaria(usuario.getSecretaria().getNome());
        }
        return res;
    }
}