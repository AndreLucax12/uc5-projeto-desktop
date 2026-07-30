import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import os from 'os'
import fs from 'fs'

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    minHeight: 400,
    minWidth: 600,
    center: true,
    title: 'TechOS - Gerenciamento de Assistência Técnica',
    show: false, // Evita que a janela apareça antes de estar pronta
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });
  // Em desenvolvimento usa a URL do Vite; em produção carrega o HTML compilado.
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Canal de teste do boilerplate
ipcMain.handle('canal-ping', async () => {
  return 'pong do Processo Main!'
})

ipcMain.handle('obter-dados-maquina', async () => {
  // Calcula a RAM total em Gigabytes
  const ramTotalGB = (os.totalmem() / (1024 ** 3)).toFixed(2);
  return {
    plataforma: os.platform(), // ex: win32, linux
    processador: os.cpus()[0].model, // modelo do processador
    memoriaRam: `${ramTotalGB} GB`
  };
});

ipcMain.handle('calcular-imc', async (_event, peso: number, altura: number)=> {
  if (!peso || !altura || peso <= 0 || altura <= 0) {
    throw new Error('Valores de peso ou altura inválidos.');
  }
  const imc = parseFloat((peso / (altura * altura)).toFixed(2));
  let classificacao = '';
  if (imc < 18.5) classificacao = 'Abaixo do peso';
  else if (imc < 25.0) classificacao = 'Peso normal'; // Limite OMS: < 25,0kg / m2 
  else if (imc < 29.9) classificacao = 'Sobrepeso';
  else classificacao = 'Obesidade';
  return { imc, classificacao };
});

ipcMain.handle('registrar-log', async (_event, textoLog: string) => {
 if (!textoLog.trim()) return false;
 // NOTA: app.getAppPath() funciona apenas em desenvolvimento.
 // Em produção (.asar), este diretório é somente leitura.
 // Para dados persistidos no app instalado, use: app.getPath('userData')
 const caminhoArquivo = path.join(app.getAppPath(), 'logs.txt');
 const timestamp = new Date().toISOString();
 const linhaLog = `[${timestamp}] ${textoLog}\n`;
 try {
 // Adiciona a linha no final do arquivo de forma síncrona
 fs.appendFileSync(caminhoArquivo, linhaLog, 'utf-8');
 return true;
 } catch (erro: unknown) {
 console.error('Falha de escrita no arquivo:', erro);
 return false;
 }
});
