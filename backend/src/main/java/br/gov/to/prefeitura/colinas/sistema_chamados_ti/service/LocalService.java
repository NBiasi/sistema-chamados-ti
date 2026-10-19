package br.gov.to.prefeitura.colinas.sistema_chamados_ti.service;

import br.gov.to.prefeitura.colinas.sistema_chamados_ti.dto.request.LocalRequestDTO;
import br.gov.to.prefeitura.colinas.sistema_chamados_ti.dto.response.LocalResponseDTO;
import br.gov.to.prefeitura.colinas.sistema_chamados_ti.entity.Local;
import br.gov.to.prefeitura.colinas.sistema_chamados_ti.entity.Secretaria;
import br.gov.to.prefeitura.colinas.sistema_chamados_ti.repository.LocalRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class LocalService {

    private final LocalRepository localRepository;
    private final SecretariaService secretariaService;

    public LocalService(LocalRepository localRepository, SecretariaService secretariaService) {
        this.localRepository = localRepository;
        this.secretariaService = secretariaService;
    }

    @Transactional(readOnly = true)
    public List<LocalResponseDTO> listarAtivos() {
        return localRepository.findByAtivoTrueOrderByNomeAsc().stream()
                .map(this::converterParaDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<LocalResponseDTO> listarPorSecretaria(Long secretariaId) {
        return localRepository.findBySecretariaIdAndAtivoTrueOrderByNomeAsc(secretariaId).stream()
                .map(this::converterParaDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Local buscarPorId(Long id) {
        return localRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Local não encontrado com o ID: " + id));
    }

    @Transactional
    public LocalResponseDTO criar(LocalRequestDTO dto) {
        Secretaria secretaria = secretariaService.buscarPorId(dto.getSecretariaId());
        Local local = new Local();
        BeanUtils.copyProperties(dto, local);
        local.setSecretaria(secretaria);

        Local salvo = localRepository.save(local);
        return converterParaDTO(salvo);
    }

    @Transactional
    public LocalResponseDTO atualizar(Long id, LocalRequestDTO dto) {
        Local local = buscarPorId(id);
        Secretaria secretaria = secretariaService.buscarPorId(dto.getSecretariaId());
        
        BeanUtils.copyProperties(dto, local, "id", "dataCriacao");
        local.setSecretaria(secretaria);

        Local salvo = localRepository.save(local);
        return converterParaDTO(salvo);
    }

    @Transactional
    public void desativar(Long id) {
        Local local = buscarPorId(id);
        local.setAtivo(false);
        localRepository.save(local);
    }

    public LocalResponseDTO converterParaDTO(Local local) {
        LocalResponseDTO dto = new LocalResponseDTO();
        BeanUtils.copyProperties(local, dto);
        if (local.getSecretaria() != null) {
            dto.setSecretariaId(local.getSecretaria().getId());
            dto.setNomeSecretaria(local.getSecretaria().getNome());
        }
        return dto;
    }
}