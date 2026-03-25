const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const puppeteer = require('puppeteer');
const {Resend} = require('resend');
const cron = require('node-cron');
require('dotenv').config();

const app = express();
const PORT = 4000;

// ==================== MIDDLEWARES (OBRIGATÓRIO NA ORDEM CERTA) ====================
app.use(cors({
  origin: 'http://localhost:3000', // Troque pelo endereço do seu frontend Next.js
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));   // ← Isso resolve o body undefined

const db = new Database('precos.db');

// Atualize seu bloco de inicialização do banco:
db.exec(`
  CREATE TABLE IF NOT EXISTS produtos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    loja TEXT,
    url TEXT NOT NULL UNIQUE,
    ultimo_preco REAL,
    ultima_verificacao TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS historico_precos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    produto_id INTEGER,
    preco REAL,
    data_hora TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (produto_id) REFERENCES produtos (id) ON DELETE CASCADE
  );
`);

console.log('✅ Banco de Dados e Histórico OK');
console.log('✅ Tabela SQLite OK');

// ==================== EMAIL ====================
const resend = new Resend(process.env.RESEND_API_KEY);

// ==================== SCRAPE ====================
async function pegarPreco(url) {
  let browser;
  try {
    // Usar 'new' no headless costuma ser melhor detectado nas versões mais recentes do Puppeteer
    browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();

    // 1. Disfarça o robô simulando um navegador Chrome real no Windows
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // 2. Entra na página
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // 3. Dá um tempinho extra (2 segundos) para o Javascript do site carregar o preço na tela
    await new Promise(resolve => setTimeout(resolve, 2000));

    const preco = await page.evaluate(() => {
      // Adicionei seletores mais específicos do Mercado Livre e Amazon
      const selectors = [
        '.ui-pdp-price__second-line .andes-money-amount__fraction', // ML principal
        '.andes-money-amount__fraction', // ML genérico
        'span.a-price-whole',            // Amazon
        'span[data-testid="price"]', 
        'span.aok-offscreen', 
        '[data-testid="price-value"]', 
        '.price__value'
      ];

      for (let s of selectors) {
        const el = document.querySelector(s);
        if (el && el.textContent) {
          // Pega o texto original, ex: "R$ 1.500,99" ou "1.500"
          let textoBruto = el.textContent;
          
          // Remove TUDO que não for número ou vírgula (tira o R$ e os pontos de milhar)
          // "R$ 1.500,99" vira "1500,99"
          let textoLimpo = textoBruto.replace(/[^\d,]/g, '');
          
          // Troca a vírgula por ponto para o JavaScript entender os centavos
          // "1500,99" vira "1500.99"
          textoLimpo = textoLimpo.replace(',', '.');
          
          // Converte para float
          const valorFinal = parseFloat(textoLimpo);
          // Evita retornar NaN se a conversão falhar
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

// Substitua a função extrairLoja antiga por esta:
function extrairLoja(url) {
  if (!url) return "Loja";
  try {
    const obj = new URL(url);
    let nome = obj.hostname.replace('www.', '').split('.')[0];
    return nome.charAt(0).toUpperCase() + nome.slice(1);
  } catch (e) {
    return "Loja";
  }
}
// ==================== FUNÇÃO ENVIAR EMAIL (RESEND) ====================
async function enviarEmail(nome, antigo, novo, url) {
  try {
    const { data, error } = await resend.emails.send({
      from: `Monitor <${process.env.EMAIL_FROM}>`, // No plano grátis, use esse remetente padrão
      to: `Carlos <${process.env.EMAIL_TO}>`, // O e-mail que vai receber o alerta
      subject: `🔥 ${nome} BAIXOU!`,
      html: `
        <div style="font-family: sans-serif; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
          <h2 style="color: #10b981;">📉O preço caiu! 💰</h2>
          <p>O produto <strong>${nome}</strong> que você está monitorando baixou de preço.</p>
          <p style="font-size: 18px;">
            De: <span style="text-decoration: line-through; color: #999;">R$ ${antigo || '?'}</span><br>
            Por: <strong style="color: #10b981; font-size: 24px;">R$ ${novo}</strong>
          </p>
          <a href="${url}" style="background: #10b981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 10px; display: inline-block; margin: 10px; font-size: 25px;">
            <span style="font-size: 20px;">🛍 Ver Produto na Loja</span>
          </a>
        </div>
      `,
    });

    if (error) {
      return console.error('❌ Erro Resend:', error);
    }

    console.log('📧 E-mail enviado com sucesso via Resend!', data.id);
  } catch (err) {
    console.error('❌ Erro inesperado ao enviar e-mail:', err);
  }
}

// ==================== MONITOR 10 MIN ====================
const intervalo = 10; // minutos
cron.schedule(`*/${intervalo} * * * *`, checarTodos);
async function checarTodos() {
  console.log(`🔄 Verificando (${intervalo}min)...`);
  // await enviarEmail('Teste de Email', 100, 50, 'https://www.mercadolivre.com.br/');
  const produtos = db.prepare('SELECT * FROM produtos').all();
  for (const p of produtos) {
    const novo = await pegarPreco(p.url);
    if (!novo) continue;
    const antigo = p.ultimo_preco || novo;
    // 1. Atualiza o estado atual do produto
  db.prepare('UPDATE produtos SET ultimo_preco = ?, ultima_verificacao = CURRENT_TIMESTAMP WHERE id = ?')
    .run(novo, p.id);

  // 2. SALVA NO HISTÓRICO (Mesmo que o preço não tenha mudado, para gerar o gráfico de linha contínua)
  db.prepare('INSERT INTO historico_precos (produto_id, preco) VALUES (?, ?)').run(p.id, novo);

  if (novo < antigo) await enviarEmail(p.nome, antigo, novo, p.url);
  }
}



// ==================== ROTAS COM SEGURANÇA ====================
app.get('/', (req, res) => res.json({ status: '✅ Backend 100% OK' }));

app.get('/produtos', (req, res) => {
  const lista = db.prepare(`
    SELECT 
      p.*, 
      (SELECT MIN(preco) FROM historico_precos WHERE produto_id = p.id) as menor_preco
    FROM produtos p 
    ORDER BY p.id DESC
  `).all();
  res.json(lista);
});

app.post('/produtos', async (req, res) => {
  console.log('📥 Body recebido:', req.body);

  const { nome, url } = req.body || {}; 
  
  if (!nome || !url) {
    return res.status(400).json({ error: 'Nome e URL são obrigatórios' });
  }

  // 1. Extrai o nome da loja antes de rodar o Puppeteer (rápido)
  const nomeDaLoja = extrairLoja(url); 

  // 2. Busca o preço (demorado)
  const preco = await pegarPreco(url);

  // 3. Salva no banco (Adicionada a 4ª interrogação para a 'loja')
  const info = db.prepare(`
    INSERT OR REPLACE INTO produtos (nome, url, ultimo_preco, loja)
    VALUES (?, ?, ?, ?)
  `).run(nome, url, preco, nomeDaLoja);

  // 4. Salva no histórico
  const idProduto = info.lastInsertRowid || db.prepare('SELECT id FROM produtos WHERE url = ?').get(url).id;

  if (preco) {
    db.prepare('INSERT INTO historico_precos (produto_id, preco) VALUES (?, ?)').run(idProduto, preco);
  }

  res.json({ success: true, preco_encontrado: preco, loja: nomeDaLoja });
  console.log(`✅ Produto "${nome}" da loja "${nomeDaLoja}" adicionado.`);
});

// Retorna o histórico de um produto específico
app.get('/produtos/:id/historico', (req, res) => {
  const { id } = req.params;
  const historico = db.prepare(`
    SELECT preco, data_hora 
    FROM historico_precos 
    WHERE produto_id = ? 
    ORDER BY data_hora ASC
  `).all(id);
  
  res.json(historico);
});
// ==================== EXCLUIR PRODUTO ====================
app.delete('/produtos/:id', (req, res) => {
  const { id } = req.params;

  try {
    const info = db.prepare('DELETE FROM produtos WHERE id = ?').run(id);
    
    // info.changes retorna quantas linhas foram afetadas. Se for 0, o ID não existia.
    if (info.changes === 0) {
      return res.status(404).json({ error: 'Produto não encontrado.' });
    }

    console.log(`🗑️ Produto ID ${id} excluído com sucesso.`);
    res.json({ success: true, message: 'Produto excluído com sucesso.' });
  } catch (error) {
    console.error('❌ Erro ao excluir:', error.message);
    res.status(500).json({ error: 'Erro interno ao excluir o produto.' });
  }
});
// ==================== EDITAR PRODUTO ====================
app.put('/produtos/:id', async (req, res) => {
  const { id } = req.params;
  const { nome, url } = req.body || {};

  if (!nome || !url) {
    return res.status(400).json({ error: 'Nome e URL são obrigatórios para atualizar.' });
  }

  try {
    // 1. Verifica se o produto existe e pega a URL antiga
    const produtoAntigo = db.prepare('SELECT * FROM produtos WHERE id = ?').get(id);
    
    if (!produtoAntigo) {
      return res.status(404).json({ error: 'Produto não encontrado.' });
    }

    // 2. Se a URL mudou, precisamos raspar o preço do novo link
    let preco = produtoAntigo.ultimo_preco;
    if (produtoAntigo.url !== url) {
      console.log(`🔄 URL alterada. Buscando preço no novo link: ${url}`);
      preco = await pegarPreco(url);
    }

    // 3. Atualiza no banco de dados
    db.prepare(`
      UPDATE produtos 
      SET nome = ?, url = ?, ultimo_preco = ?, ultima_verificacao = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(nome, url, preco, id);

    console.log(`✏️ Produto ID ${id} atualizado. Novo nome: "${nome}"`);
    res.json({ 
      success: true, 
      message: 'Produto atualizado com sucesso.',
      preco_atualizado: preco 
    });

  } catch (error) {
    // Caso tente colocar uma URL que já existe em outro produto (devido ao UNIQUE no banco)
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(400).json({ error: 'Esta URL já está cadastrada em outro produto.' });
    }
    console.error('❌ Erro ao atualizar:', error.message);
    res.status(500).json({ error: 'Erro interno ao atualizar o produto.' });
  }
});

app.post('/atualizar', async (req, res) => {
  await checarTodos();
  res.json({ message: '✅ Atualização manual OK' });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend rodando em http://localhost:${PORT}`);
  console.log(`✅ Teste: abra http://localhost:4000/ no navegador`);
});