package br.gov.to.prefeitura.colinas.sistema_chamados_ti.service;

import br.gov.to.prefeitura.colinas.sistema_chamados_ti.dto.request.SecretariaRequestDTO;
import br.gov.to.prefeitura.colinas.sistema_chamados_ti.entity.Secretaria;
import br.gov.to.prefeitura.colinas.sistema_chamados_ti.repository.SecretariaRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class SecretariaService {

    private final SecretariaRepository secretariaRepository;

    public SecretariaService(SecretariaRepository secretariaRepository) {
        this.secretariaRepository = secretariaRepository;
    }

    @Transactional(readOnly = true)
    public List<Secretaria> listarAtivas() {
        return secretariaRepository.findByAtivoTrueOrderByNomeAsc();
    }

    @Transactional(readOnly = true)
    public Secretaria buscarPorId(Long id) {
        return secretariaRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Secretaria não encontrada com o ID: " + id));
    }

    @Transactional
    public Secretaria criar(SecretariaRequestDTO dto) {
        if (secretariaRepository.existsByNomeOrSigla(dto.getNome(), dto.getSigla())) {
            throw new IllegalArgumentException("Já existe uma secretaria com esse nome ou sigla.");
        }
        Secretaria secretaria = new Secretaria();
        BeanUtils.copyProperties(dto, secretaria);
        return secretariaRepository.save(secretaria);
    }

    @Transactional
    public Secretaria atualizar(Long id, SecretariaRequestDTO dto) {
        Secretaria secretaria = buscarPorId(id);
        BeanUtils.copyProperties(dto, secretaria, "id", "dataCriacao");
        return secretariaRepository.save(secretaria);
    }

    @Transactional
    public void desativar(Long id) {
        Secretaria secretaria = buscarPorId(id);
        secretaria.setAtivo(false);
        secretariaRepository.save(secretaria);
    }
}