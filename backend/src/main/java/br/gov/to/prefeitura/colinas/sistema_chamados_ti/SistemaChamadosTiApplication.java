package br.gov.to.prefeitura.colinas.sistema_chamados_ti;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class SistemaChamadosTiApplication {

    public static void main(String[] args) {
        SpringApplication.run(SistemaChamadosTiApplication.class, args);
    }
}