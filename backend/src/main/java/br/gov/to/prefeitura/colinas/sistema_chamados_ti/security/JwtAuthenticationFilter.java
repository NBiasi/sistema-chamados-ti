package br.gov.to.prefeitura.colinas.sistema_chamados_ti.security;

import br.gov.to.prefeitura.colinas.sistema_chamados_ti.entity.Usuario;
import br.gov.to.prefeitura.colinas.sistema_chamados_ti.repository.UsuarioRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;
import java.util.List;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UsuarioRepository usuarioRepository;

    public JwtAuthenticationFilter(JwtService jwtService, UsuarioRepository usuarioRepository) {
        this.jwtService = jwtService;
        this.usuarioRepository = usuarioRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        
        String authHeader = request.getHeader("Authorization");

        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);

            if (jwtService.validarToken(token)) {
                String subject = jwtService.extrairEmail(token);
                String role = jwtService.extrairRole(token);

                if (SecurityContextHolder.getContext().getAuthentication() == null) {
                    if ("VISITANTE".equalsIgnoreCase(role)) {
                        // Trata perfil Visitante (sem buscar na tabela usuario)
                        Usuario visitanteDummy = new Usuario();
                        visitanteDummy.setNome("Visitante Anônimo");
                        visitanteDummy.setRole("VISITANTE");

                        UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                                visitanteDummy, 
                                null, 
                                List.of(new SimpleGrantedAuthority("ROLE_VISITANTE"))
                        );
                        authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                        SecurityContextHolder.getContext().setAuthentication(authToken);
                    } else {
                        // Trata Usuários do Sistema
                        Usuario usuario = usuarioRepository.findByEmail(subject).orElse(null);
                        if (usuario != null) {
                            UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                                    usuario, 
                                    null, 
                                    List.of(new SimpleGrantedAuthority("ROLE_" + usuario.getRole()))
                            );
                            authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                            SecurityContextHolder.getContext().setAuthentication(authToken);
                        }
                    }
                }
            }
        }
        filterChain.doFilter(request, response);
    }
}