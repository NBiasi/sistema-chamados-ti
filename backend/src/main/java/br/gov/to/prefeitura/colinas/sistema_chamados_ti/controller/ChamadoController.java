package br.gov.to.prefeitura.colinas.sistema_chamados_ti.controller;

import br.gov.to.prefeitura.colinas.sistema_chamados_ti.dto.request.AvaliacaoRequestDTO;
import br.gov.to.prefeitura.colinas.sistema_chamados_ti.dto.request.ChamadoRequestDTO;
import br.gov.to.prefeitura.colinas.sistema_chamados_ti.dto.request.ChamadoVisitanteRequestDTO;
import br.gov.to.prefeitura.colinas.sistema_chamados_ti.dto.response.ChamadoResponseDTO;
import br.gov.to.prefeitura.colinas.sistema_chamados_ti.entity.Usuario;
import br.gov.to.prefeitura.colinas.sistema_chamados_ti.service.ChamadoService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/chamados")
@CrossOrigin(origins = "*")
public class ChamadoController {

    private final ChamadoService chamadoService;
    private final SimpMessagingTemplate messagingTemplate;

    public ChamadoController(ChamadoService chamadoService, SimpMessagingTemplate messagingTemplate) {
        this.chamadoService = chamadoService;
        this.messagingTemplate = messagingTemplate;
    }

    private void notificarMudanca() {
        messagingTemplate.convertAndSend("/topic/chamados", "ATUALIZADO");
    }

    @GetMapping
    public ResponseEntity<List<ChamadoResponseDTO>> listarTodos() {
        return ResponseEntity.ok(chamadoService.listarTodos());
    }

    @GetMapping("/meus")
    public ResponseEntity<Page<ChamadoResponseDTO>> listarMeusChamados(
            @AuthenticationPrincipal Usuario usuarioLogado,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String busca) {
        
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "dataAbertura"));
        Page<ChamadoResponseDTO> chamados = chamadoService.listarPorUsuarioPaginado(usuarioLogado.getId(), status, busca, pageable);
        return ResponseEntity.ok(chamados);
    }

    // NOVA ROTA: Histórico global Paginado (Para o Admin/Técnico) com Filtros de Data
    @GetMapping("/historico-global")
    public ResponseEntity<Page<ChamadoResponseDTO>> listarHistoricoGlobal(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String busca,
            @RequestParam(required = false) String dataInicio,
            @RequestParam(required = false) String dataFim) {
        
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "dataConclusao"));
        Page<ChamadoResponseDTO> chamados = chamadoService.listarTodosFinalizadosPaginado(status, busca, dataInicio, dataFim, pageable);
        return ResponseEntity.ok(chamados);
    }

    @GetMapping("/visitante/{visitorId}")
    public ResponseEntity<List<ChamadoResponseDTO>> listarChamadosVisitante(@PathVariable String visitorId) {
        List<ChamadoResponseDTO> chamados = chamadoService.listarPorVisitorId(visitorId);
        return ResponseEntity.ok(chamados);
    }

    @PostMapping
    public ResponseEntity<ChamadoResponseDTO> abrirChamado(
            @AuthenticationPrincipal Usuario usuarioLogado,
            @RequestBody @Valid ChamadoRequestDTO dto) {
        ChamadoResponseDTO response = chamadoService.abrirChamadoUsuarioLogado(usuarioLogado.getId(), dto);
        notificarMudanca();
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/usuario/{usuarioId}")
    public ResponseEntity<ChamadoResponseDTO> abrirParaUsuarioLogado(
            @PathVariable Long usuarioId,
            @RequestBody @Valid ChamadoRequestDTO dto) {
        ChamadoResponseDTO response = chamadoService.abrirChamadoUsuarioLogado(usuarioId, dto);
        notificarMudanca();
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/visitante")
    public ResponseEntity<ChamadoResponseDTO> abrirParaVisitante(
            @RequestBody @Valid ChamadoVisitanteRequestDTO dto) {
        ChamadoResponseDTO response = chamadoService.abrirChamadoVisitante(dto);
        notificarMudanca();
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PatchMapping("/{chamadoId}/atribuir/{tecnicoId}")
    public ResponseEntity<ChamadoResponseDTO> atribuirTecnico(
            @PathVariable Long chamadoId,
            @PathVariable Long tecnicoId) {
        ChamadoResponseDTO response = chamadoService.atribuirTecnico(chamadoId, tecnicoId);
        notificarMudanca();
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{chamadoId}/desatribuir")
    public ResponseEntity<ChamadoResponseDTO> desatribuirTecnico(
            @PathVariable Long chamadoId) {
        ChamadoResponseDTO response = chamadoService.desatribuirTecnico(chamadoId);
        notificarMudanca();
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{chamadoId}/concluir")
    public ResponseEntity<ChamadoResponseDTO> concluirChamado(
            @PathVariable Long chamadoId,
            @RequestParam String solucao) {
        ChamadoResponseDTO response = chamadoService.concluirChamado(chamadoId, solucao);
        notificarMudanca();
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{chamadoId}/cancelar")
    public ResponseEntity<ChamadoResponseDTO> cancelarChamado(
            @PathVariable Long chamadoId,
            @RequestParam Long tecnicoId,
            @RequestParam(required = false) String motivo) {
        ChamadoResponseDTO response = chamadoService.cancelarChamado(chamadoId, tecnicoId, motivo);
        notificarMudanca();
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{chamadoId}/avaliar")
    public ResponseEntity<ChamadoResponseDTO> avaliarChamado(
            @PathVariable Long chamadoId,
            @RequestBody @Valid AvaliacaoRequestDTO dto) {
        ChamadoResponseDTO response = chamadoService.avaliarChamado(chamadoId, dto);
        notificarMudanca();
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{chamadoId}")
    public ResponseEntity<Void> excluirChamado(@PathVariable Long chamadoId) {
        chamadoService.excluirChamado(chamadoId);
        notificarMudanca();
        return ResponseEntity.noContent().build();
    }
}