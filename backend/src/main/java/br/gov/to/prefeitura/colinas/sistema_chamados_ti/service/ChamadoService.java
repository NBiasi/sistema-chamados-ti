package br.gov.to.prefeitura.colinas.sistema_chamados_ti.service;

import br.gov.to.prefeitura.colinas.sistema_chamados_ti.dto.request.AvaliacaoRequestDTO;
import br.gov.to.prefeitura.colinas.sistema_chamados_ti.dto.request.ChamadoRequestDTO;
import br.gov.to.prefeitura.colinas.sistema_chamados_ti.dto.request.ChamadoVisitanteRequestDTO;
import br.gov.to.prefeitura.colinas.sistema_chamados_ti.dto.response.ChamadoResponseDTO;
import br.gov.to.prefeitura.colinas.sistema_chamados_ti.entity.Chamado;
import br.gov.to.prefeitura.colinas.sistema_chamados_ti.entity.HistoricoChamado;
import br.gov.to.prefeitura.colinas.sistema_chamados_ti.entity.Local;
import br.gov.to.prefeitura.colinas.sistema_chamados_ti.entity.Secretaria;
import br.gov.to.prefeitura.colinas.sistema_chamados_ti.entity.Usuario;
import br.gov.to.prefeitura.colinas.sistema_chamados_ti.repository.ChamadoRepository;
import br.gov.to.prefeitura.colinas.sistema_chamados_ti.repository.HistoricoChamadoRepository;
import br.gov.to.prefeitura.colinas.sistema_chamados_ti.repository.UsuarioRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ChamadoService {

    private final ChamadoRepository chamadoRepository;
    private final UsuarioRepository usuarioRepository;
    private final SecretariaService secretariaService;
    private final LocalService localService;
    private final HistoricoChamadoRepository historicoRepository;

    public ChamadoService(ChamadoRepository chamadoRepository, 
                          UsuarioRepository usuarioRepository,
                          SecretariaService secretariaService, 
                          LocalService localService,
                          HistoricoChamadoRepository historicoRepository) {
        this.chamadoRepository = chamadoRepository;
        this.usuarioRepository = usuarioRepository;
        this.secretariaService = secretariaService;
        this.localService = localService;
        this.historicoRepository = historicoRepository;
    }

    private String gerarProtocolo() {
        String anoMesDia = LocalDateTime.now().toString().substring(0, 10).replace("-", "");
        String randomHex = UUID.randomUUID().toString().substring(0, 4).toUpperCase();
        return anoMesDia + "-" + randomHex;
    }

    @Transactional(readOnly = true)
    public List<ChamadoResponseDTO> listarTodos() {
        List<Chamado> chamados = chamadoRepository.findAll();
        return chamados.stream()
                .map(this::converterParaResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ChamadoResponseDTO> listarPorUsuario(Long usuarioId) {
        List<Chamado> chamados = chamadoRepository.findByUsuarioIdOrderByDataAberturaDesc(usuarioId);
        return chamados.stream()
                .map(this::converterParaResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Page<ChamadoResponseDTO> listarPorUsuarioPaginado(Long usuarioId, String status, String busca, Pageable pageable) {
        String filtroStatus = (status == null || status.equals("TODOS")) ? null : status;
        String filtroBusca = (busca == null || busca.isBlank()) ? null : busca;
        
        Page<Chamado> pagina = chamadoRepository.buscarMeusChamadosPaginado(usuarioId, filtroStatus, filtroBusca, pageable);
        return pagina.map(this::converterParaResponse);
    }

    // Paginação Global do Admin e Técnico com filtro de Data
    @Transactional(readOnly = true)
    public Page<ChamadoResponseDTO> listarTodosFinalizadosPaginado(String status, String busca, String dataInicioStr, String dataFimStr, Pageable pageable) {
        String filtroStatus = (status == null || status.equals("TODOS")) ? null : status;
        String filtroBusca = (busca == null || busca.isBlank()) ? null : busca;
        
        LocalDateTime dataInicio = null;
        LocalDateTime dataFim = null;
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");

        if (dataInicioStr != null && !dataInicioStr.isBlank()) {
            dataInicio = LocalDate.parse(dataInicioStr, formatter).atStartOfDay();
        }
        if (dataFimStr != null && !dataFimStr.isBlank()) {
            dataFim = LocalDate.parse(dataFimStr, formatter).atTime(23, 59, 59);
        }
        
        Page<Chamado> pagina = chamadoRepository.buscarTodosFinalizadosPaginado(filtroStatus, filtroBusca, dataInicio, dataFim, pageable);
        return pagina.map(this::converterParaResponse);
    }

    @Transactional(readOnly = true)
    public List<ChamadoResponseDTO> listarPorVisitorId(String visitorId) {
        List<Chamado> chamados = chamadoRepository.findByVisitorIdOrderByDataAberturaDesc(visitorId);
        return chamados.stream()
                .map(this::converterParaResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public ChamadoResponseDTO abrirChamadoUsuarioLogado(Long usuarioId, ChamadoRequestDTO dto) {
        Usuario usuario = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new EntityNotFoundException("Usuário não encontrado"));

        Chamado chamado = new Chamado();
        chamado.setProtocolo(gerarProtocolo());
        chamado.setTitulo(dto.getTitulo());
        chamado.setDescricao(dto.getDescricao());
        chamado.setCategoria(dto.getCategoria());
        chamado.setPrioridade(dto.getPrioridade() != null ? dto.getPrioridade() : "MEDIA");
        chamado.setUsuario(usuario);
        chamado.setStatus("ABERTO");

        if (dto.getLocalId() != null) {
            Local local = localService.buscarPorId(dto.getLocalId());
            chamado.setLocal(local);
        }

        Chamado salvo = chamadoRepository.save(chamado);
        registrarHistorico(salvo, null, "ABERTURA", null, "ABERTO", "Chamado aberto por usuário logado.");

        return converterParaResponse(salvo);
    }

    @Transactional
    public ChamadoResponseDTO abrirChamadoVisitante(ChamadoVisitanteRequestDTO dto) {
        Secretaria secretaria = secretariaService.buscarPorId(dto.getSecretariaVisitanteId());
        String chaveAcesso = UUID.randomUUID().toString().substring(0, 8);

        Chamado chamado = new Chamado();
        chamado.setProtocolo(gerarProtocolo());
        chamado.setChaveAcesso(chaveAcesso);
        chamado.setVisitorId(dto.getVisitorId());
        chamado.setNomeVisitante(dto.getNomeVisitante());
        chamado.setContatoVisitante(dto.getContatoVisitante());
        chamado.setSecretariaVisitante(secretaria);

        if (dto.getLocalId() != null) {
            Local local = localService.buscarPorId(dto.getLocalId());
            chamado.setLocal(local);
        }

        chamado.setLocalVisitante(dto.getLocalVisitante());
        chamado.setTitulo(dto.getTitulo());
        chamado.setDescricao(dto.getDescricao());
        chamado.setCategoria(dto.getCategoria());
        chamado.setPrioridade("MEDIA");
        chamado.setStatus("ABERTO");

        Chamado salvo = chamadoRepository.save(chamado);
        registrarHistorico(salvo, null, "ABERTURA_VISITANTE", null, "ABERTO", "Chamado aberto via portal público.");

        return converterParaResponse(salvo);
    }

    @Transactional
    public ChamadoResponseDTO atribuirTecnico(Long chamadoId, Long tecnicoId) {
        Chamado chamado = chamadoRepository.findById(chamadoId)
                .orElseThrow(() -> new EntityNotFoundException("Chamado não encontrado"));
        Usuario tecnico = usuarioRepository.findById(tecnicoId)
                .orElseThrow(() -> new EntityNotFoundException("Técnico não encontrado"));

        String statusAnterior = chamado.getStatus();
        chamado.setTecnico(tecnico);
        chamado.setDataAtribuicao(LocalDateTime.now());
        chamado.setStatus("EM_ANDAMENTO");

        Chamado salvo = chamadoRepository.save(chamado);
        registrarHistorico(salvo, tecnico, "ATRIBUICAO", statusAnterior, "EM_ANDAMENTO", "Atribuído ao técnico " + tecnico.getNome());

        return converterParaResponse(salvo);
    }

    @Transactional
    public ChamadoResponseDTO desatribuirTecnico(Long chamadoId) {
        Chamado chamado = chamadoRepository.findById(chamadoId)
                .orElseThrow(() -> new EntityNotFoundException("Chamado não encontrado"));

        String statusAnterior = chamado.getStatus();
        Usuario tecnicoRemovido = chamado.getTecnico();

        chamado.setTecnico(null);
        chamado.setDataAtribuicao(null);
        chamado.setStatus("ABERTO");

        Chamado salvo = chamadoRepository.save(chamado);
        registrarHistorico(salvo, tecnicoRemovido, "DESATRIBUICAO", statusAnterior, "ABERTO", "Atendimento cancelado pelo técnico. Chamado devolvido para a fila.");

        return converterParaResponse(salvo);
    }

    @Transactional
    public ChamadoResponseDTO concluirChamado(Long chamadoId, String solucao) {
        Chamado chamado = chamadoRepository.findById(chamadoId)
                .orElseThrow(() -> new EntityNotFoundException("Chamado não encontrado"));

        String statusAnterior = chamado.getStatus();
        chamado.setSolucao(solucao);
        chamado.setDataConclusao(LocalDateTime.now());
        chamado.setStatus("CONCLUIDO");

        Chamado salvo = chamadoRepository.save(chamado);
        registrarHistorico(salvo, salvo.getTecnico(), "CONCLUSAO", statusAnterior, "CONCLUIDO", "Chamado concluído.");

        return converterParaResponse(salvo);
    }

    @Transactional
    public ChamadoResponseDTO cancelarChamado(Long chamadoId, Long tecnicoId, String motivo) {
        Chamado chamado = chamadoRepository.findById(chamadoId)
                .orElseThrow(() -> new EntityNotFoundException("Chamado não encontrado"));

        Usuario tecnico = usuarioRepository.findById(tecnicoId)
                .orElseThrow(() -> new EntityNotFoundException("Técnico não encontrado"));

        String statusAnterior = chamado.getStatus();
        chamado.setTecnico(tecnico);
        chamado.setStatus("CANCELADO");
        chamado.setDataConclusao(LocalDateTime.now());
        
        if (motivo != null && !motivo.isBlank()) {
            chamado.setObservacao(motivo);
        }

        Chamado salvo = chamadoRepository.save(chamado);
        String obs = "Chamado cancelado por " + tecnico.getNome() + (motivo != null && !motivo.isBlank() ? " — Motivo: " + motivo : "");
        registrarHistorico(salvo, tecnico, "CANCELAMENTO", statusAnterior, "CANCELADO", obs);

        return converterParaResponse(salvo);
    }

    @Transactional
    public ChamadoResponseDTO avaliarChamado(Long chamadoId, AvaliacaoRequestDTO dto) {
        Chamado chamado = chamadoRepository.findById(chamadoId)
                .orElseThrow(() -> new EntityNotFoundException("Chamado não encontrado"));

        if (!"CONCLUIDO".equals(chamado.getStatus())) {
            throw new IllegalStateException("Apenas chamados concluídos podem ser avaliados.");
        }

        chamado.setNotaAvaliacao(dto.getNotaAvaliacao());
        chamado.setComentarioAvaliacao(dto.getComentarioAvaliacao());
        chamado.setDataAvaliacao(LocalDateTime.now());

        Chamado salvo = chamadoRepository.save(chamado);
        return converterParaResponse(salvo);
    }

    @Transactional
    public void excluirChamado(Long chamadoId) {
        Chamado chamado = chamadoRepository.findById(chamadoId)
                .orElseThrow(() -> new EntityNotFoundException("Chamado não encontrado"));
        chamadoRepository.delete(chamado);
    }

    private void registrarHistorico(Chamado chamado, Usuario usuario, String acao, String statusAnt, String statusNov, String obs) {
        HistoricoChamado historico = new HistoricoChamado();
        historico.setChamado(chamado);
        historico.setUsuario(usuario);
        historico.setAcao(acao);
        historico.setStatusAnterior(statusAnt);
        historico.setStatusNovo(statusNov);
        historico.setObservacao(obs);
        historicoRepository.save(historico);
    }

    public ChamadoResponseDTO converterParaResponse(Chamado c) {
        ChamadoResponseDTO dto = new ChamadoResponseDTO();
        dto.setId(c.getId());
        dto.setProtocolo(c.getProtocolo());
        dto.setNomeVisitante(c.getNomeVisitante());
        dto.setContatoVisitante(c.getContatoVisitante());

        if (c.getSecretariaVisitante() != null) {
            dto.setNomeSecretariaVisitante(c.getSecretariaVisitante().getNome());
        }

        if (c.getLocal() != null) {
            dto.setLocalId(c.getLocal().getId());
            dto.setNomeLocal(c.getLocal().getNome());
            dto.setRua(c.getLocal().getRua());
            dto.setNumero(c.getLocal().getNumero());
            dto.setSetor(c.getLocal().getSetor());
        }

        dto.setLocalVisitante(c.getLocalVisitante());
        dto.setTitulo(c.getTitulo());
        dto.setDescricao(c.getDescricao());
        dto.setCategoria(c.getCategoria());
        dto.setPrioridade(c.getPrioridade());
        dto.setStatus(c.getStatus());
        dto.setDataAbertura(c.getDataAbertura());
        
        // AGORA A DATA DE ATRIBUIÇÃO VAI PARA O FRONTEND PARA O TMA FUNCIONAR!
        dto.setDataAtribuicao(c.getDataAtribuicao());
        
        dto.setDataConclusao(c.getDataConclusao());

        if (c.getUsuario() != null) {
            dto.setNomeUsuarioLogado(c.getUsuario().getNome());
        }
        if (c.getTecnico() != null) {
            dto.setNomeTecnico(c.getTecnico().getNome());
            dto.setTecnicoId(c.getTecnico().getId());
        }
        dto.setObservacao(c.getObservacao());
        dto.setSolucao(c.getSolucao());
        dto.setNotaAvaliacao(c.getNotaAvaliacao());
        dto.setComentarioAvaliacao(c.getComentarioAvaliacao());

        return dto;
    }
}