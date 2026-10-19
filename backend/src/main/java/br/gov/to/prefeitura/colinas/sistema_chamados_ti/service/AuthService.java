package br.gov.to.prefeitura.colinas.sistema_chamados_ti.service;

import br.gov.to.prefeitura.colinas.sistema_chamados_ti.dto.request.LoginRequestDTO;
import br.gov.to.prefeitura.colinas.sistema_chamados_ti.dto.request.RecuperarSenhaRequestDTO;
import br.gov.to.prefeitura.colinas.sistema_chamados_ti.dto.request.VisitanteRequestDTO;
import br.gov.to.prefeitura.colinas.sistema_chamados_ti.dto.response.TokenResponseDTO;
import br.gov.to.prefeitura.colinas.sistema_chamados_ti.dto.response.UsuarioResponseDTO;
import br.gov.to.prefeitura.colinas.sistema_chamados_ti.entity.LogAuditoria;
import br.gov.to.prefeitura.colinas.sistema_chamados_ti.entity.Usuario;
import br.gov.to.prefeitura.colinas.sistema_chamados_ti.repository.LogAuditoriaRepository;
import br.gov.to.prefeitura.colinas.sistema_chamados_ti.repository.UsuarioRepository;
import br.gov.to.prefeitura.colinas.sistema_chamados_ti.security.JwtService;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import jakarta.persistence.EntityNotFoundException;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.Duration;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class AuthService {

    private final UsuarioRepository usuarioRepository;
    private final UsuarioService usuarioService;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;
    private final LogAuditoriaRepository logAuditoriaRepository;

    // Rate Limiting (Brute Force Protection)
    private final Map<String, Bucket> cacheIP = new ConcurrentHashMap<>();

    public AuthService(UsuarioRepository usuarioRepository, UsuarioService usuarioService, JwtService jwtService, PasswordEncoder passwordEncoder, LogAuditoriaRepository logAuditoriaRepository) {
        this.usuarioRepository = usuarioRepository;
        this.usuarioService = usuarioService;
        this.jwtService = jwtService;
        this.passwordEncoder = passwordEncoder;
        this.logAuditoriaRepository = logAuditoriaRepository;
    }

    private Bucket resolveBucket(String ip) {
        return cacheIP.computeIfAbsent(ip, k -> Bucket.builder()
                .addLimit(Bandwidth.classic(5, Refill.intervally(5, Duration.ofMinutes(1))))
                .build());
    }

    private void registrarLog(Long usuarioId, String acao) {
        HttpServletRequest request = ((ServletRequestAttributes) RequestContextHolder.currentRequestAttributes()).getRequest();
        LogAuditoria log = new LogAuditoria();
        log.setUsuarioId(usuarioId);
        log.setAcao(acao);
        log.setIp(request.getRemoteAddr());
        log.setUserAgent(request.getHeader("User-Agent"));
        logAuditoriaRepository.save(log);
    }

    @Transactional
    public TokenResponseDTO autenticarLocal(LoginRequestDTO dto) {
        HttpServletRequest request = ((ServletRequestAttributes) RequestContextHolder.currentRequestAttributes()).getRequest();
        String ip = request.getRemoteAddr();
        
        if (!resolveBucket(ip).tryConsume(1)) {
            registrarLog(null, "RATE_LIMIT_EXCEDIDO");
            throw new RuntimeException("Muitas tentativas. Tente novamente em alguns minutos.");
        }

        Usuario usuario = usuarioRepository.findByEmail(dto.getEmail())
                .orElseThrow(() -> new EntityNotFoundException("Credenciais inválidas."));

        if (!"LOCAL".equals(usuario.getProvedorAuth())) {
            throw new IllegalArgumentException("Este usuário utiliza autenticação via Google.");
        }

        if (Boolean.FALSE.equals(usuario.getAtivo())) {
            throw new IllegalStateException("Usuário desativado.");
        }

        // Migração transparente de senha em texto puro para BCrypt
        if (!usuario.getSenha().startsWith("$2a$") && !usuario.getSenha().startsWith("$2b$")) {
            if (usuario.getSenha().equals(dto.getSenha())) {
                usuario.setSenha(passwordEncoder.encode(dto.getSenha()));
                usuarioRepository.save(usuario);
            } else {
                registrarLog(usuario.getId(), "LOGIN_FAIL");
                throw new IllegalArgumentException("Credenciais inválidas.");
            }
        } else if (!passwordEncoder.matches(dto.getSenha(), usuario.getSenha())) {
            registrarLog(usuario.getId(), "LOGIN_FAIL");
            throw new IllegalArgumentException("Credenciais inválidas.");
        }

        registrarLog(usuario.getId(), "LOGIN_OK");
        String token = jwtService.gerarTokenUsuario(usuario.getEmail(), usuario.getRole());
        return new TokenResponseDTO(token, usuarioService.converterParaResponse(usuario));
    }

    // MÉTODO REINSERIDO
    public TokenResponseDTO autenticarVisitante(VisitanteRequestDTO dto) {
        String idVisitante = (dto != null && dto.getVisitorId() != null && !dto.getVisitorId().isBlank())
                ? dto.getVisitorId()
                : "visitante_" + UUID.randomUUID().toString().substring(0, 8);

        String token = jwtService.gerarTokenVisitante(idVisitante);

        UsuarioResponseDTO visitanteDto = new UsuarioResponseDTO();
        visitanteDto.setNome("Visitante");
        visitanteDto.setRole("VISITANTE");
        visitanteDto.setProvedorId(idVisitante);

        return new TokenResponseDTO(token, visitanteDto);
    }

    @Transactional
    public void recuperarSenha(RecuperarSenhaRequestDTO dto) {
        Usuario usuario = usuarioRepository.findByEmail(dto.getEmail())
                .orElseThrow(() -> new EntityNotFoundException("E-mail não encontrado no sistema."));

        if (!"LOCAL".equals(usuario.getProvedorAuth())) {
            throw new IllegalArgumentException("Este usuário utiliza autenticação via Google e não pode redefinir a senha por aqui.");
        }

        if (Boolean.FALSE.equals(usuario.getAtivo())) {
            throw new IllegalStateException("Este usuário está desativado. Contacte o administrador.");
        }

        usuario.setSenha(passwordEncoder.encode(dto.getNovaSenha()));
        usuarioRepository.save(usuario);
        registrarLog(usuario.getId(), "RESET_SENHA");
    }
}