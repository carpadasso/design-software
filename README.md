# Seu Cantinho - Loja de Reservas de Espaços
Trabalho de Design de Software/UFPR - 2025/2

**Descrição Retirada do Enunciado do Trabalho:** O "Seu Cantinho" é uma rede de lojas de aluguel de espaços para festas, como salões, chácaras e quadras esportivas. A proprietária, Dona Maria, iniciou seu negócio utilizando um sistema simples desenvolvido de forma emergencial para atender às demandas iniciais. Com o cresimento da empresa e a expansão para três estados diferentes, esse sistema se tornou insuficiente, principalmente por não garantir a consistência das reservas entre filiais e por apresentar limitações de usabilidadade e confiabilidade. Assim, é necessário o desenvolvimento de um novo sistema que ofereça suporte às seguintes funcionalidades essenciais:
- (a) Cadastro dos espaços disponíveis para aluguel, com informações detalhadas como fotos, capacidade e preço.
- (b) Gerenciamento das reservas futuras, contemplando data, cliente, espaço alugado e valor pago.
- (c) Controle de pagamentos, indicando se a reserva possui apenas sinal pago ou se já está quitada.

A ausência de uma solução robusta tem gerado problemas recorrentes, tais como: *double-booking* (o mesmo espaço reservado simultaneamente por diferentes clientes), perda de informações financeiras e aumento do tempo de operação. Além disso, a baixa familiaridade de Dona Maria com tecnologia exige uma aplicação simples, intuitiva e tolerante a falhas.

**Objetivos do Trabalho:** O objetivo principal do trabalho é propor uma solução para os problemas que o "Seu Cantinho" está enfrentando. Dessa forma, os objetivos específicos do trabalho são:
- **Modelagem UML:** Elaboração de diagramas usando a linguagem UML, representando a escolha arquitetural do sistema. O diagrama de Classes e o diagrama de Componentes foram requisitos obrigatórios, enquanto que os diagramas de Caso de Uso e os diagramas de Sequência foram opcionais, ilustrando informações adicionais importantes do funcionamento do sistema.
- **Estilo Arquitetural:** Análise do problema e dos requisitos, visando encontrar os ASR (*Architecturally Significant Requirements*) para a decisão do estilo arquitetural usado no protótipo.
- **Implementação de Protótipo:** Construção de código prototipado para o problema do "Seu Cantinho", com as funcionalidades coerentes com a API REST, documentadas no formato OpenAPI/Swagger e executável via Docker Compose.
- **Documentação do Projeto:** Registrar as decisões do projeto e o mapeamento UML para o código, fazendo o comparativo coerente com os diagramas criados.

## Estrutura do Repositório
Este repositório apresenta a seguinte estrutura em árvore, visando auxiliar o entendimento dos componentes do repositório ao leitor.
```yaml
design-software/
├── src/
│   ├── srv-cadastro/
│   │   └── database/
│   │   │   └── dados-cadastro.json
│   │   ├── Dockerfile
│   │   ├── index.js
│   │   ├── openapi.yaml
│   │   └── package.json
│   ├── srv-espaco/
│   │   └── database/
│   │   │   └── dados-espaco.json
│   │   ├── Dockerfile
│   │   ├── index.js
│   │   ├── openapi.yaml
│   │   └── package.json
│   ├── srv-pagamento/
│   │   └── database/
│   │   │   └── dados-pagamento.json
│   │   ├── Dockerfile
│   │   ├── index.js
│   │   ├── openapi.yaml
│   │   └── package.json
│   └── srv-reserva/
│   │   └── database/
│   │   │   └── dados-reserva.json
│   │   ├── Dockerfile
│   │   ├── index.js
│   │   ├── openapi.yaml
│   │   └── package.json
├── uml/
│   ├── diagrama-caso-de-uso.puml
│   ├── diagrama-classes.puml
│   ├── diagrama-componentes.puml
│   ├── diagrama-sequencia-espaco.puml
│   ├── diagrama-sequencia-pagamento.puml
│   └── diagrama-sequencia-reserva.puml
├── docker-compose.yml
├── documentacao.pdf
├── LICENSE
└── README.md
```

## Execução do Código
Para executar o código usando o Docker Compose, primeiro verifique se o Docker e o Docker Compose CLI estão instalados. Após isso, execute o seguinte comando:
```console
user@host:~$ docker compose up
```

## Licença de Uso
MIT License

Copyright (c) 2025 Leonardo Carpwiski

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.