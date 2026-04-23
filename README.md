# gprice-monitor 🚀

**Monitoramento de preços de produtos em lojas online**

Um sistema completo para acompanhar preços de produtos usando o link da loja e receber notificações por e-mail sempre que o preço mudar.

---

## ✨ Funcionalidades

- Monitoramento automático de preços a partir do link do produto
- Armazenamento do histórico de preços em banco de dados SQLite
- Notificações por e-mail (via Resend) quando o preço alterar
- Interface web moderna (frontend)
- Suporte completo a Docker e Docker Compose
- Backend leve e eficiente em Node.js

---

## 🛠 Tecnologias Utilizadas

| Camada          | Tecnologia                    |
| --------------- | ----------------------------- |
| Backend         | Node.js                       |
| Frontend        | TypeScript + JavaScript + CSS |
| Banco de Dados  | SQLite (`precos.db`)          |
| Containerização | Docker + Docker Compose       |
| Notificações    | Resend (API de e-mail)        |

---

## 📋 Pré-requisitos

- Git
- Docker e Docker Compose (recomendado)
- Conta no [Resend](https://resend.com/) para gerar a chave de API

---

## 🚀 Instalação

1. Clone o repositório:

```bash
git clone https://github.com/carlosgruthner/gprice-monitor.git
cd gprice-monitor

2. Configure as variáveis de ambiente

  Crie o arquivo .env com o seguinte conteúdo:

    RESEND_API_KEY="sua_chave_api_aqui"
    EMAIL_FROM="seu_email_de_envio@exemplo.com"
    EMAIL_TO="email_que_receberá_as_notificacoes@exemplo.com"
    EXTERNAL_API_IP=localhost
    EXTERNAL_API_PORT=4000

## Como executar :

  Opção 1: Com Docker (Recomendada)

docker-compose up --build

O frontend estará disponível em http://localhost:3000 (ou na porta configurada no docker-compose.yml).

  Opção 2: Execução Manual
    Backend:
        cd backend
        npm install
        npm start
    Frontend:
        cd frontend
        npm install
        npm run dev


##  Como Usar:
    Acesse o frontend.
    Insira o link do produto da loja que deseja monitorar.
    O sistema irá verificar o preço periodicamente e enviar um e-mail automático caso haja alteração.

## Contribuição

    Contribuições são muito bem-vindas!
    Sinta-se á vontade para abrir Issues ou Pull Requests.


```
