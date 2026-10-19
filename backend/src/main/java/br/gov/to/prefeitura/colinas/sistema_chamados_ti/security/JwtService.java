package br.gov.to.prefeitura.colinas.sistema_chamados_ti.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.util.Date;

@Service
public class JwtService {

    @Value("${app.jwt.secret}")
    private String secretKeyString;

    @Value("${app.jwt.expiration-visitor:14400000}") // 4 horas (14.400.000 ms)
    private long expirationVisitor;

    @Value("${app.jwt.expiration-user:31536000000000}") // ~1000 anos
    private long expirationUser;

    private SecretKey getSignKey() {
        byte[] keyBytes = secretKeyString.getBytes();
        return Keys.hmacShaKeyFor(keyBytes);
    }

    /**
     * Gera o token para Visitantes com expiração exata de 4 horas.
     */
    public String gerarTokenVisitante(String identificadorVisitante) {
        Date agora = new Date();
        Date dataExpiracao = new Date(agora.getTime() + expirationVisitor);

        return Jwts.builder()
                .subject(identificadorVisitante)
                .claim("role", "VISITANTE")
                .claim("tipo", "VISITANTE")
                .issuedAt(agora)
                .expiration(dataExpiracao)
                .signWith(getSignKey())
                .compact();
    }

    /**
     * Gera o token para Usuários Logados (USER, TECNICO, ADMIN) com tempo indeterminado.
     */
    public String gerarTokenUsuario(String email, String role) {
        Date agora = new Date();
        Date dataExpiracao = new Date(agora.getTime() + expirationUser);

        return Jwts.builder()
                .subject(email)
                .claim("role", role)
                .claim("tipo", "USUARIO")
                .issuedAt(agora)
                .expiration(dataExpiracao)
                .signWith(getSignKey())
                .compact();
    }

    public String extrairEmail(String token) {
        return obterClaims(token).getSubject();
    }

    public String extrairRole(String token) {
        return obterClaims(token).get("role", String.class);
    }

    public boolean validarToken(String token) {
        try {
            obterClaims(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private Claims obterClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSignKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}