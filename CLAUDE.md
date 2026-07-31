# Projeto PsyInsight

## Visão Geral

O **PsyInsight** é uma plataforma SaaS desenvolvida para auxiliar psicólogos na elaboração, estruturação e redação qualificada de laudos e documentos psicológicos, com suporte de Inteligência Artificial[cite: 1].
O sistema utiliza como diretriz técnica e ética as modalidades de documentos estabelecidas pela **Resolução CFP nº 06/2019** do Conselho Federal de Psicologia[cite: 1].
O profissional pode interagir via chat de IA para estabelecer a demanda, orientar o raciocínio clínico e preencher de forma precisa os campos regulamentares de cada documento[cite: 1].

A regulamentação e as orientações detalhadas sobre a elaboração dos documentos estão descritas no arquivo PDF localizado em `/docs/Resolução-CFP-n-06-2019-comentada.pdf`[cite: 1].

As modalidades cobertas pelo sistema, em conformidade com a Resolução CFP nº 06/2019, englobam[cite: 1]:
- **Declaração** (Art. 9º)[cite: 1]
- **Atestado Psicológico** (Art. 10)[cite: 1]
- **Relatório Psicológico** (Art. 11)[cite: 1]
- **Relatório Multiprofissional** (Art. 12)[cite: 1]
- **Laudo Psicológico** (Art. 13)[cite: 1]
- **Parecer Psicológico** (Art. 14)[cite: 1]

A implementação atual suporta a geração e edição orientada por IA de todas as modalidades de documentos regulamentadas, com autenticação completa de usuários e persistência de dados.

## Processo de Desenvolvimento

Quando instruído a criar uma funcionalidade:
1. Utilize suas ferramentas Atlassian para ler as instruções da funcionalidade no Jira.
2. Desenvolva a funcionalidade — não pule nenhuma etapa do processo de desenvolvimento em 7 passos (feature-dev).
3. Teste exaustivamente a funcionalidade com testes unitários e de integração, corrigindo eventuais falhas.
4. Envie um PR utilizando suas ferramentas do GitHub.

## Design da IA

Ao escrever código para realizar chamadas a LLMs, utilize a SDK oficial do Google GenAI ou o LiteLLM integrados ao modelo **Gemini 1.5 Pro** (para raciocínio complexo e redação dos laudos) e **Gemini 1.5 Flash** (para interações rápidas no chat).

- **Respostas Estruturadas (Structured Outputs):** Utilize o recurso nativo de *Structured Outputs* (exigindo schemas JSON rígidos) para garantir o preenchimento correto dos campos regulamentares de cada documento psicológico (Identificação, Descrição da Demanda, Procedimento, Análise, Conclusão, Referências) conforme a Resolução CFP nº 06/2019.
- **Streaming & Chat:** Implemente respostas em *streaming* no chat de interações para fornecer feedback em tempo real ao psicólogo durante o mapeamento da demanda clínica.

Certifique-se de que a chave `GEMINI_API_KEY` (ou `GOOGLE_API_KEY`) esteja configurada no arquivo `.env` na raiz do projeto.

## Arquitetura Técnica

O projeto completo deve ser empacotado em um contêiner Docker.  
O backend deve ficar em `backend/`, utilizando **uv** e **FastAPI**.  
O frontend deve ficar em `frontend/`.  
O banco de dados deve utilizar **SQLite**, recriado do zero a cada inicialização do contêiner Docker, fornecendo suporte à tabela de usuários com cadastro (*sign up*) e login (*sign in*).  
Considere compilar o frontend estaticamente e servi-lo diretamente via FastAPI, se viável.  

Devem existir scripts no diretório `scripts/` para operacionalização:

```bash
# Mac
scripts/start-mac.sh    # Iniciar
scripts/stop-mac.sh     # Parar

# Linux
scripts/start-linux.sh
scripts/stop-linux.sh

# Windows
scripts/start-windows.ps1
scripts/stop-windows.ps1