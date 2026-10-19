package br.gov.to.prefeitura.colinas.sistema_chamados_ti.service;

import br.gov.to.prefeitura.colinas.sistema_chamados_ti.entity.AceiteTermo;
import br.gov.to.prefeitura.colinas.sistema_chamados_ti.entity.Chamado;
import br.gov.to.prefeitura.colinas.sistema_chamados_ti.entity.Usuario;
import br.gov.to.prefeitura.colinas.sistema_chamados_ti.repository.AceiteTermoRepository;
import br.gov.to.prefeitura.colinas.sistema_chamados_ti.repository.ChamadoRepository;
import br.gov.to.prefeitura.colinas.sistema_chamados_ti.repository.UsuarioRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class LgpdService {

    private final AceiteTermoRepository aceiteTermoRepository;
    private final ChamadoRepository chamadoRepository;
    private final UsuarioRepository usuarioRepository;

    public LgpdService(AceiteTermoRepository aceiteTermoRepository, ChamadoRepository chamadoRepository, UsuarioRepository usuarioRepository) {
        this.aceiteTermoRepository = aceiteTermoRepository;
        this.chamadoRepository = chamadoRepository;
        this.usuarioRepository = usuarioRepository;
    }

    @Transactional
    public void registrarAceite(Long usuarioId, String visitorId, HttpServletRequest request) {
        AceiteTermo aceite = new AceiteTermo();
        aceite.setUsuarioId(usuarioId);
        aceite.setVisitorId(visitorId);
        aceite.setIp(request.getRemoteAddr());
        aceite.setUserAgent(request.getHeader("User-Agent"));
        aceiteTermoRepository.save(aceite);
    }

    public boolean verificarAceite(Long usuarioId, String visitorId) {
        if (usuarioId != null) {
            return aceiteTermoRepository.findByUsuarioId(usuarioId).isPresent();
        }
        return aceiteTermoRepository.findByVisitorId(visitorId).isPresent();
    }

    public Map<String, Object> exportarDadosTitular(Long usuarioId) {
        Usuario usuario = usuarioRepository.findById(usuarioId).orElseThrow();
        List<Chamado> chamados = chamadoRepository.findByUsuarioIdOrderByDataAberturaDesc(usuarioId);
        
        Map<String, Object> export = new HashMap<>();
        export.put("dados_pessoais", usuario);
        export.put("historico_chamados", chamados);
        return export;
    }

    @Transactional
    public void anonimizarTitular(Long usuarioId) {
        Usuario usuario = usuarioRepository.findById(usuarioId).orElseThrow();
        usuario.setNome("ANONIMIZADO");
        usuario.setEmail("anonimizado_" + usuario.getId() + "@sistema.local");
        usuario.setTelefone("00000000000");
        usuario.setAtivo(false);
        usuario.setSenha(null);
        usuarioRepository.save(usuario);
        // Os chamados mantêm-se associados ao ID por questões de estatística e relatórios.
    }

    // Ação 3.3 - Job para anonimizar visitantes automaticamente após 90 dias
    @Scheduled(cron = "0 0 2 * * ?") // Corre todos os dias às 02:00
    @Transactional
    public void rotinaAnonimizacaoVisitantes() {
        LocalDateTime limite = LocalDateTime.now().minusDays(90);
        List<Chamado> chamadosAntigos = chamadoRepository.findAll().stream()
                .filter(c -> c.getUsuario() == null && c.getDataConclusao() != null)
                .filter(c -> c.getDataConclusao().isBefore(limite))
                .filter(c -> !"ANONIMIZADO".equals(c.getNomeVisitante()))
                .toList();

        for (Chamado c : chamadosAntigos) {
            c.setNomeVisitante("ANONIMIZADO");
            c.setContatoVisitante("ANONIMIZADO");
            chamadoRepository.save(c);
        }
    }
}