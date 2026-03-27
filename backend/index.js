const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const puppeteer = require('puppeteer');
const { Resend } = require('resend');
const cron = require('node-cron');
require('dotenv').config();

const app = express();
const PORT = 4000;

const allowedOrigin = process.env.FRONTEND_URL || '*';

// ==================== MIDDLEWARES ====================
app.use(cors({
    origin: allowedOrigin,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'], // Adicionado PATCH
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));

const db = new Database('precos.db');

// CORREÇÃO 1: Removida a vírgula após 'status TEXT DEFAULT 'ativo''
db.exec(`
  CREATE TABLE IF NOT EXISTS produtos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    loja TEXT,
    url TEXT NOT NULL UNIQUE,
    ultimo_preco REAL,
    ultima_verificacao TEXT DEFAULT CURRENT_TIMESTAMP,
    intervalo_minutos INTEGER DEFAULT 30, 
    proxima_verificacao TEXT DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'ativo'
  );

  CREATE TABLE IF NOT EXISTS historico_precos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    produto_id INTEGER,
    preco REAL,
    data_hora TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (produto_id) REFERENCES produtos (id) ON DELETE CASCADE
  );
`);

console.log('✅ Banco de Dados OK');

const resend = new Resend(process.env.RESEND_API_KEY);

// ==================== SCRAPE ====================
async function pegarPreco(url) {
    let browser;
    try {
        browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await new Promise(resolve => setTimeout(resolve, 2000));

        const preco = await page.evaluate(() => {
            const selectors = [
                '.ui-pdp-price__second-line .andes-money-amount__fraction',
                '.andes-money-amount__fraction',
                'span.a-price-whole',
                'span[data-testid="price"]',
                '.price__value'
            ];
            for (let s of selectors) {
                const el = document.querySelector(s);
                if (el && el.textContent) {
                    let textoLimpo = el.textContent.replace(/[^\d,]/g, '').replace(',', '.');
                    const valorFinal = parseFloat(textoLimpo);
                    if (!isNaN(valorFinal)) return valorFinal;
                }
            }
            return null;
        });

        await browser.close();
        return preco;
    } catch (e) {
        console.error('❌ Puppeteer:', e.message);
        if (browser) await browser.close();
        return null;
    }
}

function extrairLoja(url) {
    if (!url) return "Loja";
    try {
        const obj = new URL(url);
        let nome = obj.hostname.replace('www.', '').split('.')[0];
        return nome.charAt(0).toUpperCase() + nome.slice(1);
    } catch (e) { return "Loja"; }
}

async function enviarEmail(nome, antigo, novo, url) {
    const precoAntigo = parseFloat(antigo).toFixed(2);
    const precoNovo = parseFloat(novo).toFixed(2);
    const economia = (parseFloat(antigo) - parseFloat(novo)).toFixed(2);

    try {
        await resend.emails.send({
            from: `GPrice Monitor <${process.env.EMAIL_FROM}>`,
            to: process.env.EMAIL_TO,
            subject: `🔥 BAIXOU! ${nome} agora por R$ ${precoNovo}`,
            html: `
            <div style="font-family: sans-serif; background-color: #09090b; color: #ffffff; padding: 40px 20px; text-align: center;">
                <div style="max-width: 500px; margin: 0 auto; background-color: #000000; border: 1px solid #22c55e; border-radius: 24px; padding: 30px;">
                    
                    <h1 style="color: #22c55e; font-size: 24px; margin-bottom: 10px;">🔥 O PREÇO CAIU!</h1>
                    <p style="color: #a1a1aa; font-size: 16px;">O produto que você está monitorando acaba de baixar de preço.</p>
                    
                    <hr style="border: 0; border-top: 1px solid #27272a; margin: 25px 0;">
                    
                    <h2 style="font-size: 20px; color: #ffffff; margin-bottom: 20px;">${nome}</h2>
                    
                    <div style="display: inline-block; margin-bottom: 25px;">
                        <span style="color: #71717a; text-decoration: line-through; font-size: 18px;">R$ ${precoAntigo}</span>
                        <div style="color: #4ade80; font-size: 36px; font-weight: bold; margin-top: 5px;">R$ ${precoNovo}</div>
                        <div style="display: inline-block; background-color: #064e3b; color: #4ade80; padding: 4px 12px; border-radius: 99px; font-size: 12px; font-weight: bold; margin-top: 10px;">
                            ECONOMIA DE R$ ${economia}
                        </div>
                    </div>

                    <div style="margin-top: 20px;">
                        <a href="${url}" >
                            <span style="background-color: #22c55e; color: #ffffff; text-decoration: none; padding: 15px 30px; border-radius: 12px; font-weight: bold; font-size: 16px; display: inline-block;">VER NA LOJA AGORA</span>
                        </a>
                    </div>

                    <p style="color: #52525b; font-size: 12px; margin-top: 30px;">
                        Este é um aviso automático do seu Monitor de Preços.
                    </p>
                </div>
            </div>
            `
        });
        console.log('📧 E-mail de alerta enviado com sucesso!');
    } catch (err) { 
        console.error('❌ Erro ao enviar E-mail:', err); 
    }
}

// ==================== MONITOR (LÓGICA CORRIGIDA) ====================
cron.schedule(`* * * * *`, checarTodos);

async function checarTodos() {
    const agora = new Date().toISOString();
    // O correto é 'ativo' entre aspas simples, pois é um valor de texto (String)
    
    const fila = db.prepare("SELECT * FROM produtos WHERE proxima_verificacao <= ? AND status = 'ativo'").all(agora);
    
    if (fila.length > 0) console.log(`🔄 Processando ${fila.length} produtos da fila...`);

    for (const p of fila) {
        const antigo = p.ultimo_preco;
        const novo = await pegarPreco(p.url);

        if (novo !== null) {
            const dataProxima = new Date();
            // CORREÇÃO 2: Usar o nome correto da coluna (intervalo_minutos)
            dataProxima.setMinutes(dataProxima.getMinutes() + (p.intervalo_minutos || 30));

            db.prepare(`
                UPDATE produtos SET 
                    ultimo_preco = ?, 
                    ultima_verificacao = CURRENT_TIMESTAMP,
                    proxima_verificacao = ?
                WHERE id = ?
            `).run(novo, dataProxima.toISOString(), p.id);

            // CORREÇÃO 3: Inserir no histórico com o valor capturado
            db.prepare('INSERT INTO historico_precos (produto_id, preco) VALUES (?, ?)').run(p.id, novo);

            if (antigo && novo < antigo) {
                await enviarEmail(p.nome, antigo, novo, p.url);
            }
        }
    }
}

// Rota para forçar atualização de todos os produtos agora
app.post('/atualizar', async (req, res) => {
    try {
        console.log("🔄 Iniciando atualização manual de todos os produtos...");
        
        // 1. Pega a função que você já usa no Cron (ex: checarTodos)
        // Se a função estiver definida no escopo, chame-a aqui:
        await checarTodos(); 
        // enviarEmail("Teste Produto", 100, 50, "https://exemplo.com"); // Teste de envio de email

        res.json({ message: "Atualização concluída com sucesso!" });
    } catch (error) {
        console.error("Erro na atualização manual:", error);
        res.status(500).json({ error: "Erro ao atualizar produtos" });
    }
});

// Atualizar intervalo de um produto específico
app.patch('/produtos/:id/intervalo', (req, res) => {
    const { id } = req.params;
    const { intervalo } = req.body;
    
    // Ao mudar o intervalo, já recalculamos a próxima verificação para agora + novo intervalo
    const novaProxima = new Date();
    novaProxima.setMinutes(novaProxima.getMinutes() + parseInt(intervalo));

    db.prepare(`
        UPDATE produtos 
        SET intervalo_minutos = ?, proxima_verificacao = ? 
        WHERE id = ?
    `).run(intervalo, novaProxima.toISOString(), id);

    res.json({ success: true });
});

// Atualizar intervalo de TODOS os produtos
app.patch('/produtos/intervalo/todos', (req, res) => {
    const { intervalo } = req.body;
    const novaProxima = new Date();
    novaProxima.setMinutes(novaProxima.getMinutes() + parseInt(intervalo));

    db.prepare(`
        UPDATE produtos 
        SET intervalo_minutos = ?, proxima_verificacao = ?
    `).run(intervalo, novaProxima.toISOString());

    res.json({ success: true });
});

// ==================== ROTAS ====================

app.get('/produtos', (req, res) => {
    const lista = db.prepare(`
        SELECT p.*, (SELECT MIN(preco) FROM historico_precos WHERE produto_id = p.id) as menor_preco
        FROM produtos p ORDER BY p.id DESC
    `).all();
    res.json(lista);
});

app.post('/produtos', async (req, res) => {
    const { nome, url, intervalo_minutos } = req.body;
    if (!nome || !url) return res.status(400).json({ error: 'Dados obrigatórios' });

    const nomeDaLoja = extrairLoja(url);
    const preco = await pegarPreco(url);

    // CORREÇÃO 4: Adicionado 'status' e 'intervalo_minutos' no INSERT
    const info = db.prepare(`
        INSERT INTO produtos (nome, url, ultimo_preco, loja, intervalo_minutos, status)
        VALUES (?, ?, ?, ?, ?, 'ativo')
    `).run(nome, url, preco, nomeDaLoja, intervalo_minutos || 30);

    if (preco) {
        db.prepare('INSERT INTO historico_precos (produto_id, preco) VALUES (?, ?)').run(info.lastInsertRowid, preco);
    }
    res.json({ success: true, preco, loja: nomeDaLoja });
});

app.patch('/produtos/:id/status', (req, res) => {
    const { id } = req.params;
    const { novoStatus } = req.body;
    db.prepare('UPDATE produtos SET status = ? WHERE id = ?').run(novoStatus, id);
    res.json({ success: true });
});

app.delete('/produtos/:id', (req, res) => {
    db.prepare('DELETE FROM produtos WHERE id = ?').run(req.params.id);
    res.json({ success: true });
});

app.listen(PORT, () => console.log(`🚀 Server em http://localhost:${PORT}`));