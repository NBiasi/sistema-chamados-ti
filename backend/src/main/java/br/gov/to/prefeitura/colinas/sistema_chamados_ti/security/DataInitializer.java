package br.gov.to.prefeitura.colinas.sistema_chamados_ti.security;

import br.gov.to.prefeitura.colinas.sistema_chamados_ti.entity.Usuario;
import br.gov.to.prefeitura.colinas.sistema_chamados_ti.repository.UsuarioRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class DataInitializer implements CommandLineRunner {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;

    public DataInitializer(UsuarioRepository usuarioRepository, PasswordEncoder passwordEncoder) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) throws Exception {
        List<Usuario> usuarios = usuarioRepository.findAll();
        boolean atualizou = false;

        for (Usuario u : usuarios) {
            // Se a senha não for nula e NÃO começar por $2a$ (padrão do BCrypt), encripta.
            if (u.getSenha() != null && !u.getSenha().startsWith("$2a$") && !u.getSenha().startsWith("$2b$")) {
                u.setSenha(passwordEncoder.encode(u.getSenha()));
                usuarioRepository.save(u);
                atualizou = true;
            }
        }

        if (atualizou) {
            System.out.println("✅ SEGURANÇA: Senhas em texto puro foram convertidas para BCrypt com sucesso!");
        }
    }
}